# Library ownership and reuse

`modules/` contains feature code. `platform/` contains shared infrastructure. `app/`
contains this application's composition, policies, plans, navigation, branding and
shell. `components/ui/` is the shared design system; shared hooks, utilities and
assets also remain outside individual features.

| Folder | Owns | Reuse boundary |
| --- | --- | --- |
| `modules/auth` | Auth client/server, account UI, security, feature plugins | Host supplies integrations; see its README |
| `modules/billing` | Stripe plugin, subscription queries, checkout and billing UI | Requires auth and platform |
| `modules/tenancy` | Organisation/brand authority, provisioning and switcher | Requires auth, billing and platform |
| `modules/monitoring` | Infrastructure probes, APM hook and health remote | Requires auth and platform |
| `platform` | Config, database, Redis, CMS, storage, logger | Must not import modules or app |
| `app` | Connects modules and supplies product-specific rules | Replace when moving to another app |

## Import conventions

Use relative imports inside an ownership boundary and `#lib/…` across boundaries.
The `#lib` mapping is configured in `package.json`; preserve it in a destination
SvelteKit app. Browser code uses explicit `client`, `components`, `shared`, `types`
or remote entries. Server implementations stay under `server/` or use `.server.ts`
(or SvelteKit 3's `server.ts` naming). A `server` directory is protected at any depth.
Use `import type` when a server-side type is needed without its implementation.
SvelteKit remote functions intentionally provide a browser-callable RPC boundary.

Auth's root entry is shared-only; it does not initialize the server or client.
`app/setup.server.ts` initializes the server with explicit application policies.
Reusable auth must not import billing, tenancy, monitoring or app code; the host
connects those through `modules/auth/server/integrations.ts`.

## Moving a module into another app

These are source modules, not published standalone packages. Copy the chosen module
with its documented dependencies. Copy the required platform services, shared UI,
hooks and utilities too, or supply compatible replacements. Arbitrary auth
subfeatures are not independent packages: they share the auth instance, forms,
security services and environment contract.

1. Match this app's Svelte 5 / SvelteKit 3 setup and required dependencies in
   `package.json` and the lockfile. UI also needs the Tailwind/theme setup from
   `src/assets` and root layouts. Some runtime-imported libraries are currently in
   `devDependencies` (for example `layerchart`); retain them in the destination build.
2. Merge relevant public declarations from `src/env.ts` and private/public validation
   from `platform/config/env-schema.ts`. Configure deployment values from
   `.env.example`; copying code does not copy working credentials or bindings.
3. Provide explicit host policies and initialize auth once per application using
   `app/setup.server.ts` and `app/*-policy.server.ts` as references. Implement every
   required integration deliberately; deletion and membership checks must fail
   closed when required services are unavailable.
4. Install the matching database schema. Better Auth plugin tables and the tenancy
   migrations in `database/migrations` are outside `lib`. The local
   `better-auth-directus` package is also outside `lib`; copy/build it or replace its
   integration before installing dependencies.
5. Integrate routes, server hooks and `App.Locals` from `src/app.d.ts`. Relevant routes
   include `/api/auth/[...all]`, account deletion confirmation, dashboard page/server
   loaders and the provisioning retry endpoint. Review `hooks.server.ts` and
   `csp.config.mjs` for sessions, security storage, abuse checks, CORS and headers.
   These are host responsibilities, not effects of importing a folder.
6. Run the destination's type checks, build and appropriate feature tests. Run
   `npm run check:modules` here to verify ownership, unresolved local imports and
   browser/server boundaries without executing application code.

The boundary checker is a static guard, not a replacement for SvelteKit's build
checks. It follows literal imports and exports, ignores type-only edges for browser
reachability, and stops at remote function implementations. Tests and fixtures are
excluded so their intentional mocks do not redefine production ownership.
