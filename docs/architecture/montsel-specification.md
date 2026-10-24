# Montsel — Multi-Organisation and Multi-Brand Implementation Specification

**Version:** 1.2  
**Date:** 23 October 2026  
**Status:** Agreed architectural direction; incorporates the v1.1 coherence and stress review's ranked revisions (S1–S6). Implementation and release checks remain outstanding.  
**Scope:** Identity, organisations, brands, permissions, invitations, strategic provenance and connected applications.

This is the authoritative specification for this work. It replaces Specification v0.1 and incorporates the subsequent review, the agreed revisions, and the ranked revisions from the v1.1 coherence and stress review (`montsel-specification-stress-test.md`). Where an earlier proposal or review note conflicts with this document, this document takes precedence. Existing capabilities described below are an implementation baseline, not evidence that the proposed capabilities have already been delivered.

## 1. Purpose and architectural authority

Montsel allows one person to sign in once and work across multiple organisations and authorised brands. Each brand contains its own foundation, diagnostics, strategies, plans, campaigns, content and assets. Applications reuse the approved information belonging to that brand.

The design supports individuals, businesses and agencies without assuming every customer is an agency.

**Better Auth manages identity and organisation membership. Montsel remains the authority for brand access and business data.**

| Concern | Authority | Implementation responsibility |
| --- | --- | --- |
| Identity, authentication and sessions | Better Auth | Supported server and client authentication mechanisms. |
| Organisation membership, organisation roles and organisation invitations | Better Auth organisation plugin | Configure and verify the installed plugin; apply Montsel's lifecycle rules through supported server integration points. |
| Global platform administration | Existing authentication service | Keep global user administration separate from organisation and brand permissions. |
| Brands, assignments and brand permissions | Montsel | Server-side authorisation, scoped repositories and domain constraints. |
| Invitation provisioning into brands | Montsel | Bind organisation invitations to intended brand assignments and recover provisioning failures. |
| Brand foundation records, approvals and source lineage | Montsel | Domain tables, immutable versions and generation provenance. |
| Connected application grants | Montsel | Explicit brand and action scope, checked alongside current membership. |
| Organisation commercial policy | Montsel | Billing ownership, subscription association, entitlements and usage accounting. |
| Directus | Defined integration boundary | Initially an identity/profile mirror. Any brand content access must enforce Montsel's permissions. |

Better Auth's organisation plugin does not supply Montsel brand isolation. Its active organisation is not an authority for brand access.

## 2. Core rules

1. **Deny access by default.** Every brand operation validates the authenticated principal, current organisation membership, brand assignment and required action permission. Applicable entitlements and resource status must also permit the operation.
2. **Enforce the same boundary everywhere.** The rule applies to page loaders, APIs, mutations, search, exports, files, background jobs, notifications and integrations. The named enforcement mechanism is the context-required repository rule (§6.3), backed by a CI/test convention that fails brand-scoped queries constructed without a validated operation context. UI visibility reflects permissions; server-side checks enforce them.
3. **Make invitation acceptance recoverable.** Commit organisation membership and brand assignment atomically where the supported integration shares a PostgreSQL transaction. Otherwise use idempotent provisioning, a pending state and reliable retries. Incomplete provisioning must not activate brand access.
4. **Keep context immutable within an operation.** A validated route establishes the brand for an interactive request. Jobs and integrations carry an explicitly authorised brand ID. A user's preference never overrides either.
5. **Keep brand data separate.** Each brand belongs to one organisation. Records and their relationships must remain within that brand unless a separately authorised sharing operation explicitly creates destination-owned records.
6. **Preserve approved source versions.** Outputs retain the exact inputs used. Publishing a new source version does not silently rewrite downstream work.
7. **Treat revocation as a lifecycle event.** Removing organisation membership immediately invalidates brand access through Montsel, even if assignment rows, sessions or cached UI state still exist.
8. **Record consequential actions.** Membership, permissions, overrides, approvals, exports, application grants and deletion are auditable without recording credentials or tokens.

## 3. Terminology and hierarchy

```text
User — one identity
  Organisation A — membership and commercial boundary
    Brand A — data and permission boundary
    Brand B — data and permission boundary
  Organisation B
    Brand C — data and permission boundary
```

- **User:** An authenticated person who may belong to multiple organisations.
- **Organisation:** The administrative boundary for membership, invitations, policies and eventual organisation billing.
- **Brand:** A brand-specific container owned by exactly one organisation, with independent assignments and content permissions.
- **Application/module:** A capability operating on a brand, such as Foundation, Diagnostic, Strategy or Campaigns.
- **Team:** An optional group of people within an organisation. A team is not a brand and confers no brand rights unless an explicit, later policy grants them.
- **Brand foundation:** The approved, versioned source of strategic direction within a brand.
- **Platform administrator:** An operator of the authentication service. This global role does not automatically grant access to Montsel brand content.

One organisation can own several brands. Client-owned organisations remain separate memberships. Cross-organisation brand transfers are outside the initial release.

## 4. Current implementation baseline and migration responsibility

The existing application already uses Better Auth, PostgreSQL, global user roles, per-user Creem subscriptions, Directus profile synchronisation and account security history. It does not currently configure Better Auth organisations or Montsel brand membership.

The runtime uses a direct PostgreSQL pool. Drizzle is not currently installed. PostgreSQL remains the database; before tenancy migrations are implemented, engineering must record whether Montsel domain migrations use Drizzle or a versioned SQL migration runner. Introducing Drizzle is a deliberate implementation choice, not an existing capability or a requirement to rewrite Better Auth's adapter.

Phase 1 must provide one documented deployment sequence covering:

1. The installed Better Auth organisation plugin's required schema and session fields.
2. Montsel's brand, membership, provisioning and authorisation schema.
3. Backfill and reconciliation of existing users, records and subscription associations.
4. Constraints, indexes and verification queries.
5. A recovery procedure for interrupted migrations and a rollback or forward-repair strategy.

Do not use request-time schema creation for core tenancy tables. Better Auth and Montsel migrations must have defined owners and compatible ordering. Avoid changing plugin-managed tables outside supported extensions and controlled migrations.

Existing data must be assigned to a documented organisation and brand before brand-scoped endpoints expose it. Unmapped data is quarantined from normal tenant queries; it must not become globally visible as a fallback.

## 5. Data model and invariants

Better Auth owns its organisation, member and invitation models. Verify names, fields, constraints and extension points against the installed version before writing integration code.

Montsel owns the following domain model:

