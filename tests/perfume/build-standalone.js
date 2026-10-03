// Renders the standalone theme (voidex-theme-standalone/) home, product and cart pages with real
// product data so the zip can be checked in Chromium before upload. Usage: node build-standalone.js
const fs = require('fs');
const path = require('path');
const { Liquid, Tag, Hash } = require('liquidjs');
const THEME = path.resolve(__dirname, '../../voidex-theme-standalone');
const OUT = path.join(__dirname, 'site-standalone');
fs.mkdirSync(path.join(OUT, 'assets'), { recursive: true });
const read = (p) => fs.readFileSync(path.join(THEME, p), 'utf8');
const strip = (s) => s.replace(/{%-?\s*schema\s*-?%}[\s\S]*?{%-?\s*endschema\s*-?%}/, '').replace(/posted_successfully\?/g, 'posted_successfully_q');
const schemaOf = (s) => JSON.parse(s.match(/{%-?\s*schema\s*-?%}([\s\S]*?){%-?\s*endschema\s*-?%}/)[1]);
const engine = new Liquid({ strictFilters: true, root: [path.join(THEME, 'snippets')], extname: '.liquid' });
const money = (c) => '$' + (Number(c || 0) / 100).toFixed(2);
engine.registerFilter('money', money);
engine.registerFilter('money_without_currency', (c) => (Number(c || 0) / 100).toFixed(2));
engine.registerFilter('money_with_currency', (c) => money(c) + ' CAD');
engine.registerFilter('asset_url', (f) => '/assets/' + f);
engine.registerFilter('stylesheet_tag', (u) => `<link href="${u}" rel="stylesheet">`);
engine.registerFilter('image_url', (img) => (img && (img.src || img)) || '');
engine.registerFilter('image_tag', (url, ...a) => `<img src="${url}" alt="" class="${(a.find((x) => x[0] === 'class') || [])[1] || ''}">`);
engine.registerFilter('payment_type_svg_tag', () => '<svg class="vx-pay-icon" viewBox="0 0 38 24"><rect width="38" height="24" rx="3" fill="#222"/></svg>');
engine.registerFilter('default_errors', () => '');
engine.registerFilter('default_pagination', () => '');
engine.registerTag('schema', class extends Tag { constructor(t, r, l) { super(t, r, l); while (r.length) if (r.shift().name === 'endschema') return; } * render() { return ''; } });
engine.registerTag('paginate', class extends Tag {
  constructor(t, r, l) { super(t, r, l); this.tpls = []; const s = this.liquid.parser.parseStream(r).on('tag:endpaginate', () => s.stop()).on('template', (x) => this.tpls.push(x)); s.start(); }
  * render(ctx, em) { ctx.push({ paginate: { pages: 1 } }); yield this.liquid.renderer.renderTemplates(this.tpls, ctx, em); ctx.pop(); }
});
engine.registerTag('form', class extends Tag {
  constructor(t, r, l) { super(t, r, l); const m = t.args.match(/^\s*'([^']+)'\s*,?\s*(.*)$/); this.type = m[1]; this.hash = new Hash((m[2] || '').replace(/^product\s*,?/, '')); this.tpls = []; const s = this.liquid.parser.parseStream(r).on('tag:endform', () => s.stop()).on('template', (x) => this.tpls.push(x)); s.start(); }
  * render(ctx, em) {
    const o = yield this.hash.render(ctx);
    const attrs = Object.entries(o).map(([k, v]) => `${k}="${v}"`).join(' ');
    const action = this.type === 'product' ? '/cart/add' : '/contact';
    ctx.push({ form: { posted_successfully_q: false, errors: null, name: '', email: '', body: '', order_number: '' } });
    em.write(`<form method="post" action="${action}" ${attrs}><input type="hidden" name="form_type" value="${this.type}">`);
    yield this.liquid.renderer.renderTemplates(this.tpls, ctx, em); em.write('</form>'); ctx.pop();
  }
});
engine.registerTag('section', class extends Tag {
  constructor(t, r, l) { super(t, r, l); this.name = t.args.trim().replace(/['"]/g, ''); }
  * render(ctx, em) {
    const src = read(`sections/${this.name}.liquid`); const sch = schemaOf(src); const settings = {};
    (sch.settings || []).forEach((s) => { if (s.id) settings[s.id] = s.default; });
    ctx.push({ section: { id: this.name, settings, blocks: [] } });
    const html = yield this.liquid.parseAndRender(strip(src), ctx.getAll()); ctx.pop();
    em.write(`<div id="shopify-section-${this.name}" class="shopify-section ${sch.class || ''}">${html}</div>`);
  }
});

const IMG = { 'voidex-amber-noir-edp-sample': '/img/amber.svg', 'voidex-citrus-royale-edp-sample': '/img/citrus.svg', 'voidex-oud-wood-edp-sample': '/img/oud.svg', 'voidex-rose-velvet-edp-sample': '/img/rose.svg' };
const products = JSON.parse(fs.readFileSync(path.join(__dirname, 'products.json'))).map((p) => {
  const v = p.variants; const img = { src: IMG[p.handle], alt: p.title, media_type: 'image' };
  return { ...p, url: '/products/' + p.handle, price: v[0].price, price_min: Math.min(...v.map((x) => x.price)), price_varies: true, available: true,
    featured_image: img, media: [img], has_only_default_variant: false, options: ['Size'], selected_or_first_available_variant: v[0] };
});
const collection = { handle: 'voidex-perfume-samples', title: 'VOIDEX Perfume Samples', products, products_count: 4, url: '/collections/voidex-perfume-samples' };
const cartItems = [products[0], products[3], products[2]].map((p, i) => ({ key: 'k' + i, url: p.url, image: p.featured_image, title: p.title, product: p, variant: p.variants[i], quantity: 1, final_line_price: p.variants[i].price, line_level_discount_allocations: [], url_to_remove: '/cart/change?line=' + (i + 1) + '&quantity=0' }));
const globals = {
  shop: { name: 'VOIDEX.SHOP', money_format: '${{amount}}', enabled_payment_types: ['visa', 'master', 'paypal'], privacy_policy: { url: '/policies/privacy-policy' }, refund_policy: { url: '/policies/refund-policy' }, shipping_policy: { url: '/policies/shipping-policy' }, terms_of_service: { url: '/policies/terms-of-service' } },
  routes: { root_url: '/', cart_url: '/cart', cart_add_url: '/cart/add', account_url: '/account', search_url: '/search', all_products_collection_url: '/collections/all' },
  cart: { currency: { iso_code: 'CAD' }, item_count: 3, items: cartItems, total_price: cartItems.reduce((s, i) => s + i.final_line_price, 0), cart_level_discount_applications: [] },
  request: { locale: { iso_code: 'en' }, page_type: 'index' }, page_image: { src: '//voidexshop.com/cdn/shop/files/og.jpg' },  collections: { 'voidex-perfume-samples': collection }, collection,
  canonical_url: 'https://voidexshop.com/', page_title: 'VOIDEX.SHOP', content_for_header: ''
};
async function page(file, tplName, extra) {
  const tpl = JSON.parse(read(`templates/${tplName}.json`)); let body = '';
  for (const key of tpl.order) {
    const sec = tpl.sections[key]; const src = read(`sections/${sec.type}.liquid`); const sch = schemaOf(src);
    const settings = { ...sec.settings }; if (settings.collection === 'voidex-perfume-samples') settings.collection = collection;
    const blocks = (sec.block_order || []).map((id) => ({ id, type: sec.blocks[id].type, settings: sec.blocks[id].settings, shopify_attributes: '' }));
    body += `<div class="shopify-section ${sch.class || ''}">` + (await engine.parseAndRender(strip(src), { ...globals, ...extra, section: { id: key, settings, blocks } })) + '</div>';
  }
  const html = await engine.parseAndRender(strip(read('layout/theme.liquid')), { ...globals, ...extra, content_for_layout: body });
  fs.writeFileSync(path.join(OUT, file), html);
}
(async () => {
  for (const f of ['voidex-perfume.css', 'voidex-perfume.js']) fs.copyFileSync(path.join(THEME, 'assets', f), path.join(OUT, 'assets', f));
  // stand-in product photos (the real Kling images live on cdn.shopify.com, unreachable from here)
  fs.mkdirSync(path.join(OUT, 'img'), { recursive: true });
  for (const [n, c] of [['amber', '#c9822b'], ['citrus', '#d8cf55'], ['oud', '#6b3f22'], ['rose', '#c4507a']])
    fs.writeFileSync(path.join(OUT, 'img', n + '.svg'), `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400"><rect width="400" height="400" fill="#070707"/><circle cx="200" cy="230" r="150" fill="${c}" opacity=".12"/><rect x="185" y="90" width="30" height="30" rx="4" fill="#d4af37"/><rect x="150" y="125" width="100" height="170" rx="14" fill="${c}" stroke="#d4af37" stroke-opacity=".4"/><text x="200" y="350" fill="#777" font-size="14" text-anchor="middle" font-family="sans-serif">stand-in image</text></svg>`);
  await page('index.html', 'index', {});
  await page('product.html', 'product', { product: products[0], page_title: products[0].title, request: { locale: { iso_code: 'en' }, page_type: 'product' } });
  await page('cart.html', 'cart', {});
  await page('collection.html', 'collection', {});
  await page('contact.html', 'page.contact', { page: { title: 'Contact', content: '<p>Questions about a scent or an order? Write to us below.</p>' }, page_title: 'Contact' });
  console.log('built', OUT);
})().catch((e) => { console.error(e); process.exit(1); });
