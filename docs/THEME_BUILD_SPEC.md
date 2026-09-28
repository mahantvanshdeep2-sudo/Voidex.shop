> **Status as of 2026-09-28** (added by Claude Code; the spec below is the owner's original, unchanged).
> The container has no Shopify CLI, so the "Tech approach" steps were done through the Admin
> GraphQL API instead — same outcome, never touching the live theme:
>
> | Spec step | Status |
> |---|---|
> | Work on an unpublished dev theme | Done — `VOIDEX Motion — DEV (do not publish)`, id `167583219962` |
> | Fix #1 leftover food copy | Done on the dev theme (templates and section groups scanned 2026-09-24: none left) |
> | Fix #2 delivery messaging matches checkout | Done store-wide 2026-09-24 (3–5 / 3–7 / 7–14 business days) |
> | Fix #3 drafts never buyable | Holds — related-products only returns published products; drafts are unpublished |
> | Colour palette | Default applied as the spec suggests (near-black / off-white) — **awaiting owner sign-off** |
> | Footer: real contact/policy links | Done on the dev theme ("Help" menu) |
> | Preview → sign-off → publish | **Owner's step.** The connector refuses `themePublish`; publish from admin |
>
> See `CHANGELOG.md` for evidence on each.

# VOIDEX.SHOP — Custom Storefront Build Spec (for Claude Code)

**Read `CLAUDE.md` and `CHANGELOG.md` first** — this spec assumes that context (brand rules, catalog, margin target, open issues) and doesn't repeat all of it.

## What this file is for

A starting spec for building/customizing the actual Shopify theme code for VOIDEX.SHOP using Shopify's CLI and Liquid (or a headless setup, see "Tech approach" below). This is scaffolding, not a locked spec — several inputs below are genuinely unknown and need to come from the owner or be inferred and flagged for his review before going live.

## Tech approach — don't rebuild from scratch

The store is **already live** with real (if sparse) traffic risk and one purchasable product. Treat this as a customization of the existing theme, not a from-scratch build:

1. Use **Shopify CLI** (`shopify theme dev`) to pull the current live theme into a local repo.
2. Do all work on a **new unpublished development theme** (`shopify theme push --unpublished`), never directly on the live/published theme.
3. Preview and get owner sign-off via the theme preview URL before publishing.
4. Only publish (`shopify theme publish`) after the owner explicitly approves — this is a "major decision" per `CLAUDE.md`, not something to do unilaterally.

If the goal is a fully custom/headless storefront (Hydrogen + Remix, or a separate React/Next.js frontend against the Storefront API) rather than a Liquid theme, that's a bigger scope change — confirm with the owner before starting down that path rather than assuming it.

## Known brand inputs (carry these over exactly)

- Store/domain: `voidexshop.com`
- Shopify handle: `ceqr72-v1.myshopify.com`
- Niche: shoe care (current), expanding into wellness/recovery
- Tone: currently generic Shopify starter copy in places (see fixes below) — no confirmed brand voice guide yet
- Currency: CAD
- Catalog to reflect on-site: see `CLAUDE.md` → Current catalog (1 active product, 1 planned, 3 drafts — don't surface drafts as buyable)

## Unknown brand inputs — flag for the owner, don't invent silently

The following aren't documented anywhere in the project yet. Reasonable defaults are suggested so Claude Code isn't blocked, but each should be confirmed with the owner (smallest-targeted-question style, per `CLAUDE.md`) before treating it as final:

| Input | Status | Suggested default if unconfirmed |
|---|---|---|
| Color palette | Not specified | Dark/neutral palette (black, off-white, one accent) — fits a "VOIDEX" name and shoe-care/streetwear-adjacent niche; easy to swap via theme settings, not hardcoded |
| Logo / wordmark | Not specified | Use a text wordmark ("VOIDEX") in theme settings until a real logo file exists — don't generate a "final" logo without owner sign-off |
| Fonts | Not specified | Shopify's default theme font pairing is fine as a placeholder |
| Photography / product images | Not specified | Use whatever's already uploaded to the product in Shopify admin; don't source stock photography without asking |
| Brand name going forward | **Actively in flux** — owner is considering renaming away from VOIDEX to match the wellness pivot (see `CLAUDE.md`) | Keep "VOIDEX" everywhere for now; don't hardcode the name in ways that are expensive to change later (use theme settings/metafields, not literal strings baked into templates) |

## Fixes to carry into the theme immediately (already identified, not yet resolved)

These are documented in `CHANGELOG.md` as open issues — a theme rebuild is a good time to fix them at the template/copy level rather than patching admin settings alone:

1. **Remove all leftover food-template placeholder copy** (e.g. "We send tasty emails") — audit every template/section for starter-theme copy that doesn't match a shoe-care/wellness store and replace it with real copy.
2. **Delivery-time messaging must match checkout.** Don't hardcode "2–3 weeks" in the product template if checkout will show a different estimate — pull both from the same source (shipping profile delivery estimate) or make this trivially editable, since the actual number is still being decided by the owner.
3. **Don't surface draft products as buyable.** Shoe Protector Spray, Complete Sneaker Care Kit, and Infrared Sauna Blanket are intentionally drafts — any "you might also like" / bundle / related-products section must filter to active/published products only, not just pull everything in the catalog.

## Suggested page/section scope (v1)

- **Home:** hero built around the single active product (Sneaker Wash Bag) — this store deliberately runs one hero product at a time, don't design a home page that assumes a big multi-product catalog.
- **Product page:** clear, honest delivery-time messaging (see fix #2 above); room for a future bundle upsell (Shoe Protector Spray) once it goes active — build the section now, keep it hidden/conditional until that product is published.
- **About / trust section:** something addressing legitimacy (new domain, dropship-style store) — since there's 0 order history, trust signals (clear shipping/returns policy, contact info) matter more than social proof here.
- **Footer:** real contact/policy links — no placeholder legal pages.

## What NOT to do without asking

- Don't publish any theme changes live without owner approval (see Tech approach).
- Don't invent a final logo, brand name, or color palette and treat it as decided — flag it.
- Don't remove or hide the currently-active product or change its price/variants from the theme side — pricing/catalog changes go through Shopify admin (already handled from the Cowork session), not theme code.
- Don't wire up analytics/pixels as part of this build — pixel/Conversions API verification is explicitly gated before any ad spend per `CLAUDE.md`; theme work shouldn't jump ahead of that.

## Suggested first steps for Claude Code

1. Confirm local Shopify CLI is installed and authenticated (`shopify auth login`), then pull the live theme.
2. Duplicate it into a development theme (never edit the published theme directly).
3. Do a pass for leftover placeholder copy (fix #1) — this alone is likely worth shipping before any visual redesign.
4. Ask the owner the smallest set of targeted questions needed to unblock the unknown-inputs table above (e.g. "Keep the default dark/neutral palette I've applied, or do you have brand colors already?") rather than guessing on anything visual and irreversible.
5. Preview, get sign-off, then publish.