| Entity | Required identity and scope | Purpose |
| --- | --- | --- |
| `brand` | `id`, `organisation_id`, `name`, `slug`, `created_by`, `status`, timestamps | Brand; slug unique within its organisation. |
| `brand_member` | `brand_id`, `user_id`, `role`, `status`, optional `expires_at`, grant source, granting actor, optional provisioning reference, timestamps | Explicit brand assignment; unique brand/user pair. Only active, unexpired assignments can grant access. Retain grant reasons and changes in the audit trail. |
| `user_brand_preference` | `user_id`, `last_organisation_id`, `last_brand_id` | Landing-page preference only. |
| `invitation_provisioning` | `id`, organisation invitation reference, `organisation_id`, intended recipient, state, idempotency key, attempts, timestamps | Durable provisioning and cancellation lifecycle. |
| `invitation_brand_grant` | provisioning reference, `brand_id`, intended brand role | Assignments authorised by the inviter and revalidated before activation. |
| `brand_foundation` | `id`, unique `brand_id`, name, metadata | One foundation record per brand initially; avoids circular brand/foundation ownership references. |
| `foundation` | `id`, `brand_id`, lifecycle status, approved-version reference | Stable foundation identity and current approved pointer. |
| `foundation_version` | `id`, `brand_id`, foundation reference, version number, content, approval metadata | Immutable source snapshot; drafts do not mutate approved versions. |
| `diagnostic` | `id`, `brand_id`, optional source-version reference, status, result | Diagnostic inputs and results, including work preceding foundation approval. |
| `strategy` | `id`, `brand_id`, lifecycle status, approved-version reference | Stable strategy identity. |
| `strategy_version` | `id`, `brand_id`, strategy reference, foundation-version reference, version number, content, approval metadata | Immutable strategy snapshot with its exact foundation source. |
| `plan` | `id`, `brand_id`, source strategy-version reference, status | Operational work tied to the strategy version used. |
| `campaign` | `id`, `brand_id`, optional source plan reference and immutable source snapshot/version reference, status | Campaign with a recoverable input history. |
| `content_item` | `id`, `brand_id`, optional campaign reference, status, content | Content and drafts with retained source references. |
| `asset` | `id`, `brand_id`, optional campaign/content references, storage key, metadata | Brand-owned files and generated assets. |
| `generation_run` | `id`, `brand_id`, initiating principal, module, immutable source manifest, provider/model identifiers, configuration references, status, timestamps | Generation inputs, execution and publication history. |
| `audit_event` | `id`, `organisation_id`, optional `brand_id`, actor reference, action, resource reference, outcome, timestamp, safe metadata | Organisation or brand events with explicit read permissions. |
| `application_grant` | `id`, principal/client reference, `organisation_id`, `brand_id`, allowed actions, status, expiry/revocation metadata | Bounded external application access, introduced in Phase 3. |

Additional invariants:

- All brand-owned records, including jobs, embeddings, exports and generated artefacts, contain `brand_id`.
- Require matching brand IDs in relational foreign keys wherever supported. Use appropriate composite unique keys to support these constraints. A valid resource ID alone is insufficient.
- An audit event with a brand must reference a brand in the same organisation. A null brand is permitted only for genuinely organisation-level events.
- A brand assignment cannot authorise a user without active membership of that brand's organisation. Validate both on every protected operation, regardless of retained rows.
- Approved-version pointers must reference an approved version belonging to the same document and brand. Publishing and pointer updates require a transaction and concurrency checks.
- Generated outputs reference their generation run. Multi-output runs require explicit output associations; do not rely on a free-text output ID.
- Mutable source documents used downstream require an immutable source snapshot or version reference. A mutable parent ID alone does not establish lineage.
- Deleting a user must not cascade-delete owned brand content or provenance. Actor references follow the documented retention/anonymisation policy.
- Organisation or brand deletion must not silently cascade through business content.

## 6. Roles and permission resolution

### 6.1 Separate permission layers

Global platform roles remain in the authentication service's existing user-role model. Organisation roles belong to organisation membership. Brand roles belong to `brand_member`. These are independent subjects of authorisation; none should be inferred from a similarly named role in another layer.

| Organisation role | Administrative scope | Brand content access |
| --- | --- | --- |
| Owner | Ownership, billing authority, organisation policies, membership and oversight of brand administration. | Requires an active brand assignment. May establish an explicit, audited administrative grant under the rules below. |
| Admin | Organisation invitations and member administration within delegated limits, brand creation and brand metadata administration. Cannot transfer ownership or grant organisation owner/admin status. Default plugin permissions are broader; the restriction is enforced through custom access-control statements or a member-role hook (Appendix B). | Requires an active brand assignment. Organisation administration does not itself permit reading content or granting oneself content access. |
| Member | Access to their own membership and assigned brands. | Only the permissions of an active brand assignment. |

An organisation owner may grant brand access to themselves or another active organisation member through an explicit administrative operation. Record actor, target, brand, previous and new role, and reason. This creates a normal assignment; it is not a hidden bypass around the content access service. Temporary grants must expire, and subsequent requests must respect expiry.

Platform support access to tenant content is disabled by default. Any future support-access mechanism needs its own authorised, time-bounded and audited grant.

### 6.2 Brand roles

| Brand role | Permitted scope |
| --- | --- |
| Brand admin | Brand settings and assignments, content operations and explicit approval permissions. Cannot modify organisation roles or ownership. |
| Editor | Read, create and edit brand content and generate permitted outputs. No strategic approval, permission administration or unrestricted publication by default. |
| Contributor | Read permitted context and create or edit assigned drafts. No strategic approval, membership administration or unrestricted publication. |
| Viewer | Read permitted content. Exports, downloads and access to sensitive metadata are separately granted actions. |

Maintain a versioned action-permission matrix in code. Include `brand:read`, `brand:update`, `brand_members:manage`, `foundation:edit`, `foundation:approve`, `strategy:edit`, `strategy:approve`, `generation:run`, `content:publish`, `asset:download`, `export:create` and `audit:read` as the relevant capabilities arrive. The initial matrix for the Phase 1 action set — at minimum `brand:read`, `brand:update`, `brand_members:manage` and `audit:read` — is recorded in Appendix A with the same review status as the schema. Implementation must not ship a matrix that differs from the reviewed appendix without a reviewed revision.

Editing, approval, publication and export are separate permissions. A member cannot grant a role or action they lack authority to administer. Organisation owner/admin promotion uses an owner-authorised flow; it must not be smuggled into an ordinary brand invitation.

### 6.3 Shared authorisation service

Implement a server-owned `requireBrandAccess(principal, brandId, action)` service. It resolves and validates:

1. The authenticated user or explicitly authorised delegated principal.
2. The brand's organisation and active resource status.
3. Current organisation membership.
4. Current active, unexpired brand assignment and effective action permission.
5. Application-grant scope where applicable, plus required entitlement and quota.

Return a validated operation context carrying stable user/principal, organisation and brand IDs. Repositories and downstream services use that context. They must not substitute a brand preference or trust a client-supplied role. This is the named enforcement mechanism for §2 rule 2: all brand-scoped data access goes through context-required repositories, and no endpoint, job or integration constructs tenant queries directly. A CI/test convention fails any brand-scoped repository call that lacks a validated operation context.

Cross-tenant resource responses must not disclose resource existence or private metadata. Define consistent denial responses and test them. Checking a button in the browser never replaces this service.

### 6.4 Permission-resolution execution design

