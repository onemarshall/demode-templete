# A3 — Test parity map

Recorded 30 October 2026 against the engine at
`~/Documents/LIFE/1_Projects/_04_Langfell/03-Product-Engines/diagnostic/app/cli/src`.
Read-only: no engine test was run and no engine file was modified.

A3 asks for a mapping table from engine test to Vitest file, a named replacement
for every retired test, and a named test for each of the seven invariants. The
first two are below. **The third cannot be satisfied as written: three of the
seven invariants have no test anywhere today, one has no schema to test against,
and one is in direct conflict with G10.**

---

## 1. Baseline

Counts are static — every `test(` and `it(` declaration in the file — because
running `bun test` would execute the engine, spawn children and reach a database.
A real baseline belongs in A0, on the frozen tag, and is not what this document
claims to be.

| Disposition | Files | Cases | Integration |
|---|---|---|---|
| Port | 61 | 283 | 7 |
| Adapt | 13 | 85 | 0 |
| Harness | 3 | 16 | 1 |
| Retire | 7 | 26 | 2 |
| Leave | 6 | 13 | 1 |
| **Total** | **90** | **423** | **11** |

**Parity target: 74 files and 368 cases** (Port + Adapt). Any shortfall against
that number has to be explained per file, which is what §3 is for.

Two labels differ from a whole-module reading, both for the reasons A1 gives:

- `sector-synthesis/parse.test.ts` is **Port**, not Leave. It tests the contract
  that four Port modules depend on.
- `agent-contract.test.ts` and `config.test.ts` are top-level files with no
  owning module; both test Port concerns and land under `lib/`.

---

## 2. Mapping

Target root `src/lib/modules/diagnostic/engine/` is a **proposal**, not an
existing convention. The app's current diagnostic tests sit flat in
`server/__tests__/`; 74 ported files will not fit there, and mirroring the
engine's module layout is the cheapest way to keep the mapping legible.

#### Port

