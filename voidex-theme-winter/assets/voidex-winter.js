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

  /* ---------- Snowfall (three depth layers, gentle sway, wind follows the pointer) ---------- */
  function initSnow() {
    const canvas = $('[data-vx-snow]');
    if (!canvas || !canvas.getContext) return;
    const ctx = canvas.getContext('2d');
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let w = 0, h = 0, flakes = [], frame = 0, running = false, wind = 0, windTarget = 0;

    const make = (anywhere) => {
      const depth = Math.random();
      return {
        x: Math.random() * w,
        y: anywhere ? Math.random() * h : -10,
        r: 0.6 + depth * 2.4,
        vy: 0.25 + depth * 0.95,
        sway: 0.4 + Math.random() * 1.1,
        phase: Math.random() * Math.PI * 2,
        a: 0.25 + depth * 0.6
      };
    };
    const resize = () => {
      w = window.innerWidth; h = window.innerHeight;
      canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const count = Math.round(Math.min(150, Math.max(50, (w * h) / 11000)));
      flakes = [];
      for (let i = 0; i < count; i++) flakes.push(make(true));
    };
    const draw = (move) => {
      ctx.clearRect(0, 0, w, h);
      wind += (windTarget - wind) * 0.02;
      for (let i = 0; i < flakes.length; i++) {
        const f = flakes[i];
        if (move) {
          f.phase += 0.012 * f.sway;
          f.y += f.vy;
          f.x += Math.sin(f.phase) * 0.35 * f.sway + wind * f.vy;
          if (f.y > h + 6) { flakes[i] = make(false); continue; }
          if (f.x < -6) f.x = w + 6; else if (f.x > w + 6) f.x = -6;
        }
        ctx.beginPath();
        ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(235, 247, 255, ' + f.a.toFixed(3) + ')';
        ctx.fill();
      }
    };
    const loop = () => { draw(true); frame = requestAnimationFrame(loop); };
    const start = () => { if (!running && !reduceMotion) { running = true; frame = requestAnimationFrame(loop); } };
    const stop = () => { running = false; cancelAnimationFrame(frame); };

    resize(); draw(false); start();
    let t;
    window.addEventListener('resize', () => { clearTimeout(t); t = setTimeout(() => { resize(); draw(false); }, 150); });
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

      const refresh = () => {
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
          if (priceEl) { priceEl.textContent = formatMoney(v.price); priceEl.classList.remove('is-ticking'); void priceEl.offsetWidth; priceEl.classList.add('is-ticking'); }
          if (compareEl) { compareEl.hidden = !(v.compare_at_price > v.price); compareEl.textContent = v.compare_at_price ? formatMoney(v.compare_at_price) : ''; }
          if (cta) { cta.disabled = !v.available; cta.textContent = v.available ? cta.getAttribute('data-label') : 'Sold Out'; }
          if (v.image_id) swapImage(v.image_id);
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
      refresh();
    });
  }

  initSnow();
  initParallax();
  initBuy();
})();
