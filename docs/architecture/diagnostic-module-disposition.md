# A1 — Module disposition

Recorded 30 October 2026 against the engine at
`~/Documents/LIFE/1_Projects/_04_Langfell/03-Product-Engines/diagnostic/app/cli/src`.
Read-only: no engine file was modified and the engine was not run.

This is the A1 deliverable. Every module carries exactly one label — **Port**,
**Adapt**, **Leave**, **Retire** or **Harness** — with the reason the label was
chosen. A1's gate is that no module is unlabelled and that no Port module depends
on an export inside a Leave module; both are tested below against the import
graph rather than against the plan's hypothesis.

---

## 1. Baseline

The plan's measurements were taken on `app/cli/src` and they reproduce exactly.

| Measure | Plan | Measured | Match |
|---|---|---|---|
| TypeScript files | 263 | 263 | yes |
| Test files | 90 | 90 | yes |
| SQL migrations | 43 | 43 | yes |
| Drizzle meta snapshots | 11 | 11 | yes |
| Files touching Bun APIs | 106 | 106 | yes |
| Top-level modules | 46 | **44** | **no** |

The module count is the one number that does not reproduce. `app/cli/src` holds
39 directories and 8 files; three of those files are tests, leaving 39 + 5 = 44
modules. The plan's 46 has no basis in the tree I can find. It does not change
any disposition, but the count in the plan should be corrected to 44 so a later
gate does not fail against a number nobody can reproduce.

Breakdown of the 106 Bun-touching files: 91 import `bun:test`, 23 call a `Bun.`
API, 26 use `import.meta.dir` (10 of them non-test).

---

## 2. Disposition

### Analysis — Port

| Module | Label | Reason |
|---|---|---|
| `analysis` | Port | The family analysis and synthesis loop; this is the method the app must run itself. |
| `report` | Port | Report assembly, rendering and publication artifact. Contains one non-test `bun:test` import (§4.4) and `pdfkit` (§4.5). |
| `report-writer` | Port | Model-backed report writing and its OpenAI gateway; the ported writer's starting point. |
| `review-publication` | Port | Release gate. Invariant 1 lives here and must survive the port. |
| `production-run` | Port | Run state machine, next-action and delivery route. |
| `context-packet` | Port | Assembles the evidence the model is given; must stay, because evidence scope is a contract. |
| `evidence` | Port | Evidence import and reference resolution. |
| `contracts` | Port | The intake contract. Depends on `sector-synthesis` — see §4.2. |
| `method` | Port | Method pack loading, stages, prompts, parity checks. Prompt text must end up in one place (A5). |
| `score` | Port | Signal's five-dimension score and its persistence. |
| `decision-record` | Port | Decision record contract and projection. |
| `sector-intelligence` | Port | Sector context compile, import and approval. Depends on `sector-synthesis` — see §4.2. |

### Collection — Adapt

All nine are collection capabilities that must move in (decision 10, §3) but
cannot move unchanged: each is written against `node:fs`, `import.meta.dir` and a
Bun runtime, and captured text has to go to R2 with a hash and a pointer
(decision 8) rather than to a local directory.

| Module | Label | Reason |
|---|---|---|
| `scrape` | Adapt | Website capture and coverage accounting. |
| `social-capture` | Adapt | Social capture driver. |
| `social-provider` | Adapt | Provider settings and dispatch for social capture. |
| `linkedin-capture` | Adapt | LinkedIn discovery and run. |
| `youtube-capture` | Adapt | YouTube capture. |
| `external-capture` | Adapt | External/Treg capture. |
| `visual-capture` | Adapt | Visual capture. |
| `visual-extract` | Adapt | Visual extraction from captured bytes. |
| `ai-search-capture` | Adapt | AI search-surface capture. |
| `ai-surface-read` | Adapt | **Unlabelled by the plan.** AI surface reading: how search and AI systems reconstruct a brand when asked cold. Same family as `ai-search-capture`, same filesystem dependency, same R2 treatment. |

### Sector research — Leave

| Module | Label | Reason |
|---|---|---|
| `sector-synthesis` | **Leave, split** | Authoring stays external (decision 9). But two of its five source files are a shared contract, not authoring — see §4.2. `compile-cmd`, `compile-batch-cmd` and `extract-engagement-records` leave; `parse` and `to-sector-intelligence` port. |
| `batch` | Leave | Batch research driver over the external research workspace. |
| `research-batch` | Leave | Same, batch-scoped. |
| `research-library-audit` | Leave | Audits the external research library. |
| `sector-research` | **Retire** | **The directory is empty.** Nothing to leave and nothing to port. |

### Prospecting — Leave

| Module | Label | Reason |
|---|---|---|
| `prospects` | Leave | Prospecting ownership and review; moves to its own VPS (decision 3). |
| `triggers` | Leave | Scan triggers over prospecting data; same host, same reason. |

### Delivery and foundation — Port

| Module | Label | Reason |
|---|---|---|
| `operational` | Port | Health and operational checks; the Trigger tasks need a readiness surface. |
| `persistence` | Port | Acceptance persistence helpers. |
| `store` | Port | Seeded and stored reads. Depends on `sector-synthesis` — see §4.2. |
| `lib` | Port | Paths, env, http, logging, guided-run. Every filesystem helper in here is an Adapt target in itself. |
| `db` | Port | Postgres pool. |
| `schema` | Port | Drizzle schema for all 51 tables. |
| `migrations` | Port | The 43 hand-written migrations and their smoke tests. |

