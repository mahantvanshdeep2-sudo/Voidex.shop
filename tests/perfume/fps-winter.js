// Frame-rate probe for the winter theme: scrolls the homepage at a steady pace under CPU
// throttling and records every requestAnimationFrame interval. Usage: node fps-winter.js [label]
const http = require('http'); const fs = require('fs'); const path = require('path');
const { chromium } = require('playwright-core');
const SITE = path.join(__dirname, 'site-winter');
const T = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.jpg': 'image/jpeg', '.png': 'image/png' };
const srv = http.createServer((q, s) => {
  const u = new URL(q.url, 'http://x');
  const f = path.join(SITE, u.pathname === '/' ? 'index.html' : u.pathname);
  if (!fs.existsSync(f)) { s.writeHead(404); return s.end(); }
  s.writeHead(200, { 'Content-Type': T[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(s);
});
const label = process.argv[2] || 'run';
(async () => {
  await new Promise((r) => srv.listen(0, '127.0.0.1', r)); const B = 'http://127.0.0.1:' + srv.address().port;
  const br = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const out = {};
  for (const [name, vp, dpr, throttle] of [['phone', { width: 390, height: 844 }, 3, 4], ['desktop', { width: 1440, height: 900 }, 1, 2]]) {
    const ctx = await br.newContext({ viewport: vp, deviceScaleFactor: dpr, isMobile: name === 'phone', hasTouch: name === 'phone' });
    const pg = await ctx.newPage();
    await pg.route('https://fonts.googleapis.com/**', (r) => r.fulfill({ contentType: 'text/css', body: '' }));
    await pg.goto(B + '/index.html'); if (process.env.INJECT) await pg.addStyleTag({ content: process.env.INJECT }); if (process.env.NOSNOW) await pg.evaluate(() => { const c = document.querySelector('[data-vx-snow]'); c.replaceWith(c.cloneNode()); }); await pg.waitForTimeout(2500);
    const cdp = await ctx.newCDPSession(pg); await cdp.send('Emulation.setCPUThrottlingRate', { rate: throttle });
    const runs = [];
    for (let rep = 0; rep < 3; rep++) {
      await pg.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' })); await pg.waitForTimeout(400);
      runs.push(await pg.evaluate(() => new Promise((done) => {
        const d = []; let last = performance.now(); const t0 = last; const max = document.documentElement.scrollHeight - innerHeight;
        const step = (now) => {
          d.push(now - last); last = now;
          const p = Math.min(1, (now - t0) / 5000); window.scrollTo({ top: p * max, behavior: 'instant' });
          if (p < 1) requestAnimationFrame(step); else done(d.slice(2));
        };
        requestAnimationFrame(step);
      })));
    }
    const d = runs.flat().sort((a, b) => a - b); const sum = d.reduce((a, b) => a + b, 0);
    out[name] = { frames: d.length, avgFps: +(1000 / (sum / d.length)).toFixed(1), p95ms: +d[Math.floor(d.length * 0.95)].toFixed(1), jankPct: +(100 * d.filter((x) => x > 25).length / d.length).toFixed(1), cpuThrottle: throttle + 'x' };
    await ctx.close();
  }
  console.log(label, JSON.stringify(out));
  await br.close(); srv.close();
})();
