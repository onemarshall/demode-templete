# Montsel upgrade — migration log

Started 30 October 2026. This is the A10 artefact: the record a later reader
uses to decide whether the migration may proceed, and what to do if it must be
reversed.

**Status: engineering in progress. No gate in A7 is claimed as passed except G9
and the tooling half of G11.** Everything below is evidence or an honest absence
of it.

---

## 1. Repository state (A0)

| Item | State |
|---|---|
| App repository | `onemarshall/demode-templete`, branch `main` |
| App HEAD at this log | `48f48f3` |
| App working tree | clean |
| Engine path | `~/Documents/LIFE/1_Projects/_04_Langfell/03-Product-Engines/diagnostic` |
| Engine HEAD | `1ccc2970a` |
| Engine working tree | clean (was dirty when A1 was measured; the work landed) |
| Engine tag `pre-port-<date>` | **not created** — see §6.1 |
| Engine frozen | **no** — nothing enforces it yet |
| Schemas dumped to R2 | **not done** — needs R2 credentials |

The engine is a **subdirectory of the `_04_Langfell` workspace repository**, which
also holds the Library, the book and the brand operating systems. That affects what
a tag can mean, but it does not block the port: the engine is being absorbed into
this application (decision 1) and decommissioned (Phase 10), so all A0 needs from
the engine is a commit that cannot move and a host to run the old build on. See
§6.1.

---

## 2. Baselines

| Measure | Engine | App |
|---|---|---|
| TypeScript source files | 263 | — |
| Test files | 90 | 142 |
| Declared test cases | 423 (static count) | 1079 (executed) |
| SQL migrations | 43 | 24 |
| Top-level modules | 44 (the plan says 46) | — |
| Bun-touching files | 106 | — |

**The engine's suite has not been executed.** Running `bun test` in the engine
would reach `DATABASE_URL` and `PROSPECTING_DATABASE_URL`, and the product's
`AGENTS.md` forbids running anything against the operator's local stack. A0's
baseline count therefore remains outstanding and must be taken on a disposable
database by whoever owns that harness.

**The app's suite is green.** 142 files: 140 passed, 2 skipped; 1079 tests: 1048
passed, 31 skipped, none failed. At `e20f1c2` the same suite had 11 failures in
15 files — five strategy tests importing `bun:test`, five browser timeouts, the
`access.test.ts` route expectation, the tenancy SQL contract matching prose in a
generated prompt bundle, and a Better Auth patch pin that had drifted. All are
recorded in the commit that fixed them; none was in the diagnostic module.

### Sector coverage — 29 of 33

Measured with `bun run verify sectors`, which compiles every
`Sector-Intelligence-Synthesis.md`, imports it against a disposable database and
asks the approval gate. It answers per sector, not per file.

| Verdict | Sectors | Why |
|---|---:|---|
| Approvable | **29** | — |
| Refused — `prime_first` | 1 | `deployment_status` is not one of `READY`, `SECTOR_READY`, `NAMED_COMPANY_READY` |
| Refused — `draft` | 1 | `document_status` must be `complete` |
| Placeholder stubs | 2 | 13-line working records with no synthesis body; the compiler correctly refuses them |

The 29 matches the research register's 29 canonical syntheses and the engine's
reported 29 approved sectors. The earlier apparent contradiction is resolved: the
files exist, import and approve; they have simply never been loaded into a
production database.

Two slugs have more than one canonical file
(`managed-cybersecurity-service-providers`, `private-clinics-and-specialist-healthcare-providers`),
which should be reconciled before either is imported.

---

## 3. Appendices

| Appendix | State | Artefact |
|---|---|---|
| A0 freeze and baseline | **partial** — §1, §2 | this log |
| A1 module disposition | **done** | `docs/architecture/diagnostic-module-disposition.md` |
| A2 dependency compatibility | **done** | `docs/architecture/diagnostic-dependency-inventory.md` |
| A3 test parity | **done, one requirement conflicts** | `docs/architecture/diagnostic-test-parity.md` |
| A4 schema | **partial** — §4 | migrations 0022, 0023 |
| A5 duplication | **partial** — §5 | — |
| A6 broken references | **passing** — §5 | — |
| A7 verification gates | **not passed** — §7 | — |
| A8 cutover | not started | — |
| A9 rollback | tooling only — §8 | `scripts/diagnostic/drain-check.ts` |
| A10 sign-off | **not signed** | this log |

---

## 4. Schema (A4)

