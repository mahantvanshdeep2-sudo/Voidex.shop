// Renders voidex-theme/ (layout + sections + page template) with LiquidJS into static HTML,
// using the store's real product data (products.json, pulled from the Admin API), so the
// actual theme files can be exercised in Chromium. Shopify-only filters and tags are
// stubbed to match Shopify's output shape. Usage: node build.js
const fs = require('fs');
const path = require('path');
const { Liquid, Tag, Hash } = require('liquidjs');

const THEME = path.resolve(__dirname, '../../voidex-theme');
const OUT = path.join(__dirname, 'site');
fs.mkdirSync(path.join(OUT, 'assets'), { recursive: true });

const read = (p) => fs.readFileSync(path.join(THEME, p), 'utf8');
const stripSchema = (src) => src.replace(/{%-?\s*schema\s*-?%}[\s\S]*?{%-?\s*endschema\s*-?%}/, '');
const schemaOf = (src) => JSON.parse(src.match(/{%-?\s*schema\s*-?%}([\s\S]*?){%-?\s*endschema\s*-?%}/)[1]);
// Shopify allows `?` in property names (form.posted_successfully?); LiquidJS does not.
const shopifyCompat = (src) => src.replace(/posted_successfully\?/g, 'posted_successfully_q');

const engine = new Liquid({ strictFilters: true, jsTruthy: false });

const money = (cents) => '$' + (Number(cents || 0) / 100).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
engine.registerFilter('money', money);
engine.registerFilter('asset_url', (f) => '/assets/' + f);
engine.registerFilter('stylesheet_tag', (u) => `<link href="${u}" rel="stylesheet" type="text/css" media="all" />`);
engine.registerFilter('image_url', (img, ...args) => (img && img.src) || '');
engine.registerFilter('image_tag', (url, ...args) => `<img src="${url}" alt="">`);
engine.registerFilter('payment_type_svg_tag', (type) => `<svg class="vx-pay-icon" viewBox="0 0 38 24" role="img" aria-label="${type}"><rect width="38" height="24" rx="3" fill="#222"/></svg>`);
engine.registerFilter('default_errors', () => '<ul><li>Email is invalid.</li></ul>');

engine.registerTag('schema', class extends Tag {
  constructor(token, remainTokens, liquid) {
    super(token, remainTokens, liquid);
    while (remainTokens.length) { const t = remainTokens.shift(); if (t.name === 'endschema') return; }
  }
  * render() { return ''; }
});

// {% form 'customer', id: 'x', class: 'y' %} … {% endform %}
engine.registerTag('form', class extends Tag {
  constructor(token, remainTokens, liquid) {
    super(token, remainTokens, liquid);
    const m = token.args.match(/^\s*'([^']+)'\s*,?\s*(.*)$/);
    this.formType = m[1];
    this.hash = new Hash(m[2] || '');
    this.templates = [];
    const stream = this.liquid.parser.parseStream(remainTokens)
      .on('tag:endform', () => stream.stop())
      .on('template', (tpl) => this.templates.push(tpl))
      .on('end', () => { throw new Error('form not closed'); });
    stream.start();
  }
  * render(ctx, emitter) {
    const opts = yield this.hash.render(ctx);
    const posted = ctx.getSync(['__form_posted']) === true;
    ctx.push({ form: { posted_successfully_q: posted, errors: null } });
    emitter.write(`<form method="post" action="/contact#${opts.id}" id="${opts.id}" accept-charset="UTF-8" class="${opts.class || ''}"><input type="hidden" name="form_type" value="${this.formType}" /><input type="hidden" name="utf8" value="✓" />`);
    yield this.liquid.renderer.renderTemplates(this.templates, ctx, emitter);
    emitter.write('</form>');
    ctx.pop();
  }
});

