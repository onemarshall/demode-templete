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
| M03 Business Commitments | No | No | No | No | No |
| M04 Viability Check | Yes | Yes | Yes (earlier run) | M01 upstream | No |
| Business Foundation | No | No | No | No | No |
| M05 Brand Strategy | No | No | No | No | No |
| M06 Marketing Strategy | No | No | No | No | No |
| M07 Sales Strategy | No | No | No | No | No |
| M08 Content Strategy | No | No | No | No | No |
| M09 Digital Direction | No | No | No | No | No |
| M10 Visual Identity | No | No | No | No | No |
| M11 Execution Planning | No | No | No | Blocked — no Commercial Direction producer identified | No |
| M12 Work Coordination | No | No | No | Depends on M11 | No |

Auth currently contains only `m01`, `m02` and `m04` under
`src/lib/modules/strategy/server/stages/`, and the matching `founder-conviction`,
`market-reality` and `viability-check` routes. The legacy implementations for the remaining stages
are still only in the Trigger repository.

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

## Current blocker

`scripts/strategy/integration/m02-end-to-end.ts` depends on M01 harness artifacts that do not
exist in `.local-state/strategy-integration/`: `m01-end-to-end-result.json`, `m01-browser-state.json`
and `m01-browser-target.json`. Without them the chained end-to-end verification cannot run, so M02
cannot be marked fully locally verified.

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

Regenerate the M01 harness artifacts — or make the M02 prepare step create its own predecessor —
then run `m02-end-to-end.ts` once to close the chained verification: real Auth, separate worker,
SQL, Directus readback, exact exports, revoked access and successor. After that, M02 can move to
"M03 Business Commitments" in the order defined by the handoff.

M11 remains blocked independently: no Commercial Direction producer exists, and that dependency
must not be manufactured, weakened or replaced with a fixture.
