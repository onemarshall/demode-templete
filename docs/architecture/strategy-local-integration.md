# Strategy in Auth: local integration checkpoint

**28 October completion:** Viability Check is complete as a locally verified Auth module. See [the consolidated completion checkpoint](m04-module-completion.md) for the seven-section live run, fixes, review limits and cleanup. Earlier dated sections below are historical evidence. No production rollout occurred.

**27 October update:** The real provider adapter, versioned Trigger tasks and recovery are now implemented and verified locally. See [the worker checkpoint](strategy-worker-integration.md). Live Trigger registration/provider smoke testing requires approval after an automatic-review block; no production deployment has occurred.

25 October 2026. M04 Viability Check is integrated into the Auth application in code and verified against a disposable local PostgreSQL and Directus stack. The existing Auth/Directus database has not been migrated, no real brand records were imported, and nothing was deployed. Strategy remains disabled by default.

## What is proved

The tested path is Better Auth email/password sign-in → current organisation membership and brand assignment → explicit engagement permission → durable database job → separate local worker process → PostgreSQL revision/approval/sealed document → read-only Directus API → authenticated SvelteKit page and Markdown download. The existing Auth shell is used. Auth's existing profile hook synchronized the synthetic user into Directus; a Directus profile does not grant Strategy access.

- Complete M04 workflow: 33 assertions passed, including a real session cookie, seven confirmed steps, exact presented recommendation, human decision, immutable seal, document content/hash comparison, download, stale-revision rejection and revoked grant denial.
- Browser follow-up: four assertions passed for saved document display, loaded styles, client hydration and a real button creating another persisted session. Screenshot was inspected.
- Authority and recovery: ten assertions passed for explicit approval, generation entitlement, assignment and membership revocation, Directus outage/restart, and an otherwise permitted second brand being unable to read or export the first brand's session.
- Nine unit tests passed (21 assertions): scoped Directus queries, foreign/duplicate/malformed responses, content hashes, in-flight revocation, safe Markdown rendering and session ownership.
- Migration compatibility test passed (nine assertions): exact historical canonical text/hash preserved, single-column primary keys, all scoped foreign keys retained, immutable triggers still reject writes.
- Application source check: zero errors and zero warnings with `tsconfig.strategy-check.json`, which explicitly excludes tests. Module boundary check passed across 651 source files.
- Browser-test typing follow-up: the normal full `bun run check` now passes with zero errors and zero warnings. The matcher API and declarations were valid; Bun's linked dependencies gave the augmentation and imported expectations different Vitest identities. One TypeScript path mapping resolves Vitest to the installed root package. Dependencies and test assertions are unchanged. The separate navigation harness declaration had already been corrected in the current files.
- Production Cloudflare build passed. Browser artifact scan confirmed private Strategy method resources are absent from the browser build.

The online Svelte autofixer was attempted but could not finish: its network escalation was rejected by automatic approval review over possible source transmission to svelte.dev. Local Svelte checking and the production compiler were used; this is not recorded as an autofixer pass.

## Code ownership and storage

`src/lib/modules/strategy/` owns stage rules, fields, components, packaged private methods, scoped persistence and durable jobs. `src/lib/app/strategy-*` supplies Auth composition, live authority, provider/delivery ports and the Directus reader. The route is `/o/[organisationSlug]/[brandSlug]/strategy/engagements/[engagementId]/viability-check` with its download endpoint under `/handoff`.

Auth's Better Auth tables remain the identity and organisation-membership authority. Its existing brand tables remain the brand authority. `strategy_access_grant` separately grants read/edit/approve/generate/export/manage per engagement, with explicit approver status, expiry and revocation. A global admin or brand role does not silently receive Strategy approval power. Mutation transactions recheck and lock current identity, membership, assignment and grant rows; generation additionally locks/rechecks the applicable subscription authority. Workers resolve the persisted initiating user again rather than accepting a serialized browser permission object.

Brand working data and generated Markdown are database records. The filesystem is not shared persistence. SQL transactions and fenced job leases protect publication. Existing source pins, canonical serialized text, historical hashes, decisions and immutable versions are preserved. Downloads return the exact saved document bytes.

`resources/strategy/system/` remains private versioned method source. The generated server module verifies method hashes and records the release used. It is not a customer-editable Directus content library.

## Migrations and Directus

Existing Auth migrations 0001–0003 are unchanged. New files are:

1. `0004_strategy_core.sql`: brand-owned engagements, sessions/revisions, versions, approvals, documents, source links and outbox.
2. `0005_strategy_jobs.sql`: durable jobs, leases/fencing and recovery state.
3. `0006_strategy_directus.sql`: adds surrogate UUID primary keys where Directus cannot expose composite primary keys, retaining the original composite uniqueness and every captured foreign key. Does not rewrite document or historical payload bytes.
4. `0007_strategy_auth.sql`: binds Strategy ownership to existing Auth brands/users and adds explicit engagement grants.

All seven were applied only to `strategy_auth_integration_test` at `127.0.0.1:55433`. The disposable Directus is `http://127.0.0.1:8112`, using cached Directus 12.5.0 and PostgreSQL 16 images.

