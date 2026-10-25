# Auth module

Owns authentication, account/profile forms, avatar management, admin users,
organisation plugin configuration, auth email and security features. Each feature
keeps its UI, browser state, operations and shared helpers together where applicable.

## Entry points

- `index.ts`: shared helpers and type exports only.
- `client/index.ts`: browser client, lifecycle and client helpers.
- `components/index.ts`: common auth components; feature UI also lives in
  `features/<feature>/components` and security UI in `security/components`.
- `types.ts` and `shared/`: reusable contracts. Admin response contracts are in
  `features/admin/shared/types.ts`; avatar helpers in `features/avatar/shared/utils.ts`.
- `server/`: server configuration, policies, account operations, mail and persistence.
- `remote/` and feature `remote/`: SvelteKit remote function boundaries.

The host calls `initializeAuth(integrations)` from `server/config.ts` once and uses
its result. Initialization is shared by concurrent callers and is process-scoped;
a failed startup remains failed until the process restarts. The internal auth builder shares
that process state; this module does not expose a multi-instance factory. This app does that in `#lib/app/setup.server.ts`. `AuthIntegrations` in
`server/integrations.ts` requires explicit deletion/export subscription loaders,
retained-membership checks, organisation hooks, dashboard health and extra plugins.
The auth module does not choose this app's billing, tenancy or monitoring policies.
See `app/auth-policies.server.ts` and its policy adapters for the current composition.

## Requirements when copying

Copy the whole module initially. Its feature folders are useful ownership units,
but are not individually installable plugins. The browser auth instance shares
plugin registration, configuration, form contracts and security lifecycle.

Shared code requirements: `platform` configuration, database, Redis, CMS, storage
and logger; `components/ui`, shared hooks/utilities and styling used by the UI.
Email templates remain auth-owned. The Directus CMS adapter needs the local
`better-auth-directus` package outside `src/lib` even though the provider is shared
infrastructure. Configure the intended CMS provider explicitly.

Direct external imports currently require `better-auth`, `@better-auth/core`,
`@better-auth/passkey`, `@better-captcha/svelte`, `@creem_io/better-auth`,
`@walletconnect/ethereum-provider`, `viem`, `qrcode`, `redis`, `usesend-js`, `zod`,
`consola`, `@lucide/svelte`, `bits-ui`, `layerchart`, `svelte-sonner`,
`sveltekit-superforms`, Svelte and SvelteKit, plus dependencies of shared UI/platform.
Keep versions compatible with this app's package manifest. The browser client
still imports Creem's client plugin statically, so disabling billing at runtime
alone does not remove that package dependency.

Outside this folder, integrate `src/env.ts`, `src/app.d.ts`, `hooks.server.ts`,
`csp.config.mjs`, `/api/auth/[...all]`, confirmation routes and page/server loaders.
Provision Better Auth's database/plugin tables, email delivery and optional security
backends before enabling their features. Follow the copy checklist in `../../README.md`.
