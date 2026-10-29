# M03 Business Commitments — module completion

Recorded 29 October 2026. Development-only verification. No live provider call, no paid request and
no production deployment. Anything not re-run here is marked as a gap rather than claimed.

Parity intent and the legacy trace are in `docs/architecture/m03-parity.md`.

## Status ledger

| Column | State |
| --- | --- |
| Implemented | Yes — schemas, rules, service, host composition, durable worker, provider, upstream derivation, seal, render, route and stage screen |
| Local integration verified | Partial — real-SQL service flow to seal, real-SQL M03 upstream derivation, host transport, worker guards, provider pinning and the focused suites. The hydrated page and Directus readback are **not** verified |
| Live provider verified | No — provider exercised with a fake fetch only |
| Real upstream connected | Yes in tests — derivation from an actual sealed M02 version row, with M01 lock re-check |
| Production deployed | No — out of scope |

## Implementation

| Concern | File |
| --- | --- |
| Stage machine, working-record schemas, receipt schema | `src/lib/modules/strategy/server/stages/m03/session.ts` |
| Command contract (strict, CAS + idempotency) | `src/lib/modules/strategy/server/stages/m03/commands.ts` |
| Step bodies, confirmations, outcome checks | `src/lib/modules/strategy/server/stages/m03/rules.ts` |
| Upstream body validation | `src/lib/modules/strategy/server/stages/m03/source.ts` |
| Service (create, draft, confirm, outcome, seal, successor) | `src/lib/modules/strategy/server/stages/m03/service.ts` |
| Immutable receipt and verification | `src/lib/modules/strategy/server/stages/m03/seal.ts` |
| Deterministic client document | `src/lib/modules/strategy/server/stages/m03/render.ts` |
| Provider adapter | `src/lib/modules/strategy/server/providers/m03.ts` |
| Durable worker | `src/lib/modules/strategy/server/jobs/m03-worker.ts` |
| Trigger task | `src/trigger/strategy-m03-session-v1.ts` |
| Upstream derivation from sealed M02 | `src/lib/app/strategy-m03-source.server.ts` |
| Auth transport | `src/lib/app/strategy-m03-host.server.ts` |
| Composition | `src/lib/app/strategy-runtime.server.ts`, `strategy-worker.server.ts`, `strategy-auth.server.ts`, `strategy-configuration.server.ts` |
| Gateway | `src/lib/modules/strategy/server/jobs/gateway.ts` (`createTriggerM03Gateway`) |
| Stage screen | `src/routes/(dashboard)/o/[organisationSlug]/[brandSlug]/strategy/engagements/[engagementId]/business-commitments/` |
| Private methods | `resources/strategy/system/03-Business-Commitments/` |

M03 added **no migration**. It reuses the Strategy core tables.

Private method corpus: seven documents copied from the Trigger System tree (`03-Prompt`,
`03_01-Conviction-Frontier`, `03-Quality-Gates`, `03-Handoff-Pack`, `03-Glossary`, `03-Philosophy`,
`03-README`). `03-Status`, `03-Worked-Example` and `03-Live-Evidence-Register` are operational or
evidence records, not method, and were excluded. `bun run strategy:resources` rebuilt the manifest:
**94 resources across 4 releases**. The archive remains valid and the previous releases are intact.

## Semantics preserved

- Hard upstream gate: newest sealed M02, verified seal, Outcome A only, no contrarian-trap flag, and
  the exact M01 version pinned by M02 still current. A failure produces a dependency notice and no
  session.
- Thirteen stages; eight model-drafted steps and two human-only steps. Only a typed confirmation
  advances a stage, and every confirmation is attributed to the authenticated actor.
- Step rules kept verbatim in behaviour: grid specialisation/artefact requirements, proof capture
  plans and must-qualify flagging, all seven friction sources plus the named lowest-friction copy
  threat, credibility cause/review conditions, undecided-contradiction blocking, empty-cost flag,
  advocate verdict flagging, and the full judgement contract.
- Outcome A requires `outcomeCheck` to be clean and always lands `provisional`, with reliance scope
  "Module 04 hypothesis-mode analysis only — does not authorise Module 05 lock". Outcome X requires
  a structured return document and authorises no handoff.
