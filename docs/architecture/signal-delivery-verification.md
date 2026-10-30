# Signal delivery verification — read-only findings

Recorded 30 October 2026. Read-only. **No purchase was initiated, no production data was
modified, no engine call was made.**

Scope: determine whether the released product (Signal) can actually be delivered end to end —
engine configured, Signal family supported, and the automated publish/import path demonstrable
without a consultant grant.

Baseline: `e20f1c2`, working tree carrying only the two approved changes (see §6).

---

## 1. Is the engine configured?

| Check | Command | Result |
| --- | --- | --- |
| Local environment | `grep DIAGNOSTIC_ENGINE .env` | **Absent** |
| Template environment | `grep DIAGNOSTIC_ENGINE .env.example` | **Absent** |
| Deployed Worker vars | `grep DIAGNOSTIC_ENGINE wrangler.jsonc` | **Absent** |
| Generated Worker bindings | `grep DIAGNOSTIC_ENGINE worker-configuration.d.ts` | **Absent** |
| Readiness probe | `bun scripts/diagnostic/engine-readiness.ts` | Exit 1: *"Set DIAGNOSTIC_ENGINE_URL and DIAGNOSTIC_ENGINE_TOKEN before running this check."* |

**Conclusion: the engine is not configured in anything inspectable from this repository.**

> **Superseded 30 October 2026 (Phase 3A).** This section originally said absence from the
> repository was not proof of absence in production. That qualification has now been resolved
> by authorised operational access, and the answer is negative.
>
> `wrangler secret list --name demode-templete` (names only; no value was read or recorded)
> returns twelve secrets:
>
> `BETTER_AUTH_SECRET`, `BETTER_DATABASE_URL`, `BIGDATACLOUD_API_KEY`, `CAP_SECRET`,
> `CREEM_API_KEY`, `CREEM_WEBHOOK_SECRET`, `EMAIL_USESEND_API_KEY`, `GITHUB_CLIENT_SECRET`,
> `OAUTH_PROXY_SECRET`, `REDIS_PASSWORD`, `REDIS_URL`, `SIWE_RPC_URL`.
>
> **`DIAGNOSTIC_ENGINE_URL` and `DIAGNOSTIC_ENGINE_TOKEN` are not among them.**
>
> So the deployed Worker has no engine configuration, and `engine.ts:128–133` throws
> `EngineError('unconfigured', 503)` for every call. See
> `docs/architecture/signal-delivery-verification.md` §5 and the Phase 3A addendum for the
> consequence.

## 2. Does the engine support the Signal family?

**Not determinable.** The only authority is `EngineOptions.families` from `/v1/options`, and
that call fails closed without credentials (§1). `scripts/diagnostic/engine-readiness.ts:73`
would check `families.includes('signal')`, but cannot run.

What is established: the application is built for Signal. The variant is registered
(`diagnostic/shared/registry.ts`), the intake schema requires a decision frame plus
`subjectUrl`, and `buildEngineIntake` sends `reportFamily: 'signal'`.

## 3. Can the automated publish/import path be demonstrated without a consultant grant?

**No — and the reason is in the application, not only the engine.** This is the substantive
finding of this verification.

### 3.1 The path that would work

`syncDiagnosticRun` (`diagnostic/server/orchestration.ts:261`) imports the report when the
intake status is `published`, and it does so with no grant check:

```
syncDiagnosticRun
  ├─ getIntake(engineJobId)                    → status
  ├─ updateEngagement({ status: mapped })
  ├─ if (intake.status !== 'published') return  ← no import
  └─ importDeliveredReport()                    ← hash-verified import, no grant
```

A `consultant_grant` is required only by the `/consult/[engagementId]` route, for the manual
actions `accept`, `decision`, `delta`, `save`, `approve`, `generate`, `review`, `publish`
(`diagnostic/server/consultant.ts:79–83`). The import path itself is unguarded.

