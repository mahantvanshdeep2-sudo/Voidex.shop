# VOIDEX.SHOP — Changelog

Changes, fixes, findings, and decisions, most recent first.

## 2026-10-01 (evening) — Supplier outreach and risk clean-up

- Quote-request emails sent from the owner's Gmail (ids 1a0f86c0252ebd10, 1a0f86c07dcbae7c,
  1a0f86c09b8a2f2a) to DailyFulfill, Brandsamor and Jubilee. All ask for original scents only (no
  "inspired by"/dupes), UN1266 ground/DDP shipping to Canada, SDS + allergen list, samples first.
- "Oud Wood" → "Midnight Oud" (title, description, handle with `redirectNewHandle`); new product
  image re-rendered with the new label name.
- `policies/01-refund-policy.html`: new "Fragrance samples and travel sprays" section — needs a
  manual paste (connector has no `write_legal_policies`).

## 2026-10-01 (later) — Perfume prices doubled

Owner chose "double every price". All 12 variants updated via `productVariantsBulkUpdate`, zero errors:
Amber Noir 9.94/15.94/25.94, Citrus Royale 7.94/11.94/19.94, Rose Velvet 5.94/9.94/17.94,
Oud Wood 11.94/17.94/29.94 (2mL/5mL/10mL, CAD). Both themes read prices from Shopify, so the
storefront updates with no theme change. Video ad 2's baked-in "From $4.97" text is now out of date.

## 2026-10-01 — Perfume samples launch: Royal Black Gold theme, images, video ads, go-live

Owner's request: build a black-and-gold perfume landing theme (draft), generate product images and
4 Kling 3.0 ads, then activate the 4 perfume samples with discount codes and navigation.

### Found first (Admin API)

- **Live theme changed:** MAIN is now "Updated copy of Savor" (`186287948026`, published
  2026-09-28), not Savor `167336870138`.
- At 12:01 UTC another tool (the installed **Shopify Perplexity MCP App**) had uploaded a perfume
  section + template to the DEV theme. Not usable as-is: wrong palette (`#c9a96e`), size buttons
  don't change the price, bundle builder is static, fake fallback cards with dead buttons, and it
  renders inside Savor's own header/footer. Left in place on DEV; superseded below.
- CJdropshipping app **is** installed (contradicts the 2026-09-30 note). Judge.me Reviews too.

### Task 1 — theme `VOIDEX Royal Black Gold — DRAFT` (`186421772538`, unpublished)

Not built as a standalone 7-file theme: published alone, product, cart, collection and policy
pages would have no templates. Instead `themeDuplicate` of the live theme + a dedicated layout, so
the landing page is fully black & gold and every other page keeps working.

Files (`voidex-theme/`): `layout/voidex-perfume.liquid`, `templates/page.voidex-perfume.json`
(`"layout": "voidex-perfume"`), `sections/voidex-perfume-{landing,header,footer,announcement}.liquid`,
`assets/voidex-perfume.{css,js}`. `config/settings_schema.json` / `settings_data.json` and
`layout/theme.liquid` are Savor's and were deliberately not replaced.

Built: #050505 / #d4af37, gold-gradient text, Playfair Display / Inter / Cormorant Garamond,
VØIDEX logo (nowrap), animated hero, canvas gold particles, scroll progress bar, How It Works with
hover lift, live bundle builder (3 scents × size, 30% off, adds all 3 variants then applies
`BUNDLE30` via `/discount/BUNDLE30?redirect=/cart`), product grid from the collection with CSS 3D
bottles (float, 360° spin on hover, mouse-follow glow), size buttons that update price + variant id,
AJAX add-to-cart with plain-form fallback, Women's/Men's/Unisex filters (from tags), trust badges,
size guide, FAQ accordion (6), email capture on Shopify's customer form showing `VOIDEX10`, footer
with real policy links, hamburger menu, scroll reveals and stat counters. All copy is editable in the
theme editor (section settings + blocks).

