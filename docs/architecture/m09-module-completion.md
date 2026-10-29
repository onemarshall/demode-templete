# M09 Digital Direction — module completion

Recorded 29 October 2026. Development-only verification. No live provider call, no paid request, no
production deployment.

## Status ledger

| Column | State |
| --- | --- |
| Implemented | Yes — contracts, route authority, sealed-M08 gate, rules, gates 0–6, render, seal, service, provider, worker, Trigger task, host, route and screen |
| Local integration verified | Partial — real-SQL flow to sealed; browser and Directus not verified |
| Live provider verified | No |
| Real upstream connected | In tests — derived from a sealed M08 |
| Production deployed | No |

## Implementation

Twelve stages with seven confirmed data stages: inheritance, direction, destinations, decisions,
comparison, briefs, measurement. Files mirror M08:
`stages/m09/{contracts,commands,source,rules,render,seal,service}.ts`, `providers/m09.ts`,
`jobs/m09-worker.ts`, `src/trigger/strategy-m09-session-v1.ts`,
`app/strategy-m09-{route,source,host}.server.ts`, `routes/…/digital-direction/`,
`shared/fields/m09.ts`.

## Semantics preserved

- Gate: sealed M08 whose review passed and whose decision was accepted, plus a confirmed route.
- Direction needs at least three architecture principles.
- At least two destinations, each with purpose, audience, primary action and belief role.
- Decisions must offer at least two options, choose one of them, and carry a rationale and evidence.
- Briefs must cite a known destination, carry at least two sections, name proof and a primary action,
  and cite a known measurement.
- Gates 0–6, frozen candidate, six-lens independent review, client decision, immutable seal.

## Reduced parity

Not ported: the site-architecture renderer's full page-by-page output, the quality-gate worksheet as
a separate artefact, and the legacy derived view package. The strategy record, gates, freeze, review
and seal are present; those are not.

## Verification

| Check | Result |
| --- | --- |
| `bun test tests/strategy/m09-service.test.ts` | 2 passed, 16 assertions |
| `bun run check` | 825 files; svelte-check 0/0 |
| `bun run build` | Cloudflare adapter complete |
| private-method scan | clean |
| worker build / worker `tsc` | 2.93 MB / clean |

## Gaps

No browser pass, no Directus readback, no live provider run, no dedicated M08→M09 derivation test,
and the reduced-parity list above.