| Requirement | State |
|---|---|
| `diagnostic` and `content` schemas exist | **done** — 0022 |
| Journal separate from `public.schema_migrations` | **done** — `diagnostic.schema_migrations`; `content` deliberately has none, because Directus owns `directus_migrations` |
| Neither schema on the application's `search_path` | **done**, and proven: a same-named `diagnostic."output"` does not shadow `public."output"` |
| Zero collisions with `public` | **done** — the engine's 51 tables and the app's 59 public tables do not intersect |
| 43 engine migrations applied into `diagnostic` | **not done** — belongs to the port |
| No migration touches a `public` table | **done** for 0022 and 0023; both are schema-qualified or `ALTER` existing tables additively |
| Fresh database builds from migrations alone | **does not hold** — Better Auth's migrator creates 33 of the 59 public tables before the SQL runner starts. The gate needs restating. |
| Transition rule: additive only | **done** — 0023 adds three nullable columns and one CHECK over existing rows |

Provenance (invariant 5) and `structured_data` (A9.1) are now in the schema as
nullable additions. The previous release's `SELECT` lists do not mention them.

---

## 5. Duplication and broken references (A5, A6)

**A5**

| Requirement | State |
|---|---|
| One publication write path | **yes** — `importPublishedBytes`; the artefact adapter delegates to it |
| One migration journal per schema | **yes** |
| Prompt text in one place | **no** — three prompt modules in the engine: `method/prompt.ts`, `analysis/prompt.ts`, `report-writer/prompt.ts` |
| No dual-write period | not applicable yet |
| Frozen engine imports no new module | not applicable yet |

**A6**

| Requirement | State |
|---|---|
| Types clean | **yes** — `svelte-check` 0 errors, 0 warnings |
| Module boundaries clean | **yes** — 892 source files |
| `#lib/` resolves | **yes** (svelte-check) |
| Docs updated | **yes** — four architecture documents and `AGENTS.md` |
| Worker bundle builds | **yes** — `vite build` succeeds; `wrangler types --check` regenerated |
| Trigger tasks deploy | **not verified** — needs Trigger.dev access |
| No reference to `MONTSEL_INTAKE_JOB_ROOT` | **one remains**: `scripts/diagnostic/engine-readiness.ts`. It is the engine readiness probe and is legitimately engine-facing until the port removes the engine. Delete at A8. |
| No reference to `execution-state.json` | **none in code**; one in the A1 disposition document as a description of what is being removed |
| No reference to `published-report.md` | **none** |

---

## 6. Open decisions

### 6.1 The engine is absorbed, not kept — A0 needs a frozen reference, not a new repository

This section previously recommended splitting the engine into its own repository.
That was wrong: it contradicted decision 1, which ratifies absorbing the engine
into the application on the strategy pattern, and Phase 10, which decommissions
it. The destination is `src/lib/modules/diagnostic/` in this repository.

What A0's "tag `pre-port-<date>` and keep it deployed" is actually for is narrower
than a repository split: the port must read from a state that cannot move under
it, and a rollback must be able to run the old version to prove it can still read
new rows. Both are satisfied by a recorded commit and a freeze:

- **Reference.** The engine's HEAD `1ccc2970a` is already immutable. The port
  reads from it; the tag is a convenience label, not a new home.
- **Freeze.** No engine commit during the port. A branch rule or a note in the
  engine's `STATUS.md` is enough to enforce it.
- **G10 reader.** The pre-port build is a Bun CLI. Running it later means checking
  out `1ccc2970a` and starting it — which needs a host, not a repository.

So the blocker is not structural. It is: record the commit, agree the freeze, and
have somewhere to run the old build. If a tag is wanted for legibility, tagging
the workspace repository is acceptable provided the tag name says what it points
at (`diagnostic/pre-port-2026-10-31`), because it names a workspace commit rather
than an engine-only one.

### 6.2 `sector-synthesis` must be split before the import moves in

Four Port modules import `parse.ts` and `to-sector-intelligence.ts` from a module
A1 would otherwise mark Leave. Decision 9 already implies the split, and it is
narrow: two contract files move, three authoring files stay behind.

This matters only when the *import* moves into the application, which it must,
because the engine is decommissioned. It does not block anything today: the
engine's CLI performs the import and `bun run verify sector-import` proves the
file against a disposable database.

**Research authoring is settled and stays out.** The research product produces
candidates from the desktop; the application never runs research. The earlier
question of porting the synthesis pipeline into the app is therefore optional, and
only worth doing if an uncovered sector must be served without the operator — see
§6.5.

### 6.3 Vendoring is 21 files, not 3