**Copy changed from the owner's mock-up, and why** (all editable back in the theme editor):
- "500+ fragrances" → the real collection count (4); "$4.97 starting price" → computed ($2.97).
- "4.9/5 from 2,800+ verified reviews", "Join 15,000+", the press logos and "same scent profiles as
  designer fragrances" removed — none are true for this store.
- Reviews section built (3 cards, stars, verified badge) but **off by default** and the verified
  badge unticked: the store has no perfume orders, and invented "Verified Buyer" reviews breach the
  Competition Act and the FTC fake-review rule. Judge.me is installed for real ones.
- Shipping/refund wording matches `policies/01` and `02` (1 business day dispatch, 3–5 days CA,
  30-day refund) instead of the mock-up's "5–10 days" / "no return needed".

### Verification

- **Chromium, 59/59 checks** (`tests/perfume/`, `npm test`): the real theme files rendered by
  LiquidJS with the real product data (variant IDs, prices, tags) and mocked cart endpoints. Covers
  every feature above, 320/375/414px with no horizontal scroll, reduced motion, JS-blocked failsafe,
  empty collection, sign-up success state, no console errors. Bugs it caught and that were fixed
  before upload: FAQ answers stuck closed if the JS fails to load; stat counter briefly showing
  "-5" (rAF timestamp before start); CSS reset out-ranking components (titles off-centre, light text
  on gold buttons — caught from the screenshots, now a test).
- **Theme Check** (`@shopify/theme-check-node`): 0 errors; 3 warnings = Google Fonts not on
  Shopify's CDN (expected).
- **Upload:** staged upload + `themeFilesUpsert` type `URL`. Shopify's `size` **and `checksumMd5`
  match the local file for all 8 files** (e.g. landing section 30,730 B `5e6f4033…`, CSS 42,286 B
  `9520bd97…`, template 8,313 B `bce59fd3…`). Theme role still `UNPUBLISHED`; MAIN unchanged.
- **Not verified:** rendering on the real storefront (egress-blocked). The preview link is that check.

### Task 2 — product images

Kling connector, model Nano Banana Pro (`gemini-3-pro-image`), 2K square, 20 credits each. Amber
Noir generated first; the other three made from it (image-to-image) so the line matches. Attached
with alt text via `productUpdate(media:)`; all four `READY`, 2048×2048 on cdn.shopify.com.
**Not visually checked by Claude** — `*.klingai.com` and `cdn.shopify.com` are egress-blocked.

### Task 3 — Kling 3.0 ads

