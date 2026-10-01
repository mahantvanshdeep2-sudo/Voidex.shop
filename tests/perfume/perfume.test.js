// Chromium checks for the VOIDEX perfume landing, run against the real theme assets rendered
// by build.js with the store's real product data. Cart endpoints are mocked so add-to-cart
// requests can be inspected without touching the live store.  Usage: node build.js && node perfume.test.js
const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright-core');

const SITE = path.join(__dirname, 'site');
const SHOTS = path.join(__dirname, 'shots');
const CHROME = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
fs.mkdirSync(SHOTS, { recursive: true });

let pass = 0, fail = 0;
const check = (name, ok, detail = '') => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail !== '' ? '  -> ' + detail : ''}`);
  ok ? pass++ : fail++;
};

// ---- tiny server with mocked Shopify cart endpoints ----
const state = { cart: [], adds: [], discount: null };
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.woff2': 'font/woff2' };
const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://x');
  if (url.pathname === '/cart/add.js' && req.method === 'POST') {
    let body = '';
    req.on('data', (c) => (body += c));
    req.on('end', () => {
      const data = JSON.parse(body);
      state.adds.push(data);
      if (data.items.some((i) => i.id === 1)) {
        res.writeHead(422, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ status: 422, message: 'Cart Error', description: 'All 1 of this item are in your cart.' }));
      }
      data.items.forEach((i) => state.cart.push(i));
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ items: data.items }));
    });
    return;
  }
  if (url.pathname === '/cart.js') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ item_count: state.cart.reduce((n, i) => n + i.quantity, 0) }));
  }
  if (url.pathname.startsWith('/discount/')) {
    state.discount = url.pathname + url.search;
    res.writeHead(200, { 'Content-Type': 'text/html' });
    return res.end('<p>discount applied</p>');
  }
  const file = path.join(url.pathname.startsWith('/fonts/') ? __dirname : SITE, url.pathname === '/' ? 'index.html' : url.pathname);
  if (!fs.existsSync(file)) { res.writeHead(404); return res.end('nf'); }
  res.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
});

async function newPage(browser, opts = {}) {
  const ctx = await browser.newContext({ viewport: opts.viewport || { width: 1366, height: 860 }, reducedMotion: opts.reducedMotion || 'no-preference', deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error' && !/status of 422/.test(m.text())) errors.push(m.text()); }); // 422 = the deliberate sold-out test
  await page.route('https://fonts.googleapis.com/**', (r) => r.fulfill({ contentType: 'text/css', body: fs.readFileSync(path.join(__dirname, 'fonts/local.css'), 'utf8').replace(/url\(\/fonts\//g, 'url(' + BASE + '/fonts/') }));
  if (opts.init) await page.addInitScript(opts.init);
  if (opts.blockJs) await page.route('**/voidex-perfume.js', (r) => r.abort());
  await page.goto(BASE + (opts.path || '/'), { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready);
  return { ctx, page, errors };
}

async function scrollThrough(page) {
  await page.evaluate(async () => {
    for (let y = 0; y < document.documentElement.scrollHeight; y += 500) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 90));
    }
  });
  await page.waitForTimeout(1900);
}

let BASE;
(async () => {
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  BASE = 'http://127.0.0.1:' + server.address().port;
  const browser = await chromium.launch({ executablePath: CHROME });

  // ================= Desktop =================
  {
    const { ctx, page, errors } = await newPage(browser);
    await page.waitForTimeout(600);

    const boot = await page.evaluate(() => ({
      booted: window.__vxBooted === true,
      motion: document.documentElement.classList.contains('vx-motion'),
      js: document.documentElement.classList.contains('vx-js')
    }));
    check('JS booted, motion on, failsafe cancelled', boot.booted && boot.motion && boot.js, JSON.stringify(boot));

    const fonts = await page.evaluate(async () => { await document.fonts.ready; return ['700 16px "Playfair Display"', '400 16px "Inter"', '400 16px "Cormorant Garamond"'].map((f) => document.fonts.check(f)); });
    check('Playfair Display / Inter / Cormorant Garamond loaded', fonts.every(Boolean), JSON.stringify(fonts));

    const colors = await page.evaluate(() => {
      const cs = (s) => getComputedStyle(document.querySelector(s));
      return { body: cs('body').backgroundColor, gold: getComputedStyle(document.documentElement).getPropertyValue('--gold').trim() };
    });
    check('Background #050505 and gold #d4af37', colors.body === 'rgb(5, 5, 5)' && colors.gold === '#d4af37', JSON.stringify(colors));

    const logo = await page.evaluate(() => {
      const el = document.querySelector('.vx-header .vx-logo');
      const cs = getComputedStyle(el);
      const r = el.getBoundingClientRect();
      return { text: el.textContent.trim(), nowrap: cs.whiteSpace, clip: cs.webkitBackgroundClip || cs.backgroundClip, fill: cs.webkitTextFillColor, overflow: el.scrollWidth > el.clientWidth + 1, height: Math.round(r.height), bg: cs.backgroundImage.slice(0, 15) };
    });
    check('Logo reads VØIDEX, nowrap, gold gradient text, not clipped', logo.text === 'VØIDEX' && logo.nowrap === 'nowrap' && logo.clip === 'text' && logo.bg.startsWith('linear-gradient') && !logo.overflow && logo.height < 40, JSON.stringify(logo));

    const hero = await page.evaluate(() => {
      const h = document.querySelector('.vx-hero__title');
      return { text: h.textContent.trim(), anim: getComputedStyle(h).animationName, gold: !!h.querySelector('.vx-gold-word') };
    });
    check('Hero heading + entrance animation + gold word', hero.text === 'Try Luxury Scents Before You Commit' && hero.anim.includes('vx-hero-in') && hero.gold, JSON.stringify(hero));

    const particles = await page.evaluate(async () => {
      const c = document.querySelector('[data-vx-particles]');
      const ctx = c.getContext('2d');
      const sample = () => { const d = ctx.getImageData(0, 0, c.width, c.height).data; let lit = 0, sum = 0; for (let i = 3; i < d.length; i += 4) if (d[i] > 0) { lit++; sum += i; } return { lit, sum }; };
      const a = sample();
      await new Promise((r) => setTimeout(r, 400));
      const b = sample();
      return { w: c.width, lit: a.lit, moved: a.sum !== b.sum, fixed: getComputedStyle(c).position, pe: getComputedStyle(c).pointerEvents };
    });
    check('Gold particle canvas draws and animates', particles.w > 0 && particles.lit > 50 && particles.moved && particles.fixed === 'fixed' && particles.pe === 'none', JSON.stringify(particles));

    const belowFold = await page.evaluate(() => {
      const el = document.querySelector('#faq .vx-title');
      return parseFloat(getComputedStyle(el).opacity);
    });
    check('Below-fold content starts hidden for reveal', belowFold < 0.05, String(belowFold));

    await page.waitForTimeout(2200); // let the hero entrance + counters settle
    await page.screenshot({ path: path.join(SHOTS, 'desktop-hero.png') });
    const layout = await page.evaluate(() => {
      const mid = (el) => { const r = el.getBoundingClientRect(); return Math.round(r.left + r.width / 2); };
      const vw = document.documentElement.clientWidth / 2;
      const btn = getComputedStyle(document.querySelector('.vx-hero__cta .vx-btn--gold'));
      const sub = document.querySelector('.vx-hero__sub').getBoundingClientRect();
      const cta = document.querySelector('.vx-hero__cta').getBoundingClientRect();
      const stats = document.querySelector('.vx-stats').getBoundingClientRect();
      return {
        offCenter: ['.vx-hero__title', '.vx-hero__sub', '#vx-shop-title', '#vx-shop-title + .vx-sub', '.vx-filters', '#vx-faq-title'].map((s) => Math.abs(mid(document.querySelector(s)) - vw)),
        btnColor: btn.color,
        gaps: [Math.round(cta.top - sub.bottom), Math.round(stats.top - cta.bottom)]
      };
    });
    check('Layout: titles/subtitles/filters centred, hero blocks spaced, black text on gold button', layout.offCenter.every((d) => d <= 2) && layout.btnColor === 'rgb(5, 5, 5)' && layout.gaps.every((g) => g >= 30), JSON.stringify(layout));

    const p0 = await page.evaluate(() => getComputedStyle(document.querySelector('[data-vx-progress]')).transform);
    await scrollThrough(page);
    const p1 = await page.evaluate(() => getComputedStyle(document.querySelector('[data-vx-progress]')).transform);
    check('Scroll progress bar grows with scroll', p0 !== p1 && /matrix\(1, 0, 0, 1|matrix\(0\.9|matrix\(1,/.test(p1), `${p0} -> ${p1}`);

    const reveal = await page.evaluate(() => {
      const all = Array.from(document.querySelectorAll('.vx-reveal'));
      return { total: all.length, hidden: all.filter((e) => parseFloat(getComputedStyle(e).opacity) < 0.99).map((e) => e.className) };
    });
    check('Every section revealed after scrolling', reveal.total > 30 && reveal.hidden.length === 0, `${reveal.total} items, hidden: ${JSON.stringify(reveal.hidden.slice(0, 4))}`);

    const stats = await page.evaluate(() => Array.from(document.querySelectorAll('.vx-stat__num')).map((e) => e.textContent.trim()));
    check('Stat counters finish on real values (4 scents, $2.97, 24hr, 100%)', JSON.stringify(stats) === JSON.stringify(['4', '$2.97', '24hr', '100%']), JSON.stringify(stats));

    // Counter actually animates: fresh page, record every value the 100% stat shows from first paint.
    {
      const rec = await newPage(browser, { init: () => {
        window.__vals = [];
        const poll = () => { const el = document.querySelector('[data-vx-count="100"]'); if (el) window.__vals.push(el.textContent); if (window.__vals.length < 400) requestAnimationFrame(poll); };
        requestAnimationFrame(poll);
      } });
      await rec.page.waitForTimeout(2200);
      const r = await rec.page.evaluate(() => ({ vals: Array.from(new Set(window.__vals)), final: document.querySelector('[data-vx-count="100"]').textContent }));
      const nums = r.vals.map(Number);
      check('Stat counter animates 0 -> 100, never negative', r.vals.length > 5 && r.vals.includes('0') && r.final === '100' && nums.every((n) => n >= 0 && n <= 100), `${r.vals.length} distinct values: ${r.vals.slice(0, 6).join(',')} … final ${r.final}`);
      await rec.ctx.close();
    }
    await page.evaluate(() => window.scrollTo(0, 0));

    // ---- product grid ----
    await page.evaluate(() => document.querySelector('#shop').scrollIntoView());
    await page.waitForTimeout(1900);
    const cards = await page.evaluate(() => Array.from(document.querySelectorAll('[data-vx-card]')).map((c) => ({
      name: c.querySelector('.vx-card__name').textContent.trim(),
      price: c.querySelector('[data-vx-price]').textContent.trim(),
      sizes: Array.from(c.querySelectorAll('[data-vx-size]')).map((b) => b.getAttribute('data-size')),
      variant: c.querySelector('[data-vx-variant]').value,
      action: c.querySelector('form').getAttribute('action'),
      float: getComputedStyle(c.querySelector('.vx-bottle-float')).animationName,
      cap: getComputedStyle(c.querySelector('.vx-bottle__cap')).backgroundImage.slice(0, 15),
      glow: !!c.querySelector('.vx-bottle__glow'),
      label: c.querySelector('.vx-bottle__label').textContent
    })));
    check('4 product cards from the collection', cards.length === 4, cards.map((c) => c.name).join(' | '));
    check('Each card: 2mL/5mL/10mL selector + /cart/add form + real variant id', cards.every((c) => c.sizes.join() === '2mL,5mL,10mL' && c.action === '/cart/add' && /^676168\d+$/.test(c.variant)), JSON.stringify(cards.map((c) => [c.price, c.variant])));
    check('Each card: CSS bottle (gold cap, label, glow) floating', cards.every((c) => c.float === 'vx-float' && c.cap.startsWith('linear-gradient') && c.glow && c.label.length > 2), JSON.stringify(cards.map((c) => c.label)));

    const amber = page.locator('[data-vx-card]').first();
    await amber.locator('[data-vx-size][data-size="5mL"]').click();
    const s5 = await amber.evaluate((c) => ({ price: c.querySelector('[data-vx-price]').textContent, id: c.querySelector('[data-vx-variant]').value, from: c.querySelector('[data-vx-from]').textContent, pressed: c.querySelector('[data-size="5mL"]').getAttribute('aria-pressed') }));
    check('5mL click -> $7.97 and 5mL variant id', s5.price === '$7.97' && s5.id === '67616805748986' && s5.from === '5mL' && s5.pressed === 'true', JSON.stringify(s5));
    await amber.locator('[data-vx-size][data-size="10mL"]').click();
    const s10 = await amber.evaluate((c) => ({ price: c.querySelector('[data-vx-price]').textContent, id: c.querySelector('[data-vx-variant]').value }));
    check('10mL click -> $12.97 and 10mL variant id', s10.price === '$12.97' && s10.id === '67616805781754', JSON.stringify(s10));

    // hover: lift, 360° spin, mouse-follow glow (move away first: the size clicks above already hovered the card)
    await page.mouse.move(5, 5);
    await page.waitForTimeout(1600);
    const box = await amber.locator('.vx-card__media').boundingBox();
    await page.mouse.move(box.x + box.width * 0.25, box.y + box.height * 0.3);
    await page.mouse.move(box.x + box.width * 0.3, box.y + box.height * 0.35);
    await page.waitForTimeout(450);
    const hover = await amber.evaluate((c) => ({
      mx: c.querySelector('.vx-card__media').style.getPropertyValue('--mx'),
      glow: getComputedStyle(c.querySelector('.vx-card__media'), '::after').opacity,
      spin: getComputedStyle(c.querySelector('.vx-bottle')).transform,
      lift: getComputedStyle(c).transform
    }));
    check('Hover: mouse-follow glow tracks pointer', hover.mx !== '' && parseFloat(hover.mx) < 45 && parseFloat(hover.glow) > 0.5, JSON.stringify(hover));
    check('Hover: bottle mid-rotation (rotateY) and card lifted', hover.spin !== 'none' && hover.spin.startsWith('matrix3d') && hover.lift !== 'none', `${hover.spin.slice(0, 40)} / ${hover.lift}`);
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(SHOTS, 'desktop-cards-hover.png') });

    // add to cart (selected 10mL)
    await amber.locator('[data-vx-atc-btn]').click();
    await page.waitForTimeout(500);
    const atc = await page.evaluate(() => ({
      count: document.querySelector('[data-vx-cart-count]').textContent,
      countHidden: document.querySelector('[data-vx-cart-count]').hidden,
      toast: document.querySelector('[data-vx-toast-msg]').textContent,
      toastHidden: document.querySelector('[data-vx-toast]').hidden,
      btn: document.querySelector('[data-vx-card] [data-vx-atc-btn]').textContent
    }));
    check('Add to Cart posts the selected variant (10mL) to /cart/add.js', JSON.stringify(state.adds[0]) === JSON.stringify({ items: [{ id: 67616805781754, quantity: 1 }] }), JSON.stringify(state.adds[0]));
    check('Cart count updates, toast + "Added 10mL ✓" shown', atc.count === '1' && !atc.countHidden && !atc.toastHidden && atc.toast.includes('Amber Noir EDP (10mL)') && atc.btn.includes('Added 10mL'), JSON.stringify(atc));

    // cart error path (422 sold out): forced via a fake variant id
    await page.evaluate(() => { const c = document.querySelectorAll('[data-vx-card]')[1]; c.querySelector('[data-vx-variant]').value = '1'; });
    await page.locator('[data-vx-card]').nth(1).locator('[data-vx-atc-btn]').click();
    await page.waitForTimeout(400);
    const err = await page.evaluate(() => ({ msg: document.querySelector('[data-vx-toast-msg]').textContent, cls: document.querySelector('[data-vx-toast]').className, url: location.pathname }));
    check('Cart error shows Shopify message, stays on page', err.msg.includes('All 1 of this item') && err.cls.includes('is-error') && err.url === '/', JSON.stringify(err));

    // ---- filters ----
    const visibleNames = () => page.evaluate(() => Array.from(document.querySelectorAll('[data-vx-card]')).filter((c) => getComputedStyle(c).display !== 'none').map((c) => c.querySelector('.vx-card__name').textContent.trim()));
    await page.click('[data-vx-filter="women"]');
    const fw = await visibleNames();
    await page.click('[data-vx-filter="men"]');
    const fm = await visibleNames();
    await page.click('[data-vx-filter="unisex"]');
    const fu = await visibleNames();
    await page.click('[data-vx-filter="all"]');
    const fa = await visibleNames();
    check('Filters: Women\'s / Men\'s / Unisex / All', fw.join() === 'Rose Velvet EDP' && fm.join() === 'Citrus Royale EDP' && fu.join() === 'Amber Noir EDP,Oud Wood EDP' && fa.length === 4, `${fw} | ${fm} | ${fu} | ${fa.length}`);
    await page.click('.vx-nav a[data-vx-filter-link="men"]');
    await page.waitForTimeout(900);
    const navFilter = await visibleNames();
    check('Header "Men\'s" link filters the grid', navFilter.join() === 'Citrus Royale EDP', navFilter.join());
    await page.click('[data-vx-filter="all"]');

    // ---- how it works hover lift ----
    await page.evaluate(() => document.querySelector('#how').scrollIntoView());
    await page.waitForTimeout(2000); // let the entrance finish first
    await page.hover('.vx-step >> nth=1');
    await page.waitForTimeout(600);
    const lift = await page.evaluate(() => getComputedStyle(document.querySelectorAll('.vx-step')[1]).transform);
    check('How It Works step lifts on hover', /matrix\(1, 0, 0, 1, 0, -(9|10)/.test(lift), lift);

    // ---- bundle builder ----
    await page.evaluate(() => document.querySelector('#bundle').scrollIntoView());
    await page.waitForTimeout(300);
    const bundleBtn = page.locator('[data-vx-bundle-add]');
    check('Bundle: Add button disabled until 3 picked', await bundleBtn.isDisabled());
    const pick = async (slot, name, size) => {
      await page.click(`[data-vx-slot="${slot}"] [data-vx-slot-pick]`);
      await page.click(`.vx-option:has-text("${name}")`);
      await page.click(`.vx-picker__size:has-text("${size}")`);
      await page.waitForTimeout(150);
    };
    await pick(0, 'Amber Noir', '2mL');
    const partial = await page.evaluate(() => ({ now: document.querySelector('[data-vx-bundle-new]').textContent, hint: document.querySelector('[data-vx-bundle-hint]').textContent, nextOpen: !document.querySelector('[data-vx-picker]').hidden }));
    check('Bundle: live subtotal after 1 pick + picker advances to slot 2', partial.now === '$4.97' && partial.hint.includes('Add 2 more') && partial.nextOpen, JSON.stringify(partial));
    await page.click('.vx-option:has-text("Rose Velvet")');
    await page.click('.vx-picker__size:has-text("10mL")');
    await page.click('.vx-option:has-text("Oud Wood")');
    await page.click('.vx-picker__size:has-text("5mL")');
    await page.waitForTimeout(300);
    const full = await page.evaluate(() => ({
      old: document.querySelector('[data-vx-bundle-old]').textContent,
      now: document.querySelector('[data-vx-bundle-new]').textContent,
      save: document.querySelector('[data-vx-bundle-save]').textContent,
      slots: Array.from(document.querySelectorAll('.vx-slot')).map((s) => s.textContent.replace(/\s+/g, ' ').trim()),
      disabled: document.querySelector('[data-vx-bundle-add]').disabled,
      picker: document.querySelector('[data-vx-picker]').hidden
    }));
    // 4.97 + 8.97 + 8.97 = 22.91 ; x0.70 = 16.037 -> 16.04
    check('Bundle: 3 picks -> $22.91 crossed out, $16.04 (30% off)', full.old === '$22.91' && full.now === '$16.04' && full.save.includes('$6.87') && !full.disabled && full.picker, JSON.stringify(full));
    await page.screenshot({ path: path.join(SHOTS, 'desktop-bundle.png'), clip: await page.locator('#bundle').boundingBox() });
    await page.click('[data-vx-slot="1"] [data-vx-slot-remove]');
    const removed = await page.evaluate(() => ({ now: document.querySelector('[data-vx-bundle-new]').textContent, disabled: document.querySelector('[data-vx-bundle-add]').disabled }));
    check('Bundle: removing a scent re-locks the discount', removed.now === '$13.94' && removed.disabled, JSON.stringify(removed));
    await pick(1, 'Citrus Royale', '5mL');
    state.adds = [];
    await Promise.all([page.waitForURL('**/discount/**'), bundleBtn.click()]);
    check('Bundle: adds the 3 chosen variants in one request', JSON.stringify(state.adds[0]) === JSON.stringify({ items: [{ id: 67616805716218, quantity: 1 }, { id: 67616805650682, quantity: 1 }, { id: 67616805552378, quantity: 1 }] }), JSON.stringify(state.adds[0]));
    check('Bundle: then applies BUNDLE30 and redirects to cart', state.discount === '/discount/BUNDLE30?redirect=%2Fcart', state.discount);

    // ---- FAQ ----
    await page.goto(BASE + '/#faq');
    await page.waitForTimeout(1500);
    const faqClosed = await page.evaluate(() => document.querySelector('.vx-faq__a').getBoundingClientRect().height);
    await page.click('.vx-faq__q >> nth=0');
    await page.waitForTimeout(600);
    const faqOpen = await page.evaluate(() => ({ h: document.querySelector('.vx-faq__a').getBoundingClientRect().height, exp: document.querySelector('.vx-faq__q').getAttribute('aria-expanded'), n: document.querySelectorAll('[data-vx-faq]').length }));
    await page.click('.vx-faq__q >> nth=0');
    await page.waitForTimeout(600);
    const faqAgain = await page.evaluate(() => document.querySelector('.vx-faq__a').getBoundingClientRect().height);
    check('FAQ: 6 questions, expands and collapses', faqOpen.n === 6 && faqClosed < 1 && faqOpen.h > 40 && faqOpen.exp === 'true' && faqAgain < 1, `closed ${faqClosed} / open ${JSON.stringify(faqOpen)} / again ${faqAgain}`);

    const misc = await page.evaluate(() => ({
      trust: Array.from(document.querySelectorAll('.vx-trust__item h3')).map((e) => e.textContent),
      size: Array.from(document.querySelectorAll('.vx-table tbody tr')).map((r) => r.children[1].textContent),
      reviews: !!document.querySelector('#reviews'),
      email: !!document.querySelector('form[action^="/contact"] input[name="contact[email]"]'),
      footer: Array.from(document.querySelectorAll('.vx-footer__title')).map((e) => e.textContent),
      deadLinks: Array.from(document.querySelectorAll('a[href]')).filter((a) => a.getAttribute('href') === '#' || a.getAttribute('href') === '').length
    }));
    check('Trust badges (4)', misc.trust.join('|') === '100% Authentic|Fast Shipping|Expert Support|Money-Back Guarantee', misc.trust.join('|'));
    check('Size guide: ~20 / ~50 / ~100 sprays', misc.size.join() === '~20 sprays,~50 sprays,~100 sprays', misc.size.join());
    check('Reviews section hidden by default (no real reviews yet)', misc.reviews === false);
    check('Email capture posts to Shopify customer form', misc.email);
    check('Footer columns Shop / Help / Company / Legal, no dead "#" links', misc.footer.join() === 'Shop,Help,Company,Legal' && misc.deadLinks === 0, `${misc.footer.join()} dead=${misc.deadLinks}`);

    await scrollThrough(page);
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(600);
    await page.screenshot({ path: path.join(SHOTS, 'desktop-full.png'), fullPage: true });
    check('No console or page errors (desktop)', errors.length === 0, errors.join(' | '));
    await ctx.close();
  }

  // ================= Mobile =================
  for (const width of [320, 375, 414]) {
    const { ctx, page, errors } = await newPage(browser, { viewport: { width, height: 800 } });
    await page.waitForTimeout(500);
    const m = await page.evaluate(() => {
      const logo = document.querySelector('.vx-header .vx-logo').getBoundingClientRect();
      return {
        burger: getComputedStyle(document.querySelector('[data-vx-burger]')).display,
        nav: getComputedStyle(document.querySelector('.vx-nav')).display,
        logoRight: logo.right, logoH: logo.height, vw: window.innerWidth
      };
    });
    check(`[${width}px] hamburger shown, desktop nav hidden, logo fits on one line`, m.burger !== 'none' && m.nav === 'none' && m.logoRight < m.vw - 90 && m.logoH < 34, JSON.stringify(m));
    await page.click('[data-vx-burger]');
    await page.waitForTimeout(400);
    const open = await page.evaluate(() => ({ hidden: document.querySelector('[data-vx-mobile-nav]').hidden, exp: document.querySelector('[data-vx-burger]').getAttribute('aria-expanded'), links: document.querySelectorAll('[data-vx-mobile-nav] a').length }));
    await page.click('[data-vx-mobile-nav] a[href="#bundle"]');
    await page.waitForTimeout(900);
    const closed = await page.evaluate(() => ({ hidden: document.querySelector('[data-vx-mobile-nav]').hidden, y: Math.round(document.querySelector('#bundle').getBoundingClientRect().top) }));
    check(`[${width}px] menu opens, link jumps to section and closes menu`, !open.hidden && open.exp === 'true' && open.links === 8 && closed.hidden && closed.y < 120, `${JSON.stringify(open)} ${JSON.stringify(closed)}`);
    await scrollThrough(page);
    const overflow = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, vw: window.innerWidth, wide: Array.from(document.querySelectorAll('.vx-landing *, .vx-footer *')).filter((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && (r.right > window.innerWidth + 1) && !e.closest('.vx-table-wrap'); }).slice(0, 3).map((e) => e.className) }));
    check(`[${width}px] no horizontal page scroll`, overflow.sw <= overflow.vw && overflow.wide.length === 0, JSON.stringify(overflow));
    if (width === 375) {
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.waitForTimeout(2200);
      await page.waitForTimeout(300);
      await page.screenshot({ path: path.join(SHOTS, 'mobile-375-hero.png') });
      await page.screenshot({ path: path.join(SHOTS, 'mobile-375-full.png'), fullPage: true });
    }
    check(`[${width}px] no console or page errors`, errors.length === 0, errors.join(' | '));
    await ctx.close();
  }

  // ================= Reduced motion =================
  {
    const { ctx, page, errors } = await newPage(browser, { reducedMotion: 'reduce' });
    await page.waitForTimeout(500);
    const r = await page.evaluate(() => ({
      motion: document.documentElement.classList.contains('vx-motion'),
      hidden: Array.from(document.querySelectorAll('.vx-reveal')).filter((e) => parseFloat(getComputedStyle(e).opacity) < 0.99).length,
      stat: document.querySelector('[data-vx-count="100"]').textContent
    }));
    check('Reduced motion: nothing hidden, counters show final values', !r.motion && r.hidden === 0 && r.stat === '100', JSON.stringify(r));
    check('Reduced motion: no errors', errors.length === 0, errors.join(' | '));
    await ctx.close();
  }

  // ================= Failsafe: JS blocked =================
  {
    const { ctx, page } = await newPage(browser, { blockJs: true });
    const early = await page.evaluate(() => document.documentElement.classList.contains('vx-motion'));
    await page.waitForTimeout(3000 + 1700); // failsafe fires at 3s, then the 1s fade (+ stagger) plays out
    const late = await page.evaluate(() => ({
      motion: document.documentElement.classList.contains('vx-motion'),
      hidden: Array.from(document.querySelectorAll('.vx-reveal')).filter((e) => parseFloat(getComputedStyle(e).opacity) < 0.99).length,
      faq: document.querySelector('.vx-faq__a').getBoundingClientRect().height,
      formAction: document.querySelector('[data-vx-atc]').getAttribute('action')
    }));
    check('Failsafe: with JS blocked, content un-hides after 3s', early === true && late.motion === false && late.hidden === 0, JSON.stringify({ early, ...late }));
    check('Failsafe: FAQ answers readable without JS', late.faq > 40, String(late.faq));
    check('Failsafe: add-to-cart still a plain /cart/add form', late.formAction === '/cart/add');
    await ctx.close();
  }

  // ================= Email success state + empty collection =================
  {
    const { ctx, page, errors } = await newPage(browser, { path: '/posted.html' });
    const ok = await page.evaluate(() => (document.querySelector('.vx-email__success') || {}).textContent || '');
    check('Email sign-up success shows code VOIDEX10', ok.includes('VOIDEX10'), ok.trim().slice(0, 80));
    check('Success page: no errors', errors.length === 0, errors.join(' | '));
    await ctx.close();
  }
  {
    const { ctx, page, errors } = await newPage(browser, { path: '/empty.html' });
    const e = await page.evaluate(() => ({ cards: document.querySelectorAll('[data-vx-card]').length, empty: document.querySelectorAll('.vx-empty').length, stats: Array.from(document.querySelectorAll('.vx-stat__num')).map((s) => s.textContent.trim()) }));
    check('Empty collection: no fake cards, "on their way" message, no $0.00 stat', e.cards === 0 && e.empty >= 2 && !e.stats.includes('$0.00') && !e.stats.includes('0'), JSON.stringify(e));
    check('Empty collection: no errors', errors.length === 0, errors.join(' | '));
    await ctx.close();
  }

  await browser.close();
  server.close();
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