**Decision: never-cache in Phase 1.** `requireBrandAccess` resolves organisation membership, brand assignment and action permission from the database on every protected operation. No membership, assignment, permission or entitlement decision is cached across requests in Phase 1. The accepted cost is a small number of indexed lookups per protected operation (brand → organisation, organisation membership, brand assignment, plus entitlement resolution under §11.2). This accepts measurable latency in exchange for revocation immediacy (§2 rule 7) and removes the cache-invalidation failure mode, which is where multi-tenant boundaries historically erode. The codebase has already made this trade-off once: Better Auth `secondaryStorage` is disabled so profile changes reflect immediately. If measurements later demand caching, it may be introduced only with invalidation tied to the membership, assignment and grant-change events already recorded in the audit trail, plus a stale-cache revocation negative test added to the §13.1 gate suite.

**Membership-check mechanism: direct read through a version-pinned adapter.** Montsel reads Better Auth's organisation membership tables directly, through a single adapter module that owns all knowledge of the plugin's table and field names. §14 step 1 confirms the installed plugin's actual schema before the adapter is written; a schema-drift check fails the build if the plugin's organisation schema changes. Calling the Better Auth server API on every protected operation is rejected: it couples the latency and availability of every protected operation to the auth service's HTTP surface and adds a network failure mode to the hot path. The consequence of direct reading is deliberate version coupling, localised to the adapter: upgrading the Better Auth organisation plugin requires re-verifying the adapter and repeating the isolation tests, recorded in each release's evidence (§13.1).

Resolution failures deny access (fail closed); they never fail open or fall back to a degraded allow.

## 7. Invitations, onboarding and membership lifecycle

Phase 1 delivers a complete organisation-to-brand invitation flow. Brand-only guests are deferred; initial collaborators must become organisation members before brand access activates.

Each invitation flow records the intended recipient, organisation, intended brand roles, inviter and provisioning identity. Inviter authority is checked at creation and again before assignments activate. Brand IDs must belong to the invited organisation.

Recipient acceptance requires an authenticated, verified email matching the invited recipient. Expired, cancelled, replaced or already-consumed invitations cannot create fresh grants. Handle existing users, existing organisation members and duplicate acceptance explicitly.

Use the installed Better Auth plugin's supported invitation mechanisms. Enable and test recipient email verification explicitly; do not assume the plugin's defaults meet this specification.

### 7.1 Atomic or recoverable provisioning

Where organisation membership and Montsel assignments can participate in the same supported PostgreSQL transaction, commit the complete result atomically. An after-hook alone is not evidence that operations share a transaction. Confirmed against `better-auth@1.7.12` (Appendix B): plugin hooks never share a transaction with membership writes, so the durable state machine path is mandatory for this integration.

Otherwise use a durable state machine:

```text
pending acceptance -> provisioning -> active
                           |
                           +-> retry pending -> provisioning
                           +-> cancelled / expired / permanently failed
```

Persist the provisioning record before delivery and link it to the organisation invitation. Use unique idempotency keys and brand/user uniqueness constraints. Brand assignments remain pending until the complete intended grant set is validated and ready to activate. Activate the complete Montsel assignment set and its provisioning state in one domain-database transaction, or gate every assignment on one atomically activated provisioning record. Existing, independently authorised access is not revoked merely because an additional invitation is pending.

Retries must check invitation validity, current organisation membership, current inviter authority and cancellation/revocation state. A stale retry must never recreate access after removal. Re-invitation creates a new authorised lifecycle rather than reviving a cancelled job.

Users must see whether an invitation is awaiting acceptance, provisioning, active or failed. Failed provisioning must have a bounded retry policy, operational visibility and an authorised recovery action. Email delivery uses a durable outbox or an equivalent retry mechanism and must not activate access by itself.

Organisation membership alone does not expose brand content. Do not describe successful organisation acceptance as completed brand provisioning until assignments are active.

### 7.2 Onboarding and removal

- A self-registering user who needs their own brand can create a personal organisation through an idempotent onboarding operation.
- A user arriving through an invitation completes that invitation first. Do not automatically create a paid organisation or duplicate personal brand merely because they accepted an invitation.
- Organisation owners can create multiple brands subject to configured limits. Brand creators receive an explicit initial assignment, not an inferred perpetual bypass.
- Removing organisation membership immediately removes effective access to all of its brands through Montsel. Clean up or deactivate assignment rows and pending grants without relying on that cleanup for denial.
- Removing one brand assignment leaves unrelated brand memberships intact.
- Membership, role changes, provisioning, cancellation and revocation are audited. Concurrent changes must not remove the last owner or exceed configured limits.

### 7.3 Transitional experience for existing users and degraded access states

**Backfilled personal organisations.** Every existing user at migration time receives a personal organisation through the documented backfill (§4), created idempotently against the user ID and never at request time. The user is its owner. Existing records assigned during backfill live in a default brand within that organisation, and the user receives an explicit brand-admin assignment; backfill creates no access beyond that recorded assignment. The organisation is named by a deterministic, collision-safe convention derived from the user's name or email and is presented as a personal organisation.

**First-login presentation.** An existing user signs in to find their previous content under their personal organisation and default brand. No organisation billing controls are exposed (§11.2), and the transitional entitlement policy applies to the personal organisation.

**Later invitations.** Accepting an invitation adds a membership; it never merges, renames, transfers or deletes the personal organisation. §7.2's rule against auto-creating paid organisations or duplicate brands extends to the backfilled population: an invited existing user keeps their personal organisation and gains the invited organisation alongside it.

**Degraded access states.** When membership is removed or an assignment expires while a session is active:

- The organisation and its brands disappear from the switcher at the next context resolution; retained UI state must not keep them listed.
- Deep links resolve to a neutral no-access state consistent with §6.3: the response must not distinguish "removed" from "never existed".
- In-flight requests, optimistic updates and results belonging to that brand are dropped, not rendered. Jobs keep their brand binding, and their results become invisible in the removed context (§8).
- Unsaved-work handling follows §8's switching rules.
- Revocation is not a switch: the next protected operation in any open tab fails closed, and no tab continues operating on stale context.

## 8. Brand routing, switching and operation context

Interactive routes use explicit organisation and brand context, for example:

```text
/o/:organisationSlug/:brandSlug/strategy
```

Resolve slugs server-side to stable IDs. Verify that the brand belongs to the organisation in the route, then authorise the requested action. Slugs are display/routing identifiers, not permission evidence.

The route is authoritative for interactive requests. Persisted preference selects a landing page only. Better Auth's active organisation may support organisation management UI, but mutable session state must not override an explicitly routed brand.

Display organisation and brand names in the global header. Switching must:

- Resolve the destination against current permissions.
- Warn about unsaved changes.
- Separate caches, forms, search results, subscriptions and optimistic updates by brand.
- Abort or ignore outdated responses so Brand A results cannot populate Brand B's UI.
- Preserve jobs against their original brand and show their results only in the appropriate authorised context.

