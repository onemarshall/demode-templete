# Handover — Montsel diagnostic upgrade

Written 31 October 2026, at the end of the session that executed the first pass of
the approved upgrade plan. Everything below is committed and pushed.

**Repository:** `onemarshall/demode-templete`, branch `main`
**HEAD:** `57bb7c4` — clean tree, 17 commits since `e20f1c2`
**App suite:** 142 files, 1048 tests passing, 31 skipped, none failing
**Migrations:** 24 (up from 21)

---

## 1. Read these first

In this order. Each one is self-contained and each records what it could not
establish.

| File | What it is |
|---|---|
| `docs/architecture/montsel-migration-log.md` | The A10 artefact. Current state, every gate, every open decision, what to do next. **Start here.** |
| `docs/architecture/diagnostic-module-disposition.md` | A1 — every engine module labelled, with the import graph that tests it |
| `docs/architecture/diagnostic-dependency-inventory.md` | A2 — the Bun surface, broken down by file |
| `docs/architecture/diagnostic-test-parity.md` | A3 — 90 engine test files mapped, plus the invariant audit |
| `AGENTS.md` | Verification and import commands. Do not memorise containers. |

---

## 2. What was built

### Delivery automation (before this session's plan work)

The worker used to poll and give up. It now advances an engagement through every
step the application owns — dispatch, publication release, import — and stops only
where an external actor is genuinely required. A scheduled reconcile task sweeps
the self-service queue. Terminality is defined once, in `status.ts`, and unknown
engine states mean "keep waiting" rather than "stop".

`delivered` is written only after the quality receipt passes and the bytes
hash-match. A quality refusal is a settled outcome; an import fault becomes a
visible `retrying` state instead of a finished one.

### Schema

- **0022** — the `diagnostic` and `content` schemas, with `diagnostic` carrying
  its own ledger separate from `public.schema_migrations`. `content` deliberately
  has none: Directus owns `directus_migrations`. Neither schema joins the
  application's `search_path`, proven by a same-named `diagnostic."output"` failing
  to shadow the app's.
- **0023** — `output_version.provider` / `.model` as a nullable pair with a CHECK
  refusing half a record (invariant 5), plus
  `output_version_section.structured_data` (A9.1). All nullable, all absent from
  the previous release's SELECT lists, so a rollback reads them as it does now.
- **0024** — `diagnostic_eligibility.requested_sector_ref`, so a refused sector
  request is still recorded. It used to be discarded with the refusal.

### Tooling

| Command | What it does |
|---|---|
| `bun run verify` | Lists every disposable-database proof |
| `bun run verify all` | Runs them all |
| `bun run verify sectors` | Every synthesis: importable and approvable? |
| `bun run import-sectors` | Imports and approves every sector into a named database |

`bun run verify` starts its own throwaway Postgres, waits until it accepts
connections, runs the proof and removes it. Each proof still declares the database
name it expects, so the wrapper cannot loosen the guard that keeps a mistyped URL
away from your local stack.

`bun run import-sectors` has no default target and refuses loopback unless told
otherwise. It writes and approves, so it is deliberately awkward to aim by
accident.

### Fixes

- `verify-engagement.ts` had been failing since `e20f1c2` with
  `PaymentRequiredError`. Nobody noticed because it needs a disposable database to
  run. It now proves the payment gate rather than working around it.
- `wrangler types --check` had been failing on upstream drift, which made
  `npm run build` unusable. Regenerated.
- The app suite went from 11 failures in 15 files to green. The failures were:
  five strategy tests importing `bun:test`, five browser timeouts, a stale
  visual-contract route expectation, a SQL contract matching prose in a generated
  prompt bundle, and a Better Auth patch pin that had drifted.

---

## 3. Has the plan been updated?

**No.** The plan file (`~/.devin/plans/plan-1ac3cc87d128a297.md`) is untouched —
its timestamp is still 30 October, before this work. All corrections live in the
repository instead.

That is deliberate: the plan is an approved document, and quietly rewriting an
approved plan is how a programme loses its audit trail. The corrections are
recorded in the migration log §6 and here. **If you want the plan itself revised,
that is still to do.**

### Where the plan is now wrong

