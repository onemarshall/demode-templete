# Diagnostic delivery automation

Recorded 30 October 2026. Supersedes the "no consultant sign-off" question left open in
`docs/architecture/diagnostic-status-transitions.md` §9.4.

---

## 1. The complete pipeline, as implemented

```
purchase ──► entitlement ──► intake ──► dispatch ──► engine run ──► publication ──► import ──► notice
   │             │              │           │             │              │            │          │
 checkout    fulfilPurchase  workflow   Trigger task   /v1/intakes    approved →    SHA-256   once per
 (existing)  (existing)      (existing) (existing)     (existing)     published     verified  engagement
                                                                       ▲            (existing) (new)
                                                                       │
                                                          automation supervisor (new)
```

Four things were missing between "the engine has an approved report" and "the buyer has it".
All four are now implemented in `diagnostic/server/automation.ts`.

| # | Was missing | Now |
| --- | --- | --- |
| 1 | An `approved` run was polled until timeout, never published | `publish_report` is issued automatically |
| 2 | A lost dispatch left an engagement with no engine job forever | `advanceEngagement` starts the run |
| 3 | A failed import was retryable in principle but nothing retried it | the scheduled sweep retries |
| 4 | The buyer was never told the report existed | one transactional notice per engagement |

## 2. The automation policy

Every decision is a mapping from the engine's own published state. The application holds no
prompt, rule or score.

| Engine state | Move | Why |
| --- | --- | --- |
| `queued`, `running`, `ready`, `context_ready`, `generating` | **wait** | The engine is working |
| `automation_ready` | **wait** | Checks passed; release is in progress *in the engine* |
| `approved` | **release** | Approved and awaiting publication. Publication is a mechanical step, not a judgement |
| `published` | **settled** | The existing import path takes over |
| `review_required`, `needs_analysis_review`, `needs_decision_record` | **refuse** | The engine is asking for a human judgement |
| `held`, `validation_failed`, `changes_requested`, `failed`, `cancelled` | **settled** | Terminal; nothing to automate |

The `refuse` branch is the boundary that keeps the product honest. Calling `accept_analysis`,
`review_report` or approving a decision record automatically would mean fabricating the
consultant sign-off the self-service product says it does not use. Those states are reported
as `awaiting_human` with the engine status named — never manufactured.

`selfServiceAction` is pure and unit-tested, so the policy can be read without tracing calls.

## 3. Release, not approval

The distinction matters:

- `publish_report` releases work the engine has already approved. The application is not
  deciding anything; it is completing a handshake the engine left open.
- `accept_analysis` / `review_report` would be the application deciding that a report is good.
  It does not, and must not.

Releases are bounded (`maxReleases`, default 2). An engine that stays at `approved` after two
requests produces `blocked` with a named reason rather than an infinite loop.

## 4. Recovery and the sweep

`advanceEngagement` handles three recoverable conditions:

1. **No engine job** — the dispatch was lost. It starts the run and records a `recovered`
   event.
2. **`retrying`** — the last import failed. The next advance retries it; `retrying` is
   deliberately not a terminal engagement state.
3. **`ready`** — awaiting a human, or published-but-unimported. A page visit or a sweep both
   re-sync it.

`reconcileSelfServiceEngagements` selects engagements in
`enquired | in_delivery | ready | retrying` for `montsel_self_service`, oldest first, bounded
at 25. Terminal states are excluded, so a sweep never reopens finished work.

`src/trigger/diagnostic-reconcile-v1.ts` runs it every five minutes in staging and production,
mirroring `strategy-recovery-v1`. Trigger.dev is the established scheduler in this repo; there
are no Cloudflare cron triggers, and the run is a long poll that suits Trigger's runtime.

## 5. Delivery notice

`notifyDelivery` sends one transactional `notification` email pointing at
`/app/diagnostic/<id>`. Idempotency is a `delivered_notified` row in `diagnostic_run_event`
rather than a new column: the event table is already append-only and already rendered on the
engagement page. No migration.

The notice is skipped with a logged warning when the provider is uninitialised or the
requester has no address, so a mail outage cannot fail a delivery.

## 6. Verification

Simulated engine, disposable Postgres, operator-grant entitlements. No Stripe, no customer
data, no production database.

```
MONTSEL_SIGNAL_VERIFY_DATABASE_URL=… vitest run \
  src/lib/modules/diagnostic/server/__tests__/diagnostic-delivery.integration.test.ts
  → 11 passed
```

