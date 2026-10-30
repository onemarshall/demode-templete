# Diagnostic status transitions — as-is and corrected model

Recorded 30 October 2026, before any code change in Phase 3A. Baseline `e20f1c2`.

This document exists because terminality is currently defined **three times**, in three files,
with three different sets. The defect in
`docs/architecture/signal-delivery-verification.md` §3.2 follows directly from that.

---

## 1. The three vocabularies

| Layer | Values | Source |
| --- | --- | --- |
| Engine / intake status | `queued`, `running`, `ready`, `context_ready`, `generating`, `automation_ready`, `needs_analysis_review`, `needs_decision_record`, `review_required`, `approved`, `published`, `held`, `validation_failed`, `changes_requested`, `failed`, `cancelled`, plus unknown strings | `diagnostic/server/status.ts`, `EngineIntakeView.status` |
| Engagement status | `enquired`, `scoped`, `quoted`, `invoiced`, `paid`, `in_delivery`, `delivered`, `declined`, `withdrawn`, `awaiting_input`, `quality_hold`, `retrying`, `failed`, `ready` | `diagnostic/server/engagement.ts:23–37`, DB CHECK `0014` |
| Display | label + tone + message | `status.ts` |

`statusFromIntake(status)` is the single translation into the engagement vocabulary. It
delegates unknown values to `statusFromEngine`, and unknown-unknowns to `fallback`
(`in_delivery`, "The diagnostic is running").

## 2. Current mapping — measured, not inferred

Produced by executing `statusFromIntake` directly:

| Engine / intake status | Engagement status | Label | Terminal today? |
| --- | --- | --- | --- |
| `queued` | `in_delivery` | Queued | No |
| `running` | `in_delivery` | Running | No |
| `ready` | `in_delivery` | Queued | No |
| `context_ready` | `in_delivery` | Evidence ready | No |
| `generating` | `in_delivery` | Generating | No |
| **`automation_ready`** | **`ready`** | Checks passed | **Yes — defect** |
| `needs_analysis_review` | `in_delivery` | Analysis review | Yes (intake set) |
| `needs_decision_record` | `in_delivery` | Decision record | Yes (intake set) |
| `review_required` | `ready` | Ready for review | Yes |
| **`approved`** | **`ready`** | Approved | **Yes — defect** |
| `published` | `ready` | Published | Yes (after import) |
| `held` | `quality_hold` | Quality hold | Yes |
| `validation_failed` | `quality_hold` | Quality hold | Yes |
| `changes_requested` | `failed` | Changes requested | Yes |
| `failed` | `failed` | Failed | Yes |
| `cancelled` | `withdrawn` | Cancelled | Yes |
| unknown | `in_delivery` | raw label | No |

## 3. Where terminality is decided — three definitions

### 3.1 Worker poll loop

`src/lib/app/diagnostic-worker.server.ts:41–52`

```ts
const TERMINAL_ENGAGEMENT = new Set(['delivered','failed','quality_hold','ready','withdrawn']);
const TERMINAL_INTAKE = new Set(['needs_analysis_review','needs_decision_record','held','published','review_required']);
```

The loop (`:64–73`) stops on **either** set:

```ts
if (TERMINAL_ENGAGEMENT.has(synced.status.engagement) || TERMINAL_INTAKE.has(synced.intake?.status ?? ''))
  return synced;
```

`TERMINAL_ENGAGEMENT` contains `ready`. Three intermediate or pre-import engine states map to
`ready`, so the loop stops at the first of them:

- `automation_ready` — *"release is in progress"*: the app stops before release.
- `approved` — *"awaiting publication"*: the app stops before publication.
- `published` — stops correctly, because `syncDiagnosticRun` imports within the same call.

`TERMINAL_INTAKE` is also incomplete: it omits `validation_failed`, `changes_requested`,
`failed` and `cancelled`, which happen to be covered by `TERMINAL_ENGAGEMENT` mapping them to
`quality_hold` / `failed` / `withdrawn`. The two sets only work as a pair, and neither is
individually correct.

### 3.2 Page re-sync

`src/routes/(montsel)/app/diagnostic/[engagementId]/+page.server.ts:18`

```ts
const TERMINAL = new Set(['delivered','failed','quality_hold','withdrawn','ready']);
```

Same defect, and no recovery: once an engagement is `ready`, a page visit will not re-sync it.

### 3.3 Consequence — the strand

1. Engine reports `automation_ready`.
2. `syncDiagnosticRun` writes engagement `ready` and returns without importing.
3. Worker sees `ready` in `TERMINAL_ENGAGEMENT` → returns. Trigger task ends successfully.
4. Page sees `ready` in `TERMINAL` → does not re-sync.
5. Nothing else in the application writes a later state.

