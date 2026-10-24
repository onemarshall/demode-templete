# Montsel implementation stocktake and read-only audit

**Date:** 23 October 2026, Europe/London  
**Git baseline:** `e8015e5` — Overhaul security dashboard: escalation policies, automation actions, risk factor labels  
**Scope:** Current specification, stress review, working-tree changes, tenancy code, migration code, MCP/dependencies and configured PostgreSQL connectivity.

## Follow-up scope correction — 23 October 2026

The owner has confirmed that the application MCP/OAuth authorisation server was imported by mistake and is not required. Its presence in the committed baseline explains its history, not a reason to retain it. The earlier recommendation to retain or disable it pending a scope decision is superseded: remove this runtime functionality. Directus Auth MCP and Svelte documentation tooling are separate developer connectors; Google/GitHub social sign-in remains required.

The cleanup removes the application MCP endpoint, consent page, MCP/CIMD plugins and metadata transport, associated JWT registration, runtime feature flag, schema CLI registrations and four direct dependencies (`@better-auth/mcp`, `@better-auth/cimd`, `@better-auth/oauth-provider`, `@modelcontextprotocol/server`). Existing database tables are not dropped by this code cleanup. The stocktake and file inventory below describe the earlier audit snapshot; the cleanup is a subsequent authorised change.

Cleanup verification: the package manifest and lockfile no longer contain the four removed direct dependencies; application/CLI reference scans found no remaining provider imports or feature flag. Worker types were regenerated and pass their freshness check. CLI configuration/schema inspection confirms the organisation plugin remains and MCP/OAuth-provider/JWT schema registrations are absent. The duplicate CLI `admin` import was fixed by aliasing the organisation role. Four focused account/provider/deletion regression files passed (33 tests). The full static check still reports the same four unrelated errors in the stale auth component exports and organisation invitation API typing; those findings remain open. Existing database tables and developer connectors were not modified.

## Overall assessment

**Phase 1 is partially written, not release-ready.** There is substantial backend scaffolding, but no integrated organisation/brand user journey or tenancy gate test suite. The current working tree also fails static checks. Two backend failures were reproduced with mocked dependencies, without connecting to the database.

The MCP packages were already present in the committed baseline. There is no evidence in the package or lockfile diff that implementing organisations installed new MCP packages. The package change moves the existing Zod dependency from development to runtime dependencies.

The configured local database initially refused connections, then became available after the user restored it. Read-only catalog inspection now confirms existing authentication, billing and MCP/OAuth tables, but no organisation tables, Montsel tenancy tables or Montsel migration ledger. These findings describe the configured local database, not a verified deployed environment. The user-requested Directus Auth MCP cross-check remains incomplete in this chat because its native tools are not exposed here. The separate chat “Test Directus Auth MCP” successfully called `directus_auth.schema`; the connection itself is therefore confirmed working there.

Application code, configuration, dependencies and database contents were not changed by this audit. This report and its file inventory are the audit outputs. No migration, installation, uninstallation, service startup, real invitation or email send was performed.

## 1. What has changed

Before creating this report, Git showed **45 modified tracked files, 2 deleted tracked files and 67 untracked files: 114 files in total** relative to the baseline. Git's compact status initially grouped some untracked directories, producing 89 status entries; that is not the expanded file count.

These changes mix several streams of work. Git alone does not establish authorship, dates or whether an untracked file is finished.

