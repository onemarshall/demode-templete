# Commercial Direction — the contract, and what was missing

Recorded 29 October 2026.

## What was actually missing

Nothing was broken. `FW_24-Commercial-Direction-Contract.md` (261 lines, version 2.4) defines the
record completely, and the legacy M11 consumer implements the interface it describes. The legacy
source states the gap plainly:

> No Commercial Direction producer exists in this build: the governed Commercial Direction stage is
> a named follow-on capability. This consumer implements the interface the FW_24 contract defines —
> a sealed run record with `handoff-commercial-direction.json`, exact pin, approved decision state
> and usable execution permission — and blocks honestly when the producer is absent.

So the contract existed and the **producer did not** — in the Trigger repository or in Auth. M11
therefore blocked on a gate it could never satisfy, and M12 inherited that block.

## What now exists

| Piece | File |
| --- | --- |
| The FW_24 record: nine confirmed stages plus decision and sealed | `stages/cd/contracts.ts` |
| The exact M11 handoff schema and permission derivation | `stages/cd/handoff.ts` |
| Proof that a sealed direction satisfies M11's consumer | `tests/strategy/cd-handoff.test.ts` |

The record keeps FW_24's three separate state axes rather than collapsing them:

- **decision**: `draft`, `recommended`, `client-approved`, `client-overridden`, `revision-required`,
  `superseded`;
- **evidence**: `absent`, `hypothesis`, `observed`, `tested`, `contradicted`;
- **execution permission**: `analysis-only`, `evidence-gathering`, `pilot-only`, `controlled-90-day`,
  `wider-execution`, `blocked`.

The portfolio uses FW_24's classifications (`active-first-phase`, `next`, `later`, `conditional`,
`excluded-not-now`, `not-required`).

## The rules the handoff enforces

- M11 permission is **granted** only when the decision state is `client-approved` or
  `client-overridden`, the execution permission is usable, and an authorised human owner is recorded.
- `analysis-only` and `blocked` never authorise execution, even after client approval.
- A required pre-cycle test that is unresolved refuses permission, matching FW_24's entry gate.
- A direction that selects no `active-first-phase` consequence is refused with a readable reason
  rather than an empty-array schema error.
- A handoff cannot claim `granted` while carrying a non-approving state or refusal reasons.

## Verification

Six tests pass: a complete direction produces a handoff that satisfies the consumer schema; an
unapproved direction refuses; analysis-only refuses; an unresolved pre-cycle test refuses; a resolved
one permits; and a direction with no first-phase consequence is rejected. `bun run check` is 0/0
across 840 files.

## What this is not

This is the **contract and its proof**, not the producer's runtime. Still to build for a usable
Commercial Direction stage: the service (create, confirm each stage, freeze, seal), the render, the
immutable seal with verification, the durable worker and Trigger task, the host, the route and
screen, and the M10-derived upstream gate. Until those exist the record can be validated but not
produced through the application, and M11 remains blocked in Auth — but now against a contract that
is implemented and proven rather than absent.
