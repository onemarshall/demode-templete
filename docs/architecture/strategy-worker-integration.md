# M04 provider and worker integration

**Current checkpoint: live development verification passed.** One real context draft was saved, reviewed, approved and sealed with six supporting fixture sections. Directus, export, browser display and revoked-access checks passed. No production deployment or existing-database migration occurred. See the final verification section below.

27 October 2026. Auth now contains the real OpenRouter-compatible provider adapter, versioned Trigger task entry points, SQL-backed checkpoint delivery and bounded recovery. The local integration uses the actual HTTP adapters and task handler in a separate plain Node process. No production deployment or existing Auth database migration has occurred.

## Runtime boundaries

- `src/lib/app/strategy-runtime.server.ts` composes the existing scoped services. `createStrategyExecution` provides worker/recovery services without the web surface, Directus or AI configuration requirements for bookkeeping. The web factory layers its document reader and HTTP host over those services.
- `strategy-worker.server.ts` reads explicit private process configuration, creates a small PostgreSQL pool, installs the existing Auth permission/billing policy, and supplies the real provider. Its recovery factory needs no provider key or document reader.
- The shared database module is Svelte-free. Auth's existing setup reads and validates its host configuration, calls `configureDatabase` and then initialises Better Auth. Node workers supply their own pool. Existing tenancy and billing queries and transaction locking are reused; no identity tables or permissions were duplicated.
- `tsconfig.worker.json` is independent of SvelteKit generation. It resolves the existing `#lib` source namespace for the worker build. The HTTP event type no longer requires the platform-global App namespace; its otherwise unused `locals` is an object. A plain Node import and strict standalone type checking verify this boundary.

## Provider behavior

`src/lib/modules/strategy/server/providers/m04.ts` implements both guided chat and suggested drafts using the existing M04 prompts, stage schemas, Reply schema and synthesis-model policy. Model output remains an unconfirmed candidate. It cannot manufacture human decisions, approvals or seals.

The adapter rejects credential-bearing endpoints and redirects, enforces a response byte cap and timeout, checks JSON and stage/chat schema validity, and reports safe errors without provider bodies or credentials. Publication still rechecks actor authority, current paid entitlement, current source pins, expected revision and the fenced job lease after the network request.

Production uses OpenRouter's HTTPS endpoint. An alternate endpoint is allowed only on loopback with explicit development/integration settings and the exact disposable local database. This enables full HTTP testing without model spend. Web composition passes its actual SvelteKit development/production context explicitly; worker configuration uses its process context. The existing strong synthesis-model policy is unchanged.

## Trigger tasks and recovery

- `auth-strategy-m04-session-v2`: new ID, distinct from legacy `m04-session`. Its strict payload is `{version:1,jobId}`; no serialized permissions, user identity, folder or model prompt arrives from the caller. It loads the SQL job and current actor authority before claiming work.
- `auth-strategy-recovery-v1`: a minute schedule definition. It reserves up to 50 M04 pending/expired job IDs atomically with a two-minute dispatch cooldown, then requests fresh delivery attempts. The schedule is restricted to STAGING and PRODUCTION. Development recovery is invoked deliberately, so starting a development worker cannot automatically retry old synthetic jobs. No production schedule was activated.
- Recovery uses fresh delivery keys after cooldown, so a completed earlier Trigger run cannot permanently strand a pending SQL job. SQL claims/leases and publication fences still prevent duplicate candidates.
- Enqueue outbox retries use a stable logical event key and reconcile an already persisted provider run before dispatching again. A crash between provider acceptance, SQL binding and acknowledgement does not create an endless run loop.
- Checkpoints are recorded through a persistent, scoped and deduplicated delivery ledger. Sequential M04 ordering, reset epochs and independent-gate ordering are retained. SQL business records remain authoritative; Trigger metadata is observability.
- Job dispatch failures do not prevent independent checkpoint/outbox work. Recovery attempts all reserved candidates, processes a bounded outbox pass and then surfaces aggregate failures for retry/operations. Unsupported events remain pending rather than being acknowledged or starving later supported items.