`kling-video-v3_0`, 9:16, 1080p, audio on, owner's prompts verbatim except "20 seconds" → 15 (Kling
3.0's maximum single clip; inside the 15–30s spec). 180 credits each. Kling credits 3,000 → 2,280.
Ad 4 saved to Shopify Files (15.0 MB, video/mp4). Ads 1–3 exceeded Shopify's generic-file size limit
(native video import needs a staged upload, which needs bytes this container can't download); they
remain in the owner's Kling library. Text overlays are rendered by Kling, so spelling is unverified.

### Task 4 — go-live (live store)

- 4 products `DRAFT → ACTIVE`, published to **Online Store only**; all 12 variants `CONTINUE`
  (inventory untracked). `availableForSale: true` on all 12.
- `VOIDEX10` and `BUNDLE30` created (see CLAUDE.md for rules).
- Page `voidex-perfume-samples` already used template suffix `voidex-perfume` — confirmed.
  Body gained a "Shop all four scents →" link, because on the live theme (no such template) the
  page falls back to Savor's plain page template.
- Main menu: "Perfume Samples" inserted after "Shop"; existing 4 items kept their IDs.

## 2026-09-30 — Supplier, ad-tool and Meta audit; theme options

### Found (raw API data)

- **Meta:** the Meta Ads connector is now attached to Claude, but its login sees **0 ad
  accounts and 0 catalogs**, and `ads_get_datasets` for `1095760916509693` returns "Ad account
  not found or you do not have access". The Shopify "Facebook & Instagram" channel is installed
  (publication `223184879866`), but no catalog is visible to this Meta login. Store-to-Meta is
  **not verified connected**; pixel/Conversions API still unverified.
- **Kling AI** (connected): free NORMAL plan, 0 credits. **Higgsfield** (connected): free plan,
  10 credits.
- **Suppliers:** no supplier app installed. Fulfillment services left over from uninstalled apps:
  Zendrop, Sell The Trend, Dropshipping App (9UsAY), Dropshipping App (RX31S); locations also
  include "AutoDS prod-tkjbvwcr (app uninstalled)" and an empty "UNITED STATES" (California).
- **Order #1001:** its only fulfillment was created 2 seconds after the order, at the Manual
  location, with **no tracking number**. So Shopify holds no evidence of the "delivered on day
  3" data point the delivery promise was based on; confirm with the owner how it was delivered.
- **Logo:** none in Shopify files, either theme's settings, Drive or Gmail.

### Recommended to the owner (awaiting his decisions)

- Supplier: **CJdropshipping** — free app, Canada warehouse (3–7 days), US (5–10), China
  (10–20), DDP available. Compared against Spocket ($39.99/mo+, Canadian, pricier goods),
  Zendrop (free / $49 Pro, US+CA warehouses) and DSers + AliExpress (free/$19.90, 15–45 days,
  tax at the door in Canada).
- Ad content: **Kling Standard for one month** ($6.99 first month, then $8.80; 660 credits ≈ 6–7
  eight-second 1080p clips with audio). Kling is a video model (realistic product and animal
  motion), not a talking-actor UGC tool; Higgsfield runs Kling 3.0 plus talking-head UGC presets
  (Marketing Studio) — add it only if tests show talking-head ads are needed. Third-party
  Higgsfield prices conflict ($9–15 entry up to $129).
- Theme: options page https://claude.ai/artifact/Vwe5ybH7srbcq1Ce5UzpjZ — 1 Monolith (current
  DEV), 2 Night Walk (recommended), 3 Wash Cycle, 4 buy "Motion" by Archetype (US$400–420).
  Nothing applied.

## 2026-09-28 — Pet product research, two draft options

The owner reopened pet products (dropped 2026-09-14) with a new rule: retail = 3× landed cost,
$30–50+ preferred. Research ran on WebSearch only — WebFetch is egress-blocked for trend sites,
AliExpress and CJ — so supplier costs are **targets, not quotes**.

### Store state checked first (Admin API)

- Orders: still only #1001. Wash Bag stock 47 (White 11 / Grey 16 / Value Set 20); **no unit
  cost recorded on it**, so Shopify can't report its margin.
- Terms of Service and Contact Information policies: **not yet re-pasted** (same `updatedAt`
  as 2026-09-24; Terms still has 10 placeholders).
- DEV theme still unpublished. Storefront still egress-blocked (403).
- Gmail: 3 contact-form messages (21, 23, 24 Sep) read in full — all "is this the store owner?"
  solicitation spam. Not answered, per the owner's standing ignore decision.

### Options that pass every rule (both created as DRAFT, unpublished, 0 stock, no images)

| | Fireworks Calm Kit | Glow-Walk LED Dog Boots (4) |
|---|---|---|
| Price / max landed cost at 3× | $49.99 / $16.66 | $44.99 / $15.00 |
| Demand evidence | 41% of dog owners say their dog fears fireworks (PDSA); Brampton logged 3,389 bylaw requests 17–22 Oct 2025, 44% fireworks/noise; Mississauga 432 complaints; several new 2026 Amazon listings | Top performer on Sell The Trend's pet list for 20 Sep 2026 ("LightPaws Shoes"); multiple "2026 New" TikTok Shop listings |
| Timing | Halloween 31 Oct, Diwali 8 Nov 2026 (6–10 Nov), New Year's Eve | Dark by 5 pm Nov–Feb, road salt |
| Main catch | Seasonal; efficacy claims must stay modest; compression wraps (Thundershirt) sold at PetSmart | Competition rising fast (new Amazon ASINs B0GK…/B0GL…/B0HH…); sizing returns |