// Static {% section 'name' %} — rendered with its schema defaults.
engine.registerTag('section', class extends Tag {
  constructor(token, remainTokens, liquid) {
    super(token, remainTokens, liquid);
    this.name = token.args.trim().replace(/['"]/g, '');
  }
  * render(ctx, emitter) {
    const src = read(`sections/${this.name}.liquid`);
    const schema = schemaOf(src);
    const settings = {};
    (schema.settings || []).forEach((s) => { if (s.id) settings[s.id] = s.default; });
    const cls = ['shopify-section', schema.class].filter(Boolean).join(' ');
    ctx.push({ section: { id: this.name, settings, blocks: [] } });
    const html = yield this.liquid.parseAndRender(shopifyCompat(stripSchema(src)), ctx.getAll());
    ctx.pop();
    emitter.write(`<div id="shopify-section-${this.name}" class="${cls}">${html}</div>`);
  }
});

function buildProducts() {
  const raw = JSON.parse(fs.readFileSync(path.join(__dirname, 'products.json'), 'utf8'));
  return raw.map((p) => {
    const variants = p.variants.map((v) => ({ ...v, option1: v.title }));
    const first = variants.find((v) => v.available) || variants[0];
    return {
      ...p,
      variants,
      url: '/products/' + p.handle,
      price: Math.min(...variants.map((v) => v.price)),
      price_min: Math.min(...variants.map((v) => v.price)),
      featured_image: null,
      has_only_default_variant: false,
      selected_or_first_available_variant: first,
      available: variants.some((v) => v.available)
    };
  });
}

async function render({ posted = false, emptyCollection = false, file = 'index.html' } = {}) {
  const products = emptyCollection ? [] : buildProducts();
  const collection = { handle: 'voidex-perfume-samples', title: 'VOIDEX Perfume Samples', products, products_count: products.length };

  const tpl = JSON.parse(read('templates/page.voidex-perfume.json'));
  const sectionKey = tpl.order[0];
  const sec = tpl.sections[sectionKey];
  const sectionSrc = read(`sections/${sec.type}.liquid`);
  const settings = { ...sec.settings, collection: sec.settings.collection === 'voidex-perfume-samples' ? collection : null };
  const blocks = sec.block_order.map((id) => ({ id, type: sec.blocks[id].type, settings: sec.blocks[id].settings, shopify_attributes: '' }));

  const globals = {
    shop: {
      name: 'VOIDEX.SHOP',
      money_format: '${{amount}}',
      enabled_payment_types: ['visa', 'master', 'american_express', 'paypal', 'apple_pay'],
      privacy_policy: { url: '/policies/privacy-policy' },
      terms_of_service: { url: '/policies/terms-of-service' },
      refund_policy: { url: '/policies/refund-policy' },
      shipping_policy: { url: '/policies/shipping-policy' }
    },
    routes: {
      root_url: '/', cart_url: '/cart', cart_add_url: '/cart/add', account_url: '/account',
      search_url: '/search', all_products_collection_url: '/collections/all'
    },
    cart: { item_count: 0 },
    request: { locale: { iso_code: 'en' } },
    collections: { 'voidex-perfume-samples': collection },
    canonical_url: 'https://voidexshop.com/pages/voidex-perfume-samples',
    page_title: 'VOIDEX Perfume Samples',
    page_description: 'Premium fragrance samples and travel sprays from VOIDEX. Try luxury scents in 2mL, 5mL, and 10mL sizes.',
    content_for_header: '',
    __form_posted: posted
  };

  const sectionHtml = await engine.parseAndRender(shopifyCompat(stripSchema(sectionSrc)), {
    ...globals,
    section: { id: sectionKey, settings, blocks }
  });
  const schema = schemaOf(sectionSrc);
  const wrapped = `<div id="shopify-section-${sectionKey}" class="shopify-section ${schema.class || ''}">${sectionHtml}</div>`;

  const layoutSrc = read(`layout/${tpl.layout}.liquid`);
  const html = await engine.parseAndRender(shopifyCompat(layoutSrc), { ...globals, content_for_layout: wrapped });
  fs.writeFileSync(path.join(OUT, file), html);
  return html;
}

(async () => {
  fs.copyFileSync(path.join(THEME, 'assets/voidex-perfume.css'), path.join(OUT, 'assets/voidex-perfume.css'));
  fs.copyFileSync(path.join(THEME, 'assets/voidex-perfume.js'), path.join(OUT, 'assets/voidex-perfume.js'));
  const html = await render();
  await render({ posted: true, file: 'posted.html' });
  await render({ emptyCollection: true, file: 'empty.html' });
  console.log('built', OUT, html.length, 'bytes');
})().catch((e) => { console.error(e); process.exit(1); });