Migration `0008_strategy_recovery_and_checkpoint_delivery.sql` adds the cooldown column and checkpoint delivery ledger. It has been applied only to the disposable `strategy_auth_integration_test` database. It does not rewrite historical document or canonical payload text, approvals, versions or hashes. Existing failed/cancelled jobs are not silently converted into billable retries. Revoked actor jobs cannot claim or publish and remain visible for operator reconciliation.

## Private configuration

Keep Strategy disabled until deployment settings are ready. The checked-in `.env.example` contains names only:

- Existing `BETTER_DATABASE_URL`, private Directus reader URL/token and `STRATEGY_ENABLED`.
- `OPENROUTER_API_KEY`; optional `M04_SYNTHESIS_MODEL` / existing synthesis model policy; `STRATEGY_PROVIDER_TIMEOUT_MS` (default 120000, maximum 240000).
- `TRIGGER_PROJECT_REF`, `TRIGGER_SECRET_KEY`, optional `TRIGGER_API_URL` and `TRIGGER_DEV_BRANCH`.

SDK delivery receives explicit per-call credentials for web platform bindings; it does not mutate a global SDK client. Worker SDK context/process configuration remains supported. None of these private settings is added to the browser public-env schema.

Run the Trigger CLI with its explicit config and private environment file, using a separate development branch for initial smoke testing. Do not use a production key or deploy to test connectivity. The existing Montsel development connection was verified read-only. The approved development branch is `auth-m04-integration-20261027`; the live test outcome is recorded below.

## Validation and repeatability

The guarded PostgreSQL/Directus stack and synthetic Auth fixture from the earlier checkpoint are reused. The web host runs in an isolated copy without the active application's .env. Its test-only Vite wrapper constrains Tailwind source discovery to UI source rather than scanning the multi-gigabyte vendor cache; production stylesheet source is unchanged.

The local provider and delivery contract servers bind only to loopback. SDK calls use the real SDK HTTP/SuperJSON protocol. The delivery contract server launches a separate Node process running the same exported handler that the real task invokes. The provider receives a real HTTP POST and responds with a synthetic candidate. This tests adapters and runtime composition; it does not impersonate a live Trigger cloud registration or a real model response.

Checks for this checkpoint:

- Complete Auth → SDK HTTP delivery → Node task handler → provider HTTP → PostgreSQL → Directus → displayed sealed document/export: 33 assertions passed.
- Browser styling, hydration and an actual persisted UI command: four assertions passed.
- Failed provider response preserves original prefilled drafts and revision; revoked authority cannot call the provider or claim a queued job: nine assertions passed.
- Provider/task/recovery/outbox unit tests: 15 tests passed, 38 assertions.
- Real PostgreSQL temporary-schema recovery/checkpoint tests: five tests passed, 17 assertions, including leaving unsupported-stage jobs for their own workers.
- Standalone Node configuration tests: four tests passed; strict worker type checking passed without SvelteKit generation.

The permission/entitlement/Directus restart/cross-brand suite passed ten assertions. The normal full Auth check reported zero errors and zero warnings. The Cloudflare production build and browser artifact scan passed. Final logs and source hashes are recorded in the evidence checkpoint. Do not infer that all other Strategy stages or every unrelated server test has been completed.

Useful commands from Auth:

```sh
bun run strategy:worker:build
node node_modules/typescript/bin/tsc -p tsconfig.worker.json
bun test src/lib/modules/strategy/server/providers/m04.test.ts src/lib/modules/strategy/server/jobs/__tests__ src/trigger/__tests__
bun test scripts/strategy/integration/worker-database.test.ts
bun run check
```

