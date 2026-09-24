# Open questions — owner decisions

Things Claude found but should not decide alone. Each one says what's known, what's blocked on,
and where to check.

## 1. Reference store for the visual clone — BLOCKING the design half of the work

The request was to copy another store's background theme and animations while keeping VOIDEX
content and products. The image attached to that request was a macOS "drag the app to your
Applications folder" installer window, not a store screenshot — so the reference never arrived.

**A URL beats a screenshot here, substantially.** With a URL, the source's actual stylesheet,
keyframes, easing curves, durations and scroll behaviour can be read and matched. From a
screenshot only static colour and layout can be inferred, and animation cannot be recovered
at all — it would be guesswork dressed up as a match.

Until this lands, the motion layer is built on its own timing system (see
`docs/MOTION_LAYER.md`) and no colour, font or layout decision has been made.

## 2. Footer background is `#2563eb` — RESOLVED 2026-09-24

DEV theme footer is now `#0A0A0A`, matching the new palette. See `CHANGELOG.md`.


A bright blue, against Savor's palette of white / black / `#a42325` red / `#e8d5c7` cream.
It looks like a leftover from earlier experimentation rather than a choice, but picking a
footer colour is a brand decision and the reference store will probably dictate it. Left
exactly as-is on both themes, deliberately.

## 3. Footer menus "Ask" and "Connect" have no menu assigned — RESOLVED 2026-09-24

DEV theme: "Ask" → "Help" (new Help menu), "Connect" removed. See `CHANGELOG.md`.


Both render as bare headings with no links under them. "Shop" correctly points at the `footer`
menu. Fixing this needs a decision about what belongs under each heading (policies? contact?
FAQ?), which is content, not code.

## 4. Delivery-time mismatch — RESOLVED 2026-09-24

Product page, FAQ, checkout rates and Shipping policy all read 3–5 / 3–7 / 7–14 business days.


The product page promises "2–3 weeks to reach you in Canada". Checkout shows
"Standard — free — 3–5 days". This is a real chargeback and complaint risk.

Likely fix: rename the shipping rate and correct its delivery estimate to match 2–3 weeks.
Needs the owner to confirm which number is true.

Check at: `https://admin.shopify.com/store/ceqr72-v1/settings/shipping`

## 5. Free shipping vs. the $15/unit margin target

The only shipping rate is $0.00 on a $20.99 item. Worth checking against the margin target
before leaving it.

## 6. Merchant of record

Global-e shows as merchant of record for US visitors ("By placing your order you agree to
purchase from Global-e…"), which means Shopify Managed Markets appears active for
international buyers. Confirm this is intended — there are fee and terms implications.

## 7. Facebook & Instagram sales channel

The Admin API reports the product as `isPublished: true` on that publication, but how and when
it was enabled isn't confirmed. Worth eyeballing once.

Check at: `https://admin.shopify.com/store/ceqr72-v1/settings/sales_channels`

## 8. Leftover unused locations (low priority)

From uninstalled apps: "AutoDS prod-tkjbvwcr", "Dropshipping App (9UsAY)",
"Dropshipping App (RX31S)", "Sell The Trend", "Zendrop". Harmless, but they were the direct
cause of the sold-out bug, so they're worth clearing eventually.

## 9. Real social URLs

Only `@voidex.shop.co` on Instagram is confirmed to exist. Facebook, TikTok, YouTube and X
placeholders were cleared from the footer. If any of those accounts are real, supply the URLs
and they go back.

## 10. Should the motion layer get a theme-editor toggle?

Right now it's always on (and always respects `prefers-reduced-motion`). Adding an on/off
switch in the theme editor means editing `config/settings_schema.json`, a ~50KB
Shopify-managed file. Straightforward, just not free — worth doing only if the owner wants to
be able to turn animations off without touching code.
