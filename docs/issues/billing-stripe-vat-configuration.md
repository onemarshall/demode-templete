# Billing issue — Stripe/VAT configuration discrepancy

**Status:** Recorded, unresolved. **No configuration was changed.**
**Raised:** 30 October 2026, during read-only verification of the Signal delivery path.
**Owner:** Commercial/accounting decision, not engineering.
**Severity:** High if Montsel is VAT-registered; low if it is not. The repository does not
establish which.

---

## 1. The discrepancy

Three comments in the codebase state that checkout must remain disabled until the VAT position
is established. The deployed configuration has checkout enabled and VAT disabled.

| Source | Says | Actual |
| --- | --- | --- |
| `wrangler.jsonc:53–55` (comment above the value) | *"Off until the VAT position is established. Checkout and fulfilment are implemented and one-time; see `src/lib/app/vat.server.ts` for the four conditions that must hold before this is set to 'true'."* | `wrangler.jsonc:56` → `"PUBLIC_STRIPE_ENABLED": "true"` |
| `src/lib/app/plans.ts:30` | *"VAT treatment is not established. Do not enable checkout until it is."* | `PUBLIC_STRIPE_ENABLED=true` in `wrangler.jsonc:56` and `.env:143` |
| `src/lib/app/vat.server.ts:5–13` | Four conditions must hold before `VAT_ENABLED=true`; *"Until all four are true, charging VAT would be wrong in one direction or the other, so the switch stays off."* | `VAT_ENABLED: "false"` (`wrangler.jsonc:74`), `VAT_ENABLED=false` (`.env:147`) |

So the deployed state is: **checkout live, VAT off, and the comments that were written to
prevent exactly that state are still present and unmodified.**

## 2. Why this matters

`getVatConfig` (`vat.server.ts:36`) returns `enabled: false`, which becomes
`automatic_tax: { enabled: false }` in the Stripe session
(`billing/remote/checkout.remote.ts:256`). Catalogue prices are displayed exclusive of VAT
(`VAT_PRICE_DISPLAY: "exclusive"`).

Two readings, and the repository cannot distinguish them:

| If Montsel is VAT-registered | If Montsel is not VAT-registered |
| --- | --- |
| Sales are being invoiced without VAT. Under-collection, and a correction exercise for every completed order. | The configuration is correct; the comments are stale and should be removed. |

The second reading is plausible and would make this a documentation defect. The first is a
financial exposure. **Only the accountant can say which applies**, and that is why this is
recorded as a commercial issue rather than fixed.

## 3. A second, related discrepancy

| Source | Says | Actual |
| --- | --- | --- |
| `wrangler.jsonc:72` (comment) | *"Off until Stripe reports pay_by_bank available on this account."* | `wrangler.jsonc:73` → `"PAY_BY_BANK_ENABLED": "true"`; `.env:144` → `true` |

`PAY_BY_BANK_ENABLED` only controls whether the pricing page advertises the method
(`pricing/+page.server.ts:31`); Stripe decides what checkout actually offers
(`checkout.remote.ts:246`). So the failure mode is a buyer seeing a payment method that is not
offered, not a lost payment. Lower severity, same root cause: a comment that no longer
describes its value.

## 4. A third stale statement, for completeness

`src/lib/app/stripe-plans.server.ts:7–10` states that checkout *"still creates subscription
sessions"* and *"Do not enable checkout until that task is complete"*. Both are now false:
`createCheckout` uses `mode: "payment"` and creates no subscription
(`checkout.remote.ts:66, 239`). The comment describes a superseded implementation.

## 5. Latent cost if VAT is enabled later

`vat.server.ts:9–11` records that Stripe prices carry `tax_behavior: unspecified`, which is
immutable once a price exists. Enabling VAT therefore requires **recreating all eight price
ids** and updating `STRIPE_PRICE_*` (`wrangler.jsonc:63–70`). Any order referencing the old
price id keeps its old behaviour. This is a migration, not a flag flip, and should be planned
rather than discovered.

## 6. What is needed to close this

1. Accounting confirms VAT registration status and the applicable rate.
2. If registered: recreate the Stripe prices with explicit `tax_behavior`, add the Stripe Tax
   registration, then set `VAT_ENABLED=true` and redeploy (`vat.server.ts` steps 2–4).
3. If not registered: set `PUBLIC_STRIPE_ENABLED` honestly and **delete the three stale
   comments**, so the next reader is not misled about a control that is not there.
4. Independently confirm whether `pay_by_bank` is actually available on the account, and
   align `PAY_BY_BANK_ENABLED` with the answer.

## 7. Explicitly not done

- No change to `wrangler.jsonc`, `.env`, `plans.ts`, `vat.server.ts` or any Stripe object.
- No Stripe API call.
- No invoice or order was inspected — there is no reachable database in this environment
  (`BETTER_DATABASE_URL` is empty).

This record exists so the discrepancy is not lost. Resolving it is a commercial decision.