Use the integration helpers only with their guarded local state. `fake-services.ts` serves the HTTP contracts; `worker.ts` is the standalone task-handler integration entry; `worker-faults.ts` covers failure/revocation. Synthetic credentials, cookies, worker bundles and source fixtures stay in ignored private `.local-state` storage. Prepared configurations containing real service credentials are stored with owner-only permissions outside the served project tree; only their location is recorded locally. The older Vite SSR worker launcher and in-memory provider ports have been replaced.

## Approved live development smoke test — 27 October

The user explicitly approved development-branch registration, required configuration egress and one bounded AI request. The separate branch `auth-m04-integration-20261027` registered and ran the real task. No production deployment occurred.

Run `run_06gnqcvocgmvdbrff1r6krbta2` loaded synthetic job `ea88c0a4-b849-4773-9611-711798d88251` from the guarded disposable PostgreSQL database. The job claimed exactly one attempt. Its provider operation did not finish within the expected 120-second deadline; after the test polling window, authenticated HTTP readback returned 200 with the original revision 1. No model-draft metadata, new revision or approval was published. A prefilled context draft already exists on session creation, so its mere presence is not evidence of successful generation.

The run was cancelled remotely (confirmed `CANCELED`), its local worker and test web server stopped, its SQL job cancelled, and its synthetic access grant revoked. No second AI request was made. Provider receipt, billing and the precise remote stall cause were not independently established; this is a failed live generation test, not a passed end-to-end model proof.

Two issues were corrected:

- The recovery schedule originally registered in development and dispatched older synthetic jobs. Revoked jobs failed authority checks; terminal jobs performed no generation. Recovery's declarative schedule now explicitly targets STAGING and PRODUCTION. Development recovery must be invoked deliberately.
- The provider previously relied on the fetch abort signal for its deadline. It now races the complete fetch/body-read operation against an explicit deadline, aborts and best-effort cancels the stream. Local tests cover both a stalled body after headers and a fetch that ignores abort. These tests demonstrate bounded local behaviour; the corrected adapter has not had another paid live run.

After these changes, provider/task tests passed: 12 tests, 29 assertions. Strict standalone worker type checking passed. The earlier full Auth check, production build and local end-to-end suites above predate these two focused changes; they were not rerun wholesale.

The local CLI started with Node 26, which emitted a worker-startup warning; the final deliberate attempt used the installed Node 22 CLI toolchain. Private test helpers use Node for Playwright requests because Bun's cookie URL handling failed before dispatch. These are development harness findings, not changes to application stage behaviour.

### Approved follow-up result

The user approved one further request. After a temporary approval-service usage-limit failure cleared, run `run_06gnr00oko1r9j74jgt72gu7a2` executed the corrected adapter on the same separate development branch. Synthetic job `2fdf4cf3-c59d-44ed-adb5-00b2f1c81597` made exactly one attempt and failed at approximately 120.2 seconds with the sanitized provider-timeout error. Trigger's final status is `FAILED`; the SQL job is also `failed`. No automatic retry ran.

The live timeout fix is now verified. Signed-in readback returned HTTP 200 with revision 1, no model-draft history and no approval. The presence of the original prefilled context draft is not counted as generation. The worker and isolated test web server were stopped and the synthetic grant revoked. The failed job is retained as evidence.

Non-generating OpenRouter checks returned HTTP 200: the existing key is active with credits, and configured model `inclusionai/ling-3.1-flash` is present and supports `response_format`. These checks made no completion requests. They rule out a missing model or inactive key; they do not establish the cause of the generation stall or any provider charge. The request budget remains 18000 output tokens; no changes to model, generation budget or timeout were made merely to force a pass.

Successful live generation remains a gate. Next investigate provider request/response timing and the generation budget before proposing another paid experiment; repeating the same request adds little evidence. The complete local sealed-document/Directus/export proof above remains separate from the failed live generation test. Existing/live database migrations, historical record import and production deployment remain later rollout gates.

