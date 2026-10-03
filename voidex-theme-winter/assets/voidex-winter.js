/* VOIDEX — Winter layer behaviour: scroll-driven snow, sky glow and hero motion, heated-jacket
   variant picker and gallery. Cart submission is handled by voidex-perfume.js
   ([data-vx-atc]); without JS the buy box still posts its default variant to /cart/add. */
(function () {
  'use strict';

  const root = document.documentElement;
  const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = (sel, ctx) => (ctx || document).querySelector(sel);
  const $$ = (sel, ctx) => Array.prototype.slice.call((ctx || document).querySelectorAll(sel));
  const VX = window.VX || {};

  function formatMoney(cents) {
    const fmt = VX.moneyFormat || '${{amount}}';
    const parts = (cents / 100).toFixed(2).split('.');
    const amount = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',') + '.' + parts[1];
    return fmt.replace(/\{\{\s*\w+\s*\}\}/, amount);
  }

  /* ---------- Scroll-driven motion: snow, sky glow, hero (nothing moves unless the page is scrolling) ----------
     Owner's rule (2026-10-03): motion only as a reaction to scrolling. One passive scroll listener wakes a
     single animation loop. Each frame it reads how far the page moved: the sky glow, the hero rings and the
     hero text follow the scroll position directly, and the snow falls with an "energy" that rises with scroll
     speed and eases back to zero just under a second after scrolling stops. When everything is still the
     loop shuts off, so an idle page draws nothing.
     Built for a steady frame rate: snow movement is scaled by real elapsed time (same speed at 60, 90 or
     120 Hz), flakes are stamped from a few pre-rendered sprites, the canvas resolution is capped, and if
     frames still run long the flake count drops until they don't. */
  function initMotion() {
    const canvas = $('[data-vx-snow]');
    const ctx = canvas && canvas.getContext ? canvas.getContext('2d', { alpha: true }) : null;
    const aurora = $('.vx-aurora');
    const hero = $('.vx-whero');
    const visual = $('[data-vx-parallax]');
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    const SIZES = [1.2, 1.8, 2.4, 3.1, 3.9];
    // Soft flake: white core with an ice-blue rim, bright against the dark winter sky.
    const sprites = ctx ? SIZES.map((r) => {
      const c = document.createElement('canvas');
      const px = Math.ceil(r * 2 * dpr) + 2;
      c.width = c.height = px;
      const g = c.getContext('2d');
      const grad = g.createRadialGradient(px / 2, px / 2, 0, px / 2, px / 2, px / 2);
      grad.addColorStop(0, 'rgba(255, 255, 255, 1)');
      grad.addColorStop(0.45, 'rgba(214, 238, 255, 0.9)');
      grad.addColorStop(1, 'rgba(160, 214, 250, 0)');
      g.fillStyle = grad; g.fillRect(0, 0, px, px);
      return { c, size: px / dpr };
    }) : [];
    let w = 0, h = 0, heroH = 1, flakes = [];
    let frame = 0, running = false, last = 0, lastY = window.scrollY, energy = 0, lastScrollAt = 0;
    let slowTime = 0, sampleTime = 0, heroP = -1, aur = '', vis = '';

    const make = (anywhere) => {
      const depth = Math.random();
      return {
        x: Math.random() * w,
        y: anywhere ? Math.random() * h : -8,
        s: sprites[Math.min(SIZES.length - 1, Math.floor(depth * SIZES.length))],
        depth: depth,
        vy: 0.25 + depth * 0.95,
        sway: 0.4 + Math.random() * 1.1,
        phase: Math.random() * Math.PI * 2,
        a: 0.35 + depth * 0.6
      };
    };
    const resize = () => {
      heroH = hero ? Math.max(1, hero.offsetHeight) : 1;
      if (!ctx) return;
      w = window.innerWidth; h = window.innerHeight;
      canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const target = Math.round(Math.min(140, Math.max(45, (w * h) / 12000)));
      flakes = [];
      for (let i = 0; i < target; i++) flakes.push(make(true));
    };
    // k: elapsed time in 60 Hz frames. dy: how far the page scrolled this frame (flakes drift with it by depth).
    const drawSnow = (k, dy) => {
      ctx.clearRect(0, 0, w, h);
      const drift = Math.max(-60, Math.min(60, dy)) * 0.08;
      for (let i = 0; i < flakes.length; i++) {
        let f = flakes[i];
        if (k) {
          f.phase += 0.012 * f.sway * k * energy;
          f.y += f.vy * 2.6 * energy * k - drift * f.depth;
          f.x += Math.sin(f.phase) * 0.35 * f.sway * energy * k;
          if (f.y > h + 8) { f = flakes[i] = make(false); } else if (f.y < -8) { f.y = h + 8; }
          if (f.x < -8) f.x = w + 8; else if (f.x > w + 8) f.x = -8;
        }
        const half = f.s.size / 2;
        ctx.globalAlpha = f.a;
        ctx.drawImage(f.s.c, f.x - half, f.y - half, f.s.size, f.s.size);
      }
      ctx.globalAlpha = 1;
    };
    // Layers tied to the scroll position itself, so they stop the instant the page stops.
    // Each style is written only when it changes.
    const follow = (y) => {
      if (reduceMotion || !root.classList.contains('vx-motion')) return;
      if (aurora) {
        const t = 'translate3d(' + (Math.sin(y / 900) * 4).toFixed(2) + '%,' + (-Math.min(y, 3000) * 0.03).toFixed(1) + 'px,0) scale(' + (1.04 + Math.sin(y / 1300) * 0.04).toFixed(3) + ')';
        if (t !== aur) { aurora.style.transform = t; aur = t; }
      }
      if (y > heroH * 1.5 && heroP === 1) return; // hero is far off-screen and already at rest
      if (hero) {
        const p = Math.min(1, Math.max(0, y / heroH));
        if (p !== heroP) { hero.style.setProperty('--vx-hero-p', p.toFixed(3)); heroP = p; }
      }
      if (visual) {
        const t = 'translate3d(0,' + (Math.min(y, 800) * -0.08).toFixed(1) + 'px,0)';
        if (t !== vis) { visual.style.transform = t; visual.style.setProperty('--vx-spin', (Math.min(y, 1600) * 0.12).toFixed(1)); vis = t; }
      }
    };
    const loop = (now) => {
      const dt = Math.min(50, now - (last || now)); last = now;
      const k = dt / (1000 / 60);
      const y = window.scrollY; const dy = y - lastY; lastY = y;
      // Snow energy chases the scroll speed: quick to pick up, gentle to settle.
      const target = k ? Math.min(1.6, Math.abs(dy) / k / 12) : 0;
      energy += (target - energy) * Math.min(1, (target > energy ? 0.35 : 0.1) * k);
      if (ctx) drawSnow(k, dy);
      follow(y);
      // Adaptive load: if frames run long for a sustained second, thin the snow by a fifth.
      sampleTime += dt; if (dt > 22) slowTime += dt;
      if (sampleTime > 1000) {
        if (slowTime > 400 && flakes.length > 30) flakes.length = Math.round(flakes.length * 0.8);
        sampleTime = slowTime = 0;
      }
      if (energy < 0.01 && now - lastScrollAt > 200) { running = false; energy = 0; return; }
      frame = requestAnimationFrame(loop);
    };
    const wake = () => {
      lastScrollAt = performance.now();
      if (!running && !reduceMotion && !document.hidden) { running = true; last = 0; frame = requestAnimationFrame(loop); }
    };

    resize();
    if (ctx) drawSnow(0, 0); // still snow on load; it only falls once the page scrolls
    follow(window.scrollY);
    window.addEventListener('scroll', wake, { passive: true });
    let t;
    window.addEventListener('resize', () => { clearTimeout(t); t = setTimeout(() => { resize(); if (ctx) drawSnow(0, 0); heroP = -1; aur = vis = ''; follow(window.scrollY); }, 150); });
    document.addEventListener('visibilitychange', () => { if (document.hidden && running) { running = false; cancelAnimationFrame(frame); energy = 0; } });
  }

  /* ---------- Buy box: two-option variant picker + gallery ---------- */
  function initBuy() {
    $$('[data-vx-buy]').forEach((box) => {
      const dataEl = $('[data-vx-variants]', box);
      if (!dataEl) return;
      let variants;
      try { variants = JSON.parse(dataEl.textContent); } catch (e) { return; }
      const input = $('[data-vx-variant]', box);
      const priceEl = $('[data-vx-price]', box);
      const compareEl = $('[data-vx-compare]', box);
      const cta = $('[data-vx-atc-btn]', box);
      const mainWrap = $('[data-vx-gallery-main]', box);
      const groups = $$('[data-vx-opt]', box);
      const thumbs = $$('[data-vx-thumb]', box);
      const photos = $$('template[data-vx-img]', box);
      const selected = groups.map((g) => {
        const on = $('.vx-chip.is-active', g);
        return on ? on.getAttribute('data-value') : null;
      });
      const firstImg = mainWrap && $('img', mainWrap);
      let currentId = firstImg ? firstImg.getAttribute('data-vx-image-id') : null;

      const find = (sel) => variants.find((v) => v.options.every((o, i) => o === sel[i]));

      // Swap the main photo by cloning its inert <template> (matched by image id): the old photo fades,
      // the new one decodes off-screen, then replaces it and fades in. A newer swap cancels an older one.
      const swapImage = (id) => {
        if (!mainWrap || !id || id === currentId) return;
        const tpl = photos.find((t) => t.getAttribute('data-vx-img') === id);
        const fresh = tpl && document.importNode(tpl.content, true).querySelector('img');
        if (!fresh) return;
        currentId = id;
        const old = $('img', mainWrap);
        if (old) old.classList.add('is-swapping');
        fresh.classList.add('is-swapping');
        const show = () => {
          if (currentId !== id) return;
          const current = $('img', mainWrap);
          if (current) current.replaceWith(fresh); else mainWrap.prepend(fresh);
          requestAnimationFrame(() => requestAnimationFrame(() => fresh.classList.remove('is-swapping')));
        };
        (fresh.decode ? fresh.decode() : Promise.resolve()).then(show, show);
        thumbs.forEach((t) => t.classList.toggle('is-active', t.getAttribute('data-image-id') === id));
      };

      const refresh = (initial) => {
        // The last option (e.g. Size) is disabled where no in-stock variant matches the earlier
        // choices. Earlier options (e.g. Color) stay clickable; picking one snaps the rest to a match.
        groups.forEach((g, gi) => {
          const isLast = gi === groups.length - 1;
          $$('.vx-chip', g).forEach((chip) => {
            if (!isLast) return;
            const trial = selected.slice();
            trial[gi] = chip.getAttribute('data-value');
            const v = find(trial);
            chip.disabled = !v || !v.available;
            chip.classList.toggle('is-unavailable', chip.disabled);
          });
          const label = $('[data-vx-opt-label]', g);
          if (label) label.textContent = selected[gi] || '';
        });
        const v = find(selected);
        if (v) {
          input.value = v.id;
          if (priceEl) { priceEl.textContent = v.price_formatted || formatMoney(v.price); priceEl.classList.remove('is-ticking'); void priceEl.offsetWidth; priceEl.classList.add('is-ticking'); }
          if (compareEl) { compareEl.hidden = !(v.compare_at_price > v.price); compareEl.textContent = v.compare_at_price ? (v.compare_formatted || formatMoney(v.compare_at_price)) : ''; }
          if (cta) { cta.disabled = !v.available; cta.textContent = v.available ? cta.getAttribute('data-label') : 'Sold Out'; }
          if (v.image_id && !initial) swapImage(v.image_id);
        } else if (cta) {
          cta.disabled = true; cta.textContent = 'Unavailable';
        }
      };

      groups.forEach((g, gi) => {
        $$('.vx-chip', g).forEach((chip) => {
          chip.addEventListener('click', () => {
            selected[gi] = chip.getAttribute('data-value');
            $$('.vx-chip', g).forEach((c) => {
              c.classList.toggle('is-active', c === chip);
              c.setAttribute('aria-pressed', String(c === chip));
            });
            // If this combination doesn't exist, move the other option to the nearest value that does
            // (e.g. 6XL -> 3XL), preferring in-stock variants and, on a tie, the larger size.
            const other = gi === 0 ? 1 : 0;
            if (!find(selected) && groups[other]) {
              const chips = $$('.vx-chip', groups[other]);
              const cur = chips.findIndex((c) => c.getAttribute('data-value') === selected[other]);
              let best = null, bestScore = Infinity;
              chips.forEach((c, ci) => {
                const trial = selected.slice();
                trial[other] = c.getAttribute('data-value');
                const v = find(trial);
                if (!v) return;
                const score = (v.available ? 0 : 1000) + Math.abs(ci - cur) + (ci < cur ? 0.1 : 0);
                if (score < bestScore) { bestScore = score; best = trial[other]; }
              });
              if (best !== null) {
                selected[other] = best;
                chips.forEach((c) => {
                  const on = c.getAttribute('data-value') === best;
                  c.classList.toggle('is-active', on);
                  c.setAttribute('aria-pressed', String(on));
                });
              }
            }
            refresh();
          });
        });
      });

      thumbs.forEach((t) => t.addEventListener('click', () => swapImage(t.getAttribute('data-image-id'))));
      refresh(true);
    });
  }

  /* ---------- Size guide: cm / inches toggle (the table shows cm without JS) ---------- */
  function initUnits() {
    const group = $('[data-vx-units]');
    const table = $('[data-vx-sizes]');
    if (!group || !table) return;
    group.hidden = false;
    const btns = $$('[data-vx-unit]', group);
    const set = (unit) => {
      table.classList.toggle('is-in', unit === 'in');
      btns.forEach((b) => {
        const on = b.getAttribute('data-vx-unit') === unit;
        b.classList.toggle('is-active', on);
        b.setAttribute('aria-pressed', String(on));
      });
    };
    btns.forEach((b) => b.addEventListener('click', () => set(b.getAttribute('data-vx-unit'))));
  }

  /* ---------- Country picker: switching country reloads with that market's currency ---------- */
  function initLocale() {
    $$('[data-vx-locale-select]').forEach((sel) => sel.addEventListener('change', () => sel.form && sel.form.submit()));
  }

  initMotion();
  initBuy();
  initUnits();
  initLocale();
})();