### Rejected, and why

- Electric paw washer — Walmart lists it around US$21.98; can't hold $30+.
- Pet grooming vacuum — crowded (Oneisall, Geoorood, BXYY), heavy; 3× landed cost overshoots market.
- Heated cat bed — K&H at PetSmart; fails "not available everywhere".
- Self-rolling cat ball — Cheerble plus many clones, ~$27.
- Automatic ball launcher — $11.99–$175 across many TikTok Shop sellers; heavy; 3× overshoots clones.
- Consumables (collagen chews, dental powder) — Health Canada rules for veterinary products; skip.
- Shopify Collective: no suppliers for LED boots or dog ear muffs.

### Constraint for any China-shipped product

Canada's tax-free threshold for goods from China is CA$20, so a $45–50 order owes GST/HST plus
a courier or Canada Post handling fee (CA$9.95) **at the customer's door** unless the supplier
ships DDP. Require DDP (or a North American warehouse) and count it in landed cost. The
store-wide promise (dispatch in 1 business day, 3–5 days in Canada) will not hold for China
shipping — the chosen product needs its own delivery profile and shipping-policy wording.

### Also

- Added the owner's `THEME_BUILD_SPEC.md` as `docs/THEME_BUILD_SPEC.md`, with a status table.
  The uploaded `CLAUDE.md` / `CHANGELOG.md` were older copies of files already in the repo.

## 2026-09-24 (later) — Policy audit after the owner's paste, connector re-check

### Verified via Admin API

- **Refund** and **Shipping** policies: live text identical to `policies/01` and `02`
  (text-level diff; 1,459 and 1,700 characters on both sides).
- **Privacy policy**: Shopify-generated, no placeholders, address/phone/email all match.
- **Shopify connector after the owner reconnected**: same 63 scopes as before, still no
  `write_legal_policies`. Reconnecting does not add it — the connector doesn't request it.
- **Gmail**: `search_threads` now works (it failed on OAuth scope before the reconnect).
- **DEV theme**: every `templates/*.json` and both section groups scanned for restaurant demo
  copy — none left.

### Found broken

- **Terms of service**: Shopify's Terms template was generated and the draft pasted after it.
  The whole ~24,000-character template sits inside a single `<h2>`, so it renders as one giant
  heading; 10 placeholders show to customers (`[LINK]` ×4, `[INSERT …]` ×5,
  `[NOTE TO MERCHANT …]`); and two governing-law clauses contradict each other ("state or
  territorial courts" vs Ontario). `policies/03-terms-of-service.html` is rewritten as one clean
  document to replace the whole box.
- **Contact information**: holds only the email line; `policies/04` still needs pasting.

### Correction

A chat reply earlier today said theme publishing was not API-blocked because `write_themes` is
granted. The test recorded in the entry below stands: the connector refuses `themePublish` and
live-theme writes regardless of scope.

## 2026-09-24 — Store cleanup, consistent delivery promise, professional palette

### Delivery time: four different numbers, now one

The store quoted four different delivery times. Order #1001 (placed 21 Sep, delivered on the
third day) is the only real data point. Everything now reads the same, because a product page
that disagrees with checkout is what produces chargebacks:

| Where | Before | Now |
|---|---|---|
| Product description | "2–3 weeks … overseas fulfilment partner" | 3–5 business days (CA) |
| Shoe Care FAQ | "2–3 weeks to anywhere in Canada" | 3–5 business days (CA) |
| Checkout rate name | "Standard", no estimate | "Free Shipping (3–5 business days)" |
| Shipping policy text | "7–14 business days" | Matches the table |

Canada is quoted at 3–5 rather than 3, the US at 3–7, rest of world at 7–14 — one delivery is
not a sample, and an unmet promise costs more than a cautious one.

### Changed on the live store

- **Product description** — rewrote the shipping section; removed the "2–3 weeks / overseas"
  claim.
- **Product SEO** — title and meta description were empty; both written.
- **Product URL** — `/products/voided-sneaker-wash-bag-…` → `/products/voidex-sneaker-wash-bag`.
  The old handle still carried the "VOIDED" spelling from the abandoned brand split.
