/**
 * VOIDEX motion engine
 * ---------------------------------------------------------------------------
 * Drives the scroll reveals declared in `assets/voidex-motion.css`. The
 * stylesheet hides things; this file is the only thing that un-hides them, so
 * it is written to fail open: any bail-out path clears `data-vx-motion`, which
 * drops every hiding rule at once and leaves plain Savor behind.
 *
 * It deliberately owns no layout. It adds classes and one custom property
 * (`--vx-i`, the stagger index) and nothing else.
 */

const REVEAL_MARGIN = '0px 0px -12% 0px';
const MAX_STAGGER_ITEMS = 10;
const DONE_AFTER_MS = 1600;

/** Sections whose children are positioned by a scroll container. Staggering
 *  inside one fights the carousel's own measurement, so these fade whole. */
const CAROUSEL_SELECTOR = 'slideshow-component, scroll-container, [data-carousel], .carousel';

/**
 * In-app WebViews (Android Facebook, Instagram, TikTok) ship a Chromium
 * WebView build that mishandles compositor-driven reveals during navigation.
 * Kept in sync with the equivalent detector in `assets/view-transitions.js`.
 * @param {string} [userAgent]
 * @returns {boolean}
 */
function isUnsupportedWebView(userAgent = navigator.userAgent) {
  const ua = userAgent || '';
  const androidWebView = /\bAndroid\b/i.test(ua) && /;\s?wv\)/i.test(ua);
  const knownInAppBrowser =
    /\b(FBAN|FBAV|FB_IAB|FBIOS|Instagram|musical_ly|Bytedance|BytedanceWebview|trill|TikTok)(?:\b|_)/i.test(ua);
  return androidWebView || knownInAppBrowser;
}

/**
 * Matches `isLowPowerDevice()` in `assets/utilities.js` -- a two-core or 2GB
 * device drops frames on staggered reveals, so it gets none.
 * @returns {boolean}
 */
function isLowPowerDevice() {
  /* eslint-disable-next-line compat/compat */
  return Number(navigator.hardwareConcurrency) <= 2 || Number(navigator.deviceMemory) <= 2;
}

function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/** Drops every hiding rule in the stylesheet and stops the failsafe timer. */
function disableMotion() {
  window.clearTimeout(window.__vxMotionFailsafe);
  document.documentElement.removeAttribute('data-vx-motion');
}

/**
 * Walks down from a section through any chain of single-child wrappers to the
 * first element that actually branches, and returns that element's children.
 *
 * Horizon wraps section content in a variable number of layout divs, so the
 * children worth staggering are never at a fixed depth. Following the
 * single-child chain finds them without hard-coding any theme class name.
 *
 * @param {Element} section
 * @returns {Element[]}
 */
function findStaggerItems(section) {
  if (section.querySelector(CAROUSEL_SELECTOR)) return [];

  let node = section;

  // Bounded so a pathological wrapper chain cannot spin.
  for (let depth = 0; depth < 6; depth += 1) {
    const children = Array.from(node.children).filter(
      (child) => !(child instanceof HTMLStyleElement) && !(child instanceof HTMLScriptElement)
    );

    if (children.length === 0) return [];
    if (children.length > 1) return children.slice(0, MAX_STAGGER_ITEMS);

    node = children[0];
  }

  return [];
}

/**
 * Reveals a section and its staggered children, then releases the compositor
 * layers once the animation can no longer be running.
 * @param {Element} section
 */
function reveal(section) {
  section.classList.add('vx-in');

  window.setTimeout(() => {
    section.querySelectorAll('.vx-item').forEach((item) => item.classList.add('vx-done'));
  }, DONE_AFTER_MS);
}

/** @type {IntersectionObserver | null} */
let observer = null;

/**
 * Marks a section's stagger items and hands it to the observer.
 *
 * Marking happens while the section is still hidden by CSS, so adding
 * `.vx-item` can never produce a visible flicker.
 *
 * @param {Element} section
 */
function register(section) {
  if (section.hasAttribute('data-vx-registered')) return;
  section.setAttribute('data-vx-registered', '');

  findStaggerItems(section).forEach((item, index) => {
    item.classList.add('vx-item');
    item.style.setProperty('--vx-i', String(index));
  });

  // The first section is never hidden (it carries the LCP), so it needs no
  // observation -- its CSS keyframe has already run. It still goes through
  // reveal(), because that is what schedules the `.vx-done` pass; skipping it
  // would pin `will-change` on this section's items for the life of the page.
  if (section === section.parentElement?.firstElementChild) {
    reveal(section);
    return;
  }

  observer?.observe(section);
}

/** Registers every section currently inside the main content area. */
function scan() {
  document.querySelectorAll('#MainContent > .shopify-section').forEach(register);
}

/**
 * Fades lazy images in once a decode is confirmed, instead of letting them
 * pop in at full opacity.
 */
function watchImages() {
  document.querySelectorAll('img[loading="lazy"]:not([data-vx-img])').forEach((img) => {
    img.setAttribute('data-vx-img', '');

    // An image already in the cache is complete before this runs; animating it
    // would be a pointless flash, so it is left alone.
    if (img.complete) return;

    img.addEventListener('load', () => img.classList.add('vx-img'), { once: true });
  });
}

/** Adds depth to the header once the page leaves the top. */
function watchScroll() {
  const header = document.querySelector('#header-component');
  if (!header) return;

  let ticking = false;

  const update = () => {
    header.classList.toggle('vx-scrolled', window.scrollY > 8);
    ticking = false;
  };

  window.addEventListener(
    'scroll',
    () => {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(update);
    },
    { passive: true }
  );

  update();
}

function boot() {
  if (prefersReducedMotion() || isLowPowerDevice() || isUnsupportedWebView()) {
    disableMotion();
    return;
  }

  const main = document.querySelector('#MainContent');
  if (!main) {
    disableMotion();
    return;
  }

  // The engine is live, so the failsafe must not fire and un-hide everything
  // mid-reveal.
  window.clearTimeout(window.__vxMotionFailsafe);

  observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        reveal(entry.target);
        observer?.unobserve(entry.target);
      });
    },
    { rootMargin: REVEAL_MARGIN, threshold: 0 }
  );

  scan();
  watchImages();
  watchScroll();

  // `section-renderer.js` swaps whole sections in for filtering, pagination and
  // quick-add, and the theme editor re-renders on every setting change. Both
  // arrive as subtree mutations, so anything new gets registered here or it
  // would stay hidden forever.
  const rescan = () => {
    scan();
    watchImages();
  };

  new MutationObserver(rescan).observe(main, { childList: true, subtree: true });
  document.addEventListener('shopify:section:load', rescan);

  // If the visitor flips reduced motion on mid-session, stand down rather than
  // leaving half-revealed sections behind.
  window.matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', (event) => {
    if (event.matches) disableMotion();
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot, { once: true });
} else {
  boot();
}
