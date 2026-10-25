# Trigger → Auth: proposed Strategy integration

Date: 24 October 2026. Status: proposal; no application files moved.

Sequencing update following discussion: first audit Trigger and agree its full production architecture compatible with Auth, then refactor and implement persistence/access boundaries within that final structure in tested slices. Trigger should run against that architecture before integration into Auth. Do not do a temporary folder cleanup or copy the current prototype wholesale. The planning handoff is `/Users/rob/Sites/_static/_sveltekit/_live/trigger/PRODUCTION-ARCHITECTURE-PLAN.md`.

Reviewed Trigger's active source, routes, stage services, task entry points, build configuration and asset dependencies, alongside Auth's current module, tenancy and platform boundaries. Three sub-agents independently reviewed Trigger domain/persistence, Trigger routes/UI, and Auth integration. Method documents and generated artifacts were treated as application assets, not instructions to the reviewers. This was a source review, not an execution audit of every stage or a verification of deployed services.

## Recommendation

Make Trigger's business workflow one `src/lib/modules/strategy` module inside Auth. Put its pages under `/o/[organisationSlug]/[brandSlug]/strategy`. Preserve the current stage identities M01–M12 and BF, and the existing readable route names. Trigger.dev remains a separately deployed execution layer with thin task entry points in `src/trigger/strategy`.

Do not place this workflow inside `modules/auth`, create thirteen unrelated top-level modules, or replace Auth's root layout and UI library. Auth already distinguishes reusable features (`modules`), infrastructure (`platform`), and application composition (`app`). Strategy fits that structure directly.

The important distinction is between code relocation and data migration. Trigger's client folders currently hold authoritative sessions, approvals, immutable versions and output projections. Copying library files and routes alone cannot produce a working integrated application.

## Proposed destination structure

All paths in the following tree are relative to the Auth project root. Names marked `new` are proposed, not existing implementations.

```text
src/
├── lib/
│   ├── modules/
│   │   ├── auth/                         existing identity/account module
│   │   ├── billing/                      existing billing module
│   │   ├── tenancy/                      existing organisation/brand authority
│   │   ├── monitoring/                   existing monitoring module
│   │   └── strategy/                     new feature boundary
│   │       ├── README.md
│   │       ├── types.ts                  browser-safe type entry
│   │       ├── shared/
│   │       │   ├── types.ts
│   │       │   ├── stages.ts             stage IDs, order, labels, dependencies
│   │       │   ├── routes.ts             brand-aware URL construction
│   │       │   ├── fields/               bf-fields.ts, m04-fields.ts, …
│   │       │   └── upstream-plain.ts
│   │       ├── client/
│   │       │   ├── ask-context.ts
│   │       │   ├── voice-cues.ts
│   │       │   └── orb-tune.ts
│   │       ├── components/
│   │       │   ├── StrategyNav.svelte
│   │       │   ├── Stepper.svelte
│   │       │   ├── AskPanel.svelte
│   │       │   ├── HelpHint.svelte
│   │       │   ├── VoiceOrb.svelte
│   │       │   └── stages/               stage-specific view components
│   │       ├── remote/
│   │       │   ├── intake.remote.ts
│   │       │   ├── m01.remote.ts
│   │       │   ├── …                     m02–m12
│   │       │   └── bf.remote.ts
│   │       └── server/
│   │           ├── access.ts             request/action checks
│   │           ├── intake/               intake-api, entry-brief, authority
│   │           ├── stages/
│   │           │   ├── m01/              existing m01-* services and tests
│   │           │   ├── …                 m02–m12
│   │           │   └── bf/               existing bf-* services and tests
│   │           ├── repositories/         new context-required persistence
│   │           ├── artifacts/            versions, receipts, imports, exports
│   │           ├── jobs/                 Trigger client, payloads, policy
│   │           ├── research/             Treg and sector corpus adapters
│   │           ├── method/               private method-asset loading
│   │           └── shared/               model policy, JSON, remote-safe
│   ├── platform/
│   │   ├── config/                       extend existing env validation
│   │   ├── database/                     reuse existing connection pool
│   │   └── storage/                      extend for private artifact access
│   └── app/
│       ├── navigation/config.ts          add contextual Strategy destination
│       └── strategy-policy.server.ts     new host permissions/entitlements
├── routes/(dashboard)/o/[organisationSlug]/[brandSlug]/strategy/
│   ├── +layout.server.ts                 authorised brand and overview data
│   ├── +layout.svelte                    strategy navigation and scoped help
│   ├── +page.server.ts
│   ├── +page.svelte                      real strategy overview
│   ├── intake/
│   ├── founder-conviction/               M01
│   ├── market-reality/                   M02
│   ├── business-commitments/             M03
│   ├── viability-check/                  M04; retain handoff/+server.ts
│   ├── business-foundation/              BF
│   ├── brand-strategy/                   M05
│   ├── marketing-strategy/               M06
│   ├── sales-strategy/                   M07
│   ├── content-strategy/                 M08
│   ├── digital-direction/               M09
│   ├── visual-identity/                  M10
│   ├── execution-planning/               M11
│   ├── work-coordination/               M12
│   ├── source-revision/
│   ├── runs/[runId]/                     new brand-scoped run detail
│   └── ask/+server.ts                    authenticated strategy help
└── trigger/strategy/
    ├── m01-session.ts
    ├── …                                 m02–m12
    └── bf-session.ts

resources/strategy/                       private build/deployment assets
├── system/                               required contents of 02-System
├── templates/engagement/                  intake scaffold
└── research/                             explicitly selected sector corpus
scripts/strategy/                         prompt sync and legacy-data import
tools/strategy-pipeline/                  separately evaluated CLI prototype
database/migrations/0004_strategy_*.sql    new forward migration(s)
trigger.config.ts                        merged task discovery/build settings
```