- **Shoe Care FAQ** — corrected the shipping answer, added a shipping-cost answer and a
  "how do I reach a human" answer.
- **Contact page** — was completely empty. Now has address, email, phone, hours, and a
  shipping/returns summary.
- **Main menu** — "Catalog" → "Shop"; added FAQ and Contact.
- **Footer menu** — was Search + Your Privacy Choices. Now the product and All Products.
- **New "Help" menu** — FAQ, Contact, Your Privacy Choices, Search.
- **Checkout shipping rates** — renamed to carry the delivery estimate; the duplicate free
  "Express" rate on Rest of World was deactivated. Two free rates with identical speed is not
  a choice, it's a bug the customer has to resolve.

### Changed on the dev theme (`167583219962`)

- **Palette.** Savor ships a restaurant scheme — `#a42325` brick red and `#e8d5c7` cream. On a
  shoe-care store it reads as a diner. Replaced with near-black `#0A0A0A` on white, warm
  off-white `#F4F1EC` for alternating sections, `#E2E2E2` for borders. Unlike a colour, a
  near-black primary never fights product photography.
- **Footer background** `#2563eb` → `#0A0A0A`. The blue matched nothing else on the page.
- **Footer columns.** "Ask" and "Connect" were headings with no menu attached, so they rendered
  as bare words with nothing underneath. "Ask" now points at the new Help menu and is renamed
  "Help"; "Connect" is removed, since the social icons already render in the utilities row.

### Blocked — needs the owner

- **Policies.** The connector lacks `write_legal_policies`, so `shopPolicyUpdate` is denied.
  Finished text for Refund, Shipping, Terms of Service and Contact Information is in
  `policies/`, ready to paste. Shipping, Terms and Contact are currently *empty* on the store,
  and the existing Refund policy has Shipping and Terms crammed inside it.
- **Theme publishing.** The connector blocks `themePublish` and blocks all writes to the live
  theme. The dev theme has to be published from admin.
- **Domain removal.** There is no `domainDelete` in the Admin API — domains are admin-UI only.
  Three exist: `voidexshop.com` (purchased, already primary — correct),
  `ceqr72-v1.myshopify.com` (Shopify's permanent internal domain, cannot be removed by anyone,
  not shown to customers), and `voidex-6190.myshopify.com` (an extra, removable in admin).

## 2026-09-22 — Motion layer on a dev theme

Built a motion/transition system for the storefront and put it on an **unpublished** dev theme.
Nothing on the live theme (Savor, `167336870138`) was touched.

**Dev theme:** `VOIDEX Motion — DEV (do not publish)`, id `167583219962`, created by
`themeDuplicate` from live Savor.
**Preview:** `https://voidexshop.com/?preview_theme_id=167583219962`

### Added

- `assets/voidex-motion.css` (8,296 B) — scroll reveals, cross-document page-transition
  choreography, hover/press micro-interactions, reduced-motion guards.
- `assets/voidex-motion.js` (7,404 B) — the reveal engine: IntersectionObserver, stagger
  indices, re-scan on section swaps, lazy-image fade, header scroll state.
- `snippets/voidex-motion.liquid` (1,587 B) — inlines the CSS, arms the failsafe, loads the module.

### Changed

- `layout/theme.liquid` — one `{%- render 'voidex-motion' -%}` added last in `<head>`
  (7,081 → 7,310 B; the 229-byte delta is exactly the added block, so nothing else moved).
- `config/settings_data.json` — `page_transition_enabled` and `transition_to_main_product`
  set explicitly to `true`. Neither key was present before, so the store was running on
  whatever the schema default happens to be. Savor gates its **entire** cross-document
  view-transition pipeline on these two settings
  (`snippets/view-transition-opt-in.liquid` and `snippets/scripts.liquid` both test them).
