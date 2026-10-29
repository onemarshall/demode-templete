# M02 Market Reality — module completion

Recorded 29 October 2026. Development-only verification. No production deployment, no live
provider call and no paid request was made. Figures below come from the commands listed under
Verification; anything not re-run in this session is marked as such rather than claimed.

## Status ledger

| Column | State |
| --- | --- |
| Implemented | Yes — rules, service, host composition, durable worker, provider adapters, collection, UI, seal, exports |
| Local integration verified | Partial — sealed-record browser, successor control, exports, service/host/HTTP paths and focused suites verified; the full create → seal chain and Directus readback were not re-run in this session (see Gaps) |
| Live provider verified | No — provider paths exercised with the local synthetic fake only |
| Real upstream connected | Yes — M02 consumes the actual sealed M01 version through the `m02-m01` source slot; re-verified by `validateSource` during the successor checks |
| Production deployed | No — explicitly out of scope |

## Implementation

Pure stage rules are separate from transport, SQL, providers and composition.

| Concern | File |
| --- | --- |
| Command contracts (strict, CAS + idempotency) | `src/lib/modules/strategy/server/stages/m02/commands.ts` |
| Session, recon and evidence-basis schemas | `src/lib/modules/strategy/server/stages/m02/session.ts` |
| Artifact and source-independence rules | `src/lib/modules/strategy/server/stages/m02/evidence.ts` |
| Gate, risk and outcome rules | `src/lib/modules/strategy/server/stages/m02/gates.ts` |
| M01 source derivation and validation | `src/lib/modules/strategy/server/stages/m02/source.ts`, `src/lib/app/strategy-m02-source.server.ts` |
| Service (mutations, judgements, seal, successor) | `src/lib/modules/strategy/server/stages/m02/service.ts` |
| Immutable receipt and verification | `src/lib/modules/strategy/server/stages/m02/seal.ts` |
| Deterministic client document render | `src/lib/modules/strategy/server/stages/m02/render.ts` |
| Durable generation worker | `src/lib/modules/strategy/server/jobs/m02-worker.ts`, `src/trigger/strategy-m02-session-v1.ts` |
| Provider candidate generation | `src/lib/modules/strategy/server/providers/m02.ts` |
| Safe public-URL collection | `src/lib/modules/strategy/server/providers/m02-collection.ts` |
| Auth transport and scope resolution | `src/lib/app/strategy-m02-host.server.ts` |
| Stage screen | `src/routes/(dashboard)/o/[organisationSlug]/[brandSlug]/strategy/engagements/[engagementId]/market-reality/` |
| Private method resources | `resources/strategy/system/02-Market-Reality-Check/` |

M02 added **no migration**. It reuses the existing Strategy tables (`strategy_session`,
`strategy_revision`, `strategy_version`, `strategy_source_head`, `strategy_source_ref`,
`strategy_document`, `strategy_approval`, `strategy_outbox`, `strategy_fork_command`) created by
`0004_strategy_core.sql`.

## Semantics preserved

- Eight drafts are unapproved candidates; generation cannot confirm, decide or seal.
- Evidence review and progression decision are separate receipts bound to one evidence-basis hash.
- Sealing writes one immutable version, a canonical payload and two documents; replay of the same
  command creates no second version.
- A successor forks from a sealed parent only, pins the current verified M01 source, carries the
  research scope forward as a draft and records its reason. The sealed ancestor is never edited.
- Skip, Light and Constrained routes are refused server-side in `confirm-setup` and disabled in the
  UI until an approved locked-source adoption record exists.

## Defect found and fixed in this session

The M02 zod schemas evaluated their defaults once at module load
(`.default(Gate1Section.parse({}))`, `.default({})`, `.default([])`). Zod returns that value by
reference, so an in-place mutation of one parsed record permanently changed the default seen by
every later parse in the same process — across sessions, not just across tests.

Symptom: `tests/strategy/m02-session.test.ts` "M02 evidence-basis hash preserves the pre-refactor
canonical bytes" failed (received `b8e97185…`, expected `2d8e8431…`) only when
`tests/strategy/m02-service.test.ts` ran first, and passed in isolation.

Fix: every mutable default in `stages/m02/session.ts`, `gates.ts`, `evidence.ts` and `service.ts`
is now a lazy factory (`() => …`), so each parse receives a fresh value. The historical expected
hash was **not** changed and no schema shape changed.