| Workstream | Current files or changes | Assessment |
| --- | --- | --- |
| Architecture | `montsel-specification.md`, `montsel-specification-stress-test.md` | Current specification is **v1.2**. Stress review explicitly targets **v1.1** and is stale for the revised document. |
| Dependency classification | `package.json`, `bun.lock` | Existing Zod moved to runtime dependencies. No MCP dependency/version change in this diff. |
| Better Auth schema helper | `scripts/auth-cli.ts` | Organisation plugin added, but duplicate `admin` imports prevent parsing. |
| Domain migrations | `database/migrations/0001_montsel_tenancy.sql`, `0002_backfill_personal_organisations.sql` | Six tenancy tables and personal-organisation backfill are written; their expected tables and ledger are absent from the inspected local database. |
| Migration runner | `scripts/database/migrate.ts` | Version/checksum ledger and per-file transactions implemented; inspection modes write DDL and concurrent-run locking is absent. |
| Organisation plugin | Three files under `src/lib/auth/modules/organization/`; core builder and environment schema changed | Server plugin and custom roles are written and feature-gated; client plugin integration and complete lifecycle policy are missing. |
| Brand backend | Fourteen files under `src/lib/server/brand/` | Access checks, repositories, provisioning, audit, onboarding, limits and switching queries are written. Several are broken or unsafe to expose as currently implemented. |
| Account/security/billing | Earlier CAPTCHA, password, deletion, provider, history, export and billing changes | Separate workstream. Existing account functionality does not establish completion of Montsel tenancy. |
| Auth component rename | Old `PasskeyButton.svelte` / `SocialButton.svelte` deleted; `AuthPasskeyButton.svelte` / `AuthSocialButton.svelte` added | One barrel export still points at deleted files, causing two static errors. |
| Route error UI | Shared `RouteError.svelte`, authenticated and admin error pages | Additional UI work; not evidence of tenant routing or access enforcement. |

The full path/status inventory appears at the end of this report.

## 2. Database: verified local state and remaining boundaries

### Configuration and connectivity

For a fresh local process, the inspected environment resolves the database to PostgreSQL on loopback port **5431**. The application's environment loader considers existing process values and `.env.local`, `.env.development`, then `.env`; the inspection did not find an effective overlay changing this target. Credentials and connection strings were not printed.

Initial attempts returned `ECONNREFUSED`. After the user made the database available, inspection completed on one connection inside `BEGIN READ ONLY`, followed by `ROLLBACK`. Only catalog metadata and aggregate counts were read; no user identities, account fields, credentials or token values were selected.

| Schema area | Verified local state |
| --- | --- |
| Better Auth core | `public.user`, `account`, `session`, `verification` exist. User/account/session primary keys and account/session user foreign keys are present. |
| Organisation plugin | `organization`, `member` and `invitation` are absent. |
| Montsel domain | All six tables listed below are absent. |
| Montsel migration ledger | `schema_migrations` is absent. The migration-like ledger found is `directus_migrations`, owned by Directus. |
| Existing billing | `creem_subscription` exists, with two rows. Its observed constraints include its primary key; no user foreign key or reference index was observed. |
| Existing MCP/OAuth | `oauthResource`, `oauthClient`, `oauthClientAssertion`, `oauthClientResource`, `oauthAccessToken`, `oauthRefreshToken` and `oauthConsent` exist, with token/client/resource relationships and indexes. |

The search covered all non-system schemas (`public`, `tiger`, `tiger_data`, `topology`); no organisation or Montsel table was found under another schema. Existing auth, billing and OAuth target names were found in `public` only.

Exact aggregate counts at inspection: user 2; account 2; session 29; verification 29; passkey 1; twoFactor 0; subscriptions 2. OAuth resources: 2. OAuth clients, client assertions, client-resource associations, access tokens, refresh tokens and consents: 0 each. These counts describe local stored rows, not deployed use or an assertion that a feature is unnecessary.

A running server can retain cached environment values, and deployed Worker bindings can differ from local files. This report does not establish their effective database target or feature flags.

### Directus Auth MCP verification status

The user requested use of the configured `directus_auth` MCP. Discovery found no native Directus tools in this chat, and resource lookup returned `unknown MCP server 'directus_auth'`. A separate manual HTTP initialization returned 403, but that is not evidence that the native connection is broken. Inspection of the actual tool history in “Test Directus Auth MCP” confirms a successful `directus_auth.schema` call, with collection names including `user`, `session`, `pages` and `posts`, and folders `auth`, `blocks` and `website`. That history does not expose the full schema result. The configured URL credential was kept internal, and no permissions or configuration were changed.

