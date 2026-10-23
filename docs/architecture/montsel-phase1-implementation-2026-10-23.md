# Montsel Phase 1 implementation repair — 23 October 2026

This record accompanies the v1.2 specification and the implementation audit. It describes the repaired existing implementation and its verification; it is not permission to release tenancy. `AUTH_ORGANIZATION_PLUGIN` remains false/unset in the inspected local environment. No application deployment or feature enablement was performed.

## Implemented

| Area | Result |
| --- | --- |
| Foundation | Stale component exports repaired; CLI admin-name collision was already repaired in the working tree. Organisation APIs recover the installed plugin type after checking runtime registration. Runtime-issued frozen operation contexts reject forged objects and action substitution. |
| Permissions | Native admin invitations require owner authority; comma/array-role bypasses are rejected. Native membership mutation endpoints, including pathless server-only addition, cannot bypass locked Montsel lifecycle services. Organisation roles do not imply workspace content access. |
| Assignments and audit | Managed and explicit owner grants revalidate membership and seat limits under the organisation lock. Workspace audit requires its exact action; organisation audit filters current membership, roles, assignment expiry and workspace scope. Mutation paths revalidate within their transaction. |
| Invitations | PostgreSQL row mapping repaired. Session actor and verified recipient are bound. Entire intended assignment sets are checked and activated atomically. Existing active grants remain intact. Accepted recipients persist before activation; backoff, attempts, cancellation and abandoned-hook recovery are enforced. |
| Ownership and deletion | Recent-session confirmation, verified successor and transactional transfer/removal preserve at least one owner. Last owners must transfer before leaving. Account deletion requires ending retained memberships first, even while tenancy is disabled, and fails closed if obligations cannot be checked. Attribution foreign keys null on identity deletion; retained organisations/workspaces are preserved. |
| Subscription boundary | Personal association is held outside editable metadata. An associated purchaser must remain a current owner and have an active subscription with a future paid-through date. Transfer does not move a personal subscription; Phase 1 exposes no paid generation. |
| User journey | `/organisations`; `/o/:organisationSlug/settings`; `/o/:organisationSlug/w/:workspaceSlug`; `/invite/:invitationId`; header workspace selector; account navigation; personal onboarding; creation; workspace access/role changes; invitation acceptance/status/retry/resend/cancel; ownership transfer and leaving. Every load and action checks the session and explicit route context. |
| Database | Read-only inspection commands; serialised migration runner; checksum drift checks; per-file transactions and durable failure-attempt records. Actual installed Better Auth schema and Montsel backfill proved on isolated PostgreSQL before applying locally. |
| Future surfaces | Explicit-policy file and job-publication contracts are exercised with representative fixtures. No unreviewed action was added to the Phase 1 matrix. Actual future storage, export and generation integrations require their own enforcement tests. |

The pre-existing removal of the unwanted application MCP/OAuth-provider runtime was preserved. Developer MCP connectors and social sign-in remain separate concerns.

## Database evidence

Installed Better Auth: **1.7.12**. Isolated PostgreSQL: **17.9**. The verifier applies the real installed plugin migration plan before Montsel migrations. First/repeat runs, checksum drift, concurrent runners, read-only inspection on a fresh database, backfill reconciliation and identity-retention behaviour were checked. See `../database/montsel-phase1-validation.md` and `scripts/database/phase1-verify.ts`.

The configured local app database was snapshotted to `/tmp/montsel-before-tenancy-2026-10-23.dump` with owner-only filesystem permissions; the archive listing was verified before mutation. Better Auth added `organization`, `member`, `invitation` and `session.activeOrganizationId`; its migration plan reported no unsafe changes. Montsel migrations 0001/0002 applied successfully and status/checksum checks passed. Backfill reconciled **2 personal links, 2 workspaces, 2 active assignments and 0 unmapped users**. This is local app evidence, not evidence about a deployed database.