| Engine test | Module | Cases | Target |
|---|---|---|---|
| `agent-contract.test.ts` | agent-contract.test | 6 | `src/lib/modules/diagnostic/engine/lib/agent-contract.test.ts` |
| `analysis/contract.test.ts` | analysis | 23 | `src/lib/modules/diagnostic/engine/analysis/contract.test.ts` |
| `analysis/coverage-binding.test.ts` | analysis | 8 | `src/lib/modules/diagnostic/engine/analysis/coverage-binding.test.ts` |
| `analysis/generate.test.ts` | analysis | 9 | `src/lib/modules/diagnostic/engine/analysis/generate.test.ts` |
| `analysis/prompt.test.ts` | analysis | 4 | `src/lib/modules/diagnostic/engine/analysis/prompt.test.ts` |
| `config.test.ts` | config.test | 2 | `src/lib/modules/diagnostic/engine/lib/config.test.ts` |
| `context-packet/assembler.test.ts` | context-packet | 9 | `src/lib/modules/diagnostic/engine/context-packet/assembler.test.ts` |
| `context-packet/external-selection.test.ts` | context-packet | 9 | `src/lib/modules/diagnostic/engine/context-packet/external-selection.test.ts` |
| `context-packet/method-context.test.ts` | context-packet | 1 | `src/lib/modules/diagnostic/engine/context-packet/method-context.test.ts` |
| `context-packet/offline-selection.test.ts` | context-packet | 3 | `src/lib/modules/diagnostic/engine/context-packet/offline-selection.test.ts` |
| `context-packet/passages.test.ts` | context-packet | 14 | `src/lib/modules/diagnostic/engine/context-packet/passages.test.ts` |
| `decision-record/brief.test.ts` | decision-record | 1 | `src/lib/modules/diagnostic/engine/decision-record/brief.test.ts` |
| `decision-record/contract.test.ts` | decision-record | 4 | `src/lib/modules/diagnostic/engine/decision-record/contract.test.ts` |
| `decision-record/projection.test.ts` | decision-record | 3 | `src/lib/modules/diagnostic/engine/decision-record/projection.test.ts` |
| `evidence/import.test.ts` | evidence | 5 | `src/lib/modules/diagnostic/engine/evidence/import.test.ts` |
| `evidence/references.test.ts` | evidence | 6 | `src/lib/modules/diagnostic/engine/evidence/references.test.ts` |
| `lib/cli-args.test.ts` | lib | 4 | `src/lib/modules/diagnostic/engine/lib/cli-args.test.ts` |
| `lib/env.test.ts` | lib | 1 | `src/lib/modules/diagnostic/engine/lib/env.test.ts` |
| `lib/guided-run.test.ts` | lib | 3 | `src/lib/modules/diagnostic/engine/lib/guided-run.test.ts` |
| `lib/http.test.ts` | lib | 3 | `src/lib/modules/diagnostic/engine/lib/http.test.ts` |
| `lib/log.test.ts` | lib | 3 | `src/lib/modules/diagnostic/engine/lib/log.test.ts` |
| `lib/outbound-fetch.test.ts` | lib | 11 | `src/lib/modules/diagnostic/engine/lib/outbound-fetch.test.ts` |
| `lib/paths.test.ts` | lib | 3 | `src/lib/modules/diagnostic/engine/lib/paths.test.ts` |
| `lib/research-delegation.test.ts` | lib | 2 (int) | `src/lib/modules/diagnostic/engine/lib/research-delegation.test.ts` |
| `method/context.test.ts` | method | 2 | `src/lib/modules/diagnostic/engine/method/context.test.ts` |
| `method/parity.test.ts` | method | 1 | `src/lib/modules/diagnostic/engine/method/parity.test.ts` |
| `method/prompt.test.ts` | method | 3 | `src/lib/modules/diagnostic/engine/method/prompt.test.ts` |
| `method/registry.test.ts` | method | 2 | `src/lib/modules/diagnostic/engine/method/registry.test.ts` |
| `method/stages.test.ts` | method | 3 | `src/lib/modules/diagnostic/engine/method/stages.test.ts` |
| `method/task.test.ts` | method | 5 | `src/lib/modules/diagnostic/engine/method/task.test.ts` |
| `migrations/migrations.test.ts` | migrations | 3 | `src/lib/modules/diagnostic/engine/migrations/migrations.test.ts` |
| `migrations/schema-smoke.test.ts` | migrations | 1 (int) | `src/lib/modules/diagnostic/engine/migrations/schema-smoke.test.ts` |
| `persistence/acceptance.integration.test.ts` | persistence | 1 (int) | `src/lib/modules/diagnostic/engine/persistence/acceptance.integration.test.ts` |
| `production-run/contract.test.ts` | production-run | 3 | `src/lib/modules/diagnostic/engine/production-run/contract.test.ts` |
| `production-run/delivery-route.test.ts` | production-run | 1 | `src/lib/modules/diagnostic/engine/production-run/delivery-route.test.ts` |
| `production-run/next-action.test.ts` | production-run | 5 | `src/lib/modules/diagnostic/engine/production-run/next-action.test.ts` |
| `production-run/repair-parent.test.ts` | production-run | 1 | `src/lib/modules/diagnostic/engine/production-run/repair-parent.test.ts` |
| `production-run/state.test.ts` | production-run | 3 | `src/lib/modules/diagnostic/engine/production-run/state.test.ts` |
| `report-writer/evidence.test.ts` | report-writer | 4 | `src/lib/modules/diagnostic/engine/report-writer/evidence.test.ts` |
| `report-writer/openai-gateway.test.ts` | report-writer | 2 | `src/lib/modules/diagnostic/engine/report-writer/openai-gateway.test.ts` |
| `report-writer/packet-sources.test.ts` | report-writer | 1 | `src/lib/modules/diagnostic/engine/report-writer/packet-sources.test.ts` |
| `report-writer/prompt.test.ts` | report-writer | 10 | `src/lib/modules/diagnostic/engine/report-writer/prompt.test.ts` |
| `report-writer/response.test.ts` | report-writer | 4 | `src/lib/modules/diagnostic/engine/report-writer/response.test.ts` |
| `report/contract.test.ts` | report | 15 | `src/lib/modules/diagnostic/engine/report/contract.test.ts` |
| `report/delivery-regression.test.ts` | report | 4 | `src/lib/modules/diagnostic/engine/report/delivery-regression.test.ts` |
| `report/export-command.test.ts` | report | 1 (int) | `src/lib/modules/diagnostic/engine/report/export-command.test.ts` |
| `report/pdf.test.ts` | report | 5 (int) | `src/lib/modules/diagnostic/engine/report/pdf.test.ts` |
| `report/publication-artifact.test.ts` | report | 1 | `src/lib/modules/diagnostic/engine/report/publication-artifact.test.ts` |
| `report/shared.test.ts` | report | 12 | `src/lib/modules/diagnostic/engine/report/shared.test.ts` |
| `report/signal-presentation.test.ts` | report | 4 | `src/lib/modules/diagnostic/engine/report/signal-presentation.test.ts` |
| `score/contract.test.ts` | score | 6 | `src/lib/modules/diagnostic/engine/score/contract.test.ts` |
| `score/persist.test.ts` | score | 9 | `src/lib/modules/diagnostic/engine/score/persist.test.ts` |
| `sector-intelligence/communication-baseline.test.ts` | sector-intelligence | 4 | `src/lib/modules/diagnostic/engine/sector-intelligence/communication-baseline.test.ts` |
| `sector-intelligence/context-compiler.test.ts` | sector-intelligence | 6 | `src/lib/modules/diagnostic/engine/sector-intelligence/context-compiler.test.ts` |
| `sector-intelligence/service.test.ts` | sector-intelligence | 5 | `src/lib/modules/diagnostic/engine/sector-intelligence/service.test.ts` |
| `sector-synthesis/parse.test.ts` | sector-synthesis | 6 | `src/lib/modules/diagnostic/engine/sector-synthesis/parse.test.ts` |
| `store/capture-retention.test.ts` | store | 8 | `src/lib/modules/diagnostic/engine/store/capture-retention.test.ts` |
| `store/load-corpus.integration.test.ts` | store | 1 (int) | `src/lib/modules/diagnostic/engine/store/load-corpus.integration.test.ts` |
| `store/product-definitions.test.ts` | store | 2 | `src/lib/modules/diagnostic/engine/store/product-definitions.test.ts` |
| `store/prospecting-e2e.integration.test.ts` | store | 1 (int) | `src/lib/modules/diagnostic/engine/store/prospecting-e2e.integration.test.ts` |
| `store/write-json-collection.test.ts` | store | 1 | `src/lib/modules/diagnostic/engine/store/write-json-collection.test.ts` |

