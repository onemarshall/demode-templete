# M05 Brand Strategy — module completion

Recorded 29 October 2026. Development-only verification. No live provider call, no paid request and
no production deployment.

## Status ledger

| Column | State |
| --- | --- |
| Implemented | Yes — contracts, route authority, upstream gate, rules, gates 0–7, packet, render, package, seal, service, provider, worker, Trigger task, host, route and screen |
| Local integration verified | Partial — full real-SQL flow from create to sealed, gates, coverage, freeze, review, package and seal verification; the hydrated page and Directus readback are **not** verified |
| Live provider verified | No — drafts and the Gate 7 review run against a stub |
| Real upstream connected | In tests — the chain is derived from a sealed Foundation; the derivation has its own tests |
| Production deployed | No — out of scope |

## Implementation

| Concern | File |
| --- | --- |
| Contracts (14 stages, 12 data stages, ledger, packet, checks, review, package) | `stages/m05/contracts.ts` |
| Command contract | `stages/m05/commands.ts` |
| Route record and upstream chain schema | `stages/m05/source.ts` |
| Inheritance and meaning-record checks | `stages/m05/meaning.ts` |
| Semantic ledger checks | `stages/m05/semantic.ts` |
| Decision packet checks | `stages/m05/decisions.ts` |
| Deterministic render and derived views | `stages/m05/render.ts` |
| Gates 0–6, coverage, freeze | `stages/m05/gates.ts` |
| Immutable receipt and verification | `stages/m05/seal.ts` |
| Service (create, draft, confirm, revise, checks, review, package, decide+seal, successor) | `stages/m05/service.ts` |
| Provider (drafts and the eight-lens review) | `providers/m05.ts` |
| Durable worker and Trigger task | `jobs/m05-worker.ts`, `src/trigger/strategy-m05-session-v1.ts` |
| Route authority and upstream derivation | `app/strategy-m05-route.server.ts`, `app/strategy-m05-source.server.ts` |
| Auth transport | `app/strategy-m05-host.server.ts` |
| Stage screen | `routes/…/strategy/engagements/[engagementId]/brand-strategy/` |

## Semantics preserved

- The hard upstream gate: confirmed M05 route, newest sealed Foundation only, verified seal, open
  gate with M05 permission, approved handoff pinning the exact version, recorded client approval.
- Fourteen stages from eligibility to sealed, with eleven confirmation points and eight model-drafted
  data stages.
- Inheritance: verbatim carriers, meaning records with interpretation, rejected alternative,
  recognition situation, boundary and repeat-back, coverage of the five convictions, both journey
  statements and every governing declaration, and a fifteen-field engagement check that halts on a
  blocking disposition.
- Semantic ledger: fourteen hierarchy levels, exactness enforcement, promotion and expression
  permissions, adversarial checks, recognition continuity, the exact-authority check and a
  recommendation that must be proceed or proceed-conditional.
- Decision packet: material decisions resolved, render-required decisions locked and carrying a
  render value, boundaries and sources recorded.
- Gates 0–6 with findings, exact render-coverage audit, candidate freeze with `candidateHash`.
- Gate 7: an independent eight-lens review that must cover the frozen candidate hash, offer an
  alternative and return a verdict.
- Package: six derived views with reconciliation, then the client decision (accept/revise/decline),
  then the seal. Any edit after freezing invalidates the candidate and the review.

## Deliberate differences

- **Screen depth.** The stage screen edits the record as JSON with validation on confirm, rather
  than the legacy module's 724 lines of stage-specific forms. It is complete and operable — a run can
  be driven end to end — but it is not the legacy operator experience.
- **Render.** The strategy document is assembled deterministically from the confirmed record rather
  than porting the legacy 381-line renderer byte for byte. Coverage is enforced against the packet's
  render values, so a decision that should appear cannot be silently dropped.
- **Entry receipt.** Derived from the Foundation chain (fingerprint over `{bf, m04, m03, m02, m01}`)
  rather than a separately approved source list, per the recorded decision.
- No waitpoint mirror; the durable job runner and committed outbox replace it.
- Every mutable zod default is a lazy factory.

## Verification

| Check | Result |
| --- | --- |
| `bun test tests/strategy/m05-*.test.ts` | 8 passed |
| Full M02–M05 regression (25 files) | 117 passed, 0 failed, 527 assertions |
| `bun run check` | 768 files; wrangler types current; svelte-check 0 errors, 0 warnings |
| `bun run build` | 9,284 modules; Cloudflare adapter complete |
| `node scripts/strategy/verify-build.mjs` | Private method resources absent from the browser bundle |
| `bun run strategy:worker:build` | `worker.mjs` 2.67 MB |
| `bunx tsc -p tsconfig.worker.json --noEmit` | Clean |

The service test drives eligibility → eight data stages → checks → review → package → decision →
seal, and asserts the gates all pass, coverage is complete, seven documents are written, the seal
verifies, and a successor forks to eligibility. A second test proves an inheritance with a blocking
engagement row or a thin meaning record is refused.

## Gaps

1. **No browser pass.** The page compiles and passes svelte-check but no control has been clicked.
2. **No Directus readback** for the seven sealed documents.
3. **No live provider run.** Drafts and the Gate 7 review have only run against a stub.
4. **No chained Foundation → M05 run through the Foundation service.** The derivation test builds a
   sealed Foundation row directly.
5. **Screen depth** is an editor, not the legacy stage forms.
6. Two `{@html}` uses render our own deterministic output through `renderStrategyMarkdown`.
