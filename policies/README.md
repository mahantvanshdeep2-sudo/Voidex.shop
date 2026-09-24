# Policies — ready to paste

Claude could not write these through the Shopify connector: the connection is missing the
`write_legal_policies` scope, so `shopPolicyUpdate` returns "Access denied". Everything else on
this store was updated directly.

## How to publish them (about 4 minutes)

Go to **Settings → Policies**: https://admin.shopify.com/store/ceqr72-v1/settings/legal

For each file below, open the matching box, click the `<>` (Show HTML) button in the editor
toolbar, paste the file's contents, and save.

| File | Paste into |
|---|---|
| `01-refund-policy.html` | Refund policy *(replaces what's there — the current one has Shipping and Terms crammed inside it)* |
| `02-shipping-policy.html` | Shipping policy *(currently empty)* |
| `03-terms-of-service.html` | Terms of service *(currently empty)* |
| `04-contact-information.html` | Contact information *(currently empty)* |

Leave **Privacy policy** alone — Shopify generates and maintains it, and the existing one is
current and correct.

## Why the delivery numbers say what they say

Every delivery figure on the store now reads the same, because a mismatch between the product
page and checkout is what causes chargebacks:

| Where | Before | Now |
|---|---|---|
| Product description | "2–3 weeks" | 3–5 business days (CA) |
| Shoe Care FAQ | "2–3 weeks" | 3–5 business days (CA) |
| Checkout shipping rate | "Standard" (no estimate) | "Free Shipping (3–5 business days)" |
| Old shipping policy text | "7–14 business days" | Matches the table above |

The basis is order #1001 — placed 21 September, delivered on the third day. That is one data
point, so Canada is quoted at 3–5 days rather than 3, the US at 3–7, and everywhere else at
7–14. If the next few orders land slower, raise these numbers before you scale ad spend:
an unmet delivery promise is far more expensive than a cautious one.
