# Diagnostic module — current state

Recorded 30 October 2026. Read from source. No engine run, no live provider call, no browser pass,
no production deployment.

## Status ledger

| Column | State |
| --- | --- |
| Implemented | Yes — eligibility, engagement, orchestration, import, read, comments, consultant route, Trigger task |
| Local integration verified | No — `DIAGNOSTIC_ENGINE_URL` is unset locally, so every engine call fails closed |
| Live engine verified | No |
| Browser pass | No |
| Production deployed | No |

## What the module owns, and what it may not touch

The application owns the **engagement**. The diagnostic engine (external, reached over
`DIAGNOSTIC_ENGINE_URL`) owns the **run**. `server/orchestration.ts` is the only bridge between them
and never inspects evidence, scores a finding or holds a prompt.

| File | Responsibility |
| --- | --- |
| `shared/registry.ts` | Variant registry and the per-family intake schemas (zod). The intake authority. |
| `server/eligibility.ts` | Can this be delivered with the inputs and sector coverage available? |
| `server/payments.ts` | Payment and entitlement gate. |
| `server/engagement.ts` | Engagement lifecycle, idempotent creation, withdrawal. |
| `server/dispatch.ts` | Trigger.dev dispatch. |
| `server/orchestration.ts` | Start a run, map engine state onto the engagement, import published bytes. |
| `server/engine.ts` | Typed engine client. Server-only; the token never reaches the browser. |
| `server/import.ts` | Ingestion boundary. Hash-verified write to `output` / `output_version`. |
| `server/report.ts` | Read side, tenant-scoped, plus the share-slug read. |
| `server/comments.ts` | Conversation around an exact delivered version. |
| `server/consultant.ts` | Engagement-scoped consultant authority. |
| `server/status.ts` | The single translation of engine, intake and engagement status into one vocabulary. |

## The pipeline, end to end

### 1. Purchase → entitlement

`createCheckout` (`billing/remote/checkout.remote.ts:66`) refuses without the reg. 37 cancellation
consent, requires the plan to be present in `RELEASED_PRODUCTS`, and creates the `order` row before
the Stripe session so a pending purchase is visible. The webhook activates the purchase and calls
`fulfilPurchase` (`products/server/fulfilment.ts:32`), which resolves or creates the buyer's personal
organisation and brand, then inserts one `product_entitlement` row (`source='purchase'`,
`status='active'`). Access is brand-scoped, not user-scoped.

The invoice rail (`requestInvoice`) reaches the same entitlement path through `invoice.paid`. An
issued invoice does not grant access on its own.

### 2. Eligibility

`checkEligibility` (`diagnostic/server/eligibility.ts:52`) answers one question: can this diagnostic
be delivered with the inputs and approved sector coverage available? It requires a valid http(s)
website. Gap and Direction additionally require a `sectorRef` that appears in the engine's
`sectorIntelligence` catalogue. Direction also requires `hasProposal`. Results are `eligible`,
`needs_input` or `ineligible`, with reasons.

It runs in three places:

- the pricing page pre-check, read-only (`billing/remote/eligibility.remote.ts:18`);
- `createCheckout` and `requestInvoice`, which return 409 before Stripe is touched;
- engagement start, which records to `diagnostic_eligibility` and then refuses
  (`eligibility.ts:151`).

Only the third persists. Pre-purchase checks are not recorded.

### 3. Start an engagement

`/app/workflow/[productKey]` (`(montsel)/app/workflow/[productKey]/+page.server.ts`):

1. 404 unless the brand holds the product (`access` is `owned` or `free`). The intake form is not
   reachable without entitlement.
2. Parse the family intake (`intakeSchemaFor`). Signal takes the decision frame and declared scope.
   Gap adds sector, geography, buyer input, organisational intent, available proof and evidence
   scope. Direction adds the supplied proposal, its version, constraints, claim support, expected
   commitment, current evidence and readiness evidence.