| Area | Proven |
| --- | --- |
| Signal lifecycle | `automation_ready` does not settle; publishing imports; `delivered_at` stamped; version hash matches |
| Publishing delay | survives two `automation_ready` polls through the real loop |
| Review required | settles, imports nothing, no delivery timestamp |
| Quality failure | parks in `quality_hold` with `quality_gate`, imports nothing |
| Hash mismatch | `retrying` + `hash_mismatch`, imports nothing, then recovers to `delivered` |
| **Release** | an `approved` run is published by the application, with no consultant, and the buyer is notified |
| **Refusal** | `review_required` yields `awaiting_human`, zero engine actions, zero notices |
| **Recovery** | a lost dispatch is started and delivered; a second advance sends no second notice |
| **Sweep** | a `retrying` engagement is advanced to `delivered` by `reconcile` |
| **Gap** | full field group reaches the engine (`sectorIntelligenceRef`, `buyerInput`, `availableProof`, `organisationalIntent`) and delivers |
| **Direction** | full field group reaches the engine (`proposedDirection`, `proposalVersion`, `expectedCommitment`, `claimSupport`, `sectorIntelligenceRef`) and delivers |

Supporting unit tests: `status.test.ts` (9), `polling.test.ts` (11), `quality.test.ts` (4),
`catalogue-integrity.test.ts` (10).

Full sweep: 130 passed, 1 pre-existing failure, 11 skipped.
Typecheck: 0 errors. Module boundaries: 892 files.

## 7. Checkout gate — closed as a class

`checkout.remote.ts` gated Gap and Direction by naming them:

```ts
if (productKey === "diagnostic.gap" || productKey === "diagnostic.direction")
```

Full Diagnostic was never named, so it bypassed the gate. That is now a property of the
variant, `checkoutEligibility: 'required' | 'not_required'`, read through
`requiresCheckoutEligibility`, which **fails closed** for any `diagnostic.` key without an
explicit exemption.

| Variant | Requirement | Why |
| --- | --- | --- |
| Signal | `not_required` | Its decision frame, including the subject URL, is collected inside the paid intake. A pre-purchase check would have nothing to examine and would refuse every Signal purchase |
| Gap | `required` | Sector and business context decide deliverability |
| Direction | `required` | Also needs a supplied proposal |
| Full (no variant) | gated | Fail closed; it has no route to start work |

A catalogue test asserts Signal is the only exemption and that `diagnostic.full` is gated.

## 8. What the real-engine test requires

Everything above runs against a simulated engine. The simulated engine is honest about the
contract but it is not evidence that the real engine behaves this way.

| # | Requirement | Status |
| --- | --- | --- |
| 1 | `DIAGNOSTIC_ENGINE_URL` and `DIAGNOSTIC_ENGINE_TOKEN` | **Absent.** Confirmed via `wrangler secret list`; twelve secrets, neither is one of them |
| 2 | Engine reachable and `/v1/options` answering | Unverified |
| 3 | `families` includes `signal`, `gap`, `direction` | Unverified |
| 4 | `sectorIntelligence` contains at least one sector | Unverified — Gap and Direction cannot be bought without one |
| 5 | A self-service run reaches `approved` or `published` without approval actions | Unverified; this is the assumption the `refuse` branch exists to expose |
| 6 | `publish_report` is accepted for a self-service run | Unverified |
| 7 | Quality receipt and publication hash agree | Unverified |
| 8 | A controlled fixture site the engine may read | Needs approval |

### Proposed controlled test, on separate approval

1. Point a staging environment at the real engine (secret, not committed).
2. Run `scripts/diagnostic/engine-readiness.ts` — it starts no run and spends no model call.
3. Create **one** Signal engagement against a controlled fixture site, using an
   operator-grant entitlement. No Stripe session, no payment, no buyer data.
4. Run `advanceEngagement` and record: the state sequence, whether `publish_report` was
   needed, the quality receipt, the imported hash, and the notice.
5. Repeat once for Gap and once for Direction only if step 4 passes.

Step 3 writes an engagement row, so it needs explicit approval even though it involves no
money.

## 9. Known limitations

- The reconciler does not re-check entitlement before starting a run for an engagement created
  earlier. A refund between creation and dispatch would still start work. Narrow, and fixing it
  needs an `OperationContext` the worker does not have.
- The delivery notice is skipped silently (logged) when email is unconfigured. It is not queued
  for retry.
- `review_required` is surfaced, not resolved. If the real engine routes every self-service run
  through review, the product promise is false and that is a product/engine decision, not an
  application bug.
