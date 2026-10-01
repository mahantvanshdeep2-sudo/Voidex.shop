# VOIDEX.SHOP — Store Context for Claude Code

This file hands off everything a fresh Claude Code session needs to keep working on this
Shopify store. Claude Code reads it automatically.

Owner: Vanshdeep Mahant (mahantvanshdeep2@gmail.com). Timezone: America/Toronto.

## What this store is

- Shopify dropshipping store, sole owner-operated, prices in CAD
- Domain: `voidexshop.com`
- Shopify admin: `ceqr72-v1.myshopify.com` (handle `ceqr72-v1`)
- Instagram: `@voidex.shop.co` (ID `17841417134262205`)
- Meta ad account: `1095760916509693` (named "voidex.shop")

## Theme state

| Theme | ID | Role | Notes |
|---|---|---|---|
| Updated copy of Savor | `186287948026` | **MAIN (live)** | Savor after a theme-version update; the owner published it 2026-09-28. Untouched by this repo. |
| VOIDEX Royal Black Gold — DRAFT | `186421772538` | unpublished | Duplicate of MAIN (2026-10-01) + the perfume landing in `voidex-theme/`. Preview: `https://voidexshop.com/pages/voidex-perfume-samples?preview_theme_id=186421772538` |
| Savor | `167336870138` | unpublished | The original Savor install (was MAIN until 2026-09-28). |
| VOIDEX Motion — DEV | `167583219962` | unpublished | Old Savor + the motion layer in `theme/`. Also holds a weaker perfume section another tool uploaded 2026-10-01 12:01 UTC — superseded by the Royal Black Gold theme. |
| Flora | `166903808250` | unpublished | Older theme, not in use |
| Flora — Fixed + Yellow-Blue | `167336542458` | unpublished | Older theme, not in use |

**No logo exists** in Shopify files, theme settings, Drive or Gmail (checked 2026-09-30) — the header
shows the store name as text. Theme options page for the owner:
https://claude.ai/artifact/Vwe5ybH7srbcq1Ce5UzpjZ (awaiting his pick and logo file).

Savor is a **restaurant/food** theme. That is where the leftover food copy comes from — it
is demo content, not something anyone wrote for this store.

**Never publish a theme without the owner's explicit approval.** Publishing is his decision,
not Claude's. Work on the DEV theme and hand him a preview link.

Preview link for the DEV theme:
`https://voidexshop.com/?preview_theme_id=167583219962`

## Working on the theme without Shopify CLI

The remote container has no Shopify CLI and no browser access to the storefront: the
environment's egress policy answers 403 to `voidexshop.com` and `ceqr72-v1.myshopify.com`
(re-confirmed 2026-09-24 and 2026-09-28). WebFetch is blocked the same way (trend sites,
AliExpress, CJ), so product research runs on WebSearch only. Don't retry or route around it. It lifts only when the owner adds
those hosts (plus `cdn.shopify.com`) to the environment's allowed domains, after which a new
session can take real Chromium screenshots. Theme files are still fully readable and writable
through the Shopify Admin GraphQL API, which the Shopify connector exposes:

- Read: `theme(id:) { files(filenames: [...]) { nodes { body { ... on OnlineStoreThemeFileBodyText { content } } } } }`
- Write: `themeFilesUpsert(themeId:, files: [{ filename:, body: { type: BASE64, value: "<base64>" } }])`

**Preferred for anything over a few KB (used 2026-10-01): staged upload + `type: URL`.**
`stagedUploadsCreate` (resource `FILE`, mimeType `text/plain`, httpMethod `PUT`) → `curl -X PUT
-H "Content-Type: text/plain" --data-binary @file "<url>"` (do **not** send `x-goog-acl`, it isn't
signed) → `themeFilesUpsert` with `body: { type: URL, value: "<resourceUrl>" }`. It runs as a job;
then read back `checksumMd5` and `size` and compare to `md5sum`/`wc -c` of the local file. The
bytes never pass through the model, so nothing can be mistyped. `shopify-staged-uploads.storage.googleapis.com`
is reachable from the container; `cdn.shopify.com` and the Kling CDN (`*.klingai.com`) are not.

For small files, `type: BASE64` works — it removes every JSON-escaping failure mode, and the
mutation echoes back `size`, which you can compare against the local file's byte count as a
round-trip check. One exception: for `config/settings_data.json` Shopify reports `size` as the
**minified** byte count, so compare against `json.dumps(obj, separators=(',', ':'))` for that
file, or just read the content back.

## Brand & product strategy (owner's own rules — apply to every product/store decision)