Start by retaining existing `m04-session.ts`, `m05-synthesis.ts`, etc. filenames inside their stage directories. Renaming every service while changing storage, identity and imports would make regressions harder to isolate. Extract large route pages into `components/stages` incrementally; moving a working page does not require an immediate UI rewrite.

Keep an engagement identity in the data model, even if the first UI exposes only one current engagement per brand. Suggested hierarchy: organisation → brand → strategy engagement → stage session → immutable version. Brand identity and an individual strategy exercise are different things. The route tree above assumes one selected engagement, resolved server-side; historical runs carry an explicit ID. If users must open several engagements side by side, promote the engagement to `/strategy/engagements/[engagementId]/<stage>` before shipping that capability. A selected engagement must always be checked against the routed brand.

## Source-to-destination map

Trigger paths below are relative to `/Users/rob/Sites/_static/_sveltekit/_live/trigger`; destinations are relative to Auth.

| Trigger source | Destination / treatment |
| --- | --- |
| `src/lib/server/m01-*` … `m12-*`, `bf-*` | Group beneath `modules/strategy/server/stages/<id>/`, including colocated tests. Extract persistence through repository interfaces rather than preserving filesystem assumptions. |
| `src/lib/bf-fields.ts`, `m04-fields.ts` … `m12-fields.ts` | `modules/strategy/shared/fields/`; browser-safe field definitions. |
| `src/lib/server/intake-api.ts`, `entry-brief.ts`, `entry-authority-kit.ts` | `modules/strategy/server/intake/`. |
| `src/lib/server/model-policy.ts`, `json.ts`, `remote-safe.ts` | `modules/strategy/server/shared/`; adapt configuration to Auth. |
| `src/lib/server/waitpoints-kit.ts` and stage waitpoint helpers | Shared job machinery in `server/jobs`; stage-specific checkpoint rules stay with their stage. |
| `src/lib/server/m02-treg.ts`, `m02-sector.ts` | `modules/strategy/server/research/`; remove developer-machine credential fallback and explicitly package the corpus. |
| `src/lib/components/{Stepper,AskPanel,HelpHint,VoiceOrb,M04FieldEditor}.svelte` and stage components | `modules/strategy/components/`; adapt imports and Auth theme. |
| `src/lib/components/ModuleNav.svelte` | `StrategyNav.svelte`, using one brand-aware route builder. |
| Stage `src/routes/<slug>/*.remote.ts` | `modules/strategy/remote/`; route-colocated wrappers can be retained temporarily during the first relocation. |
| Stage `src/routes/<slug>/+page.svelte` | Same stage slug under the brand Strategy route. |
| `src/trigger/*-session.ts` | `src/trigger/strategy/`; preserve deployed task IDs until a deliberate version transition. |
| `02-System/` | Private versioned `resources/strategy/system/`; bundle/load only needed assets. |
| `04-Brand-Operating-Systems/template/` | `resources/strategy/templates/engagement/`. |
| Other client folders in `04-Brand-Operating-Systems/` | Data import into authorised brand/engagement records and private storage. Do not place in `static/` or the application source tree. |
| `src/pipeline/` | Keep its CLI path separately under `tools/strategy-pipeline/` until reconciled with the interactive workflow. |