3. `requireEngagementEligibility` (`+page.server.ts:91`).
4. `startEngagement` (`engagement.ts:162`) gates on `requireStartPayment`: a live entitlement, and
   where that entitlement came from a purchase, an `activated` purchase must name it. A return to a
   success page, an initiated payment or an issued invoice never satisfies this.
5. The work item id is `sha256(brandId|productKey|canonical(intake))` (`engagement.ts:150`), so
   re-submitting an identical intake resumes the existing engagement instead of commissioning a
   second one. The engagement id is derived from it. Status is written as `enquired`.
6. `dispatchDiagnosticIntake` (`dispatch.ts:9`) triggers `diagnostic-intake-v1` with the engagement
   id as the only caller-supplied authority. A dispatch failure returns `null` and is deliberately
   swallowed: the engagement and intake are already durable.

### 4. Run

`runDiagnosticIntake` (`app/diagnostic-worker.server.ts:49`) configures the shared Postgres pool,
calls `startDiagnosticRun`, then polls `syncDiagnosticRun` every five seconds for up to 25 minutes.

`startDiagnosticRun` (`orchestration.ts:217`) builds the engine intake from the stored engagement row
(`buildEngineIntake`, `orchestration.ts:96`) — never from the browser — and POSTs `/v1/intakes`. It
sets the engagement to `in_delivery` and records a `diagnostic_run_event`.

`syncDiagnosticRun` (`orchestration.ts:261`) reads `/v1/intakes/:id`, maps the status through
`statusFromIntake`, records the event, and on `published` imports the report.

### 5. Consultant review

`/consult/[engagementId]` is guarded by `consultant_grant` (roles `reviewer`, `strategist`,
`publisher`; optional expiry). A consultant does not become a client brand member. Actions:

| Action | Engine call | Requires |
| --- | --- | --- |
| `accept` | `accept_analysis` | substantive notes |
| `decision` | `generateDecisionRecord` | a production run |
| `delta` | `applyDecisionDelta` | valid JSON, target version |
| `save` | `applyDecisionDelta` | rationale, at least one change |
| `approve` | `approveDecisionVersion` | version number |
| `generate` | `generate_report` | running intake |
| `review` | `review_report` | explicit decision and notes |
| `publish` | `publish_report` | publisher role |
| `reply` | — | client thread |

### 6. Import

`importDeliveredReport` (`orchestration.ts:310`) fetches the quality receipt first. Any failed check
parks the engagement in `quality_hold` and imports nothing. Otherwise it fetches the publication,
computes SHA-256 and refuses to write when it differs from the engine's recorded `content_hash`
(`import.ts:88`). On success it writes `output` (`out_<runPublicId>`), an append-only
`output_version`, and the section manifest, then sets the engagement to `delivered` with
`delivered_at`.

### 7. Read

`/app/diagnostic/[engagementId]` shows status, the run-event timeline, the rendered report and the
comment threads. It re-syncs from the engine on load when a job exists and the engagement is not
terminal, so a page visit can trigger an import. `/app/documents` lists outputs and
`/app/documents/[documentId]/download` serves the bytes.

Montsel clients may raise only `correction` or `explanation`; `question` and `revision_request` are
refused in the repository (`comments.ts:207`), not only hidden in the UI. A consultant reply moves
the thread to `answered`.

## State model

`status.ts` is the only place the three vocabularies meet.

| Engine / intake status | Engagement status | Label |
| --- | --- | --- |
| `ready` | `in_delivery` | Queued |
| `context_ready` | `in_delivery` | Evidence ready |
| `generating` | `in_delivery` | Generating |
| `queued` / `running` | `in_delivery` | Queued / Running |
| `needs_analysis_review` | `in_delivery` | Analysis review |
| `needs_decision_record` | `in_delivery` | Decision record |
| `automation_ready` | `ready` | Checks passed |
| `review_required` | `ready` | Ready for review |
| `approved` | `ready` | Approved |
| `published` | `ready` | Published |
| `held` / `validation_failed` | `quality_hold` | Quality hold |
| `changes_requested` / `failed` | `failed` | Changes requested / Failed |
| `cancelled` | `withdrawn` | Cancelled |