The engagement is `ready` forever, with `engine_run_ref` set and `delivered_at` null, and no
output row. The buyer paid and receives nothing, and no surface reports an error.

## 4. Second defect — import failure is not recorded

`syncDiagnosticRun` (`orchestration.ts:284–307`):

```ts
await updateEngagement({ engagementId, status: mapped.engagement, ... });   // writes 'ready'
...
if (intake.status !== 'published' || !runPublicId) return {...};
const outputId = await importDeliveredReport(engagement, runPublicId);      // may throw
```

`importDeliveredReport` throws on a missing publication, a hash mismatch, or an unknown product
key. It sets `quality_hold` only when the *quality receipt* fails a check.

If it throws after the engagement was written as `ready`:

- The engagement stays `ready` — terminal for worker and page (§3).
- No failure code is recorded.
- `retrying` exists in the engagement vocabulary (`engagement.ts:35`) and is written by
  nothing.

So a transient import failure is indistinguishable from success at the state level, and the
run cannot be retried without database surgery.

## 5. What "terminal" must mean

A state is terminal for automated processing when **no further progress is possible without an
external actor**. That yields:

| Genuinely terminal | Why |
| --- | --- |
| `published` | Engine work complete. Import happens in the same sync call; the loop may stop |
| `review_required` | Awaiting a consultant grant; nothing will change automatically |
| `needs_analysis_review` | Awaiting consultant acceptance |
| `needs_decision_record` | Awaiting consultant decision record |
| `held` | Quality hold; a human must act |
| `validation_failed` | Quality hold; a human must act |
| `changes_requested` | Run returned for changes |
| `failed` | Terminal failure |
| `cancelled` | Withdrawn |

| Genuinely **not** terminal | Why |
| --- | --- |
| `queued`, `running`, `ready`, `context_ready`, `generating` | Engine is working |
| **`automation_ready`** | Release is in progress; publication has not happened |
| **`approved`** | Awaiting publication |
| unknown strings | Unknown must mean "keep waiting", never "stop" |

## 6. Corrected model

### 6.1 One authority

`status.ts` gains two predicates and the sets they read. Nothing else defines terminality.

```ts
/** Engine/intake states after which automated processing cannot progress. */
export const TERMINAL_INTAKE_STATUSES: ReadonlySet<string>;
export function isTerminalIntake(status: string): boolean;

/** Engagement states after which no automated work remains. */
export const TERMINAL_ENGAGEMENT_STATUSES: ReadonlySet<EngagementStatus>;
export function isTerminalEngagement(status: EngagementStatus): boolean;
```

Unknown engine status → `isTerminalIntake` returns **false**. Unknown means wait.

### 6.2 Mapping corrections

`automation_ready` and `approved` map to `in_delivery`, not `ready`. They are delivery states;
the labels and messages are unchanged. `ready` then means only "awaiting a human" or
"published, import pending", which is what the UI already implies.

### 6.3 Delivery is gated on import

`delivered` is written only inside `importDeliveredReport`, after:

1. the quality receipt passes every check (`orchestration.ts:316–327`), and
2. the publication bytes hash-match the engine's `content_hash` (`import.ts:93`), and
3. the `output` / `output_version` rows are written.

This is already true and is preserved. The change is what happens **around** it.

### 6.4 Import failure becomes retryable

When `intake.status === 'published'` and the import throws, `syncDiagnosticRun` records:

- engagement `retrying`
- `failure_code` = the error class (`import_failed`, `hash_mismatch`, `missing_publication`)
- `failure_detail` = the message

`retrying` is not terminal, so both the worker and the page will attempt the import again on
the next sync. Success moves the engagement to `delivered`; repeated failure stays visible
rather than silent.

### 6.5 Poll loop uses the predicates

`runDiagnosticIntake` stops when `isTerminalIntake(intake.status)` **or**
`isTerminalEngagement(mapped.engagement)`. The loop body moves into
`diagnostic/server/polling.ts` so it can be tested with an injected clock and sync function.

## 7. Invariants to test

1. No intermediate state terminates the loop.
2. A publishing delay (`automation_ready` then `published`) completes and imports.
3. `review_required` terminates without importing and without a grant.
4. A failed quality check parks the engagement in `quality_hold` and imports nothing.
5. A hash mismatch leaves the engagement retryable and imports nothing.
6. A timeout returns `timedOut: true` with the last observed status, importing nothing.
7. Repeated polling of an unchanged intermediate state does not terminate early.
8. Successful delivery writes `output` and one `output_version`, and sets `delivered_at`.
9. An unknown engine status does not terminate.

## 8. Files this change touches