So if the engine moves a self-service run directly to `published`, import happens
automatically. That is the only sequence that works.

### 3.2 The path that cannot

Three engine states map to the same engagement status, and that status is treated as terminal
by both the poll loop and the page re-sync.

Verified by execution (`bun -e`, importing `statusFromIntake` directly):

```
automation_ready         -> ready
review_required          -> ready
approved                 -> ready
published                -> ready
```

`runDiagnosticIntake` (`lib/app/diagnostic-worker.server.ts:41–45, 64–73`):

```ts
const TERMINAL_ENGAGEMENT = new Set(['delivered','failed','quality_hold','ready','withdrawn']);
...
while (Date.now() < deadline) {
  const synced = await syncDiagnosticRun(engagementId);
  if (TERMINAL_ENGAGEMENT.has(synced.status.engagement) || ...) return synced;
  await new Promise(r => setTimeout(r, 5_000));
}
```

`/app/diagnostic/[engagementId]/+page.server.ts:18`:

```ts
const TERMINAL = new Set(['delivered','failed','quality_hold','withdrawn','ready']);
```

**Consequence.** If the engine emits `automation_ready` — which `status.ts` describes as
*"The automated checks have passed; release is in progress"* — then:

1. `syncDiagnosticRun` writes engagement status `ready` and imports nothing.
2. The poll loop sees `ready` in `TERMINAL_ENGAGEMENT` and returns immediately.
3. The diagnostic page sees `ready` in `TERMINAL` and does not re-sync on load.

The engagement is stranded at `ready` with no output, permanently. The same happens at
`approved` (*"approved and awaiting publication"*).

This is a defect in the application's own state machine. It does not depend on the engine
being unavailable or misconfigured — it triggers on a state the application itself defines
and renders.

### 3.3 What this means for the live promise

`RELEASED_PRODUCTS: "signal"` (`wrangler.jsonc:71`, `.env:154`). Signal is on sale, and the
pricing page tells buyers there is "no consultant sign-off"
(`pricing/+page.svelte:188`).

Three mutually exclusive explanations remain, and this environment can distinguish none of
them:

| # | Engine behaviour | Outcome today |
| --- | --- | --- |
| A | Publishes directly (`generating → published`) | Claim holds; import works |
| B | Emits `automation_ready` or `approved` first | **Stranded at `ready`, never imported** |
| C | Emits `review_required` | Stalls awaiting a consultant; claim is false |

Explanation A is the only one compatible with the published promise. B and C both require an
application change before the promise can be kept.

## 4. Runtime evidence available locally

| Source | Finding |
| --- | --- |
| `BETTER_DATABASE_URL` in `.env` | Empty — no local database, so no engagement or purchase rows to inspect |
| `.local-state/diagnostic-import/` | Three SHA-256-named artefacts. These are staged inputs for `scripts/diagnostic/verify-import.ts`, which runs against a disposable database. They are not engine output from a real run |
| `*.log` files | All under `.local-state/strategy-integration/`; none relate to the diagnostic module |
| `diagnostic_run_event` rows | Unreachable without a database |

