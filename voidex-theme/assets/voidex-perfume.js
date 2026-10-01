/* VOIDEX — Royal Black & Gold perfume landing behaviour.
   Loaded (defer) only by layout/voidex-perfume.liquid. Booting cancels the layout's
   3s failsafe; if this file never runs, the page stays fully visible and every
   add-to-cart form still posts natively to /cart/add. */
(function () {
  'use strict';

  const root = document.documentElement;
  window.__vxBooted = true;
  clearTimeout(window.__vxFailsafe);
  root.classList.add('vx-ready');

  const VX = window.VX || { routes: { root: '/', cart: '/cart', cartAdd: '/cart/add' }, moneyFormat: '${{amount}}' };
  const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = (sel, ctx) => (ctx || document).querySelector(sel);
  const $$ = (sel, ctx) => Array.prototype.slice.call((ctx || document).querySelectorAll(sel));
  const restart = (el, cls) => { el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls); };

  /* ---------- Money (mirrors Shopify's money_format placeholders) ---------- */
  function formatMoney(cents) {
    const fmt = VX.moneyFormat || '${{amount}}';
    const delimit = (precision, thousands, decimal) => {
      const parts = (cents / 100).toFixed(precision).split('.');
      return parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, thousands) + (parts[1] ? decimal + parts[1] : '');
    };
    return fmt.replace(/\{\{\s*(\w+)\s*\}\}/, (_, key) => {
      switch (key) {
        case 'amount_no_decimals': return delimit(0, ',', '.');
        case 'amount_with_comma_separator': return delimit(2, '.', ',');
        case 'amount_no_decimals_with_comma_separator': return delimit(0, '.', ',');
        case 'amount_with_apostrophe_separator': return delimit(2, "'", '.');
        default: return delimit(2, ',', '.');
      }
    });
  }

  /* ---------- Cart helpers ---------- */
  function setCartCount(count) {
    $$('[data-vx-cart-count]').forEach((el) => {
      el.textContent = count;
      el.hidden = count === 0;
      if (count > 0) restart(el, 'is-bumped');
    });
  }

  function refreshCart() {
    return fetch(VX.routes.cart + '.js', { headers: { Accept: 'application/json' }, credentials: 'same-origin' })
      .then((r) => r.json())
      .then((cart) => { setCartCount(cart.item_count); return cart; });
  }

  function addItems(items) {
    return fetch(VX.routes.cartAdd + '.js', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
      body: JSON.stringify({ items: items })
    }).then((r) =>
      r.json().catch(() => ({})).then((data) => {
        if (!r.ok) {
          const err = new Error(data.description || data.message || 'Sorry — that could not be added to your cart.');
          err.cartError = true;
          throw err;
        }
        return refreshCart();
      })
    );
  }

  const toastEl = $('[data-vx-toast]');
  let toastTimer;
  function toast(message, isError) {
    if (!toastEl) return;
    $('[data-vx-toast-msg]', toastEl).textContent = message;
    toastEl.classList.toggle('is-error', !!isError);
    toastEl.hidden = false;
    restart(toastEl, 'is-in');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { toastEl.hidden = true; }, 5000);
  }

  /* ---------- Scroll progress + header state ---------- */
  function initScroll() {
    const bar = $('[data-vx-progress]');
    const header = $('[data-vx-header]');
    let queued = false;
    const update = () => {
      queued = false;
      const max = root.scrollHeight - window.innerHeight;
      const progress = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
      if (bar) bar.style.transform = 'scaleX(' + progress.toFixed(4) + ')';
      if (header) header.classList.toggle('is-scrolled', window.scrollY > 12);
    };
    window.addEventListener('scroll', () => {
      if (!queued) { queued = true; requestAnimationFrame(update); }
    }, { passive: true });
    window.addEventListener('resize', update);
    update();
  }

  /* ---------- Floating gold particles (canvas) ---------- */
  function initParticles() {
    const canvas = $('[data-vx-particles]');
    if (!canvas || !canvas.getContext) return;
    const ctx = canvas.getContext('2d');
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let w = 0, h = 0, dots = [], frame = 0, running = false;

    const resize = () => {
      w = window.innerWidth; h = window.innerHeight;
      canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const count = Math.round(Math.min(70, Math.max(24, (w * h) / 24000)));
      dots = [];
      for (let i = 0; i < count; i++) {
        dots.push({
          x: Math.random() * w, y: Math.random() * h,
          r: Math.random() * 1.8 + 0.5,
          vy: Math.random() * 0.45 + 0.1, vx: (Math.random() - 0.5) * 0.3,
          a: Math.random() * 0.5 + 0.15, phase: Math.random() * Math.PI * 2
        });
      }
    };
    const draw = (move) => {
      ctx.clearRect(0, 0, w, h);
      for (let i = 0; i < dots.length; i++) {
        const p = dots[i];
        if (move) {
          p.y -= p.vy; p.x += p.vx; p.phase += 0.02;
          if (p.y < -4) { p.y = h + 4; p.x = Math.random() * w; }
          if (p.x < -4) p.x = w + 4; else if (p.x > w + 4) p.x = -4;
        }
        const alpha = p.a * (0.7 + 0.3 * Math.sin(p.phase));
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(212, 175, 55, ' + alpha.toFixed(3) + ')';
        ctx.fill();
      }
    };
    const loop = () => { draw(true); frame = requestAnimationFrame(loop); };
    const start = () => { if (!running && !reduceMotion) { running = true; frame = requestAnimationFrame(loop); } };
    const stop = () => { running = false; cancelAnimationFrame(frame); };

    resize(); draw(false); start();
    let resizeTimer;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => { resize(); draw(false); }, 150);
    });
    document.addEventListener('visibilitychange', () => (document.hidden ? stop() : start()));
  }

  /* ---------- Scroll reveals + stat counters ---------- */
  function countUp(el) {
    const raw = el.getAttribute('data-vx-count');
    const target = parseFloat(raw);
    if (isNaN(target) || reduceMotion) return;
    const decimals = (raw.split('.')[1] || '').length;
    const start = performance.now();
    const duration = 1600;
    const tick = (now) => {
      const t = Math.max(0, Math.min(1, (now - start) / duration)); // rAF time can precede `start`
      el.textContent = (target * (1 - Math.pow(1 - t, 3))).toFixed(decimals);
      if (t < 1) requestAnimationFrame(tick); else el.textContent = raw;
    };
    el.textContent = (0).toFixed(decimals);
    requestAnimationFrame(tick);
  }

  function initReveals() {
    const items = $$('.vx-reveal');
    const show = (el) => {
      el.classList.add('is-visible');
      $$('[data-vx-count]', el).forEach(countUp);
      // Once the entrance has played, hand the element back its normal hover transitions.
      setTimeout(() => el.classList.add('is-settled'), 1700);
    };
    if (!root.classList.contains('vx-motion') || !('IntersectionObserver' in window)) {
      items.forEach((el) => el.classList.add('is-visible', 'is-settled'));
      return;
    }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) { show(entry.target); io.unobserve(entry.target); }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    items.forEach((el) => io.observe(el));
  }

  /* ---------- Mobile menu ---------- */
  function initMenu() {
    const burger = $('[data-vx-burger]');
    const panel = $('[data-vx-mobile-nav]');
    if (!burger || !panel) return;
    const set = (open) => {
      burger.setAttribute('aria-expanded', String(open));
      burger.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
      panel.hidden = !open;
      if (open) restart(panel, 'is-open');
    };
    burger.addEventListener('click', () => set(burger.getAttribute('aria-expanded') !== 'true'));
    panel.addEventListener('click', (e) => { if (e.target.closest('a')) set(false); });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && burger.getAttribute('aria-expanded') === 'true') { set(false); burger.focus(); }
    });
    if (window.matchMedia) {
      const wide = window.matchMedia('(min-width: 991px)');
      const onChange = (e) => { if (e.matches) set(false); };
      wide.addEventListener ? wide.addEventListener('change', onChange) : wide.addListener(onChange);
    }
  }

  /* ---------- Category filters ---------- */
  function initFilters() {
    const grid = $('[data-vx-grid]');
    const buttons = $$('[data-vx-filter]');
    const empty = $('[data-vx-grid-empty]');
    const apply = (category) => {
      buttons.forEach((b) => {
        const on = b.getAttribute('data-vx-filter') === category;
        b.classList.toggle('is-active', on);
        b.setAttribute('aria-pressed', String(on));
      });
      if (!grid) return;
      let shown = 0;
      $$('[data-vx-card]', grid).forEach((card) => {
        const match = category === 'all' || card.getAttribute('data-category') === category;
        card.classList.toggle('is-filtered-out', !match);
        if (match) {
          shown++;
          card.classList.add('is-visible', 'is-settled');
          restart(card, 'is-filtered-in');
        }
      });
      if (empty) empty.hidden = shown > 0;
    };
    buttons.forEach((b) => b.addEventListener('click', () => apply(b.getAttribute('data-vx-filter'))));
    $$('[data-vx-filter-link]').forEach((a) => a.addEventListener('click', () => apply(a.getAttribute('data-vx-filter-link'))));
  }

  /* ---------- Product cards: size selector, mouse glow, add to cart ---------- */
  function initCards() {
    $$('[data-vx-card]').forEach((card) => {
      const media = $('[data-vx-glow]', card);
      if (media) {
        media.addEventListener('pointermove', (e) => {
          const r = media.getBoundingClientRect();
          media.style.setProperty('--mx', (((e.clientX - r.left) / r.width) * 100).toFixed(1) + '%');
          media.style.setProperty('--my', (((e.clientY - r.top) / r.height) * 100).toFixed(1) + '%');
        });
      }

      const input = $('[data-vx-variant]', card);
      const price = $('[data-vx-price]', card);
      const from = $('[data-vx-from]', card);
      const cta = $('[data-vx-atc-btn]', card);
      const sizes = $$('[data-vx-size]', card);
      sizes.forEach((btn) => {
        btn.addEventListener('click', () => {
          sizes.forEach((o) => {
            o.classList.toggle('is-active', o === btn);
            o.setAttribute('aria-pressed', String(o === btn));
          });
          if (input) input.value = btn.getAttribute('data-variant-id');
          if (price) { price.textContent = btn.getAttribute('data-price'); restart(price, 'is-ticking'); }
          if (from) from.textContent = btn.getAttribute('data-size');
          if (cta) { cta.disabled = btn.disabled; cta.textContent = btn.disabled ? 'Sold Out' : 'Add to Cart'; }
        });
      });
    });

    $$('[data-vx-atc]').forEach((form) => {
      form.addEventListener('submit', (e) => {
        if (!window.fetch) return; // native POST to /cart/add
        e.preventDefault();
        const btn = $('[data-vx-atc-btn]', form);
        const card = form.closest('[data-vx-card]');
        const active = $('[data-vx-size].is-active', form);
        const name = card ? $('.vx-card__name', card).textContent.trim() : 'Item';
        const size = active ? active.getAttribute('data-size') : '';
        const label = btn.textContent;
        btn.disabled = true;
        btn.classList.add('is-loading');
        addItems([{ id: Number($('[data-vx-variant]', form).value), quantity: 1 }])
          .then(() => {
            btn.classList.remove('is-loading');
            btn.classList.add('is-added');
            btn.textContent = 'Added' + (size ? ' ' + size : '') + ' ✓';
            toast(name + (size ? ' (' + size + ')' : '') + ' added to your cart');
            setTimeout(() => {
              btn.classList.remove('is-added');
              btn.textContent = label;
              btn.disabled = false;
            }, 2200);
          })
          .catch((err) => {
            btn.classList.remove('is-loading');
            btn.disabled = false;
            if (err && err.cartError) toast(err.message, true);
            else form.submit(); // network failure: fall back to the plain form post
          });
      });
    });
  }

  /* ---------- Bundle builder ---------- */
  function initBundle() {
    const box = $('[data-vx-bundle]');
    const dataEl = box && $('[data-vx-bundle-data]', box);
    if (!dataEl) return;
    let products;
    try { products = JSON.parse(dataEl.textContent); } catch (e) { return; }
    if (!products.length) return;

    const discount = Number(box.getAttribute('data-discount')) || 0;
    const code = box.getAttribute('data-code') || '';
    const slots = $$('[data-vx-slot]', box);
    const picker = $('[data-vx-picker]', box);
    const list = $('[data-vx-picker-list]', box);
    const sizeRow = $('[data-vx-picker-sizes]', box);
    const pickerTitle = $('[data-vx-picker-title]', box);
    const oldEl = $('[data-vx-bundle-old]', box);
    const newEl = $('[data-vx-bundle-new]', box);
    const saveEl = $('[data-vx-bundle-save]', box);
    const hintEl = $('[data-vx-bundle-hint]', box);
    const addBtn = $('[data-vx-bundle-add]', box);
    const status = $('[data-vx-bundle-status]', box);
    const picks = [null, null, null];
    let current = 0;

    const el = (tag, cls, text) => {
      const n = document.createElement(tag);
      if (cls) n.className = cls;
      if (text != null) n.textContent = text;
      return n;
    };

    products.forEach((p) => {
      const available = p.variants.some((v) => v.available);
      const min = Math.min.apply(null, p.variants.map((v) => v.price));
      const opt = el('button', 'vx-option');
      opt.type = 'button';
      opt.disabled = !available;
      opt.style.setProperty('--vx-tint', p.tint);
      opt.setAttribute('data-product-id', p.id);
      const bottle = el('span', 'vx-mini-bottle');
      bottle.setAttribute('aria-hidden', 'true');
      const text = el('span');
      text.appendChild(el('span', 'vx-option__name', p.name));
      text.appendChild(el('span', 'vx-option__meta', available ? 'From ' + formatMoney(min) : 'Sold out'));
      opt.appendChild(bottle);
      opt.appendChild(text);
      opt.addEventListener('click', () => chooseProduct(p, opt));
      list.appendChild(opt);
    });

    function openPicker(i) {
      current = i;
      slots.forEach((s, j) => s.classList.toggle('is-active', j === i));
      pickerTitle.textContent = 'Choose scent ' + (i + 1);
      $$('.is-chosen', list).forEach((o) => o.classList.remove('is-chosen'));
      sizeRow.hidden = true;
      sizeRow.innerHTML = '';
      picker.hidden = false;
      const first = $('.vx-option:not(:disabled)', list);
      if (first) first.focus({ preventScroll: true });
    }

    function closePicker() {
      picker.hidden = true;
      slots.forEach((s) => s.classList.remove('is-active'));
    }

    function chooseProduct(p, opt) {
      $$('.is-chosen', list).forEach((o) => o.classList.remove('is-chosen'));
      opt.classList.add('is-chosen');
      sizeRow.innerHTML = '';
      p.variants.forEach((v) => {
        const b = el('button', 'vx-picker__size', v.size + ' — ' + formatMoney(v.price));
        b.type = 'button';
        b.disabled = !v.available;
        b.setAttribute('data-variant-id', v.id);
        b.addEventListener('click', () => pickSize(p, v));
        sizeRow.appendChild(b);
      });
      sizeRow.hidden = false;
      const first = $('button:not(:disabled)', sizeRow);
      if (first) first.focus({ preventScroll: true });
    }

    function pickSize(p, v) {
      picks[current] = { p: p, v: v };
      renderSlots();
      update();
      const next = picks.indexOf(null);
      if (next > -1) openPicker(next);
      else { closePicker(); addBtn.focus({ preventScroll: true }); }
    }

    function renderSlots() {
      slots.forEach((slot, i) => {
        const pick = $('[data-vx-slot-pick]', slot);
        const remove = $('[data-vx-slot-remove]', slot);
        const sel = picks[i];
        pick.innerHTML = '';
        if (sel) {
          slot.style.setProperty('--vx-tint', sel.p.tint);
          const name = el('span', 'vx-slot__name');
          name.appendChild(el('span', 'vx-slot__swatch'));
          name.appendChild(document.createTextNode(sel.p.name));
          pick.appendChild(name);
          pick.appendChild(el('span', 'vx-slot__size', sel.v.size + ' — ' + formatMoney(sel.v.price)));
          pick.setAttribute('aria-label', 'Scent ' + (i + 1) + ': ' + sel.p.name + ', ' + sel.v.size + '. Change');
          remove.hidden = false;
          if (!slot.classList.contains('is-filled')) slot.classList.add('is-filled');
        } else {
          slot.classList.remove('is-filled');
          pick.appendChild(el('span', 'vx-slot__empty', '+ Pick Scent ' + (i + 1)));
          pick.removeAttribute('aria-label');
          remove.hidden = true;
        }
      });
    }

    function update() {
      const filled = picks.filter(Boolean);
      const total = filled.reduce((sum, s) => sum + s.v.price, 0);
      const complete = filled.length === 3;
      const final = complete ? Math.round((total * (100 - discount)) / 100) : total;
      newEl.hidden = filled.length === 0;
      newEl.textContent = formatMoney(final);
      restart(newEl, 'is-ticking');
      oldEl.textContent = formatMoney(total);
      oldEl.hidden = !complete;
      saveEl.hidden = !complete;
      saveEl.textContent = 'Save ' + discount + '% · ' + formatMoney(total - final);
      const left = 3 - filled.length;
      hintEl.hidden = complete;
      hintEl.textContent = left === 3
        ? 'Pick 3 scents to unlock ' + discount + '% off'
        : 'Add ' + left + ' more scent' + (left > 1 ? 's' : '') + ' to unlock ' + discount + '% off';
      addBtn.disabled = !complete;
      status.textContent = '';
      status.classList.remove('is-error');
    }

    slots.forEach((slot, i) => {
      $('[data-vx-slot-pick]', slot).addEventListener('click', () => openPicker(i));
      $('[data-vx-slot-remove]', slot).addEventListener('click', () => {
        picks[i] = null;
        renderSlots();
        update();
      });
    });
    $('[data-vx-picker-close]', box).addEventListener('click', closePicker);

    addBtn.addEventListener('click', () => {
      const merged = {};
      picks.forEach((s) => { merged[s.v.id] = (merged[s.v.id] || 0) + 1; });
      const items = Object.keys(merged).map((id) => ({ id: Number(id), quantity: merged[id] }));
      addBtn.disabled = true;
      status.classList.remove('is-error');
      status.textContent = 'Adding your bundle…';
      addItems(items)
        .then(() => {
          status.textContent = 'Bundle added — applying ' + discount + '% off…';
          const base = VX.routes.root && VX.routes.root !== '/' ? VX.routes.root : '';
          window.location.href = base + '/discount/' + encodeURIComponent(code) + '?redirect=' + encodeURIComponent(VX.routes.cart);
        })
        .catch((err) => {
          status.textContent = (err && err.message) || 'Sorry — the bundle could not be added.';
          status.classList.add('is-error');
          addBtn.disabled = false;
        });
    });

    update();
  }

  /* ---------- FAQ accordion ---------- */
  function initFaq() {
    $$('[data-vx-faq]').forEach((item) => {
      const q = $('.vx-faq__q', item);
      q.addEventListener('click', () => {
        const open = q.getAttribute('aria-expanded') !== 'true';
        q.setAttribute('aria-expanded', String(open));
        item.classList.toggle('is-open', open);
      });
    });
  }

  initScroll();
  initParticles();
  initMenu();
  initFilters();
  initCards();
  initBundle();
  initFaq();
  initReveals();
  window.addEventListener('pageshow', (e) => { if (e.persisted) refreshCart().catch(() => {}); });
})();
