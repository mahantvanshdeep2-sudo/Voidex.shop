// Renders the winter theme (voidex-theme-winter/) home + jacket product page with a fixture of the real
// Heated Jacket data, for Chromium checks before upload. Usage: node build-winter.js
const fs = require('fs');
const path = require('path');
const { Liquid, Tag, Hash } = require('liquidjs');
const THEME = path.resolve(__dirname, '../../voidex-theme-winter');
const OUT = path.join(__dirname, 'site-winter');
fs.mkdirSync(path.join(OUT, 'assets'), { recursive: true });
fs.mkdirSync(path.join(OUT, 'img'), { recursive: true });
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
engine.registerFilter('image_tag', (url, ...a) => {
  const attrs = a.filter((x) => Array.isArray(x)).map(([k, v]) => (k === 'loading' || k === 'sizes' || k === 'widths' ? '' : `${k.replace(/_/g, '-')}="${v}"`)).join(' ');
  return `<img src="${url}" ${attrs}>`;
});
engine.registerFilter('payment_type_svg_tag', () => '<svg class="vx-pay-icon" viewBox="0 0 38 24"><rect width="38" height="24" rx="3" fill="#222"/></svg>');
engine.registerFilter('default_errors', () => '');
engine.registerFilter('default_pagination', () => '');
engine.registerTag('schema', class extends Tag { constructor(t, r, l) { super(t, r, l); while (r.length) if (r.shift().name === 'endschema') return; } * render() { return ''; } });
engine.registerTag('form', class extends Tag {
  constructor(t, r, l) { super(t, r, l); const m = t.args.match(/^\s*'([^']+)'\s*,?\s*(.*)$/); this.type = m[1]; this.hash = new Hash((m[2] || '').replace(/^product\s*,?/, '')); this.tpls = []; const s = this.liquid.parser.parseStream(r).on('tag:endform', () => s.stop()).on('template', (x) => this.tpls.push(x)); s.start(); }
  * render(ctx, em) {
    const o = yield this.hash.render(ctx);
    const attrs = Object.entries(o).map(([k, v]) => `${k}="${v}"`).join(' ');
    em.write(`<form method="post" action="${this.type === 'product' ? '/cart/add' : this.type === 'localization' ? '/localization' : '/contact'}" ${attrs}><input type="hidden" name="form_type" value="${this.type}">`);
    ctx.push({ form: { posted_successfully_q: false, errors: null } });
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

// Fixture: all 96 real variants of the live Heated Jacket (ids, options, prices), in the store's own
// option-value order (Size comes back as S, M, 2XL ... 6XL, L, XL; the buy box must sort it).
const FX = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures', 'heated-jacket-variants.json'), 'utf8'));
const COLORS = { 'Black Zone2': '#222', 'Black Zone4': '#2a2a2a', 'Blue Zone8': '#2c5fb8', 'Red Zone8': '#b8262f', 'Black Zone8 Set': '#333', 'Black Zone8': '#1d1d1d', 'Black Zone9': '#111', 'Blue Zone2': '#3a6fc8', 'Blue Zone4': '#3366bb', 'Red Zone2': '#c43a3a', 'Red Zone4': '#a83030' };
for (const [n, c] of Object.entries(COLORS)) fs.writeFileSync(path.join(OUT, 'img', n.replace(/ /g, '-') + '.svg'), `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400"><rect width="400" height="400" fill="#fff"/><path d="M140 90h120l40 60-30 20v170H130V170l-30-20z" fill="${c}"/><text x="200" y="380" fill="#999" font-size="14" text-anchor="middle" font-family="sans-serif">${n} (stand-in)</text></svg>`);
const img = (n) => ({ src: '/img/' + n.replace(/ /g, '-') + '.svg', id: 52823270000000 + Object.keys(COLORS).indexOf(n) });
// Two generic supplier photos that belong to no variant, like the live product's first ten photos.
const generic = [1, 2].map((i) => { fs.writeFileSync(path.join(OUT, 'img', `generic-${i}.svg`), `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400"><rect width="400" height="400" fill="#fde"/><text x="200" y="200" fill="#a33" font-size="18" text-anchor="middle" font-family="sans-serif">old supplier photo ${i}</text></svg>`); return { src: `/img/generic-${i}.svg`, id: 52823269999990 + i }; });
// The six Kling photos saved to Shopify Files on 2026-10-03, keyed by their Files name, as 900px copies.
const PHOTOS = { front: 'zI4NTZkNjY5', back: '2MwZGU4MWUy', street: '2ZlYzAwYjI5', detail: 'zU0ZTM5NDc5', storm: 'zZkNTQ1OWI1', roadside: 'zY3MTVlY2Nh' };
const photoFor = (ref) => {
  const hit = Object.entries(PHOTOS).find(([, key]) => ref.includes('MTEyL' + key));
  if (!hit) throw new Error('unknown shop image ' + ref);
  fs.copyFileSync(path.join(__dirname, 'fixtures', 'photos', hit[0] + '.jpg'), path.join(OUT, 'img', hit[0] + '.jpg'));
  return { src: '/img/' + hit[0] + '.jpg', id: 46326035000000 + Object.keys(PHOTOS).indexOf(hit[0]), alt: hit[0] };
};
const variants = FX.variants.map(([id, c, s, p, a]) => ({ id, title: `${c} / ${s}`, price: p, compare_at_price: null, available: a, options: [c, s], option1: c, option2: s, featured_image: img(c) }));
const colorVals = FX.option_values.Color; const sizeVals = FX.option_values.Size;
const jacket = {
  title: 'Winter Heated Jacket USB Electric Cotton Coat Zip-up Heater Thermal Clothing Heating Vest For Men',
  id: 15402327769338, handle: 'winter-heated-jacket', url: '/products/winter-heated-jacket', vendor: 'VOIDEX', available: true,
  description: '<p>Supplier description.</p>', variants, has_only_default_variant: false,
  selected_or_first_available_variant: variants[0], selected_variant: null, featured_image: generic[0],
  images: generic.concat(colorVals.map(img)), options: ['Color', 'Size'],
  options_with_values: [{ name: 'Color', values: colorVals, selected_value: 'Black Zone2' }, { name: 'Size', values: sizeVals, selected_value: 'S' }],
  price: 8899, price_min: 8899, price_varies: true
};
// The other products published to the online store on 2026-10-03 (Admin API), with stand-in images.
const standIn = (file, label) => { fs.writeFileSync(path.join(OUT, 'img', file), `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400"><rect width="400" height="400" fill="#eef2f6"/><text x="200" y="200" fill="#667" font-size="18" text-anchor="middle" font-family="sans-serif">${label} (stand-in)</text></svg>`); return { src: '/img/' + file, alt: label }; };
const washBag = { id: 9429393735930, title: 'VOIDEX Sneaker Wash Bag — Machine-Safe Padded Shoe Laundry Bag', handle: 'voidex-sneaker-wash-bag', url: '/products/voidex-sneaker-wash-bag', vendor: 'VOIDEX', available: true, price_min: 2099, price_varies: true, featured_image: standIn('wash-bag.svg', 'Sneaker Wash Bag') };
const snowTool = { id: 15405275611386, title: 'Special Glass For Car Snow Removal Tools Deicing And Melting Snow', handle: 'special-glass-for-car-snow-removal-tools-deicing-and-melting-snow', url: '/products/special-glass-for-car-snow-removal-tools-deicing-and-melting-snow', vendor: 'VOIDEX', available: true, price_min: 4729, price_varies: true, featured_image: standIn('snow-tool.svg', 'Snow Removal Tool') };
const globals = {
  collections: { all: { products: [jacket, washBag, snowTool] } },
  shop: { name: 'VOIDEX.SHOP', money_format: '${{amount}}', enabled_payment_types: ['visa'], privacy_policy: { url: '/policies/privacy-policy' }, refund_policy: { url: '/policies/refund-policy' }, shipping_policy: { url: '/policies/shipping-policy' }, terms_of_service: { url: '/policies/terms-of-service' } },
  routes: { root_url: '/', cart_url: '/cart', cart_add_url: '/cart/add', account_url: '/account', search_url: '/search', collections_url: '/collections', all_products_collection_url: '/collections/all' },
  cart: { currency: { iso_code: 'CAD' }, item_count: 0, items: [], total_price: 0, cart_level_discount_applications: [] },
  request: { locale: { iso_code: 'en' }, page_type: 'index' }, page_image: img('Black Zone2'),
  canonical_url: 'https://voidexshop.com/', page_title: 'VOIDEX.SHOP', content_for_header: '',
  // Markets on 2026-10-03: Canada (primary), US, EU and Rest of World, each in its own currency.
  localization: { country: { iso_code: 'CA' }, available_countries: [['CA', 'Canada', 'CAD', '$'], ['US', 'United States', 'USD', '$'], ['DE', 'Germany', 'EUR', '€'], ['GB', 'United Kingdom', 'GBP', '£'], ['AU', 'Australia', 'AUD', '$']].map(([iso_code, name, cur, symbol]) => ({ iso_code, name, currency: { iso_code: cur, symbol } })) }
};
async function page(file, tplName, extra) {
  const tpl = JSON.parse(read(`templates/${tplName}.json`)); let body = '';
  for (const key of tpl.order) {
    const sec = tpl.sections[key]; const src = read(`sections/${sec.type}.liquid`); const sch = schemaOf(src);
    const settings = {}; (sch.settings || []).forEach((s) => { if (s.id) settings[s.id] = s.default; });
    Object.assign(settings, sec.settings || {}); if (settings.product) settings.product = jacket;
    for (const [k, v] of Object.entries(settings)) if (typeof v === 'string' && v.startsWith('shopify://shop_images/')) settings[k] = photoFor(v);
    const blocks = (sec.block_order || []).map((id) => {
      const b = sec.blocks[id]; const bs = {}; ((sch.blocks || []).find((x) => x.type === b.type).settings || []).forEach((s) => { if (s.id) bs[s.id] = s.default; });
      return { id, type: b.type, settings: Object.assign(bs, b.settings), shopify_attributes: '' };
    });
    body += `<div class="shopify-section ${sch.class || ''}">` + (await engine.parseAndRender(strip(src), { ...globals, ...extra, section: { id: key, settings, blocks } })) + '</div>';
  }
  const html = await engine.parseAndRender(strip(read('layout/theme.liquid')), { ...globals, ...extra, content_for_layout: body });
  fs.writeFileSync(path.join(OUT, file), html);
}
(async () => {
  for (const f of ['voidex-perfume.css', 'voidex-perfume.js', 'voidex-winter.css', 'voidex-winter.js']) fs.copyFileSync(path.join(THEME, 'assets', f), path.join(OUT, 'assets', f));
  await page('index.html', 'index', {});
  await page('product.html', 'product', { product: jacket, page_title: jacket.title, request: { locale: { iso_code: 'en' }, page_type: 'product' } });
  // Single-option product page (the live Sneaker Wash Bag: White / Grey / Value Set), which uses the simpler size-button layout.
  const bagVariants = [['White', 2099], ['Grey', 2399], ['Value Set', 3599]].map(([t, p], i) => ({ id: 50000000000001 + i, title: t, price: p, compare_at_price: null, available: true, options: [t] }));
  const bag = { ...washBag, description: '<p>Padded sneaker wash bag.</p>', variants: bagVariants, has_only_default_variant: false, selected_or_first_available_variant: bagVariants[0], options: ['Style'], media: [{ media_type: 'image', src: washBag.featured_image.src, alt: 'Sneaker Wash Bag' }] };
  await page('product-bag.html', 'product', { product: bag, page_title: bag.title, request: { locale: { iso_code: 'en' }, page_type: 'product' } });
  console.log('built', OUT);
})().catch((e) => { console.error(e); process.exit(1); });