**Conclusion: there is no local evidence that a Signal run has ever completed.** That is
consistent with `docs/architecture/diagnostic-module-current-state.md` ("Local integration
verified: No", "Live engine verified: No").

## 5. Blockers, ranked

| # | Blocker | Owner | Blocks | Evidence |
| --- | --- | --- | --- | --- |
| B1 | Engine credentials unverifiable from the repo | Operations | Everything downstream | §1 |
| B2 | `automation_ready` / `approved` strand the poll loop and page re-sync | Application | Automated delivery even with a working engine | §3.2 |
| B3 | No path to `published` without `consultant_grant` *in the application* | Application + engine | The "no sign-off" promise | §3.1, `consultant.ts:79–83` |
| B4 | Signal is released while B2/B3 are unresolved | Commercial | Buyer harm if B or C is the true behaviour | §3.3 |

B2 is the only one that can be fixed entirely inside this repository, and it must be fixed
before any engine verification is meaningful — otherwise a successful engine run will be
misread as a failure.

## 6. Change log for this session

Two changes were authorised and made. Nothing else was touched.

| Change | File | Verification |
| --- | --- | --- |
| `popular: true` → `false` on the unreleased Full Diagnostic | `src/lib/app/plans.ts:105` | See below |
| Registry integrity test | `src/lib/app/__tests__/catalogue-integrity.test.ts` (new) | 8 tests |

### Test results

```
bunx vitest run src/lib/app/__tests__/catalogue-integrity.test.ts --project server
  Test Files  1 passed (1)
  Tests       8 passed (8)
```

The suite covers: plan → descriptor mapping; complete variant for every self-service
diagnostic; planned diagnostics explicitly unsellable; no orphan variants; every live family
accepts a minimal intake and does not fall through to the Signal schema; the configured
release list is accepted while `full-diagnostic` is rejected; every diagnostic product
declares a sales mode; and no incomplete product carries the popular badge.

The guard was proved non-vacuous by mutation: restoring `popular: true` on
`full-diagnostic` produced

```
AssertionError: expected [ 'full-diagnostic' ] to not include 'full-diagnostic'
Tests  1 failed | 7 passed (8)
```

and reverting restored 8/8.

### Regression check

```
bunx vitest run src/lib/modules/products src/lib/modules/diagnostic src/lib/app --project server
  Test Files  1 failed | 13 passed (14)
  Tests       1 failed | 104 passed (105)
```

The single failure is **pre-existing and unrelated**:
`src/lib/modules/products/shared/__tests__/access.test.ts:44` expects
`/app/workflow/tool.visual_contract`, while the registry at `HEAD` has
`workflowPath: '/app/tools/visual-contract'`. Confirmed present at `HEAD` — neither file is
modified in this session. It needs a product decision about which path is correct, not a
silent edit.

```
node scripts/check-module-boundaries.mjs
  Module boundaries verified across 890 source files.
```

## 7. Recommended next phase

**Phase 3A — prove the existing product before building a new one.** Nothing in this phase
touches the assessment journey, the migration, checkout or sector research.

| # | Step | Depends | Why now |
| --- | --- | --- | --- |
| 1 | Fix the terminal-state defect: `automation_ready` and `approved` must not terminate polling or page re-sync | — | B2 is app-only, small, and makes every later test meaningful |
| 2 | Unit-test the poll loop against a fake engine client returning `automation_ready → published` and `review_required` | 1 | Proves the fix without any engine |
| 3 | Build a fake-engine integration harness (precedent: `scripts/strategy/integration/fake-services.ts`) driving intake → poll → import on a disposable DB | 2 | Demonstrates the full path with no engine and no purchase |
| 4 | Confirm production engine configuration with Operations (dashboard or a probe from the deployed Worker) | — | Resolves B1; can run in parallel |
| 5 | Controlled Signal run against the real engine, **on separate approval** | 3, 4 | The only way to settle §3.3 |

Step 5 is the point where a decision is needed about how to authorise a single test
engagement. The safest option is an operator-granted entitlement
(`product_entitlement.source` other than `purchase`) against a controlled fixture site — no
Stripe session, no payment, no buyer data. That still requires explicit approval because it
writes an engagement row to whatever database it targets.

Until step 5 completes, the honest position on the "no consultant sign-off" promise is that
it is **unverified**, not that it is broken. §3.3 explanation A remains possible.

## 8. What this verification did not do

- No purchase, no Stripe session, no entitlement written.
- No engine call — credentials absent.
- No database connection — `BETTER_DATABASE_URL` empty.
- No change to `RELEASED_PRODUCTS`, checkout, schema or any diagnostic module file.
- No fix applied for B2 or B3; both are reported for the next phase.
