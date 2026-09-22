const fs = require('fs');
const path = require('path');

const THEME = path.join(__dirname, '..', '..', 'theme');
const OUT = __dirname;

const css = fs.readFileSync(path.join(THEME, 'assets/voidex-motion.css'), 'utf8');

// The inline boot script, lifted verbatim out of snippets/voidex-motion.liquid so
// the harness exercises the same gate the storefront does.
const snippet = fs.readFileSync(path.join(THEME, 'snippets/voidex-motion.liquid'), 'utf8');
const boot = snippet.match(/<script>\n([\s\S]*?)\n<\/script>/)[1];

// A section shaped the way Horizon emits them: a `.shopify-section` wrapper, a
// chain of single-child layout divs, then the branching content the engine
// should find and stagger.
const section = (i, extra = '') => `
      <div class="shopify-section" id="sec-${i}">
        <div class="section">
          <div class="section-content-wrapper">
            <h2 class="title">Section ${i}</h2>
            <p class="body">Body copy for section ${i}.</p>
            <div class="card">Card A</div>
            <div class="card">Card B</div>
            ${extra}
          </div>
        </div>
      </div>`;

// One section built around a scroll container -- the engine must NOT stagger
// inside it, or it fights the carousel's own measurement.
const carouselSection = `
      <div class="shopify-section" id="sec-carousel">
        <div class="section">
          <slideshow-component>
            <div class="slide">Slide 1</div>
            <div class="slide">Slide 2</div>
          </slideshow-component>
        </div>
      </div>`;

// A section holding a sticky child, like the product page's sticky add-to-cart.
// If anything puts a transform on the section, this stops sticking.
const stickySection = `
      <div class="shopify-section" id="sec-sticky">
        <div class="section">
          <div class="section-content-wrapper">
            <div class="tall">Tall column</div>
            <div class="sticky-bar" id="sticky-probe">Add to cart</div>
          </div>
        </div>
      </div>`;

const IMG = '<img loading="lazy" width="40" height="40" alt="" src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7">';

const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <title>VOIDEX motion harness</title>
    <!-- Stops the browser auto-requesting /favicon.ico, which would show up as a
         404 in the "no page errors" assertion. -->
    <link rel="icon" href="data:,">
    <style>
      body { margin: 0; font-family: system-ui, sans-serif; }
      #header-component { position: sticky; top: 0; height: 60px; background: #fff; z-index: 5; }
      .section { padding: 40px 24px; min-height: 90vh; }
      .card { height: 120px; background: #eee; margin: 8px 0; }
      .tall { height: 1200px; background: #f6f6f6; }
      .sticky-bar { position: sticky; bottom: 0; background: #a42325; color: #fff; padding: 12px; }
      footer { padding: 40px 24px; background: #E6E6E6; }
    </style>
    <style>
${css}
    </style>
    <script>
${boot}
    </script>
  </head>
  <body>
    <div class="page-wrapper">
      <div id="header-group"><div id="header-component">Header</div></div>
      <main id="MainContent" data-template="index">
${section(1)}
${section(2)}
${carouselSection}
${section(3, IMG)}
${stickySection}
${section(4)}
      </main>
      <footer>Early drops and restock alerts</footer>
    </div>
    <script src="./voidex-motion.js" type="module"></script>
  </body>
</html>
`;

fs.writeFileSync(path.join(OUT, 'index.html'), html);
fs.copyFileSync(path.join(THEME, 'assets/voidex-motion.js'), path.join(OUT, 'voidex-motion.js'));
console.log('harness built:', fs.statSync(path.join(OUT, 'index.html')).size, 'bytes');
