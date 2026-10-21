# Getting Started

## Runtime

- **Server runtime:** Bun only.
- **Dev:** `bun --bun run dev`
- **Build:** `bun --bun run build`
- **Start (adapter output):** `bun ./build/index.js`

## Project Structure

- `src/routes` — route files (`+page.svelte`, `+page.server.ts`, `+server.ts`)
- `src/lib` — shared UI + utilities (import via `#lib`)
- `src/lib/server` — server-only utilities (import via `#lib/server`)
- `src/lib/auth` — auth, security, and Better Auth integration (see `docs/architecture/auth-module.md`)
- `packages/` — workspace SDKs (e.g. `better-auth-directus`)

## Server-only Conventions (`src/lib/auth/server`)

- Bun-only runtime assumptions.
- Validate external inputs (requests, headers, env) with Zod.
- Keep DB, auth, and secrets here — never in client code.

## Where to go next

- [Architecture overview](architecture.md)
- [Auth module layout](architecture/auth-module.md)
- [Security architecture](architecture/security.md)
- [Environment variables](reference/environment.md)
- [Testing guide](testing/guide.md)