Continue the MCP cross-check in a chat where the native Directus tools are exposed; there is no demonstrated need to reconnect the service. Its endpoint is remote, so do not assume it represents the same local PostgreSQL instance without verification. The SQL findings above were obtained before this steering and remain explicitly attributed to the local connection.

### Schema intended by the files

The Better Auth schema step must supply `user`, `organization`, `member`, `invitation` and the required session field(s). Domain migration `0001` assumes those prerequisites and creates:

- `brand`
- `brand_member`
- `user_brand_preference`
- `invitation_provisioning`
- `invitation_brand_grant`
- `audit_event`

Useful constraints already written include brand/organisation foreign keys, brand slug uniqueness within an organisation, unique brand/user assignment, role and lifecycle checks, provisioning idempotency, and an audit-event composite foreign key requiring the brand to belong to the stated organisation.

Migration `0002` intends to give each existing user a deterministic personal organisation, owner membership, default brand, brand-admin assignment, preference and audit event. It has not been exercised against PostgreSQL in this audit. Clean first-run, repeat-run, pre-existing-record reconciliation and interruption recovery require an isolated PostgreSQL test before application.

The expected domain tables and Montsel ledger are absent, so there is no evidence of successful tenancy schema application to this local database. The organisation prerequisite is absent too: the domain migration cannot be applied successfully to this state until the Better Auth organisation schema step is repaired and completed. This does not establish whether a migration was attempted and rolled back previously, or applied to a different environment.

### Runner limitations

`migrate.ts` creates the ledger before evaluating `--status` or `--dry-run`, so these commands are not currently read-only. No runner-level advisory lock prevents concurrent runners. Failed migrations roll back without a recorded failure row, whereas the specification's decision record describes recording failure. The runner uses inline transactions rather than the existing helper; this is a documentation mismatch, not by itself a transaction failure.

## 3. Confirmed blockers and permission gaps

The organisation feature is disabled in the fresh local configuration inspected here, and the brand services have no product-route callers. Security findings below describe unsafe code paths to repair **before enabling or exposing them**, not evidence of an exploited production tenant breach.

### A1 — Valid brand access throws at runtime

**Release blocker.** [context.ts](/Users/rob/Sites/_static/_sveltekit/_live/auth/auth/src/lib/server/brand/context.ts:42) declares `operationContextBrand` with TypeScript `declare const`, which emits no runtime value. The successful return path evaluates `[operationContextBrand]` as an object key at line 107.

An isolated execution of the transpiled function with successful mocked brand, membership and assignment lookups produced:

```text
ReferenceError: operationContextBrand is not defined
```

Use a real runtime symbol or another deliberate context-minting mechanism, and test the successful path as well as denials. A TypeScript brand alone is not runtime authentication. Bind the eventual public entry points to the authenticated session rather than accepting an untrusted user ID.

### A2 — Provisioning rows are mapped with the wrong column names

**Release blocker.** [provisioning.ts](/Users/rob/Sites/_static/_sveltekit/_live/auth/auth/src/lib/server/brand/provisioning.ts:65) reads camelCase fields such as `organisationId`, `createdBy` and `maxAttempts`, but the queries use `SELECT *` from a table defined with snake_case columns.

A database-shaped fixture confirmed that organisation ID, invitation ID, creator and maximum-attempt count are all lost. Grant attachment rejects the record, and activation/retry logic cannot work correctly. Add explicit SQL aliases or map the actual column names, with realistic row-shape tests.

### A3 — Invitation assignment bypasses brand administration rights