#### Adapt

| Engine test | Module | Cases | Target |
|---|---|---|---|
| `external-capture/run.test.ts` | external-capture | 8 | `src/lib/modules/diagnostic/engine/external-capture/run.test.ts` |
| `external-capture/treg.test.ts` | external-capture | 11 | `src/lib/modules/diagnostic/engine/external-capture/treg.test.ts` |
| `linkedin-capture/discovery.test.ts` | linkedin-capture | 3 | `src/lib/modules/diagnostic/engine/linkedin-capture/discovery.test.ts` |
| `linkedin-capture/run.test.ts` | linkedin-capture | 1 | `src/lib/modules/diagnostic/engine/linkedin-capture/run.test.ts` |
| `scrape/coverage.test.ts` | scrape | 12 | `src/lib/modules/diagnostic/engine/scrape/coverage.test.ts` |
| `scrape/discover.test.ts` | scrape | 3 | `src/lib/modules/diagnostic/engine/scrape/discover.test.ts` |
| `scrape/discovery-resources.test.ts` | scrape | 4 | `src/lib/modules/diagnostic/engine/scrape/discovery-resources.test.ts` |
| `scrape/local-first.test.ts` | scrape | 5 | `src/lib/modules/diagnostic/engine/scrape/local-first.test.ts` |
| `scrape/workbench-page-limit.test.ts` | scrape | 2 | `src/lib/modules/diagnostic/engine/scrape/workbench-page-limit.test.ts` |
| `social-capture/run.test.ts` | social-capture | 1 | `src/lib/modules/diagnostic/engine/social-capture/run.test.ts` |
| `social-provider/settings.test.ts` | social-provider | 3 | `src/lib/modules/diagnostic/engine/social-provider/settings.test.ts` |
| `social-provider/social.test.ts` | social-provider | 21 | `src/lib/modules/diagnostic/engine/social-provider/social.test.ts` |
| `visual-capture/run.test.ts` | visual-capture | 11 | `src/lib/modules/diagnostic/engine/visual-capture/run.test.ts` |

