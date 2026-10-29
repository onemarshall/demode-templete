# M07 Sales Strategy — module completion

Recorded 29 October 2026. Development-only verification. No live provider call, no paid request, no
production deployment.

## Status ledger

| Column | State |
| --- | --- |
| Implemented | Yes — contracts, route authority, sealed-M06 gate, rules, gates 0–7, render, seal, service, provider, worker, Trigger task, host, route and screen |
| Local integration verified | Partial — real-SQL flow to sealed, gates, freeze, review and seal verification; browser and Directus not verified |
| Live provider verified | No — drafts and the review run against a stub |
| Real upstream connected | In tests — derived from a sealed M06 |
| Production deployed | No |

## Implementation

| Concern | File |
| --- | --- |
| Contracts (13 stages, 8 data stages) | `stages/m07/contracts.ts` |
| Commands | `stages/m07/commands.ts` |
| Route record and chain | `stages/m07/source.ts` |
| Stage rules and gates 0–7 | `stages/m07/rules.ts` |
| Deterministic render | `stages/m07/render.ts` |
| Seal and verification | `stages/m07/seal.ts` |
| Service | `stages/m07/service.ts` |
| Provider | `providers/m07.ts` |
| Worker and Trigger task | `jobs/m07-worker.ts`, `src/trigger/strategy-m07-session-v1.ts` |
| Route authority and derivation | `app/strategy-m07-route.server.ts`, `app/strategy-m07-source.server.ts` |
| Host | `app/strategy-m07-host.server.ts` |
| Screen and field definitions | `routes/…/sales-strategy/`, `shared/fields/m07.ts` |

## Semantics preserved

- Gate: a sealed Marketing Strategy whose review passed and whose client decision was accepted, plus
  a confirmed M07 route.
- Eight confirmed data stages: inheritance, statements, qualification, conversation, objections,
  claims, measurement, research.
- Statements: all eight, with the deployable set (s1, s4–s8) and diagnostic set (s2, s3) enforced,
  each traced and sourced, no duplicates.
- Qualification: criteria with a real test and a disqualification, prospects with evidence for their
  belief state, and a protocol with a trigger, response and return owner.
- Claims: cannot-claim items carry no approved wording; must-qualify and can-claim items must carry
  theirs. This is the boundary the legacy module treats as load-bearing.
- Objections: each names the belief behind it and the evidence its response rests on.
- Gates 0–7, frozen candidate, six-lens independent review covering the frozen hash, client
  decision, immutable seal.

## Reduced parity

Not ported from the legacy 6,312-line module: the critique/consultation sub-flow, the full statement
catalogue metadata (`STATEMENT_CATALOGUE` descriptions), the research execution flow beyond the
recorded request queue, and the derived view package. The stage machine, gates, freeze, review and
seal are present; those capabilities are not.

## Verification

| Check | Result |
| --- | --- |
| `bun test tests/strategy/m07-service.test.ts` | 2 passed, 21 assertions |
| `bun run check` | 799 files; svelte-check 0/0 |
| `bun run build` | completed with the Cloudflare adapter |
| private-method scan | clean |
| worker build / worker `tsc` | 2.80 MB / clean |

One defect was found and fixed during the build: `approvedWording` was required non-empty, which made
the legitimate cannot-claim case unrecordable. It now defaults to empty and the rule enforces the
boundary instead.

## Gaps

1. No browser pass over the sales-strategy screen.
2. No Directus readback of sealed documents.
3. No live provider run.
4. No dedicated M06→M07 derivation test (exercised only through the synthetic source).
5. Reduced parity as listed.