- Seal refuses an undecided run, re-checks Outcome A eligibility, and refuses if the pinned upstream
  changed. The receipt hashes pretty-printed session and commitments snapshots; the canonical
  version is hashed with `sha256-json-stringify-v1` and carries the rendered document and its hash.
- Two documents: `03-business-commitments.md` and `03-outcome-x-return.md`.

## Deliberate differences from legacy

- The Trigger waitpoint mirror is replaced by the shared SQL repository, durable job runner and
  committed outbox. No per-stage mirror was added.
- Legacy `confirmedBy` (a typed name) is replaced by the authenticated actor, as in M01/M02/M04.
- Legacy shared mutable zod defaults are not reproduced; every mutable default is a lazy factory.
  A regression test asserts two parses never share nested default objects.
- Only the Full route is accepted; Skip, Light and Constrained are refused server-side until an
  approved locked-source adoption record exists, matching M02's rule.
- The provider loads the pinned method documents rather than the legacy inline prompt strings. The
  output contract is unchanged because the same step schemas validate both.

## Verification

| Check | Result |
| --- | --- |
| `bun test tests/strategy/m03-*.test.ts src/lib/.../providers/m03.test.ts src/lib/.../jobs/__tests__/m03-worker.test.ts` | 33 passed, 0 failed |
| Full M02 + M03 regression (17 files) | 95 passed, 0 failed, 395 assertions |
| `bun run check` | Module boundaries across 741 files; wrangler types current; svelte-check 0 errors, 0 warnings |
| `bun run build` | 9,251 modules; `@sveltejs/adapter-cloudflare` complete |
| `node scripts/strategy/verify-build.mjs` | Private method resources absent from the browser build |
| `bun run strategy:worker:build` | 84 modules, `worker.mjs` 2.47 MB |
| `bunx tsc -p tsconfig.worker.json --noEmit` | Clean |

What the tests actually prove:

- **Service (real PostgreSQL):** create → upstream review → ten step confirmations → draft is a
  candidate only → judgement → Outcome A → seal → one version, two documents, replay creates no
  second version → sealed record refuses further confirmations → successor forks and pins the same
  source → foreign engagement denied.
- **Upstream derivation (real PostgreSQL):** a sealed M02 version row is verified with
  `verifyM02Seal`, the M03 body is derived and stored under `m03-m02`, validation re-derives the
  same bytes, and moving the M01 head invalidates it. An Outcome B seal is refused.
- **Host transport:** create connects the upstream first; a draft enqueues a durable `m03` job with
  the pinned source; missing `generate`/`approve`/`edit` authority is denied; a foreign origin is
  denied; an unsupported route is refused.
- **Worker:** another module's job is rejected before claiming; an unavailable method release fails
  before provider execution.
- **Provider:** the pinned method release is loaded and named in the request, the JSON schema name is
  per step, a malformed candidate fails closed without leaking provider content, and an unknown
  release fails.
- **Rules/seal:** every blocking rule, the outcome ceiling, the rendered documents, and seal
  tampering detection (changed record, changed source pin, altered payload).

## Gaps

1. **No browser run of the M03 page.** The page compiles, passes svelte-check and is covered by no
   hydrated test. Its controls, draft loading and stage transitions are unproven in a browser.
2. **No Directus readback for M03 documents.** The seal writes documents through the repository;
   exact Directus readback and export byte comparison have not been exercised.
3. **No end-to-end M01 → M02 → M03 run.** The M03 source test derives from a synthetic sealed M02
   row, not from a chain produced by the M01 and M02 modules in one pass. The M02 end-to-end gap
   recorded in `m02-module-completion.md` still blocks that.
4. **No live provider run.** A bounded live batch needs its own approval; M02's approval is consumed.
5. **Successor carries only the route and reason.** It does not carry the confirmed inputs, unlike
   M02's research draft. This is a deliberate conservative choice, not parity with legacy (which had
   no successor for M03).
6. The svelte autofixer flags `{@html}` in the sealed document view. The HTML comes from our own
   deterministic renderer via `renderStrategyMarkdown`, as in M02; the warning is accepted, not
   suppressed.

## Next concrete action

Refresh the isolated workspace with the M03 slice, run a hydrated browser pass over the page
(create → upstream review → inputs → challenge draft → confirmations → judgement → outcome → seal →
exports → successor), then add Directus readback and the chained M01→M02→M03 run once the M02
end-to-end harness gap is closed.