#### Harness

| Engine test | Module | Cases | Target |
|---|---|---|---|
| `demo.test.ts` | demo.test | 2 | kept in the CLI harness |
| `run/run.test.ts` | run | 9 (int) | kept in the CLI harness |
| `runtime-template/generate.test.ts` | runtime-template | 5 | kept in the CLI harness |

#### Retire

| Engine test | Module | Cases | Target |
|---|---|---|---|
| `application/auth.test.ts` | application | 3 | — |
| `application/contracts.test.ts` | application | 1 | — |
| `application/run.test.ts` | application | 3 (int) | — |
| `application/workbench-execution.test.ts` | application | 11 | — |
| `application/workbench-review-guide.test.ts` | application | 2 | — |
| `application/workbench.integration.test.ts` | application | 1 (int) | — |
| `application/workbench.test.ts` | application | 5 | — |

#### Leave (retires with the product)

| Engine test | Module | Cases | Target |
|---|---|---|---|
| `prospects/ownership.test.ts` | prospects | 3 (int) | — |
| `prospects/review.test.ts` | prospects | 1 | — |
| `research-library-audit/run.test.ts` | research-library-audit | 2 | — |
| `sector-synthesis/compile-batch-cmd.test.ts` | sector-synthesis | 2 | — |
| `sector-synthesis/extract-engagement-records.test.ts` | sector-synthesis | 1 | — |
| `triggers/run.test.ts` | triggers | 4 | — |

---

## 3. Retired tests and their replacements

A3 requires every retired test to name what replaces it. These are the only 13
files with no target, so these are the only explanations needed.

### Retired in place — `application` (7 files, 26 cases)

The module is the engine's HTTP surface and its workbench. Its behaviour is not
being dropped; it is being replaced by code the app already owns.

| Retired test | Covers | Replacement |
|---|---|---|
| `application/auth.test.ts` | Bearer-token auth on the engine API | Deleted with the endpoint (A8). No replacement: the app does not authenticate to itself. |
| `application/contracts.test.ts` | Response envelope | Deleted with the envelope. |
| `application/run.test.ts` | Serving the API | Deleted with `Bun.serve` (A8). |
| `application/workbench-execution.test.ts` | Running an intake in a child | `diagnostic-delivery.integration.test.ts` — dispatch, release and import are now the app's own path. |
| `application/workbench.integration.test.ts` | Same, end to end | Same. |
| `application/workbench.test.ts` | Workbench read projections | Deleted. The operator console is post-launch (decision 19); nothing reads these projections until then. |
| `application/workbench-review-guide.test.ts` | Review guidance text | Deleted with the workbench. |

### Retired with the product — 6 files, 13 cases

These do not belong in this repository at all. The replacement is the product
that keeps them, and the migration log should record the move rather than a
deletion.

