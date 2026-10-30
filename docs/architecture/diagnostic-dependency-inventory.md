# A2 — Dependency compatibility inventory

Recorded 30 October 2026 against the engine at
`~/Documents/LIFE/1_Projects/_04_Langfell/03-Product-Engines/diagnostic/app/cli/src`.
Read-only: no engine file was modified.

A2 asks for a compatibility check on 106 files. This is that check, with the
counts broken down far enough to plan the work: the number reproduces, but the
shape it implies — "106 files to fix" — is wrong. **66 of the 106 are test files
whose only Bun dependency is `bun:test`**, so they need a Vitest import swap and
nothing else. The remaining **40** — 16 non-test files and 24 tests that spawn
processes or read paths — are the actual surface, and nine of the non-test files
are CLI entry points that A1 already marks as Harness.

---

## 1. Baseline

| Measure | Plan | Measured | Match |
|---|---|---|---|
| Files touching Bun APIs | 106 | 106 | yes |
| — test files | — | 90 | — |
| — of which only `bun:test` | — | 66 | — |
| — of which also use a Bun runtime API | — | 24 | — |
| — non-test files | — | 16 | — |
| Test files in the tree | 90 | 90 | yes |
| Files importing `bun:test` | — | **91** | — |

The extra `bun:test` file is `report/fixtures/export-command-regression.ts`,
which is not a test file. See §4.1.

---

## 2. Bun surface by API

| API | Files | Non-test |
|---|---|---|
| `bun:test` | 91 | 1 |
| `import.meta.dir` | 26 | 10 |
| `Bun.spawn` / `Bun.spawnSync` | 14 | 4 |
| `Bun.sleep` | 7 | 1 |
| `Bun.env` | 5 | 0 |
| `Bun.file` | 3 | 0 |
| `Bun.Subprocess` | 2 | 2 |
| `Bun.serve` | 2 | 1 |
| `Bun.stdin` | 1 | 1 |
| `Bun.argv` | 1 | 0 |
| `Bun.YAML` | 1 | **1** |

`Bun.write` is not used anywhere. `Bun.file` appears only in test files.

---

## 3. The non-test files

Nine are CLI entry points — `run.ts` or `*-cmd.ts` — which A1 already disposes as
Harness. They leave with the CLI and need no port work.

| File | API | Kind |
|---|---|---|
| `ai-search-capture/run.ts` | `Bun.spawn`, `Bun.Subprocess` | entry |
| `application/run.ts` | `Bun.serve` | entry |
| `prospects/run.ts` | `import.meta.dir` | entry |
| `prospects/review-run.ts` | `import.meta.dir` | entry |
| `rebuild-db/run.ts` | `import.meta.dir` | entry |
| `research-library-audit/run.ts` | `import.meta.dir` | entry |
| `sector-synthesis/compile-cmd.ts` | `import.meta.dir` | entry |
| `sector-synthesis/compile-batch-cmd.ts` | `import.meta.dir` | entry |
| `visual-extract/run.ts` | `Bun.spawn`, `Bun.Subprocess` | entry |

Seven are library code and are the actual A2 work:

| File | API | Why it matters |
|---|---|---|
| `application/intake.ts` | `import.meta.dir`, `Bun.spawn` | Derives a job root and starts an isolated writer child. Retires with `application` (A1), but its intake parse ports as a schema. |
| `application/workbench-execution-child.ts` | `Bun.stdin` | The child half of the same design. Retires. |
| `lib/research-delegation.ts` | `import.meta.dir`, `Bun.spawn` | A **Port** module spawning another product's process. Needs a decision, not a mechanical fix. |
| `sector-synthesis/parse.ts` | **`Bun.YAML`** | A **Port** file — the import contract from §4.2 of A1 — with no Node equivalent. |
| `store/load-corpus.ts` | `import.meta.dir` | Resolves `research/src` at runtime by path. See §4.3. |
| `triggers/enrich.ts` | `import.meta.dir`, `Bun.sleep` | Leave (prospecting), but `Bun.sleep` is the one trivial replacement in the set. |
| `report/fixtures/export-command-regression.ts` | `bun:test` | See §4.1. |

### 3.1 The 24 tests that need more than an import swap

These are integration and entry-point tests. They spawn a process, read a path or
serve a port, so they need the same treatment as the library files rather than a
`bun:test` → `vitest` substitution. They are also the tests most likely to
disappear with the behaviour they cover:

| API | Tests |
|---|---|
| `import.meta.dir` | 16 |
| `Bun.spawn` | 10 |
| `Bun.sleep` | 6 |
| `Bun.env` | 5 |
| `Bun.file` | 3 |
| `Bun.serve` | 1 |
| `Bun.argv` | 1 |

Six of them are integration tests against a live database or engine
(`application/workbench.integration`, `persistence/acceptance.integration`,
`store/load-corpus.integration`, `store/prospecting-e2e.integration`,
`migrations/schema-smoke`, `application/run`). Those carry the most value and the
most port cost, because the app's equivalent is a disposable-database harness
rather than a spawned child.

