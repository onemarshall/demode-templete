# M04 Viability Check — locally verified completion

**M04 is complete as a locally verified Auth module.** The isolated development flow generated and reviewed all seven sections, confirmed them through the normal human gates, and sealed an immutable Viability Check. Database, Directus, export, browser display and content/hash comparisons passed. This is not a production deployment or a real-brand viability assessment.

The final audit records session revision **19**, eight generated revisions, nine durable jobs (eight succeeded, one safely failed), and nine explicitly approved provider requests. One successful financial candidate was retained as an unconfirmed revision after it failed local typed review; it was not treated as valid or confirmed. One recommendation response reached the provider's output limit and failed without publishing a partial candidate. A compact replacement then succeeded. No successful model response bypassed human review.

The sealed test document is `e8cfcad1-be1a-4a8a-b0de-ac138292ec2a`, version `9aa0d3b8-72ff-43a8-9ccd-b5e73220cce7`. Final database, Directus, export and browser checks passed; content and hash matched across stored and exported copies. After the synthetic grant was revoked, read and export requests both returned 403.

## What is verified

- All seven generated sections were individually reviewed and confirmed before presentation, decision and sealing.
- The synthetic workflow preserved an explicit Wait override of the Adjust recommendation and an immutable version/hash. Canonical version, confirmed data, approval records and the presented-decision hash all matched. Model output remained an editable candidate throughout.
- Financial confirmation passed with four typed economic inputs, unknown values represented as `null`, no unsupported calculations, and the required applicable M10 consolidation.
- The final sealed document was read back from PostgreSQL and Directus, exported, rendered in the authenticated browser, and verified against its content hash.
- The live request budget was honored: nine approved paid requests total, including the invalid financial candidate, failed long recommendation, and successful compact recommendation.

The synthetic review changed only recorded test inputs and did not convert model output into evidence. Reviews corrected source quotations to exact pinned wording; rejected a claim that an assessment category itself created a new cost; and retained an unquantified baseline comparison. A fictional stretch/support-gap condition exercised the synthetic decision path. Financial review kept unknowns as null and used conservative diagnostic depth. Recommendation review clarified what the record could confirm, kept capacity unknown, and separated assessment from route authority. Eight canonical bias signals were reviewed, with the M11 risk left open and weighed qualitatively. These edits describe the test review, not claims about a real business.

## Implementation boundary

- The web application needs no AI provider key. Chat and draft requests enqueue durable SQL jobs; worker configuration owns provider credentials and execution.
- Chat and draft work use scoped, idempotent jobs. Duplicate requests are constrained by actor, command, revision and stage. A chat/draft collision cannot execute as two independent concurrent jobs.
- Publication rechecks current authority and policy, source pins, expected revision and the live lease/fence. The session revision and successful job receipt commit together.
- Recovery preserves one committed result. If a provider accepted a request but its response was lost before publication, a retry may call the external model again; external execution is not exactly once.
- Financial generation uses typed inputs, explicit unknown/null values, supported calculation kinds and their exact governed formulas. Local parsing enforces these contracts even if a provider ignores the requested JSON Schema. M1–M9 may remain unresolved in candidates; M10 consolidation must be applicable. Human confirmation remains the semantic gate.
- Recommendation guidance asks for a concise memo while retaining the full canonical method, source context, schema coverage, limitations and human authority boundaries. It does not impose new persisted word limits or weaken requirements.
- The hydrated interface includes guided durable chat and review controls. Confirmation, human decision, approval, immutable sealing and hash checks remain explicit.

## Verification evidence

| Check | Result |
|---|---|
| Full Auth check | Passed; Svelte: 0 errors, 0 warnings; module boundaries: 697 source files |
| Isolated Cloudflare build and private-resource artifact scan | Passed |
| Financial provider/schema regression suite | 22 tests / 100 assertions passed |
| Recommendation concision suite | 9 tests / 37 assertions passed |
| Audited retry and budget harness | 20 tests / 100 assertions passed |
| Adapter suite | 25 tests / 76 assertions passed |
| Recovery, enqueue and worker database suite | 8 tests / 42 assertions passed |
| Standalone Node runtime/configuration suite | 6 tests passed |
| Local end-to-end checks | 33 passed |
| Browser interaction checks, including durable chat | 20 passed |
| Preserved pure M04 domain regression tests | 18 passed across five files |
| Final live development audit | Seven sections confirmed; final seal/read/export/hash checks passed |

Focused checks from `/Users/rob/Sites/_static/_sveltekit/_live/auth/auth`:

```sh
node node_modules/typescript/bin/tsc -p tsconfig.worker.json
bun run check
bun test src/lib/modules/strategy/server/providers/m04.test.ts src/lib/modules/strategy/server/stages/m04/synthesis.test.ts
bun test tests/strategy/m04-economics.test.ts tests/strategy/m04-calculations.test.ts tests/strategy/m04-validation.test.ts tests/strategy/m04-fields.test.ts tests/strategy/m04-method.test.ts
bun test scripts/strategy/integration/worker-database.test.ts
bun run strategy:worker:build
```

Full audit records and generated private content remain in the ignored isolated test workspace; this checkpoint intentionally records only verification summaries and safe identifiers.

## Scope and recovery

No production deployment, production schedule activation, migration against an existing/live database, or real-brand import occurred. Upstream records were synthetic; this does not certify real M01/M02 workflows or the complete upstream chain. M01 and M02 are not accepted by this checkpoint. Downstream Business Foundation work has a separate gate and is not authorized by this M04 result.

The source recovery snapshot is `Trigger/.refactor-snapshots/2026-10-28-m04-module-completion/`. It contains a SHA-256 manifest and archive for 185 owned Auth Strategy source/resource/configuration files, plus reference-only host/dependency hashes. It excludes active environment files, credentials, cookies, test records and unrelated Auth work. Git history was not rewritten.

One job-status GET briefly returned 400 while the paired session read returned 200. The nearby private web log reported Redis reconnection exhaustion. Ten subsequent concurrent read pairs returned 200 for both requests. Redis/session-principal lookup is plausible but unproven; no code change was made for this non-reproduced event. The bounded readback and signing-in setup did not mutate Strategy records or call a model.

Cleanup passed: the synthetic grant is revoked, the isolated web server and identity-checked development worker are stopped, and the task-specific temporary credential file is removed. The disposable database is retained for inspection.
