# Business Foundation — module completion

Recorded 29 October 2026. Development-only verification. No live provider call, no paid request and
no production deployment. Anything not exercised here is recorded as a gap.

## Status ledger

| Column | State |
| --- | --- |
| Implemented | Yes — contracts, rules, service, host, worker, provider, upstream derivation, seal, render, route and stage screen |
| Local integration verified | Partial — real-SQL service flow from create to sealed, seal verification and tamper detection, rules, gate, upstream validation and the real M04→BF derivation. The hydrated page and Directus readback are **not** verified |
| Live provider verified | No — provider exercised with a stub only |
| Real upstream connected | Yes in tests — derived from an actual sealed M04 session and version row, with the version hash, source pin and route authorisation verified (`bf-source.test.ts`) |
| Production deployed | No — out of scope |

## Implementation

| Concern | File |
| --- | --- |
| Contracts (assessment, manifesto, document, decision, source, session, receipt) | `src/lib/modules/strategy/server/stages/bf/contracts.ts` |
| Command contract | `src/lib/modules/strategy/server/stages/bf/commands.ts` |
| Rules: assessment, declarations, render checks, gate, prefill, invalidation | `src/lib/modules/strategy/server/stages/bf/rules.ts` |
| Upstream body validation | `src/lib/modules/strategy/server/stages/bf/source.ts` |
| Service (create, draft, review, recheck, save, confirm, revise, resolve, decide+seal, successor) | `src/lib/modules/strategy/server/stages/bf/service.ts` |
| Immutable receipt and verification | `src/lib/modules/strategy/server/stages/bf/seal.ts` |
| Client document render | `src/lib/modules/strategy/server/stages/bf/render.ts` |
| Provider adapter (draft, fresh review, recheck) | `src/lib/modules/strategy/server/providers/bf.ts` |
| Durable worker | `src/lib/modules/strategy/server/jobs/bf-worker.ts` |
| Trigger task | `src/trigger/strategy-bf-session-v1.ts` |
| Upstream derivation from sealed M04 | `src/lib/app/strategy-bf-source.server.ts` |
| Auth transport | `src/lib/app/strategy-bf-host.server.ts` |
| Composition | `strategy-runtime.server.ts`, `strategy-worker.server.ts`, `strategy-auth.server.ts`, `strategy-configuration.server.ts`, `jobs/gateway.ts` |
| Stage screen | `src/routes/(dashboard)/o/[organisationSlug]/[brandSlug]/strategy/engagements/[engagementId]/business-foundation/` |
| Private methods | `resources/strategy/system/bf-templates/` |

No migration was added; BF reuses the Strategy core tables.

Private method corpus: five documents copied from the Trigger System templates
(`Business-Definition-Input-Assessment-Template`, `Business-Manifesto-Generator-Prompt`,
`Business-Foundation-Document-Generator-Prompt`, `Business-Foundation-Document-Template`,
`Business-Foundation-Approval-Record-Template`). The manifest was rebuilt: **99 resources across
5 releases**, archive intact.

## Semantics preserved

- Hard upstream gate: a sealed M04 whose version hash verifies, whose source pin matches the
  session, and whose route authorisation is `authorised` with an authorising capability. A failure
  is a blocker, not a session.
- Five stages: assessment → manifesto → document → client-decision → sealed.
- Sixteen assessment realities; a sufficient row cannot rest on an unknown or unsupported basis; a
  non-sufficient row needs a next action; a passed assessment needs every row sufficient or
  not-applicable, no blocking contradiction and a permitted manifesto route.
- Manifesto: governing declarations must appear verbatim in the manifesto, the source trace must
  cover every conviction, spine statement and declaration, all eleven declaration tests must be
  recorded and passed.
- Document: no internal machinery may leak into the client text, every required section needs
  lineage, the explanatory dependency and operating-model state must be decided, and all ten
  structural tests must pass.
- Fresh review is a separate bounded pass; every finding needs a human disposition, and the
  corrected candidate must pass a recheck before the gate can open.
- The client decision must be recorded by the named decision owner from the engagement authority.
  An approval carries both confirmations and seals the exact version in the same act, as in the
  legacy module. A revision request reopens the document; a source dispute closes the session.
- The downstream gate names every failing condition. A non-`full-standard` route leaves the gate
  blocked with Brand Strategy permission denied, even when the foundation itself seals.
- Successors pin the current verified M04 source and require fresh confirmations.

## Deliberate differences from legacy

- The waitpoint mirror is replaced by the SQL repository, durable job runner and committed outbox.
- Attribution uses the authenticated actor. The client decision still carries the named approver
  and authority reference, because that is a client act, not an operator act.
- The seal hashes the sealed **record** (data, review, source pin, sources, confirmations, gate),
  not the session file. Hashing the session would be circular: the session contains the seal. This
  keeps the receipt independently verifiable without a self-reference.
- Legacy shared mutable zod defaults are not reproduced; every mutable default is a lazy factory.

## Verification

| Check | Result |
| --- | --- |
| `bun test tests/strategy/bf-*.test.ts` | 14 passed, 0 failed |
| Full M02 + M03 + BF regression (22 files) | 109 passed, 0 failed, 464 assertions |
| `bun run check` | Module boundaries across 753 files; wrangler types current; svelte-check 0 errors, 0 warnings |
| `bun run build` | 9,266 modules; `@sveltejs/adapter-cloudflare` complete |
| `node scripts/strategy/verify-build.mjs` | Private method resources absent from the browser build |
| `bun run strategy:worker:build` | `worker.mjs` 2.57 MB |
| `bunx tsc -p tsconfig.worker.json --noEmit` | Clean |

What the tests actually prove:

- **Service (real PostgreSQL):** create seeds sixteen partial rows; assessment → manifesto →
  document confirmations advance the stages; a draft is a candidate and does not advance; the gate
  stays denied until the review and decision exist; recheck refuses while a finding is pending;
  a decision from anyone other than the named owner is refused; an approval seals; one version and
  three documents are written; the loaded seal verifies; the sealed record refuses further
  confirmations; a successor forks and pins the same source.
- **Rules:** unsupported sufficient rows, blocking contradictions, invented declarations, missing
  trace entries, unassessed tests, internal-machinery leaks, missing lineage, unresolved
  dependencies and failed structural tests are each caught; the gate opens only when every check
  passes.
- **Seal:** round-trip verification, plus detection of changed content, a changed source pin and an
  altered canonical payload.
- **Upstream validation:** waiting or terminal routes, unauthorised capabilities and a missing
  decision owner are refused.
- **M04→BF derivation (real PostgreSQL):** a sealed M04 session and its immutable version are read,
  the version hash, source pin and route authorisation are checked, the BF bundle is derived and
  stored under `bf-m04`, validation re-derives the same bytes, a tampered version is refused, a
  waiting route is refused, and a source that no longer matches the derived chain is rejected.

## Gaps

1. **No browser pass** over the foundation page. It compiles, passes svelte-check and has keyed
   blocks, but no control has been clicked.
2. **No Directus readback** for the three sealed documents.
3. **No live provider run.** Draft, fresh review and recheck have only run against a stub.
4. **No chained M04 → BF run through the M04 service.** The derivation test builds the sealed M04
   row through the real schema and tables, but M04 itself is not executed first, so the seam is
   proven at the storage boundary rather than through a full upstream run.
5. The svelte autofixer flags two `{@html}` uses in the rendered preview and sealed view. Both
   render our own deterministic output through `renderStrategyMarkdown`, as in M02/M03.

## Next concrete action

Run the hydrated browser pass over the foundation page and add Directus readback. M05 Brand
Strategy is next in dependency order.
