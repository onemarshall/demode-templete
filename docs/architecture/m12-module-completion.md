# M12 Work Coordination — module completion

Recorded 29 October 2026. Development-only verification. No live provider call, no paid request, no
production deployment.

## Status ledger

| Column | State |
| --- | --- |
| Implemented | Yes — contracts, sealed-cycle gate, rules, gates 0–8, render, seal, service, provider, worker, Trigger task, host, route and screen |
| Local integration verified | Partial — real-SQL flow to sealed; browser and Directus not verified |
| Live provider verified | No |
| Real upstream connected | In tests — derived from a sealed Commercial Cycle |
| Production deployed | No |

## What this module owns, and what it may not touch

FW_24 gives M12 dates, dependencies, scheduling and tracking. It must preserve M11's exact
quantities, ownership commitments, route, proof actions and thresholds. The gate enforces that
boundary rather than describing it:

- every recorded quantity and threshold is compared against the sealed cycle, and a difference is a
  defect, not a refinement;
- every owner must be an owner in the sealed cycle, and every sealed consequence must appear;
- the review event must match;
- a schedule item or a scorecard measure may only reference a consequence the sealed cycle planned.

## Implementation

Fourteen stages with nine confirmed data stages: inheritance, assets, rhythm, schedule, response,
scorecard, rules, checklist, transition. Files:
`stages/m12/{contracts,commands,source,rules,render,seal,service}.ts`, `providers/m12.ts`,
`jobs/m12-worker.ts`, `src/trigger/strategy-m12-session-v1.ts`,
`app/strategy-m12-{source,host}.server.ts`, `routes/…/working-cycle/`, `shared/fields/m12.ts`.

## Verification

| Check | Result |
| --- | --- |
| `bun test tests/strategy/m12-service.test.ts` | 2 passed, 16 assertions |
| `bun run check` | 890 files; svelte-check 0/0 |
| `bun run build` | Cloudflare adapter complete |
| private-method scan | clean |
| worker build | 3.18 MB |
| worker `tsc` | blocked by the same unrelated `src/lib/platform/config/env.ts` error recorded in M11 |

The service test drives eligibility → nine data stages → checks → review → decision → sealed. A
second test proves a quantity that differs from the sealed cycle is refused with that reason.

## Gaps

No browser pass over the working-cycle screen beyond the smoke check, no Directus readback, no live
provider run, no dedicated M11→M12 derivation test, and the worker typecheck caveat above.
