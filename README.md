# voidex.shop

Theme work for the VOIDEX.SHOP Shopify store.

- **`CLAUDE.md`** — store context: brand rules, catalog, theme IDs, connector status, and how
  to edit theme files without the Shopify CLI. Read first.
- **`CHANGELOG.md`** — what changed, and how each change was verified.
- **`docs/OPEN_QUESTIONS.md`** — decisions waiting on the owner.
- **`docs/MOTION_LAYER.md`** — how the animation system works, how to tune it, how to remove it.
- **`theme/`** — only the files this repo changes, at their real theme paths. Not a full theme
  checkout; the other ~415 Savor files are untouched and live only on Shopify.
- **`tests/`** — Playwright suite for the motion engine, run against a local harness.
- **`voidex-theme/`** — the perfume landing added to the unpublished `VOIDEX Royal Black Gold — DRAFT`
  theme (`186421772538`). `tests/perfume/` renders it with real product data and checks it in Chromium.

## State

The live theme ("Updated copy of Savor", `186287948026`) is **unmodified**. Work is on the
unpublished themes `186421772538` (perfume) and `167583219962` (motion layer).

Preview: `https://voidexshop.com/?preview_theme_id=167583219962`

**Nothing gets published without the owner's explicit approval.**