Different browser tabs may work in different brands concurrently. A switch in one tab must not retarget requests, drafts or generation in another.

Background jobs capture an immutable brand ID, initiating user and any delegation grant. Recheck relevant permission and entitlement before execution and again before publication. Revoked jobs must not publish through stale authority. Narrowly scoped system jobs use an explicit service principal and policy rather than impersonating an arbitrary user.

## 9. Strategic inheritance, approvals and provenance

```text
Approved Foundation version
           -> Approved Strategy version
           -> Plan source snapshot/version
           -> Campaign source snapshot/version
           -> Content and Assets
```

This is the principal derivation path. Diagnostics may precede foundation approval. Standalone content is permitted only where the product explicitly supports it and its provenance identifies the absence of an authoritative parent.

- Approved foundation and strategy versions are immutable. Changes create new versions.
- Approval is a separate authorised action. Store approver, timestamp and source relationships; use concurrency checks to prevent lost approvals or pointer updates.
- Draft exploration must be explicitly requested and clearly labelled. Draft inputs cannot silently become approved context.
- Define the source-manifest schema before enabling generation. Record brand, source record IDs, immutable version/snapshot IDs, retrieved source references, approval state at execution, prompt/template/configuration versions and available provider/model identifiers.
- An output references the run that created it. The run preserves input and publication outcomes, including cancellation and revocation.
- Record the information needed to explain and investigate an output. Do not promise deterministic reproduction of AI output.
- New approved source versions mark affected downstream work for review; they do not rewrite it automatically. Track dependencies through exact versions and snapshots.
- Retrieval applies authorised brand filtering before returning documents or vector matches to the generation process.
- `getApprovedBrandContext(context)` accepts a validated operation context and returns only the requested brand's authorised approved inputs. A brand ID by itself is insufficient authority.

Shared libraries and cross-brand copying remain deferred. When introduced, they require explicit sharing permission and destination-owned records, with safe provenance that does not grant access to restricted source content.

## 10. Files, APIs and connected applications

Browser pages, first-party modules and external applications use the same brand authorisation boundary.

**Scope clarification — 23 October 2026:** Montsel does not provide an MCP server or act as an OAuth authorisation server for third-party clients. The previously imported MCP/OAuth provider implementation was unwanted and has been removed from the application code. Social sign-in through Google/GitHub remains part of identity authentication. Developer connectors, including Directus Auth MCP, are separate tooling and do not add application capabilities.

| Caller | Required brand context | Additional checks |
| --- | --- | --- |
| Interactive page/API | Validated route or explicit request scope | Current session, organisation membership, assignment and action permission. |
| Background generation | Immutable job context | Current authority at execution and publication; entitlement and quota. |
| External application | Explicit brand ID bound to an authorised grant | Valid token audience/client/scope, current grant, membership and assignment; intersect granted actions with current permissions. |
| Internal service | Explicit service-principal scope | Service policy limited to the intended operation and brand. |

Authentication identifies a caller. It does not authorise every brand that caller can potentially access. Connected applications cannot inherit a user's preferred or newly selected brand. Multi-brand application access requires explicit, individually authorised grants.

Specify grant creation, consent, expiry, revocation and audit behaviour before exposing connected application APIs. No MCP/OAuth provider layer is required for the tenancy implementation; any future external authorisation mechanism needs a separate explicit design decision.

Scope object storage paths, upload completion, downloads, caches, search/vector indexes, notifications, exports and queues by brand. Validate resource ownership before issuing file access and again when accepting uploaded content into a brand.

Before launch, record the maximum residual access permitted for already-issued download URLs and in-flight operations. Use an authorising proxy or suitably bounded URL lifetime where immediate application revocation cannot invalidate an issued URL. Do not claim instant revocation across every external storage mechanism without proving it.

### 10.1 Directus boundary

Keep identity/profile synchronisation separate from tenant permission authority. A single Directus user role must not stand in for multiple organisation or brand memberships.

If Directus stores or serves brand content, all access must follow a reviewed arrangement: server-side Montsel checks with appropriately restricted service access, or equivalent Directus policies that enforce the same brand rules. Direct client access, file URLs, flows and privileged service tokens must not create a route around Montsel authorisation. Test revocation across both systems before exposing that integration.

## 11. Ownership, deletion, retention and commercial policy

### 11.1 Ownership and deletion

Account, organisation and brand deletion are distinct operations.

- A person cannot leave or delete their account while they are the last owner of a retained organisation. Transfer ownership to an eligible, active, verified member first, or complete an explicitly authorised organisation-closure process.
- Apply the same lifecycle checks to self-deletion, administrative user removal and external provisioning paths.
- Ownership transfer requires an authenticated owner-authorised operation, appropriate recent verification, confirmation and audit. Concurrent transfers/removals cannot leave an organisation without an owner.
- Removing a person does not remove the organisation's content, subscription or other members' access. Cancel their pending grants and invalidate their effective authorisation.
- Brand and organisation closure initially archive/restrict resources under a defined retention policy. Disallow physical organisation deletion through unguarded Better Auth endpoints while Montsel-owned work remains.
- State accurately which authentication, business, billing, audit and connected-service records are removed, retained or anonymised. Use controlled cleanup and retryable external operations; do not claim complete erasure from an identity deletion alone.

Before Phase 1 deployment, document retention, export, author attribution, backup handling and final purge policies, including what deletion means for approved source history. Do not invent retention guarantees or silently cascade-delete business work.

### 11.2 Billing ownership and migration

Organisation billing launches in Phase 5, but its ownership and migration rules are mandatory Phase 1 decisions.

Record the billing authority, customer/subscription mapping, purchaser succession, existing subscription disposition, entitlement scope and recovery procedure. Specify whether a legacy subscription remains personal or benefits one named organisation; never implicitly replicate one subscription's benefits across every organisation its purchaser joins.

The current account deletion/export queries use user IDs for subscription references. Update their mapping and policy before changing billing ownership. A new organisation-owned subscription must not become invisible to closure checks, and deleting an original purchaser must not strand billing management.

Until organisation billing launches, preserve existing subscription obligations, apply a documented transitional entitlement policy and expose no misleading organisation billing controls. Configured brand/member limits must be enforced server-side, including concurrent invitation acceptance. Record generation usage against its organisation and brand from the first generation release, even before commercial metering launches.

## 12. Audit, observability and data access

Distinguish:

1. **Account security history:** Authentication events and personal account changes.
2. **Organisation audit:** Membership, invitations, ownership, billing authority and organisation administration.
3. **Brand audit and provenance:** Assignments, approvals, exports, generation, publication and content lifecycle.

Readers require the appropriate organisation or brand audit permission. Ordinary organisation membership must not expose events from unassigned brands. An owner using an administrative grant follows the same explicit assignment policy as content access.

Record actor/delegated principal, organisation/brand, target resource, action, outcome and safe context. Permission changes retain previous/new values and relevant reasons. Never record credentials, session/access tokens, recovery codes or unrestricted request bodies.