**Permission blocker before exposure.** [invitations.ts](/Users/rob/Sites/_static/_sveltekit/_live/auth/auth/src/lib/server/brand/invitations.ts:42) accepts any organisation admin/owner, then checks only that each requested brand belongs to the organisation. Provisioning repeats those organisation-level checks, without requiring the inviter's `brand_members:manage` permission in each brand or an owner-authorised administrative grant.

An organisation admin with no assignment to Brand B could invite a controlled second account as `brand_admin` of B. That account could then grant access back to the administrator. This violates the specification's separation between organisation administration and content access. Revalidate authority for every requested brand role at creation and activation.

### A4 — Native Better Auth invitations can still create organisation admins

**Separate permission blocker.** [permissions.ts](/Users/rob/Sites/_static/_sveltekit/_live/auth/auth/src/lib/auth/modules/organization/permissions.ts:28) removes `member:update` from organisation admins, but retains invitation creation. In the installed Better Auth invitation endpoint, the privileged-role restriction prevents non-owners inviting an owner; it does not similarly prohibit inviting an admin.

The Montsel wrapper hardcodes organisation role `member`, but callers can use the native plugin endpoint. The current hooks do not reject an admin invitation. Removing role-update permission therefore does not establish the specification's owner-only admin-promotion rule. Enforce role-grant policy at the native invitation boundary too, and test direct plugin requests.

### A5 — Provisioning recovery is incomplete and unsafe to publish

[retryProvisioning](/Users/rob/Sites/_static/_sveltekit/_live/auth/auth/src/lib/server/brand/provisioning.ts:387) accepts `actorUserId` without checking it, does not enforce `nextRetryAt`, and requires `recipientUserId` even though the recipient is persisted only after successful activation. A failed first activation cannot recover as intended, even after fixing A2.

`reconcileAcceptedInvitation` does not verify that the plugin invitation is accepted or that the supplied user is its intended recipient. Activation also needs renewed invitation-expiry/cancellation checks. Retry updates can overwrite newer state, and activation upserts can replace an existing role/expiry without an explicit policy for independently authorised grants. The membership cleanup path logs failure but has no durable retry worker behind its retry claims.

These helpers currently have no public status/recovery route. Add recipient/actor binding, terminal-state guards, locked attempt accounting, complete activation checks and a tested recovery mechanism before exposing them.

### A6 — Audit readers do not enforce the permission matrix

[audit.ts](/Users/rob/Sites/_static/_sveltekit/_live/auth/auth/src/lib/server/brand/audit.ts:75) accepts a brand context but does not require `audit:read`. A context obtained by an editor for ordinary reading is therefore sufficient to call the audit reader.

The organisation audit reader accepts raw user/organisation IDs, exposes organisation-only events without an organisation permission check, and checks brand assignment status without expiry or current organisation membership. Centralise its authorisation and test revoked users, expired assignments, non-admin brand roles and cross-organisation requests.

### A7 — Schema helper and current application checks fail

Static parsing of [scripts/auth-cli.ts](/Users/rob/Sites/_static/_sveltekit/_live/auth/auth/scripts/auth-cli.ts:5) fails because both the Better Auth plugin function and the organisation role are imported under the name `admin`. The migration helper cannot load until those bindings are distinguished.

Current `svelte-check` reports **four errors and zero warnings**:

- Two deleted-component imports remain in [forms/index.ts](/Users/rob/Sites/_static/_sveltekit/_live/auth/auth/src/lib/components/forms/index.ts:8).
- Two new invitation calls lack organisation API typing on the broadly typed `auth.api` object in `invitations.ts`.

The installed plugin does expose the invitation methods. The typing error does not prove that their runtime names are wrong; the plugin API typing needs proper integration.

### A8 — Ownership and identity deletion are not integrated with tenancy

The existing [deletion policy](/Users/rob/Sites/_static/_sveltekit/_live/auth/auth/src/lib/auth/server/deletion-policy.ts:28) still checks global administrator status and personal subscriptions, without organisation ownership or membership disposition. The new `assertNotLastOwner` helper has no callers. There is no transactional Montsel ownership-transfer flow.