### CLI surface — Harness

Kept as a dev-only harness (decision 18). These may import Leave modules; nothing
in production may import them.

| Module | Label | Reason |
|---|---|---|
| `cli` | Harness | The operator command surface; the only module importing every Leave module. |
| `interactive` | Harness | Guided prompts. |
| `demo` | Harness | Demo fixtures. |
| `run` | Harness | Run entry point. |
| `runtime-template` | Harness | Runtime pack generator. |
| `rebuild-db` | Harness | Database rebuild. |
| `directus` | Harness | Directus sync; post-launch per decision 19. |

### Retire

| Module | Label | Reason |
|---|---|---|
| `application` | **Retire, split** | **Unlabelled by the plan.** It is the engine's HTTP surface. `http.ts` serves the endpoints the app calls today and A8 deletes that path; `intake.ts` derives a job root and starts an isolated writer child writing `execution-state.json`, which decision 1 and A6 both abolish. `contracts.ts` is the response envelope and retires with the server. The intake *shape* (`intake.ts`'s parse, mirrored by the app's `buildEngineIntake`) ports as a schema, not as this module. |

---

## 3. Import graph

Derived by resolving every relative import in the 263 files to its owning
module: **209 internal edges** over 44 modules, plus 15 external roots.

Port and Adapt modules import Leave modules in exactly four places, all against
the same two files:

```
contracts           -> sector-synthesis   contracts/research.ts
report              -> sector-synthesis   report/shared.ts
sector-intelligence -> sector-synthesis   sector-intelligence/communication-baseline.ts, service.ts
store               -> sector-synthesis   store/seed-sector-intelligence-cmd.ts
```

Every one of those four imports `parse.ts` or `to-sector-intelligence.ts` — the
contract, not the authoring. See §4.2.

The only other Leave inbound edges come from `cli`, which is a harness and is
allowed them: `cli -> batch`, `cli -> prospects`, `cli -> research-batch`,
`cli -> research-library-audit`, `cli -> sector-synthesis`, `cli -> triggers`.
`triggers` is also imported by `prospects`.

`sector-research` has no importer at all, because it has no files.

---

## 4. Findings that change the plan

### 4.1 Two modules are unlabelled

`ai-surface-read` and `application` appear in no row of the plan's A1 table. A1
forbids exactly this. Dispositions above: `ai-surface-read` is Adapt,
`application` retires except for the intake shape.

### 4.2 `sector-synthesis` cannot be Leave as a whole

Decision 9 says sector research *authoring* stays external and *import, approval
and use* move in. The module boundary does not currently follow that line:

| File | What it is | Disposition |
|---|---|---|
| `parse.ts` | Parses a sector synthesis document | **Port** — it is the import contract |
| `to-sector-intelligence.ts` | Converts a synthesis into sector-intelligence input | **Port** — it is the use contract |
| `compile-cmd.ts`, `compile-batch-cmd.ts`, `extract-engagement-records.ts` | Authoring and compilation | Leave |

Labelling the module Leave would put four Port modules behind an export that
never arrives. The honest disposition is the split decision 9 already implies:
`parse` and `to-sector-intelligence` move to a contract module (or to
`sector-intelligence`), and the three authoring files leave with the research
workspace. This should be settled before Phase 2, because it decides whether the
app can import a sector package at all.

### 4.3 `sector-research/` is empty

An empty directory cannot be left or ported. Retire the label and the directory.

### 4.4 A production file imports the test runner

`report/fixtures/export-command-regression.ts` imports `bun:test` and is not a
test file. A2 requires zero `bun:test` in ported code; this is the one file that
would survive a mechanical search-and-replace of test files only. It is a fixture
in `report`, which is a Port module.

### 4.5 Scope items already visible in the code

- `report` depends on `pdfkit`. Decision 17 and the non-goals exclude a
  server-rendered PDF from v1, so this dependency retires even though the module
  ports.
- `node:fs` appears in 30 modules, `node:path` in 31, and `import.meta.dir` in 10
  non-test files. The filesystem removal in A2 is not a handful of call sites; it
  is the dominant shape of the current code.
- `postgres` is imported directly by `db` and by `directus`, so the Directus
  harness talks to Postgres outside the app's pool.

### 4.6 The `diagnostic` schema collides with nothing

A4 asks for zero collisions between the engine's 51 tables and the app's public
tables. Checked directly: the engine declares 51 tables across its 43
migrations; a database built from the app's migrations plus Better Auth holds 59
public tables; the intersection is **empty**. The plan's "26 app tables" is also
stale — Better Auth and the tenancy backfill account for the other 33 — but the
collision result is what A4 needs and it holds.

---

## 5. What this does not establish

- No engine file was read beyond imports and headers; a Port label here means
  "this is the right module to port", not "this module ports cleanly".
- The dispositions are against the working tree, which is dirty (§6 of the plan's
  Phase 0 note). A0 requires the engine frozen and tagged first; until it is,
  this table describes a moving target.
- `application` retires as a module but its intake contract is still the thing
  the app must satisfy. The port needs a schema, not this file.