The existing 90-day authentication history is not the retention policy for approved strategic lineage. Define separate retention for domain audit and provenance before storing authoritative approvals. Historical input evidence must not disappear merely because a security-history cleanup runs.

Provisioning failures, denied access, migration reconciliation and cancelled publication require operational visibility without leaking private tenant data into shared dashboards or logs.

## 13. Implementation sequence and deployment gates

| Phase | Scope | Release requirement |
| --- | --- | --- |
| **1 — Tenancy foundation** | Organisations, invitations, brand membership, roles, switching, ownership and deletion safeguards; migration and transitional billing decisions. | Complete isolation and lifecycle tests. |
| **2 — Strategic foundation** | Brand foundation, immutable foundation/strategy versions, approvals, source references and generation provenance. | Traceable Foundation → Strategy workflow with approved, brand-scoped inputs. |
| **3 — Connected applications** | Plans, campaigns, content, assets, integrations and authorised application APIs. | Scoped access and provenance across modules and application grants. |
| **4 — Extended collaboration** | Teams, guest access, shared libraries and advanced approval workflows. | Explicit sharing and delegation policies with negative isolation tests. |
| **5 — Commercial operations** | Organisation billing, subscription migration, commercial entitlement controls and administration. | Verified billing ownership, migration, webhook association and reconciliation. |

Basic foundation/strategy approval permissions belong in Phase 2. Phase 4 extends them with more complex collaboration; it does not introduce the first approval safeguards.

### 13.1 Phase 1 is a strict deployment gate

Do not deploy the tenancy release until automated tests pass for cross-brand access, revoked memberships, invitations, ownership transfer, file access and background-job publication.

Phase 1 must establish and test the common file-authorisation and job-publication contracts using representative fixtures, even if the complete asset and generation UI arrives later. Every real integration must repeat those tests against its actual implementation before being enabled. Test fixtures do not establish that a future storage provider or job worker is already safe.

The gate includes:

- Cross-organisation and cross-brand denial for list, read, write, search, export and file operations.
- Organisation removal while sessions remain active, including retained assignment rows.
- Brand role reduction, application-grant revocation and access removal before job publication.
- Two tabs operating on different brands, including delayed responses and switching.
- Expired, cancelled, duplicate and wrong-recipient invitations; verified email matching.
- Provisioning failure after organisation acceptance; retry, cancellation and recovery without partial brand access.
- Concurrent acceptance, assignment and ownership operations; no last-owner loss or limit bypass.
- Account deletion and administrator removal with owned organisations, retained work and legacy billing obligations.
- File URL issuance, upload completion and the documented residual-access bound.
- Organisational metadata and audit visibility, including ordinary members with no brand assignment.
- Platform administrator, organisation administrator and brand administrator privilege separation.
- Existing-user/data backfill, failure recovery and default-deny behaviour for unmapped records.

Record the test evidence, exact schema/plugin versions and outstanding operational conditions for each release. Broader performance, backup restoration and provider-specific checks are repeated as the affected capability is introduced; tenant isolation is never postponed to a later hardening phase.

### 13.2 Further acceptance scenarios

| Scenario | Expected result |
| --- | --- |
| A user belongs to two organisations and multiple brands. | Only currently authorised brands appear; organisation switching does not grant additional content access. |
| A member assigned to Brand A changes a request to Brand B. | Every protected data surface denies access, including files, search and exports. |
| A user opens Brand A and Brand B in separate tabs. | Requests, drafts, retrieval and outputs retain their original brand context. |
| Organisation membership is removed but a brand assignment remains. | Subsequent Montsel operations fail; stale rows and sessions grant no access. |
| An owner has no brand assignment. | Administrative metadata access follows owner policy; content requires an explicit audited assignment. |
| Invitation provisioning fails midway. | No intended brand access activates; recovery is visible and idempotent. |
| A new foundation version is approved. | Dependent outputs are flagged through retained version references; other brands remain unaffected. |
| Generation starts in A while the user switches the UI to B. | Retrieval and publication remain in A; B never receives A's output through UI state. |
| The initiator loses permission before publication. | Output is not published through revoked authority; the run retains an appropriate outcome. |
| A connected application has access to A only. | Supplying B's ID or changing the user's preference cannot broaden its grant. |
| The original purchaser leaves an organisation. | Billing ownership follows the recorded migration/succession policy; work and subscription management are not stranded. |

## 14. Immediate engineering work and definition of done

Implementation begins with Phase 1, in this order:

1. Confirm the installed Better Auth organisation APIs, schema, invitation verification behaviour and supported transaction/hook integration points. Done: confirmed against `better-auth@1.7.12`; findings and resulting configuration decisions are recorded in Appendix B.
2. Record the repository/service ownership boundary, migration runner and subscription ownership/migration decisions. Inventory the existing Directus surface — what is stored, served and synced, and which credentials or URLs reach it — and confirm the identity/profile-mirror boundary (§10.1) or remediate before tenancy ships; the stress-review appendix's initial inventory is the starting point. Done: recorded in Appendix C (D1–D6), including the Directus boundary confirmation (C.3).
3. Define the permission matrix — Appendix A is the reviewed starting point — and lifecycle state machines, including administrative grants, provisioning, ownership transfer and revocation. Done: state machines recorded in Appendix D.
4. Implement controlled schema migrations and existing-data backfill with default-deny reconciliation, including the transitional personal-organisation experience (§7.3).
5. Implement the brand access service and repositories that require validated operation context, including the CI/test convention of §6.3.
6. Deliver the complete organisation invitation and brand assignment flow, ownership safeguards and account-deletion integration.
7. Build organisation/brand listing, route resolution, switching and safe preferences.
8. Prove the Phase 1 deployment gate before releasing tenancy features. The companion artefacts — the reviewed permission matrix (Appendix A), the recorded decisions from step 2 and a provisioning-recovery runbook — must exist before gate evidence is recorded.
9. Implement Foundation → Strategy as the first connected domain workflow, with immutable versions and provenance, before expanding into campaigns and content.

Phase 1 is complete only when one identity can belong to multiple organisations, create or receive authorised brands, invite collaborators, switch safely, lose access reliably and transfer ownership without exposing another brand's data or stranding retained work. All Phase 1 release gates must have evidence.

Montsel's strategic foundation is complete only when the Foundation → Strategy workflow uses exact approved inputs and exposes their lineage. Later modules must preserve that same authorisation and provenance contract.

This specification approves architectural direction. It does not assert that implementation, migrations, email delivery, security tests or production rollout have already occurred.

## Appendix A — Initial Phase 1 action-permission matrix (proposed)

Proposed initial matrix for the Phase 1 action set (§6.2). It carries the same review status as the schema; shipping a different matrix requires a reviewed revision of this appendix.

| Action | Brand admin | Editor | Contributor | Viewer |
| --- | --- | --- | --- | --- |
| `brand:read` | Yes | Yes | Yes | Yes |
| `brand:update` | Yes | No | No | No |
| `brand_members:manage` | Yes | No | No | No |
| `audit:read` | Yes | No | No | No |

