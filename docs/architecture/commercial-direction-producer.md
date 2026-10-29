# Commercial Direction — producer completion

Recorded 29 October 2026. Development-only verification. No live provider call, no paid request, no
production deployment.

## What this closes

The M11 gate required a sealed Commercial Direction that nothing could produce. FW_24 defined the
record; M11's consumer implemented the interface; the producer was a named follow-on capability that
had never been built. It now exists in Auth, and a sealed direction emits the exact handoff M11's
consumer validates.

## Implementation

| Concern | File |
| --- | --- |
| FW_24 record: nine data stages, decision, sealed | `stages/cd/contracts.ts` |
| Handoff builder, permission rules, handoff validation | `stages/cd/handoff.ts` |
| Sealed-M10 upstream gate | `stages/cd/source.ts`, `app/strategy-cd-source.server.ts` |
| Gates 0–9 | `stages/cd/rules.ts` |
| Client-facing render (no machine names) | `stages/cd/render.ts` |
| Immutable seal, handoff emission, verification | `stages/cd/seal.ts` |
| Service: create → confirm → decide → seal → successor | `stages/cd/service.ts` |
| Provider, worker, Trigger task | `providers/cd.ts`, `jobs/cd-worker.ts`, `src/trigger/strategy-cd-session-v1.ts` |
| Host transport | `app/strategy-cd-host.server.ts` |
| Screen and field definitions | `routes/…/commercial-direction/`, `shared/fields/cd.ts` |

## Design decisions worth naming

- **No module route.** FW_24 says the direction "does not add a numbered module", so it has no route
  record. It gates on the sealed M10 work alone. Its permission comes from the recorded decision,
  not from a route choice.
- **One act at the end.** The decision owner records the decision, which freezes the exact record,
  runs gates 0–9 and seals — the same shape as the Foundation. There is no separate review stage,
  because FW_24 gives the decision to the authorised owner rather than an independent reviewer.
- **Three separate state axes**, never collapsed: decision, evidence and execution permission.
  Permission is derived, never inferred from a label.
- **The handoff is a sealed document**, written alongside the rendered record and the receipt, so a
  downstream consumer reads exactly what was sealed rather than re-deriving it.

## Verification

| Check | Result |
| --- | --- |
| `bun test tests/strategy/cd-handoff.test.ts` | 6 passed |
| `bun test tests/strategy/cd-service.test.ts` | 2 passed |
| `bun run check` | 851 files; svelte-check 0/0 |
| `bun run build` | Cloudflare adapter complete |
| private-method scan | clean |
| worker build / worker `tsc` | 3.10 MB / clean |

The service test drives eligibility → nine data stages → decision → sealed, then reads the sealed
handoff document back out of the database and parses it with the M11 consumer schema: permission
`granted`, decision `client-approved`, the first-phase consequence selected and the strategy pin
matching the seal hash. A second test proves an `analysis-only` permission cannot seal, because the
decision gate refuses it.

## Gaps

- No browser pass over the commercial-direction screen.
- No Directus readback of the three sealed documents.
- No live provider run.
- No dedicated M10→CD derivation test (exercised only through the synthetic source).
- **M11 itself is still not built.** The producer now exists, so M11 has a real predecessor; the
  module that consumes it does not yet exist in Auth.