| File | Change |
| --- | --- |
| `diagnostic/server/status.ts` | Two predicates; `automation_ready`/`approved` → `in_delivery` |
| `diagnostic/server/polling.ts` | New: the poll loop, injectable clock and sleep |
| `diagnostic/server/orchestration.ts` | Import failure → `retrying` + failure code |
| `lib/app/diagnostic-worker.server.ts` | Use the predicates and the extracted loop |
| `routes/(montsel)/app/diagnostic/[engagementId]/+page.server.ts` | Use `isTerminalEngagement` |

Not touched: Visual Contract route, VAT configuration, checkout, schema, migrations,
`RELEASED_PRODUCTS`.

Also changed, to enable the harness: `scripts/diagnostic/disposable-db.ts` now resolves
`PROJECT_ROOT` from `process.cwd()` when `import.meta.dir` is absent, and spawns `bun`
explicitly for the migration runner instead of `process.execPath`. Both are no-ops when the
existing Bun scripts run.

## 9. Implementation and verification

Implemented 30 October 2026.

### 9.1 Test results

| Suite | Command | Result |
| --- | --- | --- |
| Status mapping and terminality | `vitest run …/status.test.ts` | 9 passed |
| Poll loop | `vitest run …/polling.test.ts` | 11 passed |
| Quality gate | `vitest run …/quality.test.ts` | 4 passed |
| Signal lifecycle (disposable DB + fake engine) | `vitest run …/signal-delivery.integration.test.ts` | 5 passed |
| Regression sweep | `vitest run src/lib/modules/diagnostic src/lib/modules/products src/lib/app src/lib/modules/billing` | 128 passed, 1 pre-existing failure, 5 skipped |
| Module boundaries | `node scripts/check-module-boundaries.mjs` | 891 files verified |
| Typecheck | `svelte-check` | 0 errors, 0 warnings |

The single regression-sweep failure is pre-existing and unrelated:
`products/shared/__tests__/access.test.ts:44` expects `/app/workflow/tool.visual_contract`
while the registry at `HEAD` declares `/app/tools/visual-contract`. Recorded in Phase 2 §6
and unchanged here.

### 9.2 The harness is not vacuous

Reverting the `automation_ready` mapping to `ready` makes the lifecycle suite fail with
`expected 'ready' to be 'in_delivery'`. Reverting restores 5/5.

Worth recording precisely: with the mapping reverted but the terminality fix in place, the
poll loop still completes, because `ready` is no longer a terminal *engagement* state. The
two fixes are independent — the terminality fix alone prevents the strand; the mapping fix
makes the reported status truthful. Both are required for the state model to be coherent.

### 9.3 Lifecycle scenarios proven

1. `automation_ready` does not settle the run; publishing then imports and sets `delivered`.
2. A publishing delay (`automation_ready` ×2 → `published`) completes through the real poll
   loop, taking more than one poll.
3. `review_required` settles the loop, imports nothing, leaves no delivery timestamp.
4. A failed quality check parks the engagement in `quality_hold` with `failure_code =
   quality_gate` and imports nothing.
5. A hash mismatch leaves the engagement `retrying` with `failure_code = hash_mismatch`,
   imports nothing, and then **recovers** to `delivered` once the bytes match — proving
   `retrying` is a recovery state rather than a dead end.

### 9.4 Production consequence — now confirmed, and serious

Authorised operational access resolved the open question:

```
wrangler secret list --name demode-templete
  → BETTER_AUTH_SECRET, BETTER_DATABASE_URL, BIGDATACLOUD_API_KEY, CAP_SECRET,
    CREEM_API_KEY, CREEM_WEBHOOK_SECRET, EMAIL_USESEND_API_KEY, GITHUB_CLIENT_SECRET,
    OAUTH_PROXY_SECRET, REDIS_PASSWORD, REDIS_URL, SIWE_RPC_URL
  → no DIAGNOSTIC_ENGINE_URL, no DIAGNOSTIC_ENGINE_TOKEN
```

Names only were read; no secret value was printed or recorded.

The deployed Worker therefore has **no engine configuration at all**. `engine.ts` throws
`unconfigured` on every call. Combined with `RELEASED_PRODUCTS: "signal"`, the position is:

- Signal can be bought, and the purchase will activate an entitlement.
- The intake can be submitted.
- `startDiagnosticRun` calls `createIntake`, which throws `unconfigured`.
- The Trigger task retries three times and fails.
- No report is ever produced.

The status-machine defect fixed here is real but is **not** the current binding constraint.
The binding constraint is that Signal is on sale with no engine behind it. The "no consultant
sign-off" question is moot until an engine exists, because nothing is delivered at all.
