// Screenshots + basic checks of the standalone theme pages rendered by build-standalone.js.
const http = require('http'); const fs = require('fs'); const path = require('path');
const { chromium } = require('playwright-core');
const SITE = path.join(__dirname, 'site-standalone'); const SHOTS = path.join(__dirname, 'shots'); fs.mkdirSync(SHOTS, { recursive: true });
const T = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.woff2': 'font/woff2' };
const posts = [];
const srv = http.createServer((q, s) => {
  const u = new URL(q.url, 'http://x');
  if (q.method === 'POST') { let b = ''; q.on('data', (c) => (b += c)); q.on('end', () => { posts.push([u.pathname, b]); s.writeHead(200, { 'Content-Type': 'application/json' }); s.end('{"items":[]}'); }); return; }
  if (u.pathname === '/cart.js') { s.writeHead(200, { 'Content-Type': 'application/json' }); return s.end('{"item_count":4}'); }
  const f = path.join(u.pathname.startsWith('/fonts/') ? __dirname : SITE, u.pathname === '/' ? 'index.html' : u.pathname);
  if (!fs.existsSync(f)) { s.writeHead(404); return s.end(); }
  s.writeHead(200, { 'Content-Type': T[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(s);
});
let fail = 0; const check = (n, ok, d = '') => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${n}${d ? '  -> ' + d : ''}`); if (!ok) fail++; };
(async () => {
  await new Promise((r) => srv.listen(0, '127.0.0.1', r)); const B = 'http://127.0.0.1:' + srv.address().port;
  const br = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  for (const [vp, tag] of [[{ width: 1366, height: 860 }, 'desktop'], [{ width: 375, height: 800 }, 'mobile']]) {
    const ctx = await br.newContext({ viewport: vp }); const pg = await ctx.newPage(); const errs = [];
    pg.on('pageerror', (e) => errs.push(e.message)); pg.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
    await pg.route('https://fonts.googleapis.com/**', (r) => r.fulfill({ contentType: 'text/css', body: fs.readFileSync(path.join(__dirname, 'fonts/local.css'), 'utf8').replace(/url\(\/fonts\//g, 'url(' + B + '/fonts/') }));
    for (const p of ['index', 'product', 'cart', 'collection']) {
      await pg.goto(`${B}/${p}.html`); await pg.waitForTimeout(2300);
      const info = await pg.evaluate(() => ({ bg: getComputedStyle(document.body).backgroundColor, logo: (document.querySelector('.vx-header .vx-logo') || {}).textContent, sw: document.documentElement.scrollWidth, vw: innerWidth }));
      check(`[${tag}] ${p}: black bg, VØIDEX header, no horizontal scroll`, info.bg === 'rgb(5, 5, 5)' && (info.logo || '').trim() === 'VØIDEX' && info.sw <= info.vw, JSON.stringify(info));
      await pg.screenshot({ path: path.join(SHOTS, `standalone-${tag}-${p}.png`), fullPage: p !== 'index' });
    }
    await pg.goto(`${B}/product.html`); await pg.waitForTimeout(500);
    await pg.click('[data-vx-size][data-size="10mL"]');
    const pr = await pg.evaluate(() => [document.querySelector('[data-vx-price]').textContent, document.querySelector('[data-vx-variant]').value]);
    check(`[${tag}] product: 10mL -> $12.97 + 10mL variant`, pr[0] === '$12.97' && pr[1] === '67616805781754', pr.join(' '));
    posts.length = 0; await pg.click('[data-vx-atc-btn]'); await pg.waitForTimeout(500);
    check(`[${tag}] product: Add to Cart posts 10mL variant`, posts[0] && posts[0][0] === '/cart/add.js' && posts[0][1].includes('67616805781754'), JSON.stringify(posts[0]));
    check(`[${tag}] no console errors`, errs.length === 0, errs.join(' | '));
    await ctx.close();
  }
  await br.close(); srv.close(); console.log(fail ? `${fail} failed` : 'all passed'); process.exit(fail ? 1 : 0);
})();
