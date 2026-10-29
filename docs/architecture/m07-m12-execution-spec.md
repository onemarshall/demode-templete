# M07–M12 execution specification

Recorded 29 October 2026. This authorises a batch build of the remaining strategy modules to the
pattern established by M03, BF, M05 and M06. It is a specification for work, not a claim that the
work is done.

## Scope

| Module | In scope | Dependency |
| --- | --- | --- |
| M07 Sales Strategy | Yes | Sealed M06 + confirmed M07 route |
| M08 Content Strategy | Yes | Sealed M07 + confirmed M08 route |
| M09 Digital Direction | Yes | Sealed M08 + confirmed M09 route |
| M10 Visual Identity | Yes | Sealed M09 + confirmed M10 route |
| M11 Execution Planning | **Blocked** | Requires a genuine Commercial Direction producer, which does not exist |
| M12 Work Coordination | **Dependent** | Requires the exact approved M11 Commercial Cycle and Direction |

M11 is not in this batch. No Commercial Direction record will be manufactured, no fixture will be
treated as production authority, no consumer verifier will be weakened and no hard gate removed. When
M07–M10 are complete, M11 stops and reports the exact missing contract for a decision.

## Parity level (one decision, applied to every module)

**Structural slice.** Each module ports:

- the stage machine and its statuses;
- the confirmed data stages and their schemas;
- the mechanical gates over the confirmed record;
- the candidate freeze and an independent review that must cover the frozen candidate hash;
- the client decision and the immutable seal with verification;
- the upstream gate, route authority and derived entry receipt;
- the durable worker, Trigger task, host transport and stage screen.

Each module does **not** port, unless its legacy capability is structural: research/collection
flows, critique or consultation sub-flows, starter-plan contracts, derived view packages, separate
risk or initiative registers, and catalogue metadata beyond the ids the gates require.

Every omission is listed in that module's completion report under "Reduced parity — stated plainly".
This is the M06 precedent, applied consistently.

## Conventions every module follows

- **Slots:** `mXX-route` for the confirmed route, `mXX-mYY` for the derived upstream chain. The entry
  receipt is derived from the chain tuple, excluded from its own fingerprint, and given a
  deterministic v4-shaped id.
- **Gate:** newest sealed upstream only, its seal verified against the immutable version, its review
  verdict `pass`, its client decision `accept`, plus a confirmed module route. A failure is a blocker,
  not a session.
- **Seal:** hashes the sealed record (data, confirmations, route, capability, source pin, sources,
  candidate hash), not the session, so the receipt is not self-referential. Canonical version uses
  `sha256-json-stringify-v1`; rendered text and payloads use a raw byte hash.
- **Screens:** built on `StageFieldEditor` with a `shared/fields/mXX.ts` definition file. No
  hand-written per-field markup, no raw JSON editor.
- **Defaults:** every mutable zod default is a lazy factory.
- **Wiring:** gateway entry, runtime options, worker runtime, auth host export, configuration
  resolver, recovery list — all updated in the same change.
- **Provider:** pinned method release, JSON schema per stage, honest "do not invent" guard text.

## Definition of done, per module

A module is not done until all of the following are true:

1. Contracts, source, rules, render, seal, commands, service exist and typecheck.
2. Route authority, upstream derivation, provider, worker and Trigger task exist.
3. Host, route and screen exist; the screen uses the shared field mechanism.
4. `bun test tests/strategy/mXX-service.test.ts` passes, covering the full flow to sealed, a gate
   refusal and a tamper refusal.
5. `bun run check` is 0 errors / 0 warnings.
6. `bun run build` completes with the Cloudflare adapter.
7. `node scripts/strategy/verify-build.mjs` reports no private method content in the browser bundle.
8. `bun run strategy:worker:build` and `bunx tsc -p tsconfig.worker.json --noEmit` pass.
9. `docs/architecture/mXX-module-completion.md` exists with the status ledger, verification results,
   reduced-parity list and gaps; the consolidated progress ledger is updated.
10. The completion report is copied to the Trigger repository.

## Verification debt

These are outstanding for M03, BF, M05 and M06, and will be outstanding for M07–M10 unless paid:

- a hydrated browser pass over each screen;
- Directus readback of sealed documents;
- a live provider run per module (each needs its own bounded approval);
- a chained end-to-end run rather than synthetic upstream rows.

**Proposed payment point:** after M10, before M11 is attempted. The batch build stops at M10, then one
verification pass covers M03–M10 together: browser pass over every screen, Directus readback, and a
chained M01→M10 run using the real services. That is cheaper than verifying each module in isolation
and it is the only way to prove the upstream gates work against real predecessors.

## Order and stopping rules

1. M07 → M08 → M09 → M10, in dependency order. Each is built to the definition of done above.
2. Stop after M10. Do not start M11.
3. If a module's upstream is missing or ineligible in the retained stack, record it and continue with
   the next independent work rather than fabricating a predecessor.
4. If a module's legacy surface turns out to be materially different from the M06 pattern (for
   example, no independent review stage), stop and report before improvising a substitute.

## Deliverables at the end of the batch

- Four modules reachable in the Auth application, each with a completion report.
- A consolidated progress ledger showing M01–M10 and BF with separate columns for implemented, local
  integration verified, live provider verified, real upstream connected and deployed.
- An explicit M11 blocker statement naming the missing Commercial Direction contract.
- A verification-debt register for M03–M10 with the browser, Directus and chained-run results once
  the pass is done.
