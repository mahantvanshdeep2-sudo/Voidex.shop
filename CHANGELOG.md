# VOIDEX.SHOP — Changelog

Changes, fixes, findings, and decisions, most recent first.

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
