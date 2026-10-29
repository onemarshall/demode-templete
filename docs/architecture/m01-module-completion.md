# Founder Conviction — module completion

Status: the written Founder Conviction workflow is implemented in Auth and verified end to end against the disposable integration database, a real Trigger.dev development worker and a real AI provider. The synthetic record was independently confirmed, attributed, sealed, read through Directus, displayed in the browser and exported without changing its stored bytes. Nothing was deployed and the real Auth/production databases were not migrated or changed.

Optional voice is implemented and passes simulated browser/provider-contract tests. A real voice provider and microphone session have **not** been verified. Voice remains disabled by default. Production rollout is a separate step.

## Completed workflow

- Approved source → interview preparation → written interview → synthesis.
- Individual anchor revisions and edits, manifesto revision, evidence-matrix revision and editable derived purpose/values.
- Independent confirmations of all seven anchors, manifesto, language bank, evidence matrix, facts anchor and public-record readiness.
- Explicit human quality answers and named source attribution tied to the exact approved source version/hash.
- Immutable approval/version/document creation; saved-document display through Directus; Markdown and receipt export.
- Successor creation, stale-source/revision rejection, transcript replay, job recovery and permission enforcement.

Approving a brand member does not identify whose convictions are being recorded. A manager who also has approval authority records the named source, material references and statement. The server checks and locks that attribution during the seal transaction. Separate append-only revocations affect future seals without rewriting historical approvals.

The historical rule that public-record readiness is separately confirmed but excluded from the all-confirmed sealing guard is preserved. The test record remains `not-assessed` for public-record readiness. No generated content was manually patched to make the test pass.

## Production boundaries and files

| Responsibility | Auth location |
| --- | --- |
| Screen, authenticated commands and exports | `src/routes/(dashboard)/o/[organisationSlug]/[brandSlug]/strategy/engagements/[engagementId]/founder-conviction/` |
| Interview/review/source UI | `src/lib/modules/strategy/components/m01/` |
| HTTP composition and source authority | `src/lib/app/strategy-m01-host.server.ts`, `strategy-m01-authority.server.ts` |
| Stage rules, command contracts and approval/hash behavior | `src/lib/modules/strategy/server/stages/m01/` |
| Bounded AI and optional voice adapters | `src/lib/modules/strategy/server/providers/` |
| Durable generation worker | `server/jobs/m01-worker.ts`, `src/trigger/strategy-m01-session-v1.ts` |
| Source-attribution tables | `database/migrations/0012_strategy_m01_attribution.sql` |
| Private method resources | `resources/strategy/system/01-Founder-Convictions/` |
| Reproducible development verification | `scripts/strategy/integration/m01-*`, `tests/strategy/m01-*` |

The web app and worker use the shared scoped PostgreSQL repository, revision history, immutable versions/documents, approvals, source references, leases, outbox and recovery services. Routing resolves the module from the persisted session, rather than trusting a caller-supplied task destination. Generation cannot approve or seal. Permissions, billing policy, source pins and lease fences are checked again before publication.

Document text and working data live in PostgreSQL. The browser reads saved documents through Auth's scoped server boundary and its read-only Directus identity. Markdown files are exports of a saved version, not primary storage. No service credential is exposed to the browser.

The previous 73-resource release remains available byte-for-byte for pinned Viability Check jobs. The new 80-resource release adds the seven canonical M01 method documents. The generated server-only content archive verifies hashes and denies missing/unknown releases without falling forward. Original Trigger stage code and `02-System` material remain available for rollback; this completion does not delete them.

## Live test — 29 October 2026

| Evidence | Result |
| --- | --- |
| Development branch | `auth-m01-integration-20261029` |
| Model | `inclusionai/ling-3.1-flash`, explicit development override |
| Limits | Reasoning disabled; 12,000 output-token ceiling, 4,000 for chat; 900-second deadline |
| Paid requests | Exactly **11**: original approval of ten, then one separately approved matrix correction |
| Session | `983f9714-ab55-4cce-a640-f49924475f26` |
| Engagement | `a6ff9f31-f6af-49ca-b6e7-6c0e52eb2f4c` |
| Sealed revision | **27** |
| Immutable version | `1f138ab7-9e69-4fc7-8a4b-002e6dadf9f4` |
| Final reviewed content digest | `87f4f75fb92e6918789b0a369dee7818e4cad5f86b2233357286844f455e16b3` |
| Final boundary counts | 10 supported / 8 qualified / 6 prohibited |