## Recovery checkpoint

Auth's current working files were saved before the host/runtime wiring at Trigger's `.refactor-snapshots/2026-10-27-before-m04-worker/` (1146-file manifest). Sub-agents had already created some provider/task files, so this is not an atomic snapshot from before every phase edit. The complete 25 October pre-integration snapshot remains available. Preserve the existing uncommitted application/UI changes made by other work. The final source/test manifest records only this phase's owned paths; restore shared files by reviewing their diffs, not by extracting over current work; no legacy Trigger stage routes, working folders or private method source documents were deleted.

### Local integration startup

Use a clean isolated copy without the active application's .env; the tested copy is under Trigger's `.local-state/auth-integration/workspace/`. After its guarded bootstrap and Directus setup, build the Node handler with `bun run strategy:worker:build`, start `bun scripts/strategy/integration/fake-services.ts`, and start `bun scripts/strategy/integration/serve.ts` in another terminal. Then run the documented Node/Playwright end-to-end and fault suites sequentially. The bootstrap now prepares the synthetic HTTP provider and delivery credentials, replacing the earlier in-memory provider setup.

## Provider request controls and diagnostics — 27 October

The provider now accepts explicit private `STRATEGY_DRAFT_MAX_TOKENS` (1000–18000), `STRATEGY_CHAT_MAX_TOKENS` (1000–12000), and `STRATEGY_REASONING_EFFORT` (`none`, `minimal`, `low`, `medium`, `high`). These settings are validated and forwarded by both host configurations; omission preserves the existing 18000/12000 limits and provider reasoning default. The production synthesis-model policy is unchanged. No active application .env was edited.

Safe worker diagnostics record request start, HTTP headers, schema-valid completion or failure, with effective model, byte count, token cap, explicit effort, elapsed time, status and constrained generation ID when available. They never include prompts, method text, documents, API keys, returned content or reasoning. Logging callback failures cannot affect generation. Sanitized named failures now distinguish timeout, HTTP, malformed/truncated response and schema failure in the SQL job error field.