| Plan says | Reality |
|---|---|
| "Engine tagged `pre-port-<date>`" and "both repositories" | The engine is a subdirectory of the `_04_Langfell` workspace repo. It does not need its own repo — it is being **absorbed** into the app (decision 1) and decommissioned (Phase 10). A0 needs a frozen commit and a host to run the old build, not a repository split. |
| 46 top-level modules | **44.** Nothing in the tree accounts for the other two. |
| A1's table labels every module | **Two are unlabelled**: `ai-surface-read` (Adapt) and `application` (Retire). |
| `sector-synthesis` is Leave | It cannot be Leave as a whole. Four Port modules import `parse.ts` and `to-sector-intelligence.ts`, which are the import and use contract. Two files move, three stay behind. |
| "Three external imports vendored" | **Seven entry points, 21 files**, including `pdfjs-dist`. Under a provider-only profile ~15 survive and the PDF engine leaves with the browser. |
| "A fresh database builds from migrations alone" | It does not. Better Auth's migrator creates 33 of the 59 public tables before the SQL runner starts. The gate needs restating. |
| A3: "a named test for each of the seven invariants" | Only **one** of the seven has a test. Invariant 7 cannot be a test at all — A9.1 requires G10 to run against the deployed previous release and never a mock. |
| Phase 0: "both suites green" | The app is green. The engine's suite has never been run: it reaches `DATABASE_URL` and `PROSPECTING_DATABASE_URL`, and the product's `AGENTS.md` forbids running against your local stack. |

---

## 4. The findings that matter most

### 4.1 The 500-firm analysis is prospecting, not the product

Two research pipelines exist and they are not interchangeable:

| | Prospecting corpus | Sector Intelligence Synthesis |
|---|---|---|
| What | 26,000 listings, 500-firm cohort, 500 paid classifications, 500 firm readings | Question-led research, then one synthesis document |
| Scale | Hundreds of model calls, days | 50 searches, 50 captures, 10 model calls (the workflow's own defaults) |
| Feeds | Prospecting and outreach | **The diagnostic report** |
| Status | 1 complete, 20 partial, 2 blocked, 5 not started | 29 written, all `PASS WITH LIMITS` |

The engine's sector fields — `shared_binary_gap`, `bridge_principle`,
`structural_inertia_summary`, `recommended_columbo_question` — come from the
synthesis. There is no percentage in a report.

The 500-firm analysis answers a different question: *what positions do firms in
this sector actually occupy?* It is the measured layer, and it is what would let a
synthesis say "78.8% of 468 firms" instead of "this recurs across sources". Useful,
but not a prerequisite for serving a customer.

### 4.2 Coverage is 29 of 33, and nothing is imported

Measured with `bun run verify sectors`:

| Verdict | Sectors | Why |
|---|---:|---|
| Approvable | **29** | — |
| Refused — `prime_first` | 1 | not an approvable deployment status |
| Refused — `draft` | 1 | document status must be complete |
| Placeholder stubs | 2 | 13-line working records with no synthesis body |

29 matches the research register's canonical syntheses and the engine's reported
approved sectors. The apparent contradiction is resolved: the files exist, import
and approve — they have simply never been loaded into a production database.

### 4.3 Only one invariant is tested

| # | Invariant | State |
|---|---|---|
| 1 | The release gate refuses to publish what it cannot defend | **No test in the engine.** `review-publication/` ships two files and no test. |
| 2 | The model's materiality judgement is never overridden | **No test.** Referenced in three source files, none tested. |
| 3 | Delivered bytes match the published hash | Covered |
| 4 | Self-service publishes from `automation_ready`; consultancy needs a review event | **Half covered** — the consultancy half is untested |
| 5 | A report records its provider and model | Schema added this session; the engine's HTTP contract still does not expose per-run provenance |
| 6 | Outreach claims enforced in code | Not built (Phase 7) |
| 7 | Rows readable by the previous release | Cannot be a test — see §3 |

### 4.4 Share links do not exist

`/share/[shareSlug]` is a plain `output.share_slug` lookup gated by a `can_share`
boolean. No expiry, no revocation, no hashed token, no access log. G7 is not
partially done — it is not started.

Deliberately not built before G10: a rollback to a release that ignores an expiry
column would serve expired links, which is a security regression introduced by the
migration itself.

---

## 5. Where every gate stands

| Gate | State |
|---|---|
| G1 ported unit tests green | Not started — needs the port |
| G2 both providers validate identically | Not started — needs provider keys |
| G3 fresh DB from migrations, smoke green | **Partial** — disposable builds to 0024; schema and drain proofs pass |
| G4 simulated end-to-end in staging | Not done — needs staging |
| G5 real run per family | Not done — needs engine and providers |
| G6 outreach claims | Not built — Phase 7 |
| G7 share links | Not built — see §4.4 |
| G8 restore drill | Not done — needs the VPS |
| G9 types and boundaries | **Pass** — `npm run check` clean, Worker bundle builds, suite green |
| G10 read-compatibility vs previous release | Not done — needs a staging host and the frozen commit |
| G11 queue drained at cutover and rollback | **Tooling done and proven**; no real capture yet |

---

## 6. The one open question

**Which database should the 29 sectors go into?**

Nothing on this machine is configured as production:

- engine `.env` → `postgres://localhost:54329/brc` (your local stack — the product
  rules forbid importing into it)
- app `.env` → `localhost:5431`
- no `.env.production`, no `.dev.vars`

The import has been rehearsed end to end against a throwaway database: **29
imported, 29 approved, 29 active approved versions with 43–107 context items
each.** The operation is proven; the target is the missing piece.

```bash
bun run import-sectors --target=<production-url> --reviewer=<your-name>
```

---

## 7. What to do next, in order

0. **Import the 29** into the production database once the target is known. This is
   the only item that changes what the product can sell, and it needs no port.
1. **Reconcile two duplicate slugs** before importing anything else:
   `managed-cybersecurity-service-providers` and
   `private-clinics-and-specialist-healthcare-providers` each have two canonical
   files, one of each pair parked at a non-approvable status.
2. **Record the engine's pre-port commit** (`1ccc2970a`) and agree the freeze. This
   is a note and a rule, not a build.
3. **Take the engine's baseline test count** on a disposable database. Half a day
   for whoever owns that harness.
4. **Decide the `sector-synthesis` split** — two contract files move, three
   authoring files stay.
5. **Decide the vendoring scope** — 21 files with a PDF engine, or the narrower
   subgraph without one.
6. **Then Phase 2 can start**, and with it G1, G2 and G5.
7. **G4, G8 and G10 need infrastructure** no code can supply: a staging host, a VPS
   with a restorable dump, and the pre-port build running against the same database.

---

## 8. Traps that will bite

- **The engine's `.env` points at your local stack.** Anything that runs the engine
  CLI without `MONTSEL_LOAD_DOTENV=0` and an explicit `DATABASE_URL` will write to
  `localhost:54329/brc`. The verification harnesses set both; ad-hoc commands must
  too.
- **`bun run import-sectors` refuses loopback by default.** That is not a bug. It
  needs `--allow-loopback` for a disposable database and should never get it for
  the real one.
- **A synthesis names a sector slug the taxonomy must already hold.** On a fresh
  database every import fails with "No sectors row exists". `--migrate` runs
  `seed-sectors`; a production database is presumably already seeded.
- **The two placeholder stubs are not broken documents.** They are 13-line working
  records. Adding the missing heading would produce a fake sector.
- **`npm run build` needs `wrangler types` to be current.** It is now, but a
  dependency bump can drift it again.
- **Do not run the engine's test suite.** It reaches `DATABASE_URL` and
  `PROSPECTING_DATABASE_URL`.

---

## 9. Session record

Seventeen commits, `e20f1c2..57bb7c4`:

```
57bb7c4  Import and approve every sector, against a target you must name
f24436f  Keep the sector a customer asked for when it is refused
48f48f3  One command for every disposable-database proof
fee56f0  Prove a sector synthesis import before it reaches production
504bb74  Correct the engine framing: it is absorbed, not relocated
23dfb9d  Order the remaining work by what actually blocks it
0e509c3  Record the green app suite in the migration log
8d598f6  Make the app suite green
d265228  Repair the engagement proof and stop pinning migration versions
1c1aa7f  Start the migration log and record what is and is not proven
2e4b68e  Record report provenance and prove the drain check
4bae619  Regenerate the Worker types so the build gate passes
cf2a119  Map the engine's 90 test files to their Vitest targets
45b042d  Record the A2 dependency inventory for the engine port
730c0ae  Record the A1 module disposition against the real import graph
6a3f974  Create the diagnostic and content schemas
5e0c616  Automate diagnostic delivery from dispatch to import
```

Every commit message records what it proved and what it could not.