| Retired test | Moves to |
|---|---|
| `prospects/ownership.test.ts`, `prospects/review.test.ts` | The prospecting VPS (decision 3). |
| `triggers/run.test.ts` | The prospecting VPS, with `triggers`. |
| `research-library-audit/run.test.ts` | The external research workspace (decision 9). |
| `sector-synthesis/compile-batch-cmd.test.ts`, `extract-engagement-records.test.ts` | The external research workspace. |

---

## 4. The seven invariants — audit

A3 asks for "a named test for each of the seven invariants". Against the tree as
it stands:

| # | Invariant | Named test today | Verdict |
|---|---|---|---|
| 1 | The release gate refuses to publish what it cannot defend | none | **No test** |
| 2 | The model's materiality judgement is never overridden | none | **No test** |
| 3 | Delivered bytes must match the published `content_hash` | `import.test.ts`, `report.test.ts`, `diagnostic-delivery.integration.test.ts` | **Covered** |
| 4 | Self-service publishes from `automation_ready`; consultancy requires a human review event | `polling.test.ts`, `status.test.ts`, delivery integration | **Half covered** |
| 5 | A report records which provider and model produced it | none, and no column to record the model in | **No schema, no test** |
| 6 | Outreach claims are enforced in code, not prompt wording | none | **Not built yet** |
| 7 | Every row the new pipeline writes is readable by the previous release | none | **Conflicts with G10** |

### 4.1 Invariant 1 has no test in the engine

`review-publication/` contains `automated-checks.ts` and `service.ts` and **no
test file**. The release gate — the thing invariant 1 is named after — is
untested in the product that owns it. The app's `quality.test.ts` covers the
*import* gate ("refuses an import when any check failed"), which is a different
boundary: it refuses to store a report the engine already released, not to
release one that cannot be defended.

### 4.2 Invariant 2 has no test

`materiality` appears in `analysis/generate.ts`, `analysis/prompt.ts` and
`scrape/coverage.ts`. No test file references it. "The model's materiality
judgement is never overridden" is currently an intention, not a checked property
— and it is the invariant most likely to be broken by a helpful refactor.

### 4.3 Invariant 4's consultancy half is untested

The self-service half is well covered: `polling.test.ts` and `status.test.ts`
both refuse to settle on `automation_ready`, and the delivery integration proves
publication at the automated gate without a consultant. Nothing tests that a
`langfell_consultancy` engagement *cannot* publish without a human review event.
That is the half that protects the client, and it is the half with no test.

### 4.4 Invariant 5 has nowhere to store the fact

The app records one provider — `diagnostic_engagement.capture_provider`, which
says who captured the website — and no model at all. `output_version` records a
hash, a version number and an `engine_publication_ref`; nothing records which
provider and model wrote the text. The engine keeps that in `model_generations`,
but the engine's ledger is not the app's record, and after the port the writer
runs in the app.

So "which provider and model produced this report" has no home once the pipeline
moves. This is a schema requirement A4 does not currently list, and it must land
before the ported writer can satisfy its own invariant.

### 4.5 Invariant 7 cannot be a test

A3 asks for a named test. A9.1 says read-compatibility is proven **against the
deployed previous release, never a recreated reader or a mock** — because a test
written alongside the new code would share its assumptions and pass while the
real rollback fails.

Both requirements are reasonable and they cannot both hold for the same
invariant. The resolution that keeps the stronger one: invariant 7's evidence is
the G10 procedure and its captured responses, and A3's "named test" requirement
should read "a named *proof*" for this one invariant. That is a wording change to
the plan, not a weakening of it — the procedure is stricter than a unit test.

---

## 5. What this does not establish

- The 423 is a declaration count, not a pass count. A test with three `it(` calls
  and a skipped body counts the same as one that asserts.
- No engine test was executed, so nothing here says the engine's suite is green.
  A0 records that on the frozen tag.
- The target layout is a proposal. If the port chooses a different root, every
  path in §2 moves with it and the counts do not change.