Non-generating model metadata confirms the current development model has reasoning enabled by default and does not require it. The full synthetic context prompt is about 95 KB including a 61 KB bundled method; its fixture candidate is 1722 bytes. These are measurements for one fixture, not maximum valid production answer sizes. The method and source context were preserved. OpenRouter documents that reasoning consumes the shared output budget and can be controlled explicitly: [reasoning-token reference](https://openrouter.ai/docs/guides/best-practices/reasoning-tokens).

A targeted development experiment is prepared with the same model and method, reasoning effort `none` and a 4096-token draft cap, requesting only the context step. This tests the default-reasoning hypothesis; it does not establish the historical cause of the two stalls. No unsupported claim is made that output capacity alone caused latency. If the live context succeeds, the harness will carry it through synthetic human confirmation and sealing, with the other six sections supplied by fixtures, then verify Directus, rendered content, immutable hash and export.

Validation after this change:

- Provider/task tests: 15 passed, 43 assertions, including safe diagnostics, isolated logging failure and explicit/default request settings.
- Standalone Node runtime tests: five passed, including configuration forwarding and invalid budget rejection.
- Strict worker type checking passed. Svelte check: zero errors and zero warnings.
- Rebuilt actual Node worker → loopback provider/delivery contracts → real Auth, disposable PostgreSQL, Directus, rendered sealed document and immutable export: all 33 assertions passed. This was a stubbed provider response, not a paid model call.

Automatic approval review rejected starting the changed live test because the previous one-request approval had already been consumed, and interpreted “okay fix” as code-fix authorisation rather than another paid request. The rejected command did not execute; no new completion was sent. Fresh approval is required for exactly one changed, bounded live verification. The separate test web server was stopped after local verification. Snapshot and evidence: Trigger `.refactor-snapshots/2026-10-27-provider-budget-fix/`.

## Changed live test and provider-log diagnosis

The user approved the changed 4096-token, reasoning-none, 120-second test. Run `run_06gns211kfmuvdl4jnrspucaa2` executed on development worker version `20261027.4`. Safe diagnostics confirm effective model `inclusionai/ling-3.1-flash`, reasoning effort `none`, cap 4096 and request size 100302 bytes. Headers returned HTTP 200 at 754 ms; body completion exceeded the deadline at 120106 ms. SQL retained a single failed attempt with `M04ProviderTimeoutError`. Authenticated readback returned 200 at the unchanged revision 1. The synthetic grant was revoked; worker and test web server stopped. No synthetic approval or sealing was attempted because generation failed.

A read-only inspection of the existing signed-in OpenRouter account then established the cause more precisely. [Generation log](https://openrouter.ai/logs?transaction=gen-1793115826-HUV8TDOreo501BKLG10J) identifies DeepInfra, 25083 native prompt tokens, 2510 native completion tokens, **zero reasoning tokens**, throughput 21.0 tokens/second, 119474 ms generation time, client cancellation and provider status 499. Recorded cost was $0.002421515. I/O logging is disabled; no logging policy was changed and no private prompt or output was retrieved. The reasoning-default hypothesis did not explain this changed request: visible generation was progressing when the application's deadline cancelled it.

At the observed speed, allowing 4096 tokens can require roughly 195 seconds plus overhead. This is a latency estimate for one route, not a speed guarantee. The configurable provider maximum is now 240000 ms, retaining the existing 120000 ms default, with a 60-second margin inside the task's existing 300-second limit. Stage contracts, complete method context, immutable versions, hashes and human approval rules are unchanged. Runtime tests verify the preserved default, acceptance of 240000 and rejection of a value above that boundary. Provider/task tests (15 tests/43 assertions), five standalone runtime tests and strict worker type checking pass after this adjustment.

Prepared next verification: exactly one request using the same model and synthetic context, reasoning none, 4096 output tokens and an explicit 240-second deadline. The harness waits up to 270 seconds and, only if generation succeeds, tests synthetic approval/sealing, Directus readback and immutable export using fixture data for the other six sections. It has not run: the prior approval specifically covered one 120-second request and is consumed. Snapshot: Trigger `.refactor-snapshots/2026-10-27-provider-duration-diagnosis/`.

## Four-minute verification: completed response, schema mismatch

The user approved exactly one 240-second request. Run `run_06gns3orc56m2623kotokorka2` (worker `20261027.5`) used the same model, reasoning none and 4096-token cap. HTTP 200 headers arrived at 532 ms; the provider operation returned after 66966 ms. The answer was valid JSON, untruncated and complete, but failed the unchanged M04 context Zod schema. The database job safely recorded `M04ProviderDraftSchemaError` on its only attempt. Signed-in readback remained HTTP 200 at revision 1; no approval, sealed document or generated revision was published. Test services were stopped and synthetic access revoked.

The provider receipt `gen-1793116283-3iSwbtMq6hEb0JXZJV25` confirms `finish_reason:stop`, no cancellation, zero reasoning tokens, 1550 native completion tokens and 66511 ms generation time through DeepInfra. Recorded cost: $0.002207675. Exact invalid field paths were not captured by the old adapter; prompt/output logging remains disabled and the rejected response is not retained. This request demonstrates variable provider latency and a separate output-contract failure; it does not prove that extending the timeout alone fixed generation.

### Structured-output correction

Draft requests now send the exact `z.toJSONSchema(STAGE_SCHEMAS[stage])` as `response_format.type:json_schema`, with `strict:true`, a stage-specific schema name, explicit `stream:false` and `provider.require_parameters:true`. The local stage schema remains the final publication check; no fallback to unvalidated JSON is allowed. Chat retains its established JSON-object contract. No method text, stage fields, confirmation rule or historical hash was changed.

A non-generating endpoint check shows DeepInfra advertises `structured_outputs` and `response_format`; Novita does not advertise those capabilities for this model. Requiring parameters prevents silent routing to an endpoint that drops the response constraint. [OpenRouter's structured-output reference](https://openrouter.ai/docs/guides/features/structured-outputs) notes that enforcement varies by provider, so local validation is still necessary.

Failure diagnostics now include up to ten validation codes and schema-known property/index paths, masking unknown property names and omitting raw values and error messages. This improves any subsequent diagnosis without retaining private output.

Post-fix checks: 17 provider/task tests passed (53 assertions), strict standalone worker types passed, and all 33 full local end-to-end assertions passed with the rebuilt Node worker and synthetic HTTP provider. Those assertions cover real Auth, PostgreSQL, Directus, human-decision commands on test records, rendered sealed documents and immutable export. The new strict-output request has not been sent to a paid model. The live test approval was consumed by the request above; another live request requires fresh approval. Snapshot: Trigger `.refactor-snapshots/2026-10-27-strict-output-contract/`.

## Strict-schema live verification passed

The user approved exactly one strict-schema completion. Run `run_06gns6hnas7jg641baps5ojra2` (worker `20261027.6`) succeeded with the same development model, reasoning none, 4096-token cap and 240-second deadline. Headers returned HTTP 200 at 626 ms; schema-valid completion arrived at 146437 ms. Generation receipt: `gen-1793117011-3nV1l7zKrOw8nlwUTusW`. The single SQL attempt succeeded, creating exactly one generated revision (revision 2). Its model and usage metadata are persisted in the version history: 25083 prompt tokens, 2732 completion tokens, zero reasoning tokens, recorded cost $0.00247096575.

### Review and approval proof

The first confirmation correctly returned 400 because the model paraphrased the source-bound decision-owner name and authority reference. Its principal names also differed from the prepared synthetic reviewer fixture. The unchanged domain guard refused confirmation. For the authorised synthetic review, the harness corrected only `decisionOwner` and `authorityRef` from the pinned engagement receipt, plus `principals` from the prepared synthetic fixture. Every other generated context field was retained. All seven context/downstream validations passed with those corrections. The original generated revision remains preserved; review was appended through ordinary authenticated confirmation commands, not an overwrite or guard bypass.

The remaining six sections were supplied by the existing synthetic candidates. They were not generated by this live request. The synthetic reviewer then presented, decided and sealed the result through normal application commands. Final session revision: 12. Version ID: `738048dd-c5bd-4270-87d9-93f4f58f699c`; document ID: `a6bec5b2-b5e2-4300-85e2-5d9d88a24999`.

### Verified readback and cleanup

- Authenticated sealed-document read: 200; document text equals PostgreSQL content and its SHA-256 hash.
- Private Directus reader: 200; content equals the same immutable database document.
- Markdown export: exact content match; rendered document HTML present.
- Real authenticated browser: saved-document article visible; screenshot retained in private evidence.
- Exactly one generated SQL revision and one successful worker attempt; no second completion request.
- Revoking the synthetic grant blocks the same signed-in read with 403.
- Development run terminal status `COMPLETED`; worker and isolated test web server stopped. Existing Auth/Trigger services and production records were not changed.

The first verification harness had a native-Fetch `.ok` property/method mismatch after all content/hash/export checks had passed. That private test check was corrected and the already sealed record was re-read and verified, including the browser and revoked-access test. No additional generation or approval mutation was needed for that verification.

This establishes the live generation → durable SQL → editable human review → approval/seal → Directus → browser/export path for M04 using one real generated context and six fixture sections. It is not evidence that all sections or other modules have had live AI generation, that a model candidate can bypass human review, or that production rollout is complete. Existing method resources, stage behaviour, approval rules and immutable history remain intact. Snapshot: Trigger `.refactor-snapshots/2026-10-27-m04-live-verified/`.