- **Focus discipline:** one active product listing at a time, not a sprawling catalog.
- **Margin target:** $15 profit per unit (down from $20, originally $25 — the trend has been
  downward; don't push it back up without asking).
- **Sourcing rule:** only sell products already trending in roughly the last 14 days. No bets
  on unproven products.
- **Product-selection framework** — apply before recommending or building around any product:
  1. Solves a problem the customer feels emotionally/privately.
  2. Not something available everywhere (if it's at Walmart down the street, skip it).
  3. Demand is already proven.
  - Product choice outranks store polish: a great store cannot save a weak product.
- **Pet products — reopened by the owner 2026-09-28** (dropped 2026-09-14, then asked for again).
  His new pricing rule for it: retail = **3× landed cost**, and prefer products selling at
  **$30–50+**, because cheap items sell more but earn too little. Research and two draft
  listings from 2026-09-28 are in `CHANGELOG.md`.
- **Apps (checked 2026-10-01 via `appInstallations`):** **CJdropshipping is installed** (handle
  `cucheng`), plus Judge.me Reviews, Zendrop, Sell The Trend, AliExpress Dropshipping Center,
  Dropshipper-ai, Dropshiptool, COD King, ShipX, Faire, Flow, Translate & Adapt. CJ creates no
  location; products must be linked to CJ SKUs **inside the CJ app** (not possible via Admin API).
- **Suppliers on the store (checked 2026-09-30, partly superseded above):** no supplier app is installed. The only live
  fulfillment is "Manual" at "VOIDEX Fulfillment (Supplier Dropship)", Mississauga. Zendrop, Sell
  The Trend, AutoDS and two "Dropshipping App" entries are leftovers of uninstalled apps.
  Recommended to the owner: CJdropshipping (free, CA/US warehouses, DDP) — awaiting his OK.
- **Fulfillment:** AutoDS cancelled. Inventory, fulfillment, and supplier price checks are
  manual. No dropshipping-supplier connector exists (AliExpress, CJ, Zendrop, Spocket all
  checked, none found), so supplier work is manual-assisted: Claude drafts, owner executes/pays.

## Current catalog (verified 2026-09-22 via Admin API; perfume line added 2026-10-01)

- **Perfume samples — ACTIVE since 2026-10-01 on the owner's explicit instruction** (this
  overrides "one active product" for this line). Collection `voidex-perfume-samples`
  (`gid://shopify/Collection/511795429626`), published to Online Store only. Each has 2mL / 5mL /
  10mL variants, inventory untracked + `CONTINUE`, stocked at VOIDEX Fulfillment, General profile,
  one Kling-generated 2048² image, **no unit cost recorded**. Prices doubled 2026-10-01 on the owner's instruction:
  - Amber Noir `15402596040954` — $9.94 / $15.94 / $25.94 (VX-AN-*)
  - Citrus Royale `15402596008186` — $7.94 / $11.94 / $19.94 (VX-CR-*)
  - Rose Velvet `15402595942650` — $5.94 / $9.94 / $17.94 (VX-RV-*)
  - Midnight Oud `15402595975418` (renamed from "Oud Wood", a Tom Ford mark, 2026-10-01; old URL redirects) — $11.94 / $17.94 / $29.94 (VX-OW-*)
- **Discount codes (2026-10-01):** `VOIDEX10` (10% off order, once per customer) and `BUNDLE30`
  (30% off perfume-collection items, min 3 items). Neither combines with other product/order discounts.
- **Landing page:** page `voidex-perfume-samples` (`gid://shopify/Page/160920862970`), template
  suffix `voidex-perfume`, linked from the main menu as "Perfume Samples".

- **Niche:** shoe care, expanding into wellness/recovery. Renaming away from VOIDEX is being
  considered to match the wellness pivot — not yet decided.
- **1 ACTIVE:** VOIDEX Sneaker Wash Bag — $20.99 / $23.99 / $35.99 CAD, 47 units across
  White / Grey / Value Set. The only product purchasable end-to-end.
- **3 DRAFT (deliberate, not oversights):** Shoe Protector Spray ($16.99–$27.99),
  Complete Sneaker Care Kit ($31.99–$34.99), Infrared Recovery Sauna Blanket ($219.99–$249.99).
- **2 DRAFT pet options (created 2026-09-28, awaiting the owner's pick, no images or
  supplier yet):** Fireworks Calm Kit (`gid://shopify/Product/15396756029690`, $49.99) and
  Glow-Walk LED Dog Boots (`gid://shopify/Product/15396756521210`, $44.99). Delete the one he
  doesn't choose.
- **4 ARCHIVED:** VØIDEX Steam Press, Crunchy Sound Butter Stick, Carbon Fiber Card Holder,
  Foaming Soap Dispenser.

Drafts and archived products must never be surfaced as buyable. Any related-products,
bundle, or "you might also like" section has to filter to active/published only.

## Supplier outreach (2026-10-01, from the owner's Gmail, on his instruction)

Quote requests for 4 original EDPs (amber/oud, citrus, rose, woody oud) in 2/5/10 mL, VOIDEX label,
Canada shipping (UN1266, DDP), samples first — sent to sales@dailyfulfill.com, info@brandsamor.com,
support@jubilee.beauty. Check Gmail for replies and compare landed cost against the doubled prices.
Not contacted: CJ (in-app sourcing request only), Wicked Good (conflicting emails — use its contact
form), Clamar (no public email, mostly cosmetics/skincare — phone 905-421-0165).

## Store health as of 2026-09-22

- 0 orders, 0 real customers (only the owner's own customer record). No paid traffic yet.
- Storefront "sold out" bug is **fixed and verified** — see `CHANGELOG.md`. If it ever
  resurfaces, check the shipping profiles' location groups first; don't re-diagnose from scratch.

### Open issues needing an owner decision

See `docs/OPEN_QUESTIONS.md`. Don't resolve these unilaterally — flag and ask, or fix and
show evidence.

## Connected tools / accounts

| Tool | Status |
|---|---|
| Other writers | The **Shopify Perplexity MCP App** is installed and also writes to the store (it uploaded the 2026-10-01 12:01 UTC perfume section to the DEV theme). Re-read live state before acting on anything in this file. |
| Shopify | Connected, live. 63 scopes (check any time with `{ currentAppInstallation { accessScopes { handle } } }`). **No `write_legal_policies`, even after the owner reconnected on 2026-09-24** — the connector doesn't request it, so policies are always a manual paste from `policies/`; don't retry `shopPolicyUpdate`. The connector also refuses `themePublish` and writes to the live theme despite `write_themes`. |
| Gmail | Working — search verified 2026-09-24 after the owner reconnected. The 3 contact-form messages (21–24 Sep: "is this the store owner?") are solicitation spam — owner policy is ignore, no reply. |
| Google Drive | Connected |
| Instagram | Installed, needs reconnect |
| Meta Ads connector | **Connected to Claude (2026-09-30) but sees 0 ad accounts and 0 catalogs**; `voidex.shop` (`1095760916509693`) returns "not found or no access". Owner must reconnect it with the Facebook profile that owns that ad account and tick the ad account, business, Page, Instagram and pixel. Start read-only. |
| Kling AI | Pro (SVIP) plan since ~2026-10-01, 2,280 credits left after the 2026-10-01 run (Nano Banana Pro image = 20 credits; Kling 3.0 15s 1080p video with audio = 180). Every job is charged — only generate what the owner asked for. Result URLs are on `*.klingai.com` (egress-blocked here) and expire in 24h; Shopify can ingest them by URL. |
| Higgsfield | Connected 2026-09-30. Free plan, 10 credits. Same rule: no generations without the owner's OK. |
| Windsor.ai | Installed, sign-in incomplete |
| trend tracker | Installed, sign-in incomplete |
| AutoDS | Ignore — cancelled |

**Gate before any ad spend:** pixel/Conversions API status is unverified. Confirm first. Any
campaign budget needs explicit owner approval regardless.

## How the owner wants work done

- Do as much as possible yourself — research, prep, routine execution, verification — without
  waiting on him. Escalate only for payment/financial authorization or genuinely major decisions.
- **Never claim something is "fixed" or "done" unless it is actually verified.** He checks
  independently, and a claim that fails his check is not acceptable. Show the evidence: raw API
  data, byte-level round trips, real browser runs — not page summaries. A page-summary tool has
  already misreported this store's status once (see `CHANGELOG.md`).
- When he needs to check something himself, always give the direct URL.
- If a question is genuinely necessary, ask the smallest targeted question: a specific named
  choice plus one sentence on why it's needed. Not an open-ended "what do you want to do".
- He wants ongoing automated product research and store work, not one-off check-ins.

## Sources

- https://help.shopify.com/en/manual/online-sales-channels/manage
- https://help.shopify.com/en/manual/fulfillment/setup/shipping-profiles/setting-up-shipping-profiles
- https://shopify.dev/docs/api/admin-graphql/latest/mutations/deliveryProfileUpdate
- https://shopify.dev/docs/api/admin-graphql/latest/mutations/themeFilesUpsert
- https://developers.facebook.com/documentation/ads-commerce/ads-ai-connectors/ads-mcp-server/ads-mcp-server-overview
- https://help.shopify.com/en/manual/online-sales-channels/social-commerce/facebook-instagram-by-meta/setup
