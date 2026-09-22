const { chromium } = require('playwright');
const fs = require('fs');

const BASE = 'http://127.0.0.1:8097';
const CHROME = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const SHOTS = require('path').join(__dirname, 'shots');

fs.mkdirSync(require('path').join(__dirname, 'shots'), { recursive: true });

let pass = 0;
let fail = 0;
const check = (name, ok, detail = '') => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  -> ' + detail : ''}`);
  ok ? pass++ : fail++;
};

const snapshot = (page) =>
  page.evaluate(() => {
    const secs = Array.from(document.querySelectorAll('#MainContent > .shopify-section'));
    const items = Array.from(document.querySelectorAll('.vx-item'));
    return {
      attr: document.documentElement.getAttribute('data-vx-motion'),
      sections: secs.length,
      revealed: secs.filter((s) => s.classList.contains('vx-in')).length,
      hidden: secs.filter((s) => parseFloat(getComputedStyle(s).opacity) < 0.05).map((s) => s.id),
      transformed: secs.filter((s) => getComputedStyle(s).transform !== 'none').map((s) => s.id),
      items: items.length,
      itemsHidden: items.filter((i) => parseFloat(getComputedStyle(i).opacity) < 0.05).length,
      itemsDone: items.filter((i) => i.classList.contains('vx-done')).length,
      carouselItems: document.querySelectorAll('#sec-carousel .vx-item').length,
      staggerIndices: Array.from(document.querySelectorAll('#sec-2 .vx-item')).map((i) =>
        i.style.getPropertyValue('--vx-i')
      ),
      imgStamped: !!document.querySelector('img[data-vx-img]'),
      stickyPos: getComputedStyle(document.querySelector('#sticky-probe')).position,
    };
  });

const scrollThrough = async (page) => {
  const h = await page.evaluate(() => document.body.scrollHeight);
  for (let y = 0; y < h; y += 500) {
    await page.evaluate((v) => window.scrollTo(0, v), y);
    await page.waitForTimeout(160);
  }
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(2000);
};