Notes:

- Organisation owners and admins hold no content access without an active brand assignment (§6.1). The audited administrative grant creates a normal assignment — typically brand admin — recorded with actor, target, previous and new role, and reason.
- Platform administrators hold no brand access by default (§6.1).
- Phase 2+ actions (`foundation:edit`, `foundation:approve`, `strategy:edit`, `strategy:approve`, `generation:run`, `content:publish`, `asset:download`, `export:create`) enter this matrix through reviewed revisions as their phases are specified. The `asset:download` and `export:create` contracts are exercised in Phase 1 through representative fixtures (§13.1) even though their UI arrives later.
- `audit:read` at brand scope covers assignment and lifecycle events for that brand only (§12); organisation-level audit reading is governed by organisation membership and §12's visibility rules.

## Appendix B — Better Auth organisation plugin confirmation (§14 step 1)

Verified against the installed `better-auth@1.7.12` (exact match for the `^1.7.12` range) on 23 October 2026, by reading the plugin's shipped source (`dist/plugins/organization/`). This appendix records confirmed facts and the configuration decisions they force.

### B.1 Confirmed schema

| Table | Fields (confirmed) | Notes |
| --- | --- | --- |
| `organization` | `id`, `name`, `slug`, `logo` (nullable), `metadata`, `createdAt` | `slug` is **globally unique** and indexed — personal-organisation naming (§7.3) must satisfy a global constraint, not a per-user one. |
| `member` | `id`, `organizationId` (FK → organization, indexed), `userId` (FK → user, indexed), `role`, `createdAt` | **No status field and no unique `(organizationId, userId)` constraint.** Membership removal is a row delete; duplicates are prevented only at application level. Multiple roles are stored comma-separated in `role`. |
| `invitation` | `id`, `organizationId` (FK, indexed), `email` (indexed), `role`, `status`, `inviterId`, `expiresAt`, `createdAt` | `status` enum is `pending` / `accepted` / `rejected` / `canceled` (single-l spelling). No DB-level uniqueness on pending invitations. |
| `session` | adds `activeOrganizationId` | `activeTeamId` is added only when teams are enabled. |

`team`, `teamMember` and `organizationRole` tables exist only when teams or dynamic access control are enabled. **Both remain disabled in Phase 1** (§3: teams confer no brand rights; §6.1: no dynamic organisation roles in the initial release).

### B.2 Transaction and hook semantics (decisive for §7.1)

The installed Better Auth 1.7.12 acceptance implementation calls `runWithTransaction` for member creation and session changes. The invitation-status update and before/after organisation hooks are outside that block. Montsel's separate PostgreSQL pool operations are not part of that adapter transaction. A plugin transaction therefore does not establish atomic membership and Montsel brand assignment.

Consequences:

- Montsel uses the durable state machine in §7.1; organisation acceptance alone grants no brand access.
- Provisioning persists the verified recipient before activation, validates the entire intended assignment set, and commits all brand assignments and the active provisioning state in one domain transaction.
- Native membership changes, including the pathless server-only `addMember` operation, are guarded. Membership removal and ownership transfer use Montsel's shared organisation lock and transaction; they cannot bypass the last-owner policy through a native endpoint.
- A plugin failure that leaves an accepted invitation without membership cannot manufacture membership through brand provisioning. The owner must create a new authorised invitation lifecycle. Accepted membership with failed brand setup uses bounded retries; already-authorised assignments are preserved.
- `createOrganization` writes the organisation and owner through the plugin; brand setup is a separate recoverable step. A retained organisation whose initial brand setup failed remains visible in organisation settings.

This corrects the earlier blanket statement that the plugin never uses transactions. Actual adapter/connection behaviour must still be verified for the deployment target.

### B.3 Confirmed behaviours and resulting decisions

| # | Confirmed behaviour | Consequence / decision |
| --- | --- | --- |
| 1 | Last-owner safeguards exist in `leaveOrganization` and `removeMember` (`YOU_CANNOT_LEAVE_THE_ORGANIZATION_AS_THE_ONLY_OWNER`). | Satisfies §11.1's intent, but both are count-then-act **without a lock**: concurrent owner removals can race. Montsel's ownership-transfer and removal flows re-validate owner counts under their own transaction rather than relying on the plugin guard alone. |
| 2 | Only owners can set or update the owner role. However the default `admin` role includes `member: [create, update, delete]`, so a default admin **can grant the admin role**. | §6.1's restriction is not met by defaults. Enforce through custom access-control statements restricting `member:update`, or a `beforeUpdateMemberRole` hook; record the chosen mechanism in the step-2 decisions. |
| 3 | Default role permissions: admin = `organization [update]`, `invitation [create, cancel]`, `member [create, update, delete]`; owner adds `organization [delete]`; member = none. | Matches §6.1's owner/admin/member shape except finding 2. |
| 4 | By-ID invitation actions (`accept`/`reject`/`get`) require a verified email **only when invitation IDs are predictable** (serial/false/custom generation). With the default opaque ID generator, a matching session email plus the ID suffices. | §7 requires verified email explicitly: set `requireEmailVerificationOnInvitation: true`. Treat invitation IDs as action-capable secrets; the invitation-list response contains them. |
| 5 | `membershipLimit` is enforced at accept time by count-then-create without a lock. | Concurrent acceptance can exceed the limit. §11.2's server-side limit enforcement (including concurrent acceptance) must be implemented in Montsel provisioning, not delegated to the plugin check. |
| 6 | `disableOrganizationDeletion: true` makes the delete endpoint fail with `ORGANIZATION_DELETION_DISABLED`; `beforeDeleteOrganization`/`afterDeleteOrganization` hooks also exist. | **Set `disableOrganizationDeletion: true`** (§11.1: no physical organisation deletion through unguarded endpoints while Montsel-owned work remains). Closure happens through Montsel's archive/restrict lifecycle. |
| 7 | `allowUserToCreateOrganization` gates creation; `organizationLimit` caps organisations per user; slug uniqueness is check-then-create in code, backed by the global unique index. | Supports §7.2 onboarding and §7.3 backfill. Personal-organisation slugs need a deterministic, globally collision-safe convention. |
| 8 | `activeOrganizationId` is plain session state, set by `setActive`, cleared on leave/delete. | §8 stands unchanged: it may drive organisation-management UI only, never brand authorisation. |
| 9 | Invitation expiry defaults to 48 hours (`invitationExpiresIn`); `cancelPendingInvitationsOnReInvite` defaults to false; re-inviting an existing member cancels the invitation. | Configure the expiry deliberately; map the plugin's re-invite semantics onto §7.1's "new authorised lifecycle" rule in the provisioning layer. |

### B.4 Open items carried into step-2 decisions

