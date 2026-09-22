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
| Savor | `167336870138` | **MAIN (live)** | Shopify's Savor theme, store ID 3626. Horizon architecture. Untouched by this repo. |
| VOIDEX Motion — DEV | `167583219962` | unpublished | Duplicate of Savor + the motion layer in `theme/`. Preview only. |
| Flora | `166903808250` | unpublished | Older theme, not in use |
| Flora — Fixed + Yellow-Blue | `167336542458` | unpublished | Older theme, not in use |

Savor is a **restaurant/food** theme. That is where the leftover food copy comes from — it
is demo content, not something anyone wrote for this store.

**Never publish a theme without the owner's explicit approval.** Publishing is his decision,
not Claude's. Work on the DEV theme and hand him a preview link.

Preview link for the DEV theme:
`https://voidexshop.com/?preview_theme_id=167583219962`

## Working on the theme without Shopify CLI

The remote container has no Shopify CLI and no browser access to `voidexshop.com` (the
environment's network policy blocks it). Theme files are still fully readable and writable
through the Shopify Admin GraphQL API, which the Shopify connector exposes:

- Read: `theme(id:) { files(filenames: [...]) { nodes { body { ... on OnlineStoreThemeFileBodyText { content } } } } }`
- Write: `themeFilesUpsert(themeId:, files: [{ filename:, body: { type: BASE64, value: "<base64>" } }])`

Use `type: BASE64`, not `TEXT` — it removes every JSON-escaping failure mode, and the
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
- **Rejected direction:** pet products / pet-store niche — researched, then explicitly dropped.
- **Fulfillment:** AutoDS cancelled. Inventory, fulfillment, and supplier price checks are
  manual. No dropshipping-supplier connector exists (AliExpress, CJ, Zendrop, Spocket all
  checked, none found), so supplier work is manual-assisted: Claude drafts, owner executes/pays.

## Current catalog (verified 2026-09-22 via Admin API)

- **Niche:** shoe care, expanding into wellness/recovery. Renaming away from VOIDEX is being
  considered to match the wellness pivot — not yet decided.
- **1 ACTIVE:** VOIDEX Sneaker Wash Bag — $20.99 / $23.99 / $35.99 CAD, 47 units across
  White / Grey / Value Set. The only product purchasable end-to-end.
- **3 DRAFT (deliberate, not oversights):** Shoe Protector Spray ($16.99–$27.99),
  Complete Sneaker Care Kit ($31.99–$34.99), Infrared Recovery Sauna Blanket ($219.99–$249.99).
- **4 ARCHIVED:** VØIDEX Steam Press, Crunchy Sound Butter Stick, Carbon Fiber Card Holder,
  Foaming Soap Dispenser.

Drafts and archived products must never be surfaced as buyable. Any related-products,
bundle, or "you might also like" section has to filter to active/published only.

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
| Shopify | Connected, live. Theme read/write confirmed working. |
| Gmail | Connected but **insufficient OAuth scope** — search/list/label all fail. Owner must reconnect with full Gmail access before any inbox work. |
| Google Drive | Connected |
| Instagram | Installed, needs reconnect |
| Meta Ads connector | Not yet added. Owner chose **Option A**: official Meta Ads connector (`https://mcp.facebook.com/ads`) + Shopify's native Facebook & Instagram sales channel. Start read-only. |
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