(async () => {
  const browser = await chromium.launch({ executablePath: CHROME, args: ['--no-sandbox'] });

  // ---------------------------------------------------------------- normal run
  {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await ctx.newPage();
    const errors = [];
    page.on('console', (m) => { if (m.type() === 'error' && !m.text().includes('favicon')) errors.push(m.text()); });
    page.on('requestfailed', (r) => { if (!r.url().includes('favicon')) errors.push('requestfailed ' + r.url()); });
    page.on('pageerror', (e) => errors.push(String(e)));

    await page.goto(BASE, { waitUntil: 'load' });
    await page.waitForTimeout(600);

    const before = await snapshot(page);
    console.log('\n--- 1. initial state ---');
    check('motion enabled', before.attr === 'on', `attr=${before.attr}`);
    check('all sections found', before.sections === 6, `${before.sections}`);
    check('only first section revealed at load', before.revealed === 1, `revealed=${before.revealed}`);
    check('below-fold sections are hidden', before.hidden.length >= 4, `hidden=${before.hidden.join(',')}`);
    check('stagger items marked', before.items > 0, `${before.items} items`);
    check(
      'stagger indices ascend from 0',
      JSON.stringify(before.staggerIndices) === JSON.stringify(['0', '1', '2', '3']),
      JSON.stringify(before.staggerIndices)
    );
    check('carousel section not staggered', before.carouselItems === 0, `${before.carouselItems}`);
    check('lazy image stamped', before.imgStamped === true);
    await page.screenshot({ path: `${SHOTS}/h-01-initial.png` });

    console.log('\n--- 2. no transform on sections (sticky safety) ---');
    check('no section carries a transform', before.transformed.length === 0, before.transformed.join(','));
    check('sticky child still sticky', before.stickyPos === 'sticky', before.stickyPos);

    console.log('\n--- 3. after scrolling through ---');
    await scrollThrough(page);
    const after = await snapshot(page);
    check('every section revealed', after.revealed === after.sections, `${after.revealed}/${after.sections}`);
    check('nothing left hidden', after.hidden.length === 0, after.hidden.join(','));
    check('no item left hidden', after.itemsHidden === 0, `${after.itemsHidden}`);
    check('will-change released', after.itemsDone === after.items, `${after.itemsDone}/${after.items}`);
    await page.screenshot({ path: `${SHOTS}/h-02-scrolled.png` });

    console.log('\n--- 4. dynamically injected section (section-renderer / filters) ---');
    await page.evaluate(() => {
      const el = document.createElement('div');
      el.className = 'shopify-section';
      el.id = 'sec-injected';
      el.innerHTML = '<div class="section"><div class="w"><h2>New</h2><div class="card">A</div><div class="card">B</div></div></div>';
      document.querySelector('#MainContent').appendChild(el);
    });
    await page.waitForTimeout(400);
    await page.evaluate(() => document.querySelector('#sec-injected').scrollIntoView());
    await page.waitForTimeout(1200);
    const injected = await page.evaluate(() => {
      const el = document.querySelector('#sec-injected');
      return {
        registered: el.hasAttribute('data-vx-registered'),
        revealed: el.classList.contains('vx-in'),
        opacity: parseFloat(getComputedStyle(el).opacity),
        items: el.querySelectorAll('.vx-item').length,
      };
    });
    check('injected section registered', injected.registered === true);
    check('injected section revealed', injected.revealed === true);
    check('injected section visible', injected.opacity > 0.95, `opacity=${injected.opacity}`);
    check('injected section staggered', injected.items === 3, `${injected.items}`);

    console.log('\n--- 5. console errors ---');
    check('no page errors', errors.length === 0, errors.slice(0, 5).join(' | '));
    await ctx.close();
  }

  // ------------------------------------------- failsafe: engine never arrives
  {
    console.log('\n--- 6. FAILSAFE: motion script blocked ---');
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await ctx.newPage();
    await page.route('**/voidex-motion.js', (r) => r.abort());
    await page.goto(BASE, { waitUntil: 'load' });

    const mid = await snapshot(page);
    check('hiding rules active before failsafe fires', mid.hidden.length > 0, `hidden=${mid.hidden.length}`);

    await page.waitForTimeout(3000);
    const end = await snapshot(page);
    check('failsafe cleared the attribute', end.attr === null, `attr=${end.attr}`);
    check('all content visible after failsafe', end.hidden.length === 0, end.hidden.join(','));
    await page.screenshot({ path: `${SHOTS}/h-03-failsafe.png` });
    await ctx.close();
  }

  // ------------------------------------------------------- reduced motion
  {
    console.log('\n--- 7. prefers-reduced-motion: reduce ---');
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
    const page = await ctx.newPage();
    await page.goto(BASE, { waitUntil: 'load' });
    await page.waitForTimeout(800);
    const s = await snapshot(page);
    check('motion never enabled', s.attr === null, `attr=${s.attr}`);
    check('nothing hidden', s.hidden.length === 0, s.hidden.join(','));
    check('no items marked', s.items === 0, `${s.items}`);
    await ctx.close();
  }

  // ------------------------------------------------------- low power device
  {
    console.log('\n--- 8. low-power device (2 cores) ---');
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await ctx.newPage();
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'hardwareConcurrency', { get: () => 2 });
    });
    await page.goto(BASE, { waitUntil: 'load' });
    await page.waitForTimeout(800);
    const s = await snapshot(page);
    check('motion not enabled on low-power', s.attr === null, `attr=${s.attr}`);
    check('nothing hidden on low-power', s.hidden.length === 0, s.hidden.join(','));
    await ctx.close();
  }

  await browser.close();
  console.log(`\n================  ${pass} passed, ${fail} failed  ================`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error('FATAL', e); process.exit(1); });