Applied migration files are immutable. Subsequent schema fixes must use a new numbered migration. The temporary backup is a pre-change recovery artefact, not a long-term backup-retention guarantee; move it into the approved protected backup process as appropriate.

## Verification

- Full server regression suite, static Svelte/TypeScript checks, production build, and Svelte autofixer checks.
- Native Better Auth HTTP and direct-server API tests cover admin invitation escalation and lifecycle bypass attempts.
- Isolated PostgreSQL integration tests cover negative tenant access, assignment expiry and membership revocation, atomic invitation grants/rollback, capacity/backoff, due retries, abandoned acceptance hooks, concurrent ownership changes and workspace limits.
- Route tests cover feature gating, authenticated actor binding, explicit slug-derived context, wrong-organisation denial, two-tab isolation and recovery headers.
- Styled Chromium screen/switcher checks cover creation/settings, viewer/admin visibility, invitation actions and navigation. Representative desktop/mobile views were inspected; this does not establish a live email acceptance journey in production.
- File/job contracts use explicit fixture policies and fake provider callbacks. They establish orchestration requirements, not a deployed file URL's lifetime or a future queue's safety.

Final server run: **86 files passed, 1 integration file skipped; 728 tests passed and 20 skipped**. The 20 skips include the eight PostgreSQL tests, which were executed separately and passed **8/8** on the isolated database; the other twelve are existing skips. The full Chromium browser regression suite passed **54/54**, including **6/6** new screen/switcher checks. Svelte/TypeScript reported **0 errors and 0 warnings**. The production build passed. The browser assertions passed and the process returned success, although Vite emitted a teardown warning about a server remaining open; this is recorded separately from the assertions.

An earlier Svelte autofixer pass reported no issues or suggestions. Automatic approval review rejected the final repeat because it can export project source to an external documentation service. No workaround was used; final validation used the local compiler and tests instead.

## Remaining release conditions

1. **Deployed connection path (specification C.6):** confirm which database the deployed app and Directus instance use. The Directus connector inventory now includes the tenancy table names, providing evidence of schema visibility through that connection. Reading its migration ledger was denied by the connector permissions, so this is not an exact database/ledger identity proof. Choose Hyperdrive or document direct-TCP isolate concurrency, pool sizing and PostgreSQL connection capacity. Test transaction and advisory-lock behaviour through that actual path. The existing pool maximum is 20; isolated localhost tests do not establish its suitability for Workers deployment.
2. **Recovery scheduling:** deploy/configure the protected recovery job and private secret; verify failed acceptance recovers on a later scheduled run. See `../database/montsel-provisioning-recovery.md`. No external recurring job was created here.
3. **Email/deployed journey:** verify live delivery, sign-in redirect, email verification, acceptance, recovery and cross-tab revocation against the intended release environment. No real invitation emails were sent by the tests.
4. **Retention and closure policy:** current behaviour archives workspace access, retains organisation/workspace/audit records, and nulls removed actor references. Final purge timing, backup-retention horizons and a reviewed organisation-closure path are not invented by this implementation. A sole owner currently needs a verified successor before account deletion. Resolve the specification §11.1 policy before release.
5. **Real later-phase integrations:** future storage/signing, upload completion, downloads, exports, application grants and generation workers must repeat the relevant fixture contracts with actual adapters before being enabled.

The tests address the audited Phase 1 code defects, but the operational conditions above still prevent claiming the full deployment gate has passed. Keep tenancy disabled until they are recorded and verified.


## Local UI review enabled

Following the user's explicit request to display the UI, `AUTH_ORGANIZATION_PLUGIN=true` was set in the local `.env`. The existing development server reloaded the setting. `/organisations` now reaches the authenticated journey (redirecting signed-out visitors to sign-in with that destination preserved). The account area displays its Organisations & workspaces link for signed-in users. No production configuration or deployment was changed; the release conditions above remain outstanding.