The plan names three external imports. The engine imports seven entry points
whose closure is 21 files including `pdfjs-dist`. Decide whether the PDF and
browser subgraph comes with the port or is dropped with the collection features
that use it.

Under a provider-only capture profile — the only one that can run on a worker —
about 15 of the 21 survive and the PDF engine leaves with the browser it exists to
feed. What does not disappear with the browser: URL validation, sitemap discovery
and the Treg receipt file, all of which need rewriting rather than removing.

### 6.4 Invariant 5 needs a contract, not just a column

The columns exist. The engine's HTTP contract still does not expose per-run
provider and model, only its configured values. After the port the writer runs in
the app and knows both; until then the import path can only record provenance
when a caller supplies it.

---

## 7. Gates (A7)

| Gate | State | Evidence |
|---|---|---|
| G1 ported unit tests green | **not started** | needs the port |
| G2 one fixture validates identically on both providers | **not started** | needs provider keys |
| G3 fresh DB from migrations, smoke green | **partial** | disposable database builds to 0023; schema and drain proofs pass |
| G4 simulated end-to-end in staging | **not done** | needs staging |
| G5 real run per family, hash-verified import | **not done** | needs engine and providers |
| G6 outreach claims rejected; descriptive-only fallback | **not built** | Phase 7 |
| G7 share links expire, revoke, redact, log | **not built** | The mechanism does not exist. `/share/[shareSlug]` is a plain `output.share_slug` lookup gated by a `can_share` boolean: no expiry, no revocation, no hashed token, no access log. Phase 7 builds it. Deliberately not started now — see §8. |
| G8 restore performed, row counts compared | **not done** | needs the VPS |
| G9 types and boundaries clean | **pass** | `npm run check` clean; `vite build` succeeds; app suite green |
| G10 read-compatibility against the deployed previous release | **not done** | needs 6.1 and staging |
| G11 queue drained and verified at cutover and rollback | **tooling done, capture pending** | `drain-check.ts` proven on a disposable database for clear, blocked and unknown, including exit codes |

---

## 8. Rollback (A9)

The read-compatibility contract in A9.1 is satisfied by construction for the
schema changes made so far: `output_version.provider`, `output_version.model` and
`output_version_section.structured_data` are nullable, and the previous release's
`SELECT` lists do not name them.

The drain check exists and is proven. What has not happened is a real capture
against a real queue, because there is no deployed cutover to capture.

**Why share tokens were not started.** Expiry, revocation and a hashed token all
change what `/share/[shareSlug]` does. The previous release reads that route, and
A9.1 requires it to keep rendering new-pipeline reports after a rollback. A
rollback to a release that ignores an expiry column would serve an expired link,
which is a security regression introduced by the migration itself. The work
belongs after G10 is proven, where the plan already puts it.

**A9.4 — not reversible.** Published reports written by the new pipeline remain on
the record. They cannot be un-published, and the previous release must be able to
display them. That is the reason G10 is a gate rather than a check.

---

## 9. What to do next, in order

Each item is blocked by something specific, and the block is named so it can be
removed rather than worked around.

0. **Import the 29 approvable syntheses.** This is the only item that changes what
   the product can sell, and it needs no port: `bun run verify sector-import
   --candidate=<file>` proves a file, then the engine's importer and approval run
   against the target database. Reconcile the two duplicated slugs first.
1. **Record the engine's pre-port commit and agree the freeze** (§6.1). The commit
   is `1ccc2970a`; the freeze is a rule, not a build. Nothing structural stands in
   the way of the port.
2. **Take the engine's baseline test count on a disposable database.** The suite
   has never been run here; it reaches the operator's local stack, which the
   product forbids. This is a half-day for whoever owns the harness.
3. **Decide the `sector-synthesis` split** (§6.2). One decision, then a small
   refactor: move `parse.ts` and `to-sector-intelligence.ts` to the contract
   module and leave the three authoring files behind.
4. **Decide the vendoring scope** (§6.3). Twenty-one files with a PDF engine, or
   the narrower subgraph without one.
5. **Then Phase 2 can start**, and with it G1, G2 and G5.
6. **G4, G8 and G10 need infrastructure**: a staging environment, a VPS with a
   restorable dump, and the `pre-port` build deployed against the same database.
   None of these can be satisfied by code in this repository.
7. **G7 share tokens** land after G10, for the reason in §8.

---

## 10. What this log does not claim

- No gate other than G9 is passed.
- No engine code was modified, ported, frozen or tagged.
- No staging environment, VPS, R2 bucket or Trigger.dev deployment was touched.
- The engine's suite has never been run here; the app's is green as of `8d598f6`.