The eight planned operations completed: preparation, opening turn, written reply, synthesis, anchor revision, manifesto revision, evidence revision and purpose/values derivation. Two synthesis candidates were rejected and replaced, first for thin/unfinished content and then for two non-verbatim inflections. The final bank's 24 phrases were independently matched against the source. A separately approved matrix correction resolved the remaining boundary-count failure. All candidate revisions remain in history.

Both paid limits were enforced by separate durable proxy ledgers: ten plus one. Each outgoing request was reserved before forwarding, including ambiguous failures, and concurrency/restart checks prevented overspend. The provider key stayed only in the local proxy; the worker used a synthetic key to reach it. All eleven persisted generation jobs succeeded. No additional provider call was needed for approval, sealing, replay, readback or export.

All people, customer dialogue, events and business details were explicitly fictional test inputs. The human gate answers exercise software transitions within that fixture; they are not approval of a real strategy or verification of real lived/customer/market evidence. Source attribution and the sealed document state this limitation.

## Verification

- **94 assertions**: simulated Auth → separate Node worker → PostgreSQL → Directus → immutable export, including stale inputs, independent approvals, named source attribution, revoked attribution, immutable writes and successors.
- **11 browser assertions**: create, note, prepare, interview, synthesize and independent approvals.
- **16 simulated voice browser assertions**: transcript persistence, lost-response replay, refresh recovery, conflict reconciliation and revoked access. No real microphone or paid voice call.
- **48 live read-only assertions**: authenticated access; cross-scope/anonymous denial; SQL session binding; exact sealed revision and canonical output bytes; historical hash algorithm; source references; attribution use; approval declaration; all three generated documents; exact Directus readback and Markdown/receipt exports; enabled immutability guards; no generation jobs created by verification.
- **9 live sealed-browser assertions**: saved document displays, edit/seal controls are absent, version download and successor controls are available, and no generation command is submitted.
- **15 final audit assertions**: exact exported content/hashes, one sealed version after seal replay, eleven successful jobs, both request budgets exhausted exactly, two scoped test grants revoked, and HTTP **403** after revocation.
- Provider/voice/transcript/service tests: **26 passed / 141 assertions**. Historical M01 golden output hash remains `66aa1b46afd59211250ad2ce24ec00d7d6e444037370dd70a8727c252c902014`.
- Final resource, request-budget, live-harness and prompt tests: **21 passed / 142 assertions**. Final HTTP/source-authority tests: **11 passed**.
- M01/M04 worker/recovery tests and Viability Check's local end-to-end regression passed after shared changes.
- Isolated Svelte check: **zero errors and warnings**. Standalone worker TypeScript check passed. The final completion production build passed with the Cloudflare adapter, and the scan found no current or archived private method content in the browser bundle.

The live test exposed and fixed test-harness recovery issues without repeating requests: canonical turn-operation comparison, already committed revision reconciliation and sealed-response replay. Its non-paid closing contribution is also checkpointed before posting. Generation prompts now state existing quality requirements more clearly, including literal source wording and boundary counts; schemas, approval gates and historical hashes were not loosened.

## Cleanup, evidence and remaining release work

The synthetic identity's two scoped test grants were revoked and denial verified. The development worker, isolated web app, paid-request proxies and simulated services were stopped. Task-specific temporary credentials were removed; pre-existing configuration was preserved. Disposable PostgreSQL/Directus containers are stopped with their data retained.

The pre-change source snapshot remains at `.refactor-snapshots/2026-10-28-before-m01-completion/`. Final source, SHA-256 manifest, curated verification evidence, screenshot and exact synthetic exports are stored under `.refactor-snapshots/2026-10-29-m01-module-completion/` in Trigger. Active environment files, keys, cookies and raw HTTP logs are excluded. Runtime evidence is also retained privately under `.local-state/auth-integration/workspace/.local-state/strategy-integration/`.

Remaining release work is deployment configuration, shared production database reachability, a controlled migration rollout and operational acceptance in the intended hosting environment. The trusted upstream source boundary was exercised using a fixture, not a newly implemented upstream intake module. Real voice compatibility remains a separate unverified item. Concurrent unrelated Auth work was preserved; an earlier whole-project check reported a workflow-page `PageData.form` error outside this module, so module verification used the isolated copy and does not claim the entire concurrently edited application is release-ready.