Do not bulk-copy `01-Library` or `prototype`. Trace required resources: M05–M12 load method documents from `02-System` at runtime, prompt-bundle generation also reads that tree, and the M02 sector helper currently defaults to a corpus under `prototype`. Package those dependencies explicitly rather than migrating whole reference directories.

## Keep Auth as the host

Reuse Auth's AppShell, BrandSwitcher, authentication, database pool, logger, environment validation and shared UI. Trigger's root layout is chiefly CSS, Toaster and AskPanel; Auth already supplies global chrome and notifications. Put AskPanel inside the Strategy layout and authorise its endpoint.

Both apps use Svelte 5/SvelteKit 3, but their UI presets differ: Trigger uses maia/neutral/hugeicons and Auth uses nova/zinc/remixicon. Merge genuinely missing primitives; do not overwrite Auth's `components.json`, `app.css`, utilities or hooks. Review package differences deliberately, including Superforms 2 versus Auth's 3. Trigger SDK, Triggerkit and method assets need their own build/runtime handling; do not replace Auth's package manifest, root config or lockfile with Trigger's.

Use relative imports inside Strategy and Auth's `#lib/…` convention across boundaries. Adapt Trigger's existing alias assumptions. Re-evaluate Triggerkit's virtual registry, exclusions and generated declarations against the merged import graph; the broad Auth library must not accidentally become a task-service registry.

## Persistence and generated outputs

Trigger currently uses synchronous filesystem IO, atomic renames and PID-based lock files. For example, `m01-session.ts` anchors sessions beneath `04-Brand-Operating-Systems/<folder>/Input/_internal/runs/<uuid>`. M04 persistence additionally enforces revisions and sealed-record immutability. Its Trigger task explicitly treats the persisted session as authoritative and itself as a durable checkpoint mirror.

Auth targets Cloudflare Workers while the Trigger task config selects a Node runtime. A process-local folder or PID lock cannot serve as shared authoritative persistence for these independently hosted runtimes. This is the major implementation change, not merely a path rewrite.

Proposed database responsibilities: brand/engagement ownership, sessions, optimistic revisions, confirmations, source-version relationships, approvals, job bindings and artifact metadata. Proposed private blob-storage responsibilities: uploads, transcripts, immutable payloads, receipts and rendered documents. Auth has a generic storage abstraction, but it is not yet a complete private-artifact implementation; add the required access-controlled read/signing behaviour behind that boundary.

For existing records:

1. Inventory genuine client data separately from test/pilot/generated fixtures.
2. Explicitly map each legacy folder to an organisation, brand and engagement; do not infer ownership from the folder name.
3. Preserve authoritative session JSON, confirmations, immutable versions, receipts and source references. Store ownership mappings alongside original payloads instead of inserting IDs into already sealed bytes.
4. Verify original hashes and retained relationships after import. Keep rendered `Output` files as projections/downloads, without treating them as replacements for source records.
5. Preserve the distinction between an authenticated actor and the declared business decision authority in legacy records. Importing a claimed actor name must not confer access or approval rights.