If the new schema/backfill is applied, restrictive user foreign keys in brand creation, assignments, grants, provisioning and audit can prevent deleting the identity. Better Auth's installed internal deletion path deletes sessions and accounts before deleting the user; a later foreign-key failure can therefore leave a partially dismantled sign-in account. This consequence is conditional on applying the schema and reaching that path; it was not attempted on real data.

Implement foreground ownership/deletion guards across self and administrator removal, explicit attribution/retention handling, and transactional ownership tests before enabling tenancy. Do not use a database foreign-key error as the user-facing lifecycle policy.

### A9 — Limits and entitlements are not yet authoritative

Brand creation checks the brand count before its transaction, without serialising concurrent creation. Managed/administrative assignment paths do not consistently apply seat limits. Provisioning's organisation ceiling uses `MEMBERS_PER_BRAND * 100` (2,500), while the declared organisation limit is 100.

[entitlements.ts](/Users/rob/Sites/_static/_sveltekit/_live/auth/auth/src/lib/server/brand/entitlements.ts:24) copies deletion-prevention semantics: every subscription status except `canceled`/`expired` is treated as live. That can grant entitlements for unpaid, paused or unknown statuses. A conservative deletion block is not proof of paid access. Define a positive entitlement policy and make personal-organisation classification an authoritative association rather than trusting freely editable metadata. This helper is optional in the current access call and is not evidence that paid generation has been enabled.

## 4. Integration and release status

| Phase 1 requirement | Current state |
| --- | --- |
| Organisation plugin/configuration | Written, server-registered and feature-gated; not enabled in the inspected fresh local environment. |
| Organisation client integration | No `organizationClient()` integration found. |
| Brand schema and backfill | Written; expected tables and ledger are absent from the verified local database. |
| Access service and repositories | Written, with runtime and authorisation blockers above. |
| Invitation provisioning | Written but nonfunctional; no complete acceptance/recovery journey. |
| Invitation delivery | Wrapper sends a link to `/invite/:id`, but no corresponding route exists. Native plugin delivery is intentionally a no-op. |
| Brand routing and header switcher | Query/resolution helpers exist; no `/o/.../:brandSlug` routes or integrated selector found. |
| Onboarding | Helper written; no application caller found. |
| Ownership transfer and account deletion | Not integrated with tenancy. |
| Durable retries/operational recovery | No complete worker/outbox/status surface found. |
| Schema-drift and repository-convention enforcement | Claimed in comments/specification; corresponding tests/CI enforcement not found. |
| Tenant-isolation/lifecycle tests | No tests found for the new brand layer or organisation module. |
| Foundation/Strategy, source versions and generation | Not implemented; later-phase scope. |
| Teams, guests and shared libraries | Not implemented; intentionally deferred. |
| Organisation billing and migration | Not implemented; personal subscriptions remain the current model. |

The old account/security regression results must not be presented as evidence that these new Phase 1 gates pass. This audit ran static checks and two isolated runtime/row-shape fixtures, not a full tenant integration suite.

## 5. MCP and dependency assessment

Three different concerns must remain separate:

| Concern | Evidence and status | Recommendation |
| --- | --- | --- |
| Better Auth organisation plugin | Included in the existing Better Auth package; no separate MCP installation is needed for tenancy. | Keep and repair this integration for Phase 1. |
| Application MCP runtime | `@better-auth/mcp`, `@better-auth/cimd`, `@modelcontextprotocol/server`, JWT/MCP/CIMD plugin setup, protected echo endpoint and consent page all predate this diff. | Superseded by owner decision: remove the unwanted application server functionality. |
| Developer documentation/tooling MCP | `@sveltejs/mcp` is an existing development dependency. Inspected Codex configuration contains a disabled Svelte server and an enabled Directus-auth connector; no Better Auth documentation server entry was identified there. | Developer tooling is not the app's tenant authorisation mechanism. Installing documentation MCP does not implement organisations or brands. |

