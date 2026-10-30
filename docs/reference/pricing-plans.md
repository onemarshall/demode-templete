# Pricing Plans

Product catalogue for the Stripe integration. Plan ids are passed to `createCheckout({ productId })`; Stripe price ids live in `STRIPE_PRICE_*` environment variables. Nothing here is recurring.

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

## Payment methods

Payment method does not determine product type. Every Montsel product is
self-service; the rail is only about how the money moves.

| Products | Payment |
| --- | --- |
| Books and practical products | Card checkout |
| Signal £395 | Card; Pay by Bank when available |
| Gap £995 and above | Pay by Bank preferred; card always available |

### Bank payment status: enabled (test mode)

Both bank rails were enabled in the Dashboard on 29 October 2026 and the API now confirms them:

| Method | Configuration | Capability |
| --- | --- | --- |
| `pay_by_bank` | `available: true` | `pay_by_bank_payments` active |
| `customer_balance` (Bank Transfers) | `available: true` | `gb_bank_transfer_payments`, `sepa_bank_transfer_payments`, `us_bank_transfer_payments`, `us_bank_account_ach_payments` active |

Enabling "Bank Transfers" granted **five** capabilities, not one, which covers UK, SEPA and US routes.

Verified behaviour:

- **Checkout** offers `card`, `pay_by_bank`, `link`. With a customer attached it would also offer `customer_balance`, so the session filters it out — see below.
- **Invoices** carry `payment_settings.payment_method_types: ['customer_balance', 'card']`, set explicitly rather than inherited.

**Test mode only.** The only connected account reports `livemode: false`. Live mode has its own Dashboard toggle and must be enabled and re-verified separately before `PAY_BY_BANK_ENABLED` is set to `true`.

### Why Checkout excludes `customer_balance`

Bank transfer is a delayed-notification method: 0–3 business days before funds clear. It cannot support the instant access the software products promise. So Checkout filters to `card` and `pay_by_bank`, and bank transfer is offered on the invoice rail instead.

The filter uses `allowed_payment_method_types`, which narrows Stripe's dynamically computed set. `payment_method_types` no longer works for Checkout Sessions.

### Checkout does not accept `payment_method_types`

Stripe removed that parameter for Checkout Sessions. Methods are resolved from
Dashboard settings, so the application must not try to pin them. Card stays
available as the fallback by default.

### Indicative fees

Reference rates, not account-specific. Verify against your own rate card.

| Method | Rate | £395 | £995 | £1,495 | £2,495 | £4,995 |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| UK card | 1.5% + 20p | £6.13 | £15.13 | £22.63 | £37.63 | £75.13 |
| Pay by Bank | 0.5% + 20p, capped £5 | £2.18 | £5.00 | £5.00 | £5.00 | £5.00 |

At £4,995 the difference is roughly £70 per sale. That is the whole commercial
argument for Pay by Bank, and it only materialises once the method is enabled.

### Release gating

`plans.ts` carries `released` per product, currently `false` everywhere.
`createCheckout` returns 409 for an unreleased product, so a catalogue entry is
never mistaken for permission to sell. Flip a product to `released: true` only
alongside the release decision it belongs to.

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

## What remains before enabling payment

1. **VAT position.** Four conditions in `src/lib/app/vat.server.ts`. Prices are
   `tax_behavior: unspecified`, so enabling Stripe Tax needs new prices.
2. **Pay by Bank eligibility.** Stripe-side; see above.
3. **Book fulfilment.** No file delivery exists. Books record a sale but
   deliver nothing.
4. **Direction eligibility check.** The pre-purchase check is specified in the
   commercial authority but not implemented.
5. **Terms review.** `/auth/terms` implements the UK reg. 37 consent mechanism;
   the wording still wants a solicitor's eye.

The subscription table and its reads remain in place for account export and
deletion. Nothing is recurring, so they will stay empty.

---

## History

This file previously described a generic SaaS ladder: Free, Basic $9/month, Pro $29/month, Enterprise $99/month, with annual variants. That catalogue was never the Langfell product set and is superseded. The old `STRIPE_PRICE_BASIC`, `_PRO` and `_ENTERPRISE` variables are retired.
