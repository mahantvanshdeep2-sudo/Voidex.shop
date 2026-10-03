/* VOIDEX — Winter layer behaviour: snowfall canvas, hero parallax, heated-jacket
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

  /* ---------- Snowfall (depth layers, gentle sway, wind follows the pointer) ----------
     Built for a steady frame rate: movement is scaled by real elapsed time (same speed at 60, 90 or
     120 Hz, and no lurch after a slow frame), flakes are stamped from a few pre-rendered sprites instead
     of building a path and a colour string per flake per frame, the canvas resolution is capped, and if
     the device still can't keep up the flake count drops until it can. */
  function initSnow() {
    const canvas = $('[data-vx-snow]');
    if (!canvas || !canvas.getContext) return;
    const ctx = canvas.getContext('2d', { alpha: true });
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    const SIZES = [1.2, 1.8, 2.4, 3.1, 3.9];
    // Soft flake: white core with a sky-blue rim, so it reads on white snow and on the blue glow alike.
    const sprites = SIZES.map((r) => {
      const c = document.createElement('canvas');
      const px = Math.ceil(r * 2 * dpr) + 2;
      c.width = c.height = px;
      const g = c.getContext('2d');
      const grad = g.createRadialGradient(px / 2, px / 2, 0, px / 2, px / 2, px / 2);
      grad.addColorStop(0, 'rgba(255, 255, 255, 1)');
      grad.addColorStop(0.45, 'rgba(168, 214, 246, 0.95)');
      grad.addColorStop(1, 'rgba(110, 175, 228, 0)');
      g.fillStyle = grad; g.fillRect(0, 0, px, px);
      return { c, size: px / dpr };
    });
    let w = 0, h = 0, flakes = [], target = 0, frame = 0, running = false, last = 0;
    let wind = 0, windTarget = 0, slowTime = 0, sampleTime = 0;

    const make = (anywhere) => {
      const depth = Math.random();
      return {
        x: Math.random() * w,
        y: anywhere ? Math.random() * h : -8,
        s: sprites[Math.min(SIZES.length - 1, Math.floor(depth * SIZES.length))],
        vy: 0.25 + depth * 0.95,
        sway: 0.4 + Math.random() * 1.1,
        phase: Math.random() * Math.PI * 2,
        a: 0.35 + depth * 0.6
      };
    };
    const resize = () => {
      w = window.innerWidth; h = window.innerHeight;
      canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      target = Math.round(Math.min(140, Math.max(45, (w * h) / 12000)));
      flakes = [];
      for (let i = 0; i < target; i++) flakes.push(make(true));
    };
    const draw = (k) => {
      ctx.clearRect(0, 0, w, h);
      wind += (windTarget - wind) * Math.min(1, 0.02 * k);
      for (let i = 0; i < flakes.length; i++) {
        let f = flakes[i];
        if (k) {
          f.phase += 0.012 * f.sway * k;
          f.y += f.vy * k;
          f.x += (Math.sin(f.phase) * 0.35 * f.sway + wind * f.vy) * k;
          if (f.y > h + 8) { f = flakes[i] = make(false); }
          if (f.x < -8) f.x = w + 8; else if (f.x > w + 8) f.x = -8;
        }
        const half = f.s.size / 2;
        ctx.globalAlpha = f.a;
        ctx.drawImage(f.s.c, f.x - half, f.y - half, f.s.size, f.s.size);
      }
      ctx.globalAlpha = 1;
    };
    const loop = (now) => {
      // k = elapsed time in 60 Hz frames; capped so a stalled tab doesn't teleport the snow.
      const dt = Math.min(50, now - (last || now)); last = now;
      draw(dt / (1000 / 60));
      // Adaptive load: if frames run long for a sustained second, thin the snow by a fifth.
      sampleTime += dt; if (dt > 22) slowTime += dt;
      if (sampleTime > 1000) {
        if (slowTime > 400 && flakes.length > 30) flakes.length = Math.round(flakes.length * 0.8);
        sampleTime = slowTime = 0;
      }
      frame = requestAnimationFrame(loop);
    };
    const start = () => { if (!running && !reduceMotion) { running = true; last = 0; frame = requestAnimationFrame(loop); } };
    const stop = () => { running = false; cancelAnimationFrame(frame); };

    resize(); draw(0); start();
    let t;
    window.addEventListener('resize', () => { clearTimeout(t); t = setTimeout(() => { resize(); draw(0); }, 150); });
    window.addEventListener('pointermove', (e) => { windTarget = ((e.clientX / Math.max(w, 1)) - 0.5) * 0.9; }, { passive: true });
    document.addEventListener('visibilitychange', () => (document.hidden ? stop() : start()));
  }

  /* ---------- Hero parallax (pointer on desktop, scroll everywhere) ---------- */
  function initParallax() {
    const visual = $('[data-vx-parallax]');
    if (!visual || reduceMotion || !root.classList.contains('vx-motion')) return;
    let px = 0, py = 0, sy = 0, queued = false;
    const apply = () => {
      queued = false;
      visual.style.transform = 'translate3d(' + (px * 14).toFixed(1) + 'px,' + (py * 14 + sy * -0.08).toFixed(1) + 'px,0) rotate(' + (px * 2).toFixed(2) + 'deg)';
    };
    const queue = () => { if (!queued) { queued = true; requestAnimationFrame(apply); } };
    window.addEventListener('pointermove', (e) => {
      if (e.pointerType && e.pointerType !== 'mouse') return;
      px = e.clientX / window.innerWidth - 0.5; py = e.clientY / window.innerHeight - 0.5; queue();
    }, { passive: true });
    window.addEventListener('scroll', () => { sy = Math.min(window.scrollY, 800); queue(); }, { passive: true });
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

  initSnow();
  initParallax();
  initBuy();
  initUnits();
  initLocale();
})();