1. Admin role-restriction mechanism: custom `ac` statements vs `beforeUpdateMemberRole` hook (B.3 finding 2).
2. Migration runner choice for the plugin's four tables plus Montsel's domain schema (§4) — the plugin's own tables must be created through the supported CLI migration path (`scripts/auth-cli.ts`), not request-time creation.
3. The plugin's partial-failure states (B.2) define the reconciliation cases the provisioning state machine must cover: invitation accepted without member row, member row without active provisioning record.

## Appendix C — Phase 1 decision record (§14 step 2)

Recorded 23 October 2026 against the verified baseline (stress-review appendix, Appendix B). Each decision records context, options considered, the decision, and consequences. Changing a decision requires a reviewed revision of this appendix.

### C.1 D1 — Migration runner for the Montsel domain schema

**Context.** Schema management today uses three mechanisms: the Better Auth CLI instance (`scripts/auth-cli.ts`) for plugin tables, request-time `CREATE TABLE IF NOT EXISTS` for app tables (`auth_history`, security storage), and ad-hoc scripts. §4 prohibits request-time creation for tenancy tables. Plugin-managed tables must be created through the supported CLI path.

**Options.** (a) A versioned SQL migration runner owned by this repository; (b) Drizzle + drizzle-kit; (c) continued ad-hoc scripts.

**Decision: (a).** A small versioned SQL runner: `scripts/database/migrate.ts`, a `schema_migrations` table (version, name, checksum, applied_at), ordered `.sql` files, each file applied inside one transaction via the existing `withTransaction` helper, checksum verification, and fail-loud drift detection.

**Rationale.** Matches the codebase's raw-SQL conventions; adds no dependency; gives exact control over the composite foreign keys and constraints §5 requires; makes the §4 recovery story straightforward — a failed migration is recorded as failed and repaired forward with a new migration, never auto-rolled-back. Drizzle may still be adopted later for query-building; this decision does not foreclose it.

**Consequences.** Ordering is fixed: plugin tables first (`npx auth migrate` via `scripts/auth-cli.ts`), then the Montsel domain migration, which may reference plugin tables but never alters them. Request-time creation remains only for existing non-tenancy app tables, with opportunistic migration into the runner later. CI applies the runner to an ephemeral database and asserts idempotency.

### C.2 D2 — Repository/service ownership boundary (the S2 mechanism)

**Context.** There is no `src/lib/server/` layer; raw pool queries appear in 11 files, almost all under `src/lib/auth/`, plus one route handler (`src/routes/api/checkout/guest/+server.ts`). The existing style is module-level functions.

**Decision.** Brand-scoped data access lives in context-required repository modules under `src/lib/server/brand/`: `context.ts` (the `requireBrandAccess` service and the `OperationContext` type) and `repositories/` per aggregate. Every brand-scoped exported function takes `ctx: OperationContext` as its first parameter. `OperationContext` is brand-marked and constructible only by `requireBrandAccess`, so a repository call without a validated context is a type error. No brand-scoped `pool.query` outside these repositories.

**Rationale.** Converts §2 rule 2 from discipline to structure. Placing the layer under `$lib/server/` additionally uses SvelteKit's own server-only import enforcement — client code cannot import it. Matches the existing module-function style without introducing a framework.

**Enforcement (the CI/test convention).** (i) The TypeScript brand above; (ii) a vitest convention test that fails when `pool.query`/`db.query` appears in `src/routes/**` or outside the repository layer for brand-scoped tables; (iii) the convention is recorded in the project's agent/conventions documentation.

**Consequences.** Existing non-tenancy modules (auth history, security storage, billing) are out of scope until they touch brand data; they migrate into the boundary when they do.

### C.3 D3 — Directus access boundary

**Context.** The verified inventory: the integration is user-level only (`syncUser`/`findUser`, avatar upload/delete, `getAssetUrl`); a generic `fileService` exists but its only caller is avatar upload; Directus asset URLs are embedded in session serialisation and the profile page. The capability surface is broader than current usage.

**Decision.** The identity/profile-mirror boundary (§10.1) is confirmed: Directus stores identity mirrors and user avatars only. No brand or tenant content is stored in, or served through, Directus in Phase 1. The generic `fileService` must not be wired to any brand surface without the §10.1 reviewed arrangement. Asset URLs in session serialisation are acceptable while they reference only user avatars.

**Consequences.** No Directus policy work in Phase 1. The inventory is re-run as a Phase 1 release-checklist item (§14 step 2, S5) to confirm no new Directus surfaces appeared during development. Any future tenant content in Directus is a precondition-gated change, not an incidental one.

### C.4 D4 — Subscription ownership and transitional entitlements

**Context.** `creem_subscription` rows are keyed by `referenceId` = user id; the deletion and export queries use the same mapping (verified verbatim). Organisation billing launches in Phase 5.

**Options.** (a) Legacy subscriptions remain personal (user-scoped) through Phases 1–4; (b) re-map legacy subscriptions to the purchaser's default organisation now.

**Decision: (a).** Transitional entitlement rule: an organisation is entitled if and only if it is a personal organisation whose owner holds an active subscription. Membership in someone else's organisation confers no entitlement from the purchaser's subscription — §11.2's no-implicit-replication rule. Entitlement resolution executes inside `requireBrandAccess` under §6.4's never-cache design. The deletion and export queries keep the user-id mapping, which remains correct under this decision.