---

## 4. Findings

### 4.1 `bun:test` in a production fixture

`report/fixtures/export-command-regression.ts` imports `bun:test` and is not a
test file. It is in `report`, which is a Port module. A mechanical pass over
`*.test.ts` would leave it behind, and it would then fail to resolve under
Vitest.

### 4.2 `Bun.YAML` in the file A1 says must port

`sector-synthesis/parse.ts` parses YAML through `Bun.YAML`, which has no Node
equivalent. This is not a mechanical substitution: the port needs a YAML parser
as a real dependency, and the parse must be proven byte-identical on the sector
packages already imported. Combined with A1 §4.2 — where `parse.ts` is the
contract four Port modules depend on — this file is on the critical path for
"can the app import a sector package at all".

### 4.3 A Port module reads another product's source tree at runtime

`store/load-corpus.ts` does:

```ts
const pipelineSrc = resolve(import.meta.dir, "../../../../../research/src");
```

`store` is a Port module; `research` is a Leave product. This is a dependency
A1's import graph does not see, because it is a path string rather than an
import — and it will not survive either the `import.meta.dir` removal or the
prospecting split. It needs a real interface or the code needs to leave.

### 4.4 The vendoring list is three names, not three files

A2 says "Three external imports vendored: `search/src/network.ts`,
`search/src/api.ts`, `research/src/shared/news-evidence-key`." The engine imports
**seven** distinct entry points across six `search/src` files:

| Entry point | Imported by |
|---|---|
| `search/src/network.ts` | `application/workbench-execution.ts`, `scrape/site-map.ts` |
| `search/src/api.ts` | `scrape/firecrawl.ts`, `scrape/local-first.ts`, `triggers/enrich.ts`, `triggers/run.ts` |
| `search/src/providers/social/registry.ts` | `social-provider/registry.ts` |
| `search/src/providers/social/normalise.ts` | `social-provider/normalise.ts` |
| `search/src/providers/social/retrieval.ts` | `social-provider/collect.ts` |
| `search/src/providers/social/client.ts` | `social-provider/client.ts` |
| `research/src/shared/news-evidence-key` | `prospects/review.ts` |

Resolving the transitive closure of those seven entries gives **21 files**, not
three, and they bring their own dependencies:

```
search/src/{api,browser,capture-quality,capture-session,discovery-session,fetch,
  firecrawl,lib,network,pdf,provider-safety,response-limits,session-lock,
  treg-tagging,treg-tinyfish}.ts
search/src/providers/social/{catalog.json,client,normalise,registry,retrieval}
research/src/shared/news-evidence-key.ts
```

External specifiers in that closure: `node:async_hooks`, `node:crypto`,
`node:dns/promises`, `node:fs`, `node:http`, `node:https`, `node:module`,
`node:net`, `node:os`, `node:path`, `node:stream`, `node:url`, `node:zlib`, and
**`pdfjs-dist/legacy/build/pdf.mjs`**.

Vendoring is therefore a 21-file extraction with a PDF engine attached, not a
three-file copy. Two options worth putting to a decision: vendor the closure as a
package with `pdfjs-dist` kept, or vendor only the subgraph the ported modules
need and drop `pdf.ts`/`browser.ts` with the collection features that use them.

### 4.5 `@clack/prompts` reaches an Adapt module

`lib/ui.ts` imports `@clack/prompts`, and `scrape/run.ts` imports `lib/ui.ts`.
A1 labels `scrape` Adapt and `lib` Port, so a prompt library would follow an Adapt
module into the port. It should not: `scrape/run.ts` is a CLI entry and belongs
with the Harness. This is the general case — **every module's `run.ts` is an entry
point, not part of the module's library**, and the labels should be applied at
file granularity for those.

### 4.6 `node:*` availability is not the constraint

The engine imports ten distinct built-ins: `fs`, `path`, `crypto`, `os`, `url`,
`dns/promises`, `http`, `https`, `net`, `tls`. All of them are available in
Trigger's Node runtime. The plan's phrasing — "limited to those available in the
Trigger Node runtime (fs removed)" — implies `fs` is unavailable; it is not. The
real constraint is that a stateless worker has no durable local disk, so `fs` must
go for a design reason rather than a platform one. That distinction matters when
someone later asks whether a temporary file is allowed.

### 4.7 No `$app/*` in the engine

Verified: the engine imports no SvelteKit virtual modules. A2's condition holds
as written, and the CLI harness remains the only thing that needs them.

---

## 5. What this does not establish

- Nothing here was executed. A `Bun.YAML` parse, a `Bun.spawn` call site and a
  `bun:test` import are all static readings of source text.
- The 21-file closure is import-resolved only; it does not include runtime asset
  reads (`catalog.json` is included because it is imported, not because anything
  checks how it is loaded under Vitest).
- The counts are against the dirty working tree, not the frozen `pre-port` tag
  A0 still requires.