Directus exposes the Strategy SQL records; it does not replace transactional stage services with generic collection writes. Its document reader is a private server service identity with read permissions on `strategy_document` and `strategy_version` only. It has no write permission or admin access. This local Directus edition supports basic table-level read grants; selected field permissions and custom row policies are restricted. Therefore this service token is trusted across brands and must remain server-side. The adapter sends complete organisation/brand/engagement/document filters, selects fixed fields, checks returned ownership and hashes, and rechecks live Auth authority before delivery. A Directus error returns an unavailable response; there is no silent SQL-content fallback. If independent Directus tenant enforcement is required, choose and verify a supported Directus permission configuration before rollout.

The Auth migration CLI and runtime now share `AUTH_USER_FIELDS`, including provider and last-login fields. This fixes the newly provisioned database lacking a field that the real runtime already required; runtime schema validation remains enabled.

## Reproduce locally

Prerequisites: Docker with the pinned image tags cached, Bun, Node, installed Playwright Chromium, and dependencies installed from `bun.lock`. Run from this Auth checkout. The web test must run in an isolated copy without the active application's .env; Vite can otherwise apply its generated public bindings. The bootstrap writes explicit test settings: it writes explicit private test settings under ignored `.local-state/strategy-integration/`. All stack helpers reject any database or URL other than the dedicated loopback stack.

```sh
bun scripts/strategy/integration/local-stack.ts up
STRATEGY_LEGACY_FIXTURE_ROOT=/Users/rob/Sites/_static/_sveltekit/_live/trigger bun scripts/strategy/integration/bootstrap.ts
bun scripts/strategy/integration/directus-setup.ts
bun run strategy:worker:build
```

In separate terminals, start `bun scripts/strategy/integration/fake-services.ts` and `bun scripts/strategy/integration/serve.ts`. Both must use the isolated copy.

The retained Trigger fixture generator is used solely to produce a fictional sealed upstream chain with the synthetic grant identity before hashing. Bootstrap removes its temporary source folder afterwards. It does not import real client data. Run the next checks sequentially in another terminal:

```sh
bun build scripts/strategy/integration/end-to-end.ts --target node --packages external --outfile .local-state/strategy-integration/end-to-end.mjs
node .local-state/strategy-integration/end-to-end.mjs
bun build scripts/strategy/integration/browser-proof.ts --target node --packages external --outfile .local-state/strategy-integration/browser-proof.mjs
node .local-state/strategy-integration/browser-proof.mjs
bun build scripts/strategy/integration/permissions-recovery.ts --target node --packages external --outfile .local-state/strategy-integration/permissions-recovery.mjs
node .local-state/strategy-integration/permissions-recovery.mjs
bun test tests/strategy scripts/strategy/integration/database.test.ts
```

Node runs Playwright because its request cookie implementation failed under the installed Bun version. The separate worker now runs as a compiled plain Node process using the actual task handler; it uses the same private runtime configuration and database as the web process. The browser test signs in normally. Only mock email verification is completed by updating the newly created synthetic user's verification field in the guarded test database. Model output is deterministic synthetic fixture data. The existing security plugin is disabled through its supported development setting for this test; CAPTCHA, billing provider webhooks and real model quality are not certified.

Do not run build/type generation concurrently with the dev/browser checks; SvelteKit generation can reload the running app. After stopping the test app:

```sh
bun scripts/strategy/integration/validate.ts
node scripts/strategy/verify-build.mjs
bun x --no-install svelte-check --tsconfig ./tsconfig.strategy-check.json
```

Stop the disposable stack with `bun scripts/strategy/integration/local-stack.ts down`. Add `--remove-data` only to discard this synthetic database. If another checkout owns a running test stack, stop it there before creating a fresh one. Do not copy or commit connection files, runtime env, cookies or tokens.

## Remaining production gates

This is a verified local integration of one complete stage, not a rollout of every stage or a live database cutover.

- Provider/chat ports and Auth-hosted Node task entry points are implemented; the remaining live development smoke test requires approval. Deployment and runtime connectivity checks remain separate.
- Versioned SDK dispatch and scheduled recovery definitions are implemented. Local lease, replay and outage tests pass. Register and verify them against the selected development/deployment infrastructure after approval; no production schedule has been activated.
- Decide and test the production Directus service/tenant permission policy, deploy credentials privately to both runtimes, and verify real shared PostgreSQL connectivity from Cloudflare and Trigger.
- Review/apply migrations and Directus metadata to an integration/staging clone before any live migration. Establish backup restore proof and recovery targets before moving real records.
- Plan historical filesystem record import with count/hash/approval/source reconciliation and a recoverable switch. No original records were moved, rewritten or deleted in this phase.
- Bind M01 attribution to the same Auth transaction and complete its screen/worker integration, then M02 and later stages in dependency order. Existing pure stage code being packaged does not mean those stages have been cut over.
- Browser-test typing follow-up is complete: the unchanged full `bun run check` is green. This does not certify every server-side test suite or production service.

## Recovery and provenance

Before integration, Auth's current working files (including its already uncommitted refactor) were privately snapshotted in Trigger at `.refactor-snapshots/2026-10-25-before-auth-integration/`, with a verified 990-file manifest. Testing used Trigger's ignored `.local-state/auth-integration/workspace/`, not the original Auth database configuration. The final transfer checks original hashes and preserves intervening changes; its file manifest and reversible checkpoint live beside that snapshot. No existing Auth worktree was reset.