- `sections/footer-group.json` — two leftover-content fixes:
  - `"We send tasty emails"` → `"Early drops and restock alerts"`. The original is Savor
    restaurant demo copy. The replacement promises nothing the store can't keep (no discount)
    and stays accurate through the wellness pivot.
  - Social links: every URL was a Savor placeholder pointing at a network's own home page
    (`https://facebook.com`, `https://instagram.com`, `https://youtube.com`,
    `https://www.tiktok.com/`, `https://x.com`). On a store with no order history those read
    as broken links and cost more trust than the icons buy. Only the account confirmed to
    exist is kept — `https://www.instagram.com/voidex.shop.co/`. The rest are cleared and go
    back when real URLs are supplied.

### Design constraints the motion layer holds to

1. Only `opacity` and `transform` animate — both compositor-driven, so no reveal touches
   layout or paint on the main thread.
2. **No `transform` on any section-level element.** A transform creates a containing block,
   which silently breaks `position: sticky` and `position: fixed` descendants — the product
   page's sticky add-to-cart bar and the collection filter rail both depend on those.
   Sections fade; only their inner children translate.
3. Nothing is hidden unless JS has confirmed it can un-hide it. Every hiding rule is gated on
   `html[data-vx-motion='on']`, set by an inline boot script and cleared by a 2.5s failsafe
   timer that the engine cancels on boot. If the module 404s, throws, or is blocked, the
   attribute disappears and the page renders as plain, fully visible Savor.
4. The first section is never hidden waiting on JS — it carries the LCP and animates via a
   pure-CSS keyframe that cannot fail to complete.

### Verification

Byte-level round trip confirmed for every uploaded file: `themeFilesUpsert` echoed
`size` equal to the local byte count for the CSS (8,296), JS (7,404), snippet, layout
(7,310) and footer JSON (7,806). `config/settings_data.json` is the one exception: Shopify
reports its `size` as the **minified** byte count, and the 5,910 returned is exactly this
repo's copy minified — so it round-tripped perfectly too. It was additionally verified by
reading the content back and confirming both transition keys and the colour palette survived.

Behaviour was tested in real Chromium against a local harness that reproduces Horizon's DOM
(`#MainContent > .shopify-section`, single-child wrapper chains, a `slideshow-component`
carousel, a `position: sticky` probe) and loads the **actual** asset files — 27 assertions,
all passing:

- initial state: motion on, only the first section revealed, below-fold sections hidden,
  stagger indices `0,1,2,3`, carousel correctly excluded from staggering, lazy image stamped
- no section carries a transform; the sticky probe still computes `position: sticky`
- after scrolling: every section revealed, nothing left hidden, `will-change` released on
  every item
- a dynamically injected section (what `section-renderer.js` does for filters, pagination and
  quick-add) is registered, revealed and staggered
- **failsafe:** with the module request aborted, hiding rules are active at first, then the
  timer clears the attribute and all content becomes visible
- `prefers-reduced-motion: reduce`: motion never enables, nothing hidden, no items marked
- low-power device (2 cores): motion never enables, nothing hidden
- no console or page errors

Two real bugs were found by this suite and fixed before the final upload:

1. The first-section load-in keyframe animated `transform`, violating constraint 2 above. On
   a product page the first section is `product-information`, which holds the sticky
   add-to-cart bar — so for the 720ms of that animation the bar would have come unstuck. The
   keyframe is now opacity-only.
2. `register()`'s first-section early-return added `vx-in` but never scheduled the `.vx-done`
   pass, so `will-change: opacity, transform` stayed pinned on that section's items for the
   life of the page. It now goes through `reveal()` like every other section.

### Not verified from this container

The environment's network policy blocks `voidexshop.com` and `ceqr72-v1.myshopify.com`
(proxy answers 403 to CONNECT), so the dev theme was **not** rendered end-to-end as a real
storefront page. The engine's behaviour is verified against real Horizon-shaped DOM; what
remains unverified is Liquid rendering of the patched `theme.liquid` on the real store and
how the motion reads against actual store content. The preview link is the check for that.

---

## 2026-09-21

### Fixed & verified: storefront "sold out" bug

