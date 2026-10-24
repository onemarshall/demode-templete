# Montsel App Structure Proposal

**Status:** Revised proposal for review  
**Scope:** Use the existing `auth` SvelteKit app as the base for Montsel, and plan how the current `trigger`, `research`, `search`, and `diagnostic` codebases fit around it.

## Recommendation

Keep one customer-facing SvelteKit app. Let SvelteKit's `src/routes` describe the pages people can visit. Keep the code for each area together in a small number of clear `src/lib` folders. Put all authentication implementation in one `src/lib/auth` folder. Keep only the genuinely separate workflow and research engines in their own top-level workspaces.

The first proposal made the architecture look more complicated than it needs to be. In particular, `brand` is context used across the app, not a separate app section. Foundation is a Strategy capability, not a sibling product to Diagnostic, Research, and Strategy. Neither needs a top-level folder of its own.

## Proposed repository shape

```text
montsel/
├── apps/
│   └── web/                    # The existing SvelteKit app, becoming Montsel
├── engines/
│   ├── diagnostic/             # Existing method, CLI, internal workbench
│   ├── research/               # Existing research engine and CLI
│   └── search/                 # Existing search and capture engine
├── workers/
│   └── trigger/                # Durable background workflows and approvals
├── docs/
└── workspace files            # Root scripts and package-manager config
```

This is intentionally small. `apps/web` is the product interface. The engine and worker folders stay separate because they have their own runtime, operational data, security controls, or deployment lifecycle. We should not create a `packages/` layer until two parts of the system need to share a stable piece of code.

## SvelteKit app

```text
apps/web/src/
├── routes/                     # Pages and URL structure
│   ├── (public)/
│   │   ├── auth/                # Sign-in, sign-up, recovery, verification pages
│   │   └── pricing/
│   ├── (app)/
│   │   ├── +layout.server.ts    # Require a signed-in session
│   │   ├── dashboard/
│   │   ├── diagnostic/          # Thin route files that call the module
│   │   ├── research/            # Thin route files that call the module
│   │   ├── strategy/            # Thin route files that call the module
│   │   └── settings/
│   ├── api/                     # Only explicit HTTP endpoints
│   └── +layout.svelte
│
└── lib/                         # Application code used by those pages
    ├── auth/                    # All auth config, client/server logic and helpers
    ├── modules/                 # Product areas, each grouped as a movable unit
    │   ├── diagnostic/
    │   ├── research/
    │   └── strategy/
    └── shared/                  # UI and platform capabilities used across modules
        ├── components/
        └── workspace/            # Organisation, brand context, membership, access
```

The `(public)` and `(app)` names are SvelteKit route groups: they help organise layouts and access rules without adding those names to URLs. Actual screens remain under `routes`. The sign-in, sign-up, and recovery pages therefore stay in `routes/auth`, while all authentication implementation lives together in `lib/auth`. Route files should mainly load data, handle form submissions, and call the owning `lib` area.

Each product area belongs in one module folder, so its UI, domain logic, schemas, server operations, tests, and public entry point travel together. The strategy module can be moved, tested, or extracted without hunting through unrelated `lib` folders. Its only dependencies on the rest of the app should be explicit shared contracts, such as the authorised workspace context and approved data adapters. Foundation and brand-strategy work are capabilities within Strategy, not root-level folders.

Grow a module's internal folders only when its code warrants them. For example:

```text
lib/modules/strategy/
├── components/                  # Strategy-specific Svelte views
├── domain/                      # Foundation and strategy rules
├── server/                      # Scoped reads, writes and workflow actions
├── schemas/                     # Validated inputs and outputs
├── __tests__/
└── index.ts                     # Public module interface
```

The `routes/strategy` files remain small SvelteKit entry points that connect URLs and layouts to this module. Moving or extracting the module later would require updating those entry points and supplying its declared shared contracts, but would not require redistributing its domain or UI code. Do not create empty folders before there is code for them.

## What belongs where

- **Auth** owns sign-in and sign-up flows, sessions, password recovery, passkeys, two-factor, Better Auth configuration, auth clients, and auth-specific emails. It stays a coherent area even though SvelteKit route entry files must live under `routes`.
- **Shared workspace** owns the organisation and brand context needed to work safely. A brand is selected workspace context and an access boundary; it is not another product in the main navigation. Each product module uses the same server-side workspace access contract.
- **Diagnostic module** owns Signal, Gap, and Direction customer flows. The existing diagnostic engine and its private operator workbench remain in `engines/diagnostic` until their customer-facing interfaces are deliberately integrated.
- **Research module** owns research projects and results in the Montsel interface. The existing Research engine remains an engine behind an explicit adapter.
- **Strategy module** owns the Foundation → Strategy journey and its related business, market, brand, marketing, sales, and content work. Foundation is part of this module; it is not a separate app folder.
- **Trigger** owns durable background jobs. Pages call a narrow server adapter; they should not directly import worker internals.

## Why this matches the existing code

The `auth` SvelteKit app already has sign-in/account routes, a sizeable `lib/auth`, security code, shared UI, and Montsel organisation/brand work. It is the natural host for the single web experience, but its current generic app identity and crowded `lib` need a gradual product-focused organisation.

The `trigger` SvelteKit app already has routes for business foundation, viability, market reality, brand strategy, marketing, sales, content, and execution planning. Those are good candidates to become pages under Montsel's Strategy area. Its Trigger.dev tasks and durable pipeline state should stay in the worker boundary.

Research and Search already have clear engine, storage, provider, capture, and operational layers. Diagnostic already distinguishes its methodology, evidence rules, CLI, runtime method packs, private workbench, and persistent data. The monorepo should make those projects easier to develop together without erasing their operational distinctions.

The current Montsel specification places organisation and brand access below every feature, then develops Foundation → Strategy before connected applications, campaigns, content, and assets. This structure follows that sequence and keeps brand-scoped authorisation and provenance central.

## Migration plan

1. Confirm this simple division: pages in `routes`; coherent auth in `lib/auth`; cross-cutting UI and workspace access in `lib/shared`; self-contained product areas in `lib/modules/{diagnostic,research,strategy}`.
2. Treat the current `auth` folder as the web app source. Move it under `apps/web` only after validating Wrangler, Vite, SvelteKit, environment files, CI, and deployment paths together. Keep the first move behaviour-preserving.
3. Migrate the `trigger` strategy pages into Montsel one area at a time. Keep durable tasks in `workers/trigger` and keep existing tests with the feature being moved.
4. Bring the Research, Search, and Diagnostic source into `engines/` only after their individual install, test, data-path, and deployment workflows still work from the monorepo. Do not move their runtime data into Git.
5. Add shared packages only when a stable contract or code unit is actually consumed by multiple workspaces. Preserve each engine's database ownership, provider-safety controls, and release checks.

The `auth` working tree currently contains significant uncommitted Montsel work. Any later migration should preserve it and use separate, reviewable changes. This proposal itself does not move application code or operational data.

## One decision before implementation

Should `apps/web` be the one customer-facing SvelteKit app, with Diagnostic's current private operator workbench remaining separate? The proposed layout assumes yes, while allowing Diagnostic customer journeys to appear inside Montsel.

## Review note

This proposal is based on the five inspected codebases and the current Montsel architecture specification. The Svelte MCP documentation tools named in the repository instructions were not available in the tool set during review, so the proposed structure is grounded in the code currently present. No application source was moved or changed.