The inspected local environment has `AUTH_MCP_PLUGIN=true`. `AUTH_ORGANIZATION_PLUGIN` is absent and resolves to the schema default `false` for a fresh process. Deployed settings and already-running process values were not independently inspected.

The package/lockfile diff only promotes existing Zod to runtime dependencies, consistent with existing runtime imports including the MCP route. There is no new MCP package/version change to undo in that diff. The schema CLI already included MCP/OAuth schema setup in the baseline; adding the organisation plugin did not introduce that code. The local catalog confirms those existing OAuth tables, currently with no registered-client, consent or token rows. The separate Directus Auth MCP connector works in the dedicated test chat but is not exposed in this audit chat; it must not be confused with the application's own MCP endpoint or its database tables.

The owner has now excluded the application MCP/OAuth provider from scope. Remove its runtime implementation and direct dependencies; do not treat it as Phase 3 work. Existing database tables require a separate reviewed cleanup and are not dropped by the application removal.

Official distinction: the [organisation plugin](https://better-auth.com/docs/plugins/organization) handles membership and organisations; the [Better Auth documentation MCP](https://better-auth.com/docs/introduction#ai-resources) supports coding assistants. Neither replaces Montsel brand authorisation.

## 6. Specification and stress-review reconciliation

The current specification is v1.2, with permission-resolution, transition, decision and lifecycle appendices added. The stress review targets v1.1 and explicitly says revisions stale its verdict. Its statement that no tenancy code exists is now historical.

One technical claim needs correction before implementation relies on it: Appendix B.2 says the installed organisation plugin contains no transaction usage anywhere. The installed Better Auth 1.7.12 invitation implementation imports and calls `runWithTransaction` around member creation/session work. Invitation status updates and before/after hooks lie outside that block. This does **not** prove that Montsel's separate pool operations share an atomic transaction, but it disproves the blanket claim. Reconfirm actual adapter transaction behaviour and exact failure windows against the installed version.

Other spec-to-code gaps include unenforced schema-drift/repository convention tests, role-grant policy, incomplete lifecycle hooks and recovery, missing ownership integration, and deployment database connectivity. Fix recorded facts and mark steps as implemented, tested or pending separately; comments asserting a guarantee are not evidence of the guarantee.

## 7. Recommended recovery order

1. **Reconcile environments and complete the Directus Auth MCP cross-check.** The configured local database is now verified and has no tenancy schema or Montsel ledger. Use the confirmed working native MCP connection for the user-requested cross-check and establish whether its remote instance and the running/deployed app use this same database. Do not run the current runner's write-capable inspection modes merely to inspect status.
2. **Repair static/runtime blockers without expanding scope.** Fix the CLI import collision, stale component exports, organisation API typing, runtime context brand and provisioning mapping. Add reproducing tests first.
3. **Close permission gaps before enabling organisations.** Enforce brand authority for invitation assignments, owner-only organisation-role grants at native endpoints, authenticated actor/recipient binding and audit permissions.
4. **Complete lifecycle safety.** Add recoverable acceptance/retries/cancellation, ownership transfer and deletion handling; use consistent locking and limits. Resolve retention/user-FK disposition before backfill reaches real users.
5. **Prove migrations on isolated PostgreSQL.** Verify prerequisites, first/second run, checksum drift, concurrent runner behaviour and backfill reconciliation. Reconcile specification facts with the installed SDK.
6. **Connect the first complete tenancy journey.** Add client plugin, onboarding, organisation/brand selection, explicit routes, invitation acceptance and recovery UI, keeping user identity derived from the session.
7. **Pass the Phase 1 gate.** Negative access, mid-session revocation, two-tab context, invitation failure/recovery, native endpoint bypass, owner concurrency, file-authorisation and job-publication contracts must have evidence.
8. **Remove the unwanted application MCP/OAuth provider.** The owner has resolved this scope decision. Remove its runtime, routes, CLI schema registrations, flags and direct dependencies while preserving social sign-in and developer connectors. This cleanup does not resolve the tenancy blockers above.

Do not proceed to Foundation/Strategy or claim Phase 1 complete until the repaired foundation has both database evidence and passing tenancy tests.

## Appendix — Expanded Git file inventory

Snapshot relative to `e8015e5`, captured before the audit outputs were added. `M` = modified tracked file; `D` = deleted tracked file; `??` = untracked file. This inventory records presence/status, not authorship or implementation correctness.

```text
M   bun.lock
??  database/migrations/0001_montsel_tenancy.sql
??  database/migrations/0002_backfill_personal_organisations.sql
??  docs/architecture/montsel-specification-stress-test.md
??  docs/architecture/montsel-specification.md
M   package.json
M   scripts/auth-cli.ts
??  scripts/database/migrate.ts
M   src/app.css
M   src/app.html
M   src/lib/auth/modules/core.ts
??  src/lib/auth/modules/organization/index.ts
??  src/lib/auth/modules/organization/permissions.ts
??  src/lib/auth/modules/organization/plugin.ts
??  src/lib/auth/security/__tests__/captcha-scope.test.ts
??  src/lib/auth/security/__tests__/endpoints/captcha-token.test.ts
M   src/lib/auth/security/__tests__/hooks/before.test.ts
??  src/lib/auth/security/__tests__/sign-out.test.ts
M   src/lib/auth/security/core/feature.ts
M   src/lib/auth/security/endpoints/captcha.ts
M   src/lib/auth/security/features/captcha/index.ts
M   src/lib/auth/security/hooks/before.ts
M   src/lib/auth/security/plugin.ts
??  src/lib/auth/server/__tests__/account-export.test.ts
??  src/lib/auth/server/__tests__/account-unlink-policy.test.ts
??  src/lib/auth/server/__tests__/deletion-journey.test.ts
??  src/lib/auth/server/__tests__/deletion-policy.test.ts
??  src/lib/auth/server/__tests__/history-plugin.integration.test.ts
??  src/lib/auth/server/__tests__/history-plugin.test.ts
??  src/lib/auth/server/__tests__/history.test.ts
??  src/lib/auth/server/__tests__/session-history.test.ts
??  src/lib/auth/server/__tests__/user-context.test.ts
??  src/lib/auth/server/account-export.ts
??  src/lib/auth/server/account-unlink-policy.ts
M   src/lib/auth/server/cms/providers/directus/index.ts
??  src/lib/auth/server/cms/providers/directus/provider.test.ts
M   src/lib/auth/server/config.ts
M   src/lib/auth/server/database/hooks.ts
??  src/lib/auth/server/deletion-policy.ts
??  src/lib/auth/server/history.ts
??  src/lib/auth/server/options/__tests__/user-deletion.test.ts
M   src/lib/auth/server/options/user.ts
??  src/lib/auth/server/plugins/history.ts
M   src/lib/auth/server/plugins/security.ts
M   src/lib/auth/server/user-context.ts
M   src/lib/auth/shared/env/env-schema.ts
??  src/lib/components/admin-security/AdminAuditHistory.svelte
M   src/lib/components/billing/SubscriptionStatus.svelte
??  src/lib/components/billing/__tests__/subscription-status.svelte.test.ts
??  src/lib/components/efferd/app-shell/app-shell-2/__tests__/MobileNavHarness.svelte
??  src/lib/components/efferd/app-shell/app-shell-2/__tests__/MobileNavWrapper.svelte
??  src/lib/components/efferd/app-shell/app-shell-2/__tests__/app-shared.test.ts
??  src/lib/components/efferd/app-shell/app-shell-2/__tests__/mobile-navigation.svelte.test.ts
M   src/lib/components/efferd/app-shell/app-shell-2/app-shared.ts
M   src/lib/components/efferd/app-shell/app-shell-2/app-shell.svelte
M   src/lib/components/efferd/app-shell/app-shell-2/nav-group.svelte
M   src/lib/components/efferd/app-shell/app-shell-2/nav-user.svelte
??  src/lib/components/errors/RouteError.svelte
M   src/lib/components/forms/DeleteUserForm.svelte
??  src/lib/components/forms/__tests__/delete-user.svelte.test.ts
M   src/lib/components/forms/auth/AuthCaptchaPanel.svelte
M   src/lib/components/forms/auth/AuthForm.svelte
M   src/lib/components/forms/auth/AuthFormSocialRow.svelte
??  src/lib/components/forms/auth/AuthPasskeyButton.svelte
??  src/lib/components/forms/auth/AuthSocialButton.svelte
D   src/lib/components/forms/auth/PasskeyButton.svelte
D   src/lib/components/forms/auth/SocialButton.svelte
??  src/lib/components/forms/auth/__tests__/captcha-form.svelte.test.ts
??  src/lib/components/forms/auth/__tests__/password-visibility.svelte.test.ts
M   src/lib/components/forms/auth/index.ts
M   src/lib/components/forms/shared/CapWidgetAdapter.svelte
M   src/lib/components/profile/tabs/DeleteTab.svelte
M   src/lib/components/profile/tabs/GeneralTab.svelte
M   src/lib/components/profile/tabs/SecurityTab.svelte
??  src/lib/components/security/ConnectedAccounts.svelte
??  src/lib/components/security/__tests__/connected-accounts.svelte.test.ts
M   src/lib/components/ui/password-input/password-input.svelte
??  src/lib/remote/__tests__/auth-captcha.test.ts
M   src/lib/remote/auth.remote.ts
??  src/lib/remote/security/history.remote.ts
??  src/lib/server/brand/audit.ts
??  src/lib/server/brand/better-auth-adapter.ts
??  src/lib/server/brand/cascade.ts
??  src/lib/server/brand/context.ts
??  src/lib/server/brand/entitlements.ts
??  src/lib/server/brand/errors.ts
??  src/lib/server/brand/index.ts
??  src/lib/server/brand/invitations.ts
??  src/lib/server/brand/limits.ts
??  src/lib/server/brand/onboarding.ts
??  src/lib/server/brand/provisioning.ts
??  src/lib/server/brand/repositories.ts
??  src/lib/server/brand/resolution.ts
??  src/lib/server/brand/brands.ts
??  src/routes/(admin)/+error.svelte
M   src/routes/(admin)/admin/security/+page.server.ts
M   src/routes/(admin)/admin/security/+page.svelte
M   src/routes/(admin)/admin/users/+page.svelte
??  src/routes/auth/(app)/+error.svelte
??  src/routes/auth/(app)/account/+page.server.ts
??  src/routes/auth/(app)/account/+page.svelte
??  src/routes/auth/(app)/account/__tests__/account-page.svelte.test.ts
??  src/routes/auth/(app)/account/__tests__/account-page.test.ts
??  src/routes/auth/(app)/account/export/+server.ts
??  src/routes/auth/(app)/account/export/__tests__/account-export-route.test.ts
??  src/routes/auth/(app)/activity/+page.server.ts
??  src/routes/auth/(app)/activity/+page.svelte
M   src/routes/auth/(app)/billing/+page.svelte
M   src/routes/auth/(app)/profile/+page.svelte
M   src/routes/auth/(app)/security/+page.server.ts
M   src/routes/auth/(app)/security/+page.svelte
M   src/routes/auth/(app)/set-password/+page.server.ts
M   src/routes/auth/(app)/set-password/+page.svelte
M   src/routes/auth/(public)/goodbye/+page.svelte
```