Unrecognised engine statuses fall back to `in_delivery` with the raw label, so a new engine state
appears rather than disappearing.

Defined in the union but never written by any current code path: `scoped`, `quoted`, `invoiced`,
`paid`, `awaiting_input`, `retrying`. They are read by the UI and the label map, but nothing sets
them.

## Persistence

| Table | Migration | Role |
| --- | --- | --- |
| `diagnostic_engagement` | `0014` | The engagement record, intake and engine linkage |
| `work_item` | `0009` | Progress and resume path |
| `product_entitlement` | `0009` | Brand-scoped access |
| `purchase` | `0016` | Activated payment behind an entitlement |
| `output`, `output_version` | `0009`, `0013` | Delivered bytes, append-only by trigger |
| `output_version_section` | `0021` | Section manifest for anchoring comments |
| `diagnostic_eligibility` | `0021` | Recorded checks |
| `diagnostic_run_event` | `0021` | Timeline |
| `consultant_grant` | `0021` | Engagement-scoped consultant authority |
| `report_comment_thread`, `report_comment_message` | `0021` | Conversation |

`engine_publication_ref` is text with no foreign key, so the engine's ledger stays rebuildable and is
not a dependency of this database.

## What is not wired

These are observed in source, not inferred from behaviour.

1. **Full Diagnostic can be sold but cannot run.** It is priced at £2,495 with `popular: true`
   (`app/plans.ts:91`) and has a product row with `salesMode: 'planned'`
   (`products/shared/registry.ts:118`). It has no entry in `VARIANTS`
   (`diagnostic/shared/registry.ts:113`), so `getVariant` returns `undefined` and the workflow page
   renders "This workflow is not open yet". `createCheckout` also skips the eligibility gate for it,
   because that gate is scoped to `diagnostic.gap` and `diagnostic.direction`. If it were released,
   a buyer could pay and have no route to start work.

2. **The self-service promise and the run shape disagree.** The application is built around
   `needs_analysis_review` and `needs_decision_record`, and reserves accept, approve and publish to a
   consultant grant. The pricing copy states there is no consultant sign-off. Whether a self-service
   run can skip those states is an engine behaviour and cannot be determined from this repository;
   the application itself has no path to publish that bypasses those actions.

3. **Nothing runs locally.** `DIAGNOSTIC_ENGINE_URL` is absent from `.env`, so `getOptions`,
   `createIntake`, `getIntake` and the rest fail closed. The pricing page shows "Eligibility cannot
   be confirmed right now" and the workflow page shows a sector error as a result.

4. **No retry path.** A dispatch that returns `null`, or a run that exceeds the 25-minute poll, leaves
   an engagement with no job or a stale job and no endpoint to re-dispatch. The only recovery is
   support acting on the database, or a page load calling `syncDiagnosticRun` when a job already
   exists.

5. **Limits are hard-coded.** `buildEngineIntake` sends `maxPages: 10`, `maxReviewBatches: 10`,
   `maxModelCalls: 20` regardless of what `/v1/options` reports in `EngineOptions.limits`.

6. **Pre-purchase eligibility is not persisted.** Only `requireEngagementEligibility` writes to
   `diagnostic_eligibility`, so the checks a buyer passes at the pricing page and at checkout leave
   no record.

7. **`cancelEngagement` has no caller.** Withdrawal exists in the repository but no route invokes it.

## Verification basis

Read in full: the diagnostic module (`shared/registry.ts`, all of `server/`), the Trigger task and
worker, the workflow, diagnostic, documents and consult routes, `app/plans.ts`,
`products/shared/registry.ts`, `products/server/{resolve,fulfilment}.ts`, the pricing route and its
load, `billing/remote/{checkout,eligibility}.remote.ts`, and migrations `0013`, `0014`, `0021`.

Not verified: any engine response, any live Stripe event, any browser interaction, and the deployed
configuration of `RELEASED_PRODUCTS`.
