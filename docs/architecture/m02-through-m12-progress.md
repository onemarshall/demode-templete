# M02 through M12 — progress ledger

Last updated 29 October 2026. This is the consolidated state of the Strategy refactor into the Auth
application. It records what exists, what has been proven, and what has not. It is not a completion
claim for any stage listed as partial or not started.

Columns are deliberately separate. A stage is never "done" because it is implemented.

## Stage ledger

| Stage | Implemented | Local integration verified | Live provider verified | Real upstream connected | Production deployed |
| --- | --- | --- | --- | --- | --- |
| M01 Founder Conviction | Yes | Yes | Voice unverified; generation verified earlier | n/a (first stage) | No |
| M02 Market Reality | Yes | Partial — sealed record, successor, exports and transport verified; full chain not re-run | No | Yes — actual sealed M01 version via `m02-m01` | No |
| M03 Business Commitments | Yes | Partial — real-SQL service, upstream derivation, transport, worker and provider verified; no browser or Directus pass | No | Yes in tests — derived from a sealed M02 version with M01 lock re-check | No |
| M04 Viability Check | Yes | Yes | Yes (earlier run) | M01 upstream | No |
| Business Foundation | Yes | Partial — real-SQL service to sealed, rules, gate, seal and the real M04→BF derivation verified; browser and Directus not verified | No | Yes in tests — derived from a real sealed M04 session and version row | No |
| M05 Brand Strategy | Yes | Partial — full real-SQL flow to sealed, gates, coverage, review, package and seal verified; browser and Directus not verified | No | In tests — derived from a sealed Foundation | No |
| M06 Marketing Strategy | Yes (reduced parity) | Partial — real-SQL flow to sealed, gates, freeze, review and seal verified; browser and Directus not verified | No | In tests — derived from a sealed M05 | No |
| M07 Sales Strategy | Yes (reduced parity) | Partial — real-SQL flow to sealed, gates, freeze, review and seal verified; browser and Directus not verified | No | In tests — derived from a sealed M06 | No |
| M08 Content Strategy | Yes (reduced parity) | Partial — real-SQL flow to sealed; browser and Directus not verified | No | In tests — derived from a sealed M07 | No |
| M09 Digital Direction | Yes (reduced parity) | Partial — real-SQL flow to sealed; browser and Directus not verified | No | In tests — derived from a sealed M08 | No |
| M10 Visual Identity | No | No | No | No | No |
| M11 Execution Planning | No | No | No | Blocked — no Commercial Direction producer identified | No |
| M12 Work Coordination | No | No | No | Depends on M11 | No |

Auth currently contains `m01`, `m02`, `m03`, `m04`, `bf`, `m05` and `m06` under
`src/lib/modules/strategy/server/stages/`, and the matching `founder-conviction`,
`market-reality`, `business-commitments`, `viability-check`, `business-foundation`,
`brand-strategy`, `marketing-strategy`, `sales-strategy`, `content-strategy` and `digital-direction` routes. The legacy implementations for the remaining stages are still only in the
Trigger repository.

## M02 detail

See `docs/architecture/m02-module-completion.md`. Summary:

- Full local slice implemented: strict command contract, eight draft gates, separate evidence and
  progression judgements, immutable seal with receipt verification, deterministic render, durable
  worker, safe public-URL collection, host composition and stage screen.
- Focused suites: 63 passing across 9 files. Build, worker bundle, worker typecheck, module
  boundaries, svelte-check and the private-method bundle scan all pass.
- Fixed a real shared-state defect: M02 schema defaults were evaluated once at module load, so
  mutating one parsed record changed every later parse in the process. Defaults are now lazy.
- Not proven in this session: a fresh create → generation → review → judgement → seal chain,
  Directus readback, revoked-access denial and the separate worker process. These rest on the
  focused suites and the earlier run.

## M03 detail

See `docs/architecture/m03-module-completion.md` and `m03-parity.md`. Summary:

- Full local slice implemented: thirteen stages, eight draft steps, ten human confirmations, the
  hard M02 upstream gate, mechanical outcome checks, immutable seal with two documents, durable
  worker and stage screen.
- 33 M03 tests; 95 passing across the combined M02+M03 regression. Build, worker bundle, worker
  typecheck, module boundaries, svelte-check and the private-method scan all pass.
- Seven M03 method documents added to the private corpus; manifest rebuilt to 94 resources across
  4 releases with the archive intact.
- Not proven: the hydrated page, Directus readback, a live provider run and a chained
  M01→M02→M03 pass.

## Business Foundation detail

See `docs/architecture/bf-module-completion.md`. Summary:

- Full local slice implemented: sixteen-row assessment, manifesto with verbatim declarations and
  full source trace, client document with leak/lineage/structural checks, bounded fresh review and
  recheck, named-owner client decision, immutable seal, downstream gate, durable worker and page.
- 14 BF tests; 109 passing across the combined M02+M03+BF regression. Build, worker bundle, worker
  typecheck, module boundaries, svelte-check and the private-method scan all pass.
- Five BF template documents added to the private corpus; manifest rebuilt to 99 resources across
  5 releases.
- Not proven: the hydrated page, Directus readback, a live provider and a chained M04→BF run through the M04 service.

## M05 detail

See `docs/architecture/m05-module-completion.md` and `m05-parity.md`. Summary:

- Full local slice: fourteen stages, route authority, Foundation-derived upstream gate, inheritance
  and semantic checks, decision packet, gates 0–6 with coverage and candidate freeze, Gate 7 review,
  package, client decision, seal, durable worker and Trigger task, host and stage screen.
- 8 M05 tests; 117 passing across the combined M02–M05 regression. Build, worker bundle, worker
  typecheck, module boundaries, svelte-check and the private-method scan all pass.
- Not proven: the hydrated page, Directus readback, a live provider run, and a chained
  Foundation→M05 run through the Foundation service.
- The screen edits records as JSON rather than the legacy stage-specific forms; complete and
  operable, but not the legacy operator experience.

## Screen uniformity

All editable strategy screens now share one field mechanism: `shared/fields/types.ts`
(`Field`/`StageDefinition`), one `StageFieldEditor` with `derive`/`computed` hooks, and one
definition file per module (`shared/fields/{m02,m03,m04,m05,bf}.ts`). M01 keeps its bespoke voice
and output-review components, which have no equivalent.

A headless browser smoke pass over all six routes returned 200, rendered the expected `h1` and
raised no runtime errors. The editors themselves could not be exercised: creating an M03 or BF
record against the retained stack now returns `409 source-stale`, because the sealed M02/M04
records pin upstream versions that have since moved. That is correct refusal behaviour, and it is
the same chained-upstream gap recorded above.

## M06 detail

See `docs/architecture/m06-module-completion.md`. Summary:

- Full local slice: route authority, sealed-M05 gate, eight confirmed data stages, gates 0–7,
  candidate freeze, six-lens independent review, client decision, seal, durable worker, Trigger task,
  host and screen on the shared field mechanism.
- 2 M06 tests; check, build, worker bundle, worker typecheck and the private-method scan all pass.
- **Reduced parity**: research requests, critique, starter plan, derived views, risk register and
  initiative record are not ported.
- Not proven: the hydrated page, Directus readback, a live provider run, and a dedicated M05→M06
  derivation test.

## Current blocker

`scripts/strategy/integration/m02-end-to-end.ts` depends on M01 harness artifacts that do not
exist in `.local-state/strategy-integration/`: `m01-end-to-end-result.json`, `m01-browser-state.json`
and `m01-browser-target.json`. Without them the chained end-to-end verification cannot run, so M02
cannot be marked fully locally verified — and M03's chained pass depends on the same gap.

M03 additionally has no browser or Directus verification yet; its page compiles and passes
svelte-check but has never been driven in a hydrated browser.


## Last recoverable checkpoint

- Integration stack left running with data retained: Postgres `127.0.0.1:55433`
  (`strategy_auth_integration_test`), Directus `http://127.0.0.1:8112`, isolated app
  `http://127.0.0.1:5188`.
- Sealed M02 session for inspection: `72b2456f-b6b5-4112-86f6-f02de4a2e102` (revision 25), version
  `6bacb11b-d43d-4da0-8577-abcac5af19db`.
- Six synthetic successor sessions parented to it were created during reproduction and remain in
  the disposable database; the sealed parent is untouched.
- The synthetic grant for engagement `ac0ecaec-adba-4c5f-bfa3-7c3406eed79d` is revoked again, as it
  was before verification.
- Isolated workspace `trigger/.local-state/auth-integration/m02-workspace` is current as of this
  entry and must be re-synced after further code changes.

## Next concrete action

Refresh the isolated workspace with the M02, M03, BF and M05 slices and drive all four pages in a
hydrated browser. Then regenerate the M01 harness artifacts and run the chained
`m02-end-to-end.ts`, adding M03 and BF steps so the real M01 → M02 → M03 → M04 → BF handoff is
proven rather than derived from synthetic rows.

M11 remains blocked independently: no Commercial Direction producer exists, and that dependency
must not be manufactured, weakened or replaced with a fixture.