**Consequences.** No billing code changes in Phase 1 beyond the entitlement check in the access service. Brand and member limits are enforced server-side in Montsel provisioning (Appendix B, B.3 #5); the transitional limit numbers are recorded before release. Purchaser succession, organisation-subscription mapping and webhook re-association remain Phase 5 work, with §11.2's stranding safeguards attached. No organisation billing UI is exposed.

### C.5 D5 — Organisation admin role restriction

**Context.** The installed plugin's default `admin` role includes `member: [create, update, delete]`, so a default admin can grant the admin role — broader than §6.1 requires (Appendix B, B.3 #2).

**Options.** (a) Custom access-control statements; (b) a `beforeUpdateMemberRole` hook.

**Decision: (a).** Define Montsel's organisation roles with `createAccessControl`, merging `defaultStatements`: admin = `member [create, delete]`, `invitation [create, cancel]`, `organization [update]`; owner = full defaults; member = defaults. Pass the `ac` and roles to both the server and client plugins.

**Rationale.** Structural: the plugin's own permission machinery enforces the restriction on every endpoint, including `updateMemberRole`, with no hook-ordering concerns. Hooks remain reserved for Montsel lifecycle events (audit, provisioning). Delegated limits read as: admins manage ordinary members (invite, remove); every role change to or from admin/owner is owner-only.

**Consequences.** Role promotions admin↔member require an owner and are audited (§12). The client plugin receives the same `ac`/roles so UI gating matches server enforcement.

### C.6 D6 — Database connectivity on Workers (open, with recommendation)

**Context.** Deployment target is Cloudflare Workers (`@sveltejs/adapter-cloudflare`, `nodejs_compat`); the database is a raw `pg` Pool (max 20 per isolate) over TCP; `wrangler.jsonc` contains **no Hyperdrive binding**. §6.4's never-cache decision multiplies per-operation lookups, and §7.1's atomic provisioning depends on transaction semantics over that connection path.

**Status: open.** This is a deployment-sequence obligation (§4), not a blocking architectural decision. Recommendation: adopt a Hyperdrive binding before the Phase 1 release, since connection multiplexing matters once every protected operation performs several indexed lookups. If direct TCP via `nodejs_compat` sockets is kept instead, the deployment sequence must document per-isolate pool sizing against PostgreSQL `max_connections` and the effect of connection behaviour on `withTransaction` hold times.

**Owner and deadline.** Engineering; resolved before Phase 1 gate evidence is recorded (§14 step 8).

## Appendix D — Phase 1 lifecycle state machines (§14 step 3)

Canonical transition definitions for implementation. Every transition writes an audit event (§12). States are stored explicitly; expiry is the one exception — it is evaluated at access time from `expires_at`, never by a background job.

### D.1 Invitation provisioning

```text
pending_acceptance → provisioning → active
                         │
                         ├→ retry_pending → provisioning   (bounded retries)
                         ├→ cancelled / expired
                         └→ permanently_failed
```

| From → To | Guard | Effect |
| --- | --- | --- |
| `pending_acceptance` → `provisioning` | Organisation invitation accepted: invitation `pending`, unexpired, recipient session email matches and is verified (`requireEmailVerificationOnInvitation: true`), inviter authority revalidated | Provisioning record created before delivery (§7.1); idempotency key = invitation ID |
| `provisioning` → `active` | Complete intended assignment set validated (brands belong to the invited organisation; roles within inviter's authority; recipient has active organisation membership) | **One domain transaction:** activate all `brand_member` rows (`pending_provisioning → active`) and the provisioning record. This is the only transition that grants access. |
| `provisioning` → `retry_pending` | Any failure: plugin member row absent (B.2 partial state), assignment insert failure, membership absent | Attempts incremented; failure visible to inviter and recipient (§7.1) |
| `retry_pending` → `provisioning` | Attempts < max AND backoff elapsed AND re-guarded: invitation still valid, membership still active, inviter authority still held, not cancelled | Idempotent re-entry via idempotency key |
| `retry_pending` → `permanently_failed` | Attempts exhausted, or invitation cancelled/expired, or inviter authority lost, or recipient membership removed | Terminal; authorised recovery action creates a **new** invitation lifecycle, never revives this one |
| any (pre-active) → `cancelled` | Invitation cancelled or rejected | Pending assignments deleted or marked cancelled; no access ever granted |
| any (pre-active) → `expired` | `expiresAt` passed before activation | Same as cancelled |

Invariants: a stale retry must never recreate access after removal (guards re-run on every attempt); existing, independently authorised access is unaffected by an unrelated pending invitation (§7.1); organisation acceptance alone never activates brand access.

### D.2 Brand assignment

| State | Meaning |
| --- | --- |
| `pending_provisioning` | Created by an invitation; grants nothing |
| `active` | Grants access per its role, while membership is active and `expires_at` (if set) is in the future |
| `revoked` | Explicitly removed; retained for audit |
| `expired` | Terminal record of an `expires_at` passing; evaluated at access time |

Transitions: `pending_provisioning → active` (only via D.1's activation transaction); `active → revoked` (explicit removal by brand admin, org owner/admin policy, or the D.4 cascade); `active → expired` (derived at access time; the row is marked expired lazily). Re-granting a previously revoked/expired pair **updates** the existing row (unique `brand_id + user_id`) with new grant metadata and writes an audit event with previous and new role — it never inserts a duplicate.

### D.3 Ownership transfer

Preconditions: authenticated owner; recent verification (existing re-auth mechanism); explicit confirmation; target is an active, verified member; target ≠ the only other constraint below.

Execution, in one transaction with a row lock on the organisation's owner members: re-count owners; apply the role change (transferor → requested role, typically admin; target → owner); re-count owners ≥ 1; write audit with actor, target, previous/new roles, reason. Concurrent leave/remove/transfer attempts serialise on the lock; the last-owner guard (§11.1, B.3 #1) is re-checked inside the transaction, not trusted from the plugin's unlocked check.

Blocked paths: leaving or deleting the account while the last owner of a retained organisation; administrator removal of the last owner. Both require ownership transfer or the explicitly authorised organisation-closure process first.

### D.4 Revocation cascade (membership removal)

Trigger: member row deleted (leave, remove, administrator removal, account deletion).

1. **Immediate, by validation:** every subsequent `requireBrandAccess` fails for that user + organisation — membership is read live per §6.4; no cleanup is required for denial.
2. **Follow-up, asynchronous and idempotent (never relied upon for denial):** deactivate that user's `brand_member` rows across the organisation's brands (`active → revoked`); cancel `pending_provisioning` assignments and provisioning records; revoke application grants scoped to the organisation (Phase 3); write audit events.
3. Failed follow-up steps retry with visibility (§7.1); a stale or failed cleanup must not resurrect access.

### D.5 Administrative and managed grants

Two paths create assignments; both are audited with actor, target, brand, previous and new role, and reason:

- **Managed grant** (brand admin, via `brand_members:manage`): grants any brand role to an active organisation member, including brand admin. Cannot grant to a non-member of the organisation.
- **Administrative grant** (organisation owner, per §6.1): grants brand access to themselves or another active organisation member — typically brand admin — through an explicit, audited operation. This creates a normal assignment; it is not a bypass of the access service.

Temporary grants carry `expires_at`; expiry is enforced at access time (§D.2). No actor can grant a role they lack authority to administer (§6.2).

### D.6 Plugin invitation mapping

Plugin invitation statuses (`pending`/`accepted`/`rejected`/`canceled`) map onto D.1. Configuration decisions: `cancelPendingInvitationsOnReInvite: true` — each invitation ID maps to exactly one provisioning lifecycle, so re-invitation cancels the old lifecycle and creates a new one (§7.1's "new authorised lifecycle" rule); `invitationExpiresIn` configured deliberately (default 48h retained unless product decides otherwise). Inviting an existing member cancels the invitation (plugin behaviour) — the provisioning layer treats this as `cancelled`, not a failure.


## Implementation verification record — 23 October 2026

The implementation repair and operational evidence are tracked separately in `montsel-phase1-implementation-2026-10-23.md`. This specification's phase boundaries and action matrix remain authoritative. Current code guards native admin invitations as well as role updates; access-control statements alone did not close that invitation bypass. Native lifecycle mutations are routed through Montsel's locked service. Account deletion requires leaving retained organisations first, including when tenancy is disabled. Historical actor references are nullable and retained business data is not deleted with the identity.

Personal subscription association is held in `personal_organisation_owner`, independent of editable organisation metadata. Entitlement requires that associated user still be a current organisation owner with an active subscription and a future paid-through date. Ownership transfer does not move the former owner's personal subscription to the successor; paid capability remains unavailable until billing responsibility is explicitly resolved. Phase 1 does not expose paid generation.
