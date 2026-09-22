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

## State

The live theme (Savor, `167336870138`) is **unmodified**. All work is on the unpublished dev
theme `167583219962`.

Preview: `https://voidexshop.com/?preview_theme_id=167583219962`

**Nothing gets published without the owner's explicit approval.**
