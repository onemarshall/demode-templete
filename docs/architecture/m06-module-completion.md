# M06 Marketing Strategy — module completion

Recorded 29 October 2026. Development-only verification. No live provider call, no paid request and
no production deployment.

## Status ledger

| Column | State |
| --- | --- |
| Implemented | Yes — contracts, route authority, upstream gate, rules, gates 0–7, render, seal, service, provider, worker, Trigger task, host, route and screen |
| Local integration verified | Partial — full real-SQL flow from create to sealed, gates, freeze, review and seal verification; the hydrated page and Directus readback are **not** verified |
| Live provider verified | No — drafts and the review run against a stub |
| Real upstream connected | In tests — derived from a sealed M05; the derivation has its own code path but no dedicated test yet |
| Production deployed | No — out of scope |

## Implementation

| Concern | File |
| --- | --- |
| Contracts (13 stages, 8 data stages) | `stages/m06/contracts.ts` |
| Command contract | `stages/m06/commands.ts` |
| Route record and chain schema | `stages/m06/source.ts` |
| Stage rules and gates 0–7 | `stages/m06/rules.ts` |
| Deterministic render | `stages/m06/render.ts` |
| Immutable receipt and verification | `stages/m06/seal.ts` |
| Service (create → confirm → checks → review → decide → seal → successor) | `stages/m06/service.ts` |
| Provider (drafts and the six-lens review) | `providers/m06.ts` |
| Durable worker and Trigger task | `jobs/m06-worker.ts`, `src/trigger/strategy-m06-session-v1.ts` |
| Route authority and upstream derivation | `app/strategy-m06-route.server.ts`, `app/strategy-m06-source.server.ts` |
| Auth transport | `app/strategy-m06-host.server.ts` |
| Stage screen and field definitions | `routes/…/marketing-strategy/`, `shared/fields/m06.ts` |

## Semantics preserved

- The gate: a sealed Brand Strategy whose independent review passed and whose client decision was
  accepted, plus a confirmed M06 module route. A failure is a blocker, not a session.
- Thirteen stages with eight confirmed data stages: inheritance, foundation, audience, positioning,
  expressions, routes, activation, measurement.
- Inheritance: verbatim carriers, meaning records covering the five convictions, both journey
  statements and every declaration, each with interpretation, rejected alternative, recognition
  situation, boundary and repeat-back.
- Positioning must trace to the belief, carry a competitor test and a proof basis, and be longer than
  a slogan.
- All ten statements are required, three of them marked as anchors, each traced and sourced, with no
  duplicates.
- Routes need a function, disposition, known audience and honest evidence confidence; activation
  needs an owner, sequence, budget basis and three first actions; measurement needs at least two
  metrics with baseline, target, source and cadence.
- Gates 0–7, a frozen candidate hash, and an independent six-lens review that must cover the frozen
  candidate. Any edit after freezing invalidates it.

## Reduced parity — stated plainly

The legacy module is 5,881 lines across 24 files. This port implements the stage machine, the
mechanical gates, the freeze, the independent review and the seal, but **not** every legacy
capability. Not ported: research requests (`m06-research`), the critique flow (`m06-critique`), the
starter-plan contract (`m06-starter-plan`), the derived views (`m06-views`), the risk register
(`m06-risk`), the initiative record (`m06-initiative`), and the statement catalogue's wider
metadata. The statement set is the ten ids (s1–s10) with the three anchors, which matches the legacy
anchor/expression split, but the catalogue descriptions are not carried across.

That is a deliberate reduction to get a complete, working vertical slice, and it is recorded here so
the module is not mistaken for full legacy parity.

## Verification

| Check | Result |
| --- | --- |
| `bun test tests/strategy/m06-service.test.ts` | 2 passed, 0 failed, 34 assertions |
| `bun run check` | 786 files; wrangler types current; svelte-check 0 errors, 0 warnings |
| `bun run build` | 9,305 modules; Cloudflare adapter complete |
| `node scripts/strategy/verify-m06` (private scan) | Private method resources absent from the browser bundle |
| `bun run strategy:worker:build` | `worker.mjs` 2.73 MB |
| `bunx tsc -p tsconfig.worker.json --noEmit` | Clean |

The service test drives eligibility → eight data stages → checks → review → decision → seal, and
asserts the gates pass, the candidate freezes, the review covers it, two documents are written, the
seal verifies and a successor forks. A second test proves a thin meaning record is refused.

## Gaps

1. **No browser pass** over the marketing-strategy screen.
2. **No Directus readback** for the sealed documents.
3. **No live provider run.**
4. **No dedicated test for the M05→M06 derivation** — it is exercised only through the service test's
   synthetic source.
5. **Reduced parity** as listed above.