- **Symptom:** the only active product (VOIDEX Sneaker Wash Bag) and all 3 variants showed as
  sold out / unavailable.
- **Root cause:** both shipping profiles ("General profile", "Dropshipper-AI Shipping") had
  only two empty leftover app locations in their location group ("Dropshipping App (9UsAY)",
  "Dropshipping App (RX31S)"). The actual stock location, "VOIDEX Fulfillment (Supplier
  Dropship)" (48 units), was missing from both.
- **Fix:** `deliveryProfileUpdate` with
  `locationsToAdd = gid://shopify/Location/96010993914` on both profiles. Zones and rates
  untouched. Zero `userErrors`.
- **Verification (5 independent checks, raw data):**
  1. Admin API re-query confirmed "VOIDEX Fulfillment" present in both profiles.
  2. Raw product JSON (plain + cache-busted, `cf-cache-status: DYNAMIC`) showed
     `available: true` for the product and all 3 variants.
  3. Raw product page HTML: buy button reads "Add to cart", no `disabled`, no "Sold out".
  4. Real-browser screenshot: "ADD TO CART" enabled, "Buy with Shop" present.
  5. End-to-end: added 1x White to a throwaway cart, requested rates for Toronto ON and
     New York NY — both returned "Standard, $0.00, 3–5 days". Cart cleared afterwards
     (no order, no charge).
- **Lesson:** a page-summary tool (WebFetch) reported this page as "Unavailable"/"Sold out"
  while raw API and HTML said "Add to cart". Raw data is the source of truth for this store.

### Investigated: Gmail inbox spam wave

- ~15+ same-day messages: blank/"(no subject)" lines, unfamiliar senders, spam-filter-evasion
  character substitutions ("tra©k", "D.o...y.ø.ü...s.h.i.p"), a probing "is this the correct
  email address for customers to contact the store" line, a foreign-language message, and an
  unrelated catfish-style "TikTok" email — arriving the same day as Shopify's "verify your
  domain's contact information" notice.
- **Diagnosis:** WHOIS-harvest spam wave, the kind that hits a domain right after registration.
- Cross-checked against Shopify: 0 orders, 0 real customers — none of it is real buyer traffic.
- **Owner decision:** ignore, no replies or clicks.
- One message ("VOIDEX.SHOP (Shopify) – New customer message…") has a real structured subject
  and looks like a genuine Shopify Inbox notification — worth opening once Gmail scope is fixed.
- **Blocked:** Gmail connector has insufficient OAuth scope (`search_threads` and `list_labels`
  both fail). Owner must reconnect Gmail with full permissions.

### Decision: Meta Ads connector route

- Owner chose Option A: Meta's official Ads connector (`https://mcp.facebook.com/ads`) plus
  Shopify's native Facebook & Instagram sales channel, starting read-only.
- Shopify connector is connected; the Facebook & Instagram publication now shows the product
  as `isPublished: true` via the Admin API. Owner still needs to confirm this on the Sales
  channels page. Pixel/Conversions API status unverified. Meta Ads connector not yet added.

### Verified admin links

- Sales channels: `https://admin.shopify.com/store/ceqr72-v1/settings/sales_channels`
  (underscore, not hyphen — the hyphenated version 404s)
- Shipping and delivery: `https://admin.shopify.com/store/ceqr72-v1/settings/shipping`
- Claude cannot open admin pages itself (login required), so these were checked against
  documented Shopify paths, not click-tested.

## Earlier

- **2026-09-16:** Formalized the owner's three-test product-selection filter (emotional/private
  problem, not generically available, demand already proven) as the standing filter for all
  future product recommendations.
- **2026-09-14:** Researched a pet-product niche against a value/weight/margin filter;
  rejected — not pursuing pet products.
- Consolidated branding to VOIDEX for the single active product, dropping the earlier
  VOIDED/VØIDEX split.
- Margin target lowered over time: $25 → $20 → current $15 profit/unit.
- AutoDS subscription cancelled — fulfillment, inventory and supplier price checks now manual.

---