## Verification

All commands run in `/Users/rob/Sites/_static/_sveltekit/_live/auth/auth` unless stated.

| Check | Result |
| --- | --- |
| `bun test tests/strategy/m02-*.test.ts src/lib/modules/strategy/server/providers/m02.test.ts src/lib/modules/strategy/server/providers/m02-collection.test.ts src/lib/modules/strategy/server/jobs/__tests__/m02-worker.test.ts` | 63 passed, 0 failed, 256 assertions, across 9 files. Re-run three times, including after the schema fix, in mixed file order |
| `bun run check` | Module boundaries verified across 729 files; `wrangler types --check` up to date; svelte-check 0 errors, 0 warnings |
| `bun run build` | `vite build` transformed 9,236 modules; `@sveltejs/adapter-cloudflare` completed |
| `node scripts/strategy/verify-build.mjs` | Private Strategy method resources absent from the browser build |
| `bun run strategy:worker:build` | 73 modules bundled to `worker.mjs` (2.20 MB) |
| `bunx tsc -p tsconfig.worker.json --noEmit` | Clean |

### Sealed-record browser and transport checks

Run against the retained sealed M02 session `72b2456f-b6b5-4112-86f6-f02de4a2e102` (revision 25,
stage `sealed`) on the disposable stack, using the isolated app at `http://127.0.0.1:5188` and a
real Better Auth sign-in as the synthetic operator.

| Check | Result |
| --- | --- |
| Scoped JSON read | 200, revision 25, stage `sealed` |
| Successor POST over HTTP with real cookies | 200, new session at revision 1, stage `setup` |
| Successor POST through the host composition | 200 |
| Successor call against the service + repository directly | 200 |
| Sealed screen renders in a hydrated browser | Pass |
| Export link resolves to the handoff route | 200 |
| Exported bytes equal the stored document | Pass |
| Successor control opens a new record and reaches research setup | Pass |
| Browser runtime errors | None |

The export links use `href="./market-reality/handoff?…"`. Resolved against the page URL
`…/engagements/<id>/market-reality`, the browser resolves the base to `…/engagements/<id>/`, so the
target is `…/engagements/<id>/market-reality/handoff`. This was checked rather than assumed; the
link is correct.

### What this does not prove

The sealed record, its documents and its receipt were produced by an earlier run of this module.
This session verified the sealed-record surfaces and the successor path against it; it did not
re-execute create → generation → review → judgement → seal, Directus readback, revoked-access
denial or the separate worker process. Those remain evidenced only by the focused suites and the
earlier run, not by a fresh end-to-end pass.

## Test data, accounting and cleanup

- All inputs are explicitly synthetic fixtures; no client data, quote, claim or market observation
  is represented as real.
- Paid provider requests: **0**. No live provider, model or external service was called.
- Reproduction created six synthetic successor sessions on the disposable database, all parented to
  `72b2456f-…`: `3c649b4d…`, `9020d073…`, `ee364fce…`, `3ae524a3…`, `54c9829a…`, `dbcfe708…`.
  The sealed parent and its version, documents and receipt are unchanged.
- The synthetic grant for engagement `ac0ecaec-adba-4c5f-bfa3-7c3406eed79d` was temporarily
  un-revoked to run the browser and HTTP checks and restored afterwards to
  `revoked_at = 2026-10-29T14:21:56.560Z`.
- No service was started or stopped. The integration Postgres (55433), Directus (8112) and the
  isolated app (5188) were already running and were left running.
- The isolated workspace at
  `/Users/rob/Sites/_static/_sveltekit/_live/trigger/.local-state/auth-integration/m02-workspace`
  is not refreshed automatically. It was re-synced from this repository for the final browser run.

## Gaps

1. `scripts/strategy/integration/m02-end-to-end.ts` cannot run as committed. It requires
   `m01-end-to-end-result.json`, `m01-browser-state.json` and `m01-browser-target.json` in
   `.local-state/strategy-integration/`, and none of them exist. The full chained
   create → seal → Directus → export → successor pass needs those M01 harness artifacts
   regenerated, or the M02 prepare step made self-sufficient.
2. No live provider run for M02. A bounded live batch needs its own fresh approval; prior M01/M04
   approvals are consumed.
3. Directus readback for M02 documents was not re-verified in this session.
4. Skip, Light and Constrained routes remain unavailable by design until approved source records
   are connected.
