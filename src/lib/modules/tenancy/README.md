# Tenancy module

Owns organisation/brand access, memberships, lifecycle, provisioning, repository
boundaries and route resolution. Browser-safe display/routing contracts live in
`shared/types.ts`, with a type-only entry at `types.ts`. All authority and database
operations remain in `server/`. Switcher values and saved preferences never confer
access.

The brand switcher itself is part of the application shell
(`src/lib/app/shell/shell-brand-switcher.svelte`), not this module: it posts to
`/app/brand`, which re-validates the chosen brand through `requireBrandAccess`
before setting the active-brand cookie.

Requirements: auth organisation membership/API configuration, billing subscription
reads for entitlements, platform database/logger/config, shared UI (including its
icons and styling), `pg`, `better-auth` and SvelteKit. Server code uses Node-compatible
crypto. The host supplies routing and invokes the module's authorization/repository
boundaries from its own endpoints/loaders.

Database schema is outside this folder: install Better Auth's user/organisation,
member and invitation tables first, then the ordered SQL files in
`database/migrations`. The third migration renames workspaces to brands; do not copy
only the initial migration. Review and run migrations against the destination schema
rather than treating folder copying as a migration.

This app's host integration is `app/organization-auth-policy.server.ts` plus
`app/auth-policies.server.ts`. They connect organisation membership hooks, provisioning
and deletion retention checks to auth. Page/layout loaders under `src/routes` supply
switcher data, route selection and active brand context. The internal provisioning
retry API is also outside this folder. Preserve its authentication/authorization
when installing it in another app.

See `../../README.md` for shared setup. This module deliberately depends on auth and
billing; they are explicit dependencies rather than files hidden in a UI folder.