The next schema work belongs in new numbered migrations, following the existing checksummed runner. Applied migrations 0001–0003 stay unchanged.

## Authorisation and background work

Replace Trigger's `?folder=` and `bos:active-client` selection with brand context resolved by the host. A filesystem client picker must not become an organisation or brand directory that any signed-in user can enumerate.

Use `brandRequest`/`requireBrandAccess` and extend the action model for strategy reads, edits, approval, generation and export. Current Auth code implements only `brand:read`, `brand:update`, `brand_members:manage` and `audit:read`; new permissions are work to implement, not capabilities already supplied. Define the role/action matrix explicitly. Existing entitlement handling is limited to the current personal-organisation billing model and needs a deliberate policy for wider organisation use.

Every remote function, mutation, endpoint, poll and download checks current authority and the resource's brand. A parent layout check is insufficient. Every repository method takes an authorised context and scopes queries by brand plus resource ID.

Worker payloads carry trusted initiating user, organisation, brand, engagement/session/run IDs and pinned input versions. Auth contexts are process-branded objects and cannot be serialised into a task as proof of authority. Reconstruct current authority before execution and before results become available. Authenticate and make callbacks idempotent; bind incoming job references to server-owned records. Trigger run IDs and checkpoint tokens are not user permissions.

Auth's `resource-contracts.ts` supplies useful enqueue/execute/publish contracts but explicitly does not implement a production job runner or asset store. The actual adapters remain necessary.

## Surfaces to exclude or review separately

- Trigger's root page and demo `UserService`, welcome task and email demo are not a replacement for Auth identity or the Strategy overview.
- `/orb-lab` and the separate `montsel-voice-orb/` app remain development/reference material unless deliberately promoted.
- `/system` currently exposes project-wide runs and approvals. Replace with brand-filtered activity or an explicitly protected operations page.
- `/api/email` needs a distinct authenticated integration endpoint only if the migrated production flow uses it.
- M04's legacy setup/step/review/return/chat HTTP routes overlap remote functions. Audit callers and tests before retaining or retiring each one. Retain the Markdown handoff endpoint intentionally.
- `system-pipeline.ts` is not the full interactive M01–M12 engine: its task map stops before the M06 module declared by the CLI registry. Do not make it the central production orchestrator by relocation alone.
- Exclude dependencies, build caches, `.trigger`, generated test client folders and secrets.

## Suggested implementation sequence

1. Audit active code, prototypes, dependencies and persistence inside Trigger. Produce a complete production target tree, source-path mapping, schema/ownership design, worker/storage contracts and Auth host requirements before broad moves.
2. Refactor Trigger directly into that final module/resource/task structure. Establish database and access boundaries from the outset; keep stage behaviour and tests recognisable. Avoid an intermediate structure requiring another redesign.
3. Prove a representative stage with database-backed sessions, revisions, generated documents, permissions and job recovery. Extend the same architecture through intake and M01–M12/BF in dependency order, preserving runnable checkpoints.
4. Replace folder selection and global run lookups, implement private artifacts and worker policies, and validate selected legacy imports with preserved hashes, seals and source relationships. Keep method documents as private versioned resources initially; store brand working data and generated document content in the database.
5. Verify the refactored Trigger host against shared production-style persistence and test the full workflow, isolation, recovery and separate web/task builds.
6. Integrate the resulting module, resources, routes and task entry points into Auth through the previously designed host contracts. Reconcile contextual navigation, UI, policies, dependencies and configuration without another domain/storage redesign.

Update the existing tenancy SQL contract test to permit only context-enforcing Strategy repositories, instead of putting product SQL into tenancy or weakening all checks. Extend the module boundary checker so reusable auth cannot import Strategy, and platform remains independent of feature modules.

Validation must cover cross-brand denial, lost membership during a job, stale revisions, sealed-output immutability, approval identity, authenticated callbacks, artifact access, source-revision ownership, and separate web/task builds. Run stage tests as each stage moves. The proposal itself does not change application behaviour or deploy any service.
