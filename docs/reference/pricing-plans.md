# Pricing Plans

Product catalogue for the Stripe integration. Use these plan ids with `authClient.subscription.upgrade({ plan })`. Stripe price ids live in `STRIPE_PRICE_*` environment variables.

**Status: catalogue approved, checkout implemented, billing disabled.** Prices are one-time, GBP, and approved in the Langfell commercial authority at `01-Library/02-Business/03-Offers/01-Pricing-and-Outcomes`. No product is available for purchase.

`checkout.remote.ts` creates `mode: "payment"` sessions and `products/server/fulfilment.ts` grants the entitlement from the webhook, so the two blockers previously recorded here are closed. `PUBLIC_STRIPE_ENABLED` stays `false` in `wrangler.jsonc` until the VAT position is established — the four conditions are listed in `src/lib/app/vat.server.ts`. Flipping it is a commercial decision, not a deployment step.

---

## Montsel software

| Plan id | Product | Price | Billing | Description |
| --- | --- | --- | --- | --- |
| `signal` | Signal | £395 | One-time | A source-bounded reading of public communication |
| `gap` | Gap | £995 | One-time | Evidence-backed weaknesses, contradictions and opportunities |
| `direction` | Direction | £1,495 | One-time | A Proceed, Refine, Pause or Reset decision on a supplied direction |
| `full-diagnostic` | Full Diagnostic | £2,495 | One-time | One integrated assessment across all three |
| `strategy` | Strategy | £4,995 | One-time | Business Foundation and connected strategic direction |

## Montsel books and practical products

| Plan id | Product | Price | Billing | Description |
| --- | --- | --- | --- | --- |
| `101-better-ways-to-think` | 101 Better Ways to Think | £14.95 | One-time | Short-form thinking ideas |
| `everything-works-nothing-fits` | Everything Works. Nothing Fits. | £24.95 | One-time | The business worldview and connected strategy |
| `think-decide-act` | Think, Decide & Act | £69 | One-time | One integrated product, three connected stages |
| `visual-contract` | Visual Contract | Free | — | Visual priorities and a designer brief |

Think, Decide & Act is one product at one price. Its three stages are not separate SKUs and it is not a bundle.

## Langfell consultancy — not a checkout product

| Offer | Fee | Basis |
| --- | --- | --- |
| Strategic Diagnostic | £12,500 | Proposal-defined |
| Strategic Foundation | from £15,000 | Scope-dependent |
| Integrated Strategic Engagement | £35,000 reference | Scoped individually |

These must never appear as Stripe products. They are scoped by proposal, invoiced, and carry engagement terms that a checkout cannot express.

---

## Environment variables

```
STRIPE_PRICE_SIGNAL
STRIPE_PRICE_GAP
STRIPE_PRICE_DIRECTION
STRIPE_PRICE_FULL_DIAGNOSTIC
STRIPE_PRICE_STRATEGY
STRIPE_PRICE_101_BETTER_WAYS
STRIPE_PRICE_EVERYTHING_WORKS
STRIPE_PRICE_THINK_DECIDE_ACT
```

Visual Contract is free and needs no price id.

## Test-mode ids

Created 29 October 2026 in the Demo test account `acct_1LwmLsHQny0VaIlg` (`livemode: false`), catalogue tag `langfell-montsel-2026-10-29`. All GBP, `type: one_time`, `tax_behavior: unspecified`.

| Plan id | Product | Price id |
| --- | --- | --- |
| `signal` | Signal | `price_1UVtfyHQny0VaIlgvDJZ8V3I` |
| `gap` | Gap | `price_1UVtg2HQny0VaIlgLKXo2Eng` |
| `direction` | Direction | `price_1UVtg3HQny0VaIlgxVLSk0Ol` |
| `full-diagnostic` | Full Diagnostic | `price_1UVtg3HQny0VaIlg6UWIIJfP` |
| `strategy` | Strategy | `price_1UVtg4HQny0VaIlgu02dcNQg` |
| `101-better-ways-to-think` | 101 Better Ways to Think | `price_1UVtg8HQny0VaIlg9zOuYUcR` |
| `everything-works-nothing-fits` | Everything Works. Nothing Fits. | `price_1UVtg9HQny0VaIlgHTjKoTpA` |
| `think-decide-act` | Think, Decide & Act | `price_1UVtg9HQny0VaIlgZ3xhUhbo` |

These are **test-mode** ids. A live account will produce different ids; do not copy them into a production environment.

---

## What the payments task must still do

1. Change checkout from `mode: "subscription"` to `mode: "payment"`.
2. Remove `subscription_data` from the session and handle one-time completion.
3. Establish VAT treatment per product, including e-books and the Think, Decide & Act format.
4. Build entitlement and fulfilment: report delivery for diagnostics, file delivery for books.
5. Implement the Direction pre-purchase eligibility check and the refund path for an unsuitable purchase.
6. Replace the `?subscription=success` return handling with a purchase-based equivalent.
7. Publish refund and digital-cancellation terms before enabling checkout.

The subscription table and webhook handler remain in place. If no product is ever recurring, decide whether to retire them rather than leaving dead configuration.

---

## History

This file previously described a generic SaaS ladder: Free, Basic $9/month, Pro $29/month, Enterprise $99/month, with annual variants. That catalogue was never the Langfell product set and is superseded. The old `STRIPE_PRICE_BASIC`, `_PRO` and `_ENTERPRISE` variables are retired.
