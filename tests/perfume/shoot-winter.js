// Chromium checks + screenshots for the winter theme rendered by build-winter.js.
const http = require('http'); const fs = require('fs'); const path = require('path');
const { chromium } = require('playwright-core');
const SITE = path.join(__dirname, 'site-winter'); const SHOTS = path.join(__dirname, 'shots'); fs.mkdirSync(SHOTS, { recursive: true });
const T = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml' };
const posts = [];
const srv = http.createServer((q, s) => {
  const u = new URL(q.url, 'http://x');
  if (q.method === 'POST') { let b = ''; q.on('data', (c) => (b += c)); q.on('end', () => { posts.push([u.pathname, b]); s.writeHead(200, { 'Content-Type': 'application/json' }); s.end('{"items":[]}'); }); return; }
  if (u.pathname === '/cart.js') { s.writeHead(200, { 'Content-Type': 'application/json' }); return s.end('{"item_count":1}'); }
  const f = path.join(SITE, u.pathname === '/' ? 'index.html' : u.pathname);
  if (!fs.existsSync(f)) { s.writeHead(404); return s.end(); }
  s.writeHead(200, { 'Content-Type': T[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(s);
});
let fail = 0; const check = (n, ok, d = '') => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${n}${d ? '  -> ' + d : ''}`); if (!ok) fail++; };
(async () => {
  await new Promise((r) => srv.listen(0, '127.0.0.1', r)); const B = 'http://127.0.0.1:' + srv.address().port;
  const br = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  for (const [vp, tag] of [[{ width: 1366, height: 860 }, 'desktop'], [{ width: 375, height: 800 }, 'mobile']]) {
    const ctx = await br.newContext({ viewport: vp }); const pg = await ctx.newPage(); const errs = [];
    pg.on('pageerror', (e) => errs.push(e.message)); pg.on('console', (m) => m.type() === 'error' && !/Failed to load resource/.test(m.text()) && errs.push(m.text()));
    await pg.route('https://fonts.googleapis.com/**', (r) => r.fulfill({ contentType: 'text/css', body: '' }));
    for (const p of ['index', 'product']) {
      await pg.goto(`${B}/${p}.html`); await pg.waitForTimeout(1800);
      const info = await pg.evaluate(() => ({ bg: getComputedStyle(document.body).backgroundColor, sw: document.documentElement.scrollWidth, vw: innerWidth, snow: !!document.querySelector('canvas[data-vx-snow]') && document.querySelector('canvas[data-vx-snow]').width > 0 }));
      check(`[${tag}] ${p}: winter bg, snow canvas running, no horizontal scroll`, info.bg === 'rgb(5, 10, 19)' && info.snow && info.sw <= info.vw, JSON.stringify(info));
      // Scroll through the page so every scroll reveal fires, then confirm none stayed hidden.
      const H = await pg.evaluate(() => document.documentElement.scrollHeight);
      for (let y = 0; y < H; y += Math.round(vp.height * 0.6)) { await pg.evaluate((yy) => window.scrollTo({ top: yy, behavior: 'instant' }), y); await pg.waitForTimeout(120); }
      await pg.waitForTimeout(1600); await pg.evaluate(() => { window.scrollTo({ top: 0, behavior: 'instant' }); }); await pg.waitForTimeout(300);
      const rev = await pg.evaluate(() => { const r = [...document.querySelectorAll('.vx-reveal')]; return [r.length, r.filter((e) => !e.classList.contains('is-visible')).length]; });
      check(`[${tag}] ${p}: every scroll-reveal section becomes visible`, rev[1] === 0, `${rev[0]} reveal elements, ${rev[1]} still hidden`);
      await pg.screenshot({ path: path.join(SHOTS, `winter-${tag}-${p}.png`), fullPage: p === 'index' });
    }
    // Global copy: no Canada-only wording, no fixed temperature, no dead perfume link; live products listed
    for (const p of ['index', 'product']) {
      await pg.goto(`${B}/${p}.html`); await pg.waitForTimeout(300);
      const txt = await pg.evaluate(() => document.body.innerText);
      const bad = ['Canad', '°C', '°F', '−20', '-20', 'Perfume'].filter((w) => txt.includes(w));
      check(`[${tag}] ${p}: no Canada-only wording, temperature number or perfume link`, bad.length === 0, bad.join(','));
    }
    await pg.goto(`${B}/index.html`); await pg.waitForTimeout(300);
    const more = await pg.evaluate(() => [...document.querySelectorAll('#shop .vx-card')].map((a) => a.getAttribute('href')));
    check(`[${tag}] "More from VOIDEX" lists the other live products, not the jacket`, more.join(',') === '/products/voidex-sneaker-wash-bag,/products/special-glass-for-car-snow-removal-tools-deicing-and-melting-snow', more.join(','));
    const nav = await pg.evaluate(() => [...document.querySelectorAll('header a')].map((a) => a.textContent.trim() + '=' + a.getAttribute('href')).filter((x) => /Shop All/.test(x)));
    check(`[${tag}] menu has Shop All -> /collections/all`, nav.length > 0 && nav.every((x) => x.endsWith('=/collections/all')), nav.join(' | '));
    const cell = () => pg.evaluate(() => { const td = document.querySelector('[data-vx-sizes] tbody td'); return td.innerText.trim(); });
    const cm = await cell(); await pg.click('[data-vx-unit="in"]'); const inch = await cell(); await pg.click('[data-vx-unit="cm"]'); const back = await cell();
    check(`[${tag}] size guide switches cm <-> inches`, cm === '64' && inch === '25.2' && back === '64', [cm, inch, back].join(' / '));
    // Snow actually moves between frames
    await pg.goto(`${B}/index.html`); await pg.waitForTimeout(800);
    const a = await pg.evaluate(() => document.querySelector('canvas[data-vx-snow]').toDataURL()); await pg.waitForTimeout(400);
    const b = await pg.evaluate(() => document.querySelector('canvas[data-vx-snow]').toDataURL());
    check(`[${tag}] snowfall animates`, a !== b);
    // Variant picker: Blue Zone8 + L -> its id and price; image swaps
    await pg.click('.vx-chip[data-value="Blue Zone8"]'); await pg.click('.vx-chip[data-value="L"]'); await pg.waitForTimeout(600);
    const v = await pg.evaluate(() => [document.querySelector('[data-vx-variant]').value, document.querySelector('[data-vx-price]').textContent, document.querySelector('[data-vx-main-img]').getAttribute('src')]);
    check(`[${tag}] picker: Blue Zone8 / L -> id 67614466113786, $121.89, blue image`, v[0] === '67614466113786' && v[1] === '$121.89' && v[2].includes('Blue-Zone8'), v.join(' '));
    // Thumbnail click swaps the main photo from its template and leaves exactly one main image
    await pg.click('.vx-thumb[data-image-id="52823270000003"]'); await pg.waitForTimeout(700);
    const th = await pg.evaluate(() => { const w = document.querySelector('[data-vx-gallery-main]'); return [w.querySelectorAll('img').length, w.querySelector('img').getAttribute('src'), w.querySelector('img').classList.contains('is-swapping'), document.querySelector('.vx-thumb.is-active').dataset.imageId]; });
    check(`[${tag}] thumbnail swaps the main photo`, th[0] === 1 && th[1].includes('Red-Zone8') && !th[2] && th[3] === '52823270000003', JSON.stringify(th));
    // Sizes are listed smallest to largest even though the store sends S, M, 2XL ... 6XL, L, XL
    const order = await pg.evaluate(() => [...[...document.querySelectorAll('[data-vx-opt]')][1].querySelectorAll('.vx-chip')].map((c) => c.dataset.value).join(','));
    check(`[${tag}] size chips run S to 6XL`, order === 'S,M,L,XL,2XL,3XL,4XL,5XL,6XL', order);
    // Missing combo: Black Zone8 Set has no 4XL-6XL -> from 6XL it snaps to the nearest size (3XL) and greys the other three
    await pg.click('.vx-chip[data-value="Blue Zone8"]'); await pg.click('.vx-chip[data-value="6XL"]'); await pg.waitForTimeout(200);
    await pg.click('.vx-chip[data-value="Black Zone8 Set"]'); await pg.waitForTimeout(200);
    const snap = await pg.evaluate(() => [document.querySelector('[data-vx-variant]').value, [...document.querySelectorAll('[data-vx-opt]')][1].querySelector('.vx-chip.is-active').dataset.value, [...document.querySelectorAll('.vx-chip:disabled')].map((c) => c.dataset.value).join(','), document.querySelector('[data-vx-price]').textContent]);
    check(`[${tag}] picker: Set from 6XL snaps to 3XL, 4XL-6XL greyed`, snap[0] === '67614464606458' && snap[1] === '3XL' && snap[2] === '4XL,5XL,6XL' && snap[3] === '$129.17', JSON.stringify(snap));
    posts.length = 0; await pg.click('[data-vx-atc-btn]'); await pg.waitForTimeout(600);
    check(`[${tag}] Add to Cart posts the selected variant`, posts[0] && posts[0][0] === '/cart/add.js' && posts[0][1].includes('67614464606458'), JSON.stringify(posts[0]));
    // Every one of the 96 real variants is reachable through the chips and posts its own id
    const reach = await pg.evaluate(() => {
      const data = JSON.parse(document.querySelector('[data-vx-variants]').textContent); const bad = [];
      for (const v of data) {
        document.querySelector(`.vx-chip[data-value="${v.options[0]}"]`).click();
        document.querySelector(`[data-vx-opt]:nth-of-type(2) .vx-chip[data-value="${v.options[1]}"], fieldset[data-vx-opt] ~ fieldset[data-vx-opt] .vx-chip[data-value="${v.options[1]}"]`).click();
        if (document.querySelector('[data-vx-variant]').value !== String(v.id)) bad.push(v.title);
      }
      return [data.length, bad.length, bad.slice(0, 3).join('; ')];
    });
    check(`[${tag}] all real variants selectable with the right id`, reach[0] === 96 && reach[1] === 0, JSON.stringify(reach));
    const ov = await pg.evaluate(() => [...document.querySelectorAll('body *')].filter((e) => { const r = e.getBoundingClientRect(); return r.right > innerWidth + 0.5 && getComputedStyle(e).position !== 'fixed'; }).slice(0, 5).map((e) => e.className + ' ' + Math.round(e.getBoundingClientRect().right)));
    if (ov.length) console.log('overflowing:', ov.join(' | '));
    check(`[${tag}] no console errors`, errs.length === 0, errs.join(' | '));
    await ctx.close();
  }
  // Reduced motion: snow drawn but static, content visible
  const ctx = await br.newContext({ viewport: { width: 375, height: 800 }, reducedMotion: 'reduce' }); const pg = await ctx.newPage();
  await pg.route('https://fonts.googleapis.com/**', (r) => r.fulfill({ contentType: 'text/css', body: '' }));
  await pg.goto(`${B}/index.html`); await pg.waitForTimeout(500);
  const a = await pg.evaluate(() => document.querySelector('canvas[data-vx-snow]').toDataURL()); await pg.waitForTimeout(400);
  const b = await pg.evaluate(() => document.querySelector('canvas[data-vx-snow]').toDataURL());
  const op = await pg.evaluate(() => getComputedStyle(document.querySelector('#vx-how-title')).opacity);
  check('[reduced motion] snow is still, sections visible', a === b && op === '1', op);
  // JS blocked: everything visible, form still posts natively
  const c2 = await br.newContext({ viewport: { width: 375, height: 800 }, javaScriptEnabled: false }); const p2 = await c2.newPage();
  await p2.goto(`${B}/index.html`); await p2.waitForTimeout(3400);
  const vis = await p2.evaluate(() => [getComputedStyle(document.querySelector('#vx-zones-title')).opacity, document.querySelector('form[data-vx-atc]').getAttribute('action'), document.querySelector('[data-vx-variant]').value]);
  check('[no JS] content visible, buy form posts default variant to /cart/add', vis[0] === '1' && vis[1] === '/cart/add' && vis[2] === '67614463918330', vis.join(' '));
  await br.close(); srv.close(); console.log(fail ? `${fail} failed` : 'all passed'); process.exit(fail ? 1 : 0);
})();
