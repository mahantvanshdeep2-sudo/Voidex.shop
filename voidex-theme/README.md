# voidex-theme — VOIDEX Royal Black Gold perfume landing

Files added to the draft theme **`VOIDEX Royal Black Gold — DRAFT` (`186421772538`)**, at their real
theme paths. Everything else in that theme is an untouched copy of the live theme.

Preview: https://voidexshop.com/pages/voidex-perfume-samples?preview_theme_id=186421772538

| File | Role |
|---|---|
| `layout/voidex-perfume.liquid` | Standalone black/gold layout used only by the perfume page |
| `templates/page.voidex-perfume.json` | `"layout": "voidex-perfume"` + all default content blocks |
| `sections/voidex-perfume-landing.liquid` | Hero → How it works → Bundle builder → Products → Trust → Reviews (off) → Size guide → FAQ → Email |
| `sections/voidex-perfume-{announcement,header,footer}.liquid` | Static sections rendered by the layout, editable in the theme editor |
| `assets/voidex-perfume.css`, `assets/voidex-perfume.js` | Styles and behaviour |

Test locally: `cd tests/perfume && npm install && npm test` (renders these files with real product
data and runs 59 Chromium checks). Upload method and verification: see `CLAUDE.md` and `CHANGELOG.md`.
