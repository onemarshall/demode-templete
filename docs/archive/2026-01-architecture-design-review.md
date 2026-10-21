# Architecture & Design Review

## 0) Purpose

This document is a **high-level architecture and design review** for the app, with an embedded **task tracker**.

Goals:

- Define the system boundaries (what owns what)
- Describe the key runtime flows (auth, security, CMS, email)
- Identify risks/constraints and current tradeoffs
- Provide a prioritized backlog of follow-up tasks

Non-goals:

- Replace existing deep-dive docs
- Serve as a complete runbook

## 1) System Overview

### 1.1 Tech Stack

- **Runtime**
  - Bun (server-side runtime)
  - SvelteKit (app + routing)
  - Svelte 5 (runes) UI
- **Auth**
  - Better Auth (server handler + client)
- **Data**
  - Postgres (Better Auth persistence)
  - Redis (security analytics + rate limiting + session telemetry)
- **CMS / Media**
  - Directus (optional, via provider abstraction)
- **Testing**
  - Vitest (unit + integration)
  - Testing Library (Svelte)

### 1.2 Architectural Layers

- **UI Layer (routes + components)**
  - Svelte 5 pages
  - form schemas and UI components
- **Server routing (SvelteKit)**
  - `/api/auth/[...all]` for Better Auth
  - Additional API endpoints for security, system health, SIWE, etc.
- **Cross-cutting middleware (hooks)**
  - `src/hooks.server.ts` applies security gating and headers
- **Auth core**
  - Better Auth server config + plugins
- **Provider services**
  - CMS (Directus/Strapi/Payload)
  - Email providers
  - Storage providers
- **Security plugins**
  - abuse protection, fraud detection, geo intelligence, rate limiting, security analytics

### 1.3 1-page Overview (Major Subsystems)

Mental model: this repo is primarily an **auth + security platform** built on SvelteKit + Better Auth.

- **Auth UI**
  - `/auth/*` grouped routes (sign-in variants, profile/security, sessions)
- **Auth API**
  - `/api/auth/[...all]` routes to the Better Auth handler
- **Security middleware**
  - `src/hooks.server.ts` is doing real request filtering + risk gating
- **Security analytics**
  - Better Auth plugin(s) + custom endpoints under `/api/auth/security-analytics/*`
  - Admin UI under `/admin/security*`
- **Admin**
  - `/admin/users` uses Better Auth admin endpoints for user/session actions (ban/unban/impersonate/etc.)
- **Providers**
  - modular intent exists for CMS/email/storage providers (Directus/Usesend/etc.)
- **Testing**
  - Vitest configured with mocks/aliases to make SSR and browser-ish dependencies testable

## 2) Boundaries & Ownership

### 2.1 Auth Handler Authority

Desired authority model:

- **`src/hooks.server.ts`**
  - Owns: request gating, security headers, session decoration
  - Does not own: implementing auth endpoints
- **`src/routes/api/auth/[...all]/+server.ts`**
  - Owns: Better Auth handler (the only authoritative auth endpoint surface)

Design intent:

- Prevent logic duplication and drift between hooks and API handler
- Keep security middleware composable and testable

### 2.2 CMS Boundary (Directus)

Principle: Directus is **optional** and must not be allowed to break core auth flows.

- Provider selection happens via env (`CMS_PROVIDER`)
- Missing/invalid CMS config should **disable CMS integration** rather than failing auth

Production hardening:

- Directus calls are wrapped in a **fail-open boundary**:
  - timeouts
  - error classification
  - circuit breaker/backoff
  - safe fallbacks

Key files:

- Provider initialization: `src/lib/auth/server/plugins/cms.ts`
- CMS factory: `src/lib/auth/server/cms/index.ts`
- Directus provider: `src/lib/auth/server/cms/providers/directus/*`
- Better Auth DB hooks calling CMS sync: `src/lib/auth/server/database/hooks.ts`

### 2.3 Security Boundary

Principle: Security checks should be strict where necessary, but should avoid accidental lockouts.

Key responsibilities:

- Rate limiting / temporary blocks
- Abuse/fraud detection headers
- CAPTCHA orchestration
- CORS and security headers

Key file:

- `src/hooks.server.ts`

## 3) Key Runtime Flows

### 3.1 Sign-in / Sign-up (high level)

- UI posts to auth endpoint(s)
- `/api/auth/[...all]` executes Better Auth
- `hooks.server.ts` decorates session and applies security checks

### 3.1.1 Key Interactions (Data/Control Flow)

- **Browser auth**
  - Root layout initializes the auth client and session management
  - Components use Better Auth client hooks for reactive auth state
- **Server request path**
  - `hooks.server.ts` runs on every request:
    - preflight handling
    - security gating (abuse detection, temp blocks, CAPTCHA extraction)
    - session decoration via Better Auth session APIs
    - applies headers/CSP
- **Admin flows**
  - `/admin/users/+page.server.ts`:
    - session required
    - role/id allowlist from env
    - uses Better Auth admin API helpers

### 3.2 2FA

- User begins sign-in
- Better Auth issues a 2FA pending state
- UI completes 2FA and finalizes session

Main risk:

- Handling stale 2FA cookies/session state deterministically with clear UX

### 3.3 CMS Sync (Directus)

- Better Auth creates/updates a user in Postgres
- Database hooks attempt user sync to Directus
- Fail-open boundary ensures Directus outages do not break auth

### 3.4 Avatar

- Profile page may read avatar from Directus if available
- Upload/import uses Directus file manager when configured
- Errors should degrade gracefully (feature unavailable) rather than breaking profile render

## 4) Configuration & Environment

- Env validation is centralized and uses Zod
- Public vs server env separation

References:

- `docs/ENVIRONMENT_VALIDATION.md`

## 5) Error Handling & Observability

- Consistent logging and error categorization are expected

References:

- `docs/ERROR_HANDLING.md`
- `docs/RETRY_LOGIC.md`

## 6) Risks / Hotspots

- **Auth authority drift**: hooks vs route handler logic duplication
- **Directus boundary**: optional integration must remain fail-open
- **2FA stale state**: must avoid trapping users
- **Security middleware**: avoid false positives and ensure good telemetry
- **Test brittleness**: Svelte 5 component testing requires good stubs/mocks

## 6.1) Maintainability / Design Risks (What to Watch)

- **Duplicated responsibility**
  - keep a single authority for auth request handling
- **Dependency direction drift**
  - avoid server importing client, or shared importing server-only runtime
- **Barrel exports**
  - avoid “dumping ground” public barrels; keep a clean, intentional surface
- **TODOs that are actually security decisions**
  - e.g. any `isAdmin` shortcuts must be production-safe

## 6.2) Suggested Ideal Structure (Keep Routes Stable)

This is a target structure to make dependency direction obvious, while keeping URL routes stable:

```text
src/
  lib/
    auth/
      index.ts
      server/
        auth.ts
        handle.ts
        hooks.ts
        plugins/
        options/
        email/
        cms/
        storage/
      client/
        auth-client.ts
        init.ts
        session.ts
      shared/
        env/
        logger/
        redis/
        types/
        utils/
      features/
        twoFactor/
        passkey/
        admin/
      remote/
        security/
          analytics.ts
          operations.ts
  routes/
    api/auth/[...all]/+server.ts
  hooks.server.ts
```

Mapping intent:

- `src/hooks.server.ts` becomes a thin wrapper delegating to `src/lib/auth/server/hooks.ts`
- `/api/auth/[...all]` becomes a thin wrapper delegating to `src/lib/auth/server/handle.ts`

## 6.3) Boundaries & Rules (Dependency Direction)

Boundaries:

- **`src/routes/**`\*\*
  - orchestration only (parse inputs, call `lib/*`, return responses)
- **`src/lib/auth/server/**`\*\*
  - SSR-only logic (Better Auth instance, DB/Redis, provider wiring, security gating)
  - may import `shared/**`
  - must not import `client/**`
- **`src/lib/auth/client/**`\*\*
  - browser-only logic (auth client, session state, UI-facing helpers)
  - may import `shared/**` (public env only)
  - must not import `server/**`
- **`src/lib/auth/shared/**`\*\*
  - pure utilities/types used by both

Forbidden imports (high-signal examples):

- client-side code importing `'$lib/auth/server/*'`
- shared code importing DB drivers or server-only SvelteKit helpers unless explicitly server-scoped

## 6.4) Top Refactors (Ordered by Impact/Effort)

1. **Single authoritative auth handler path**
   - `/api/auth/[...all]` is canonical; `hooks.server.ts` should be gating/headers only

2. **Normalize/centralize auth exports**
   - decide canonical imports (server vs client) and avoid multiple “entrypoint-ish” modules

3. **Make `hooks.server.ts` a composition root only**
   - move heavy logic into `src/lib/auth/server/hooks.ts`

4. **Replace any dev-only admin checks with real checks**
   - implement admin verification via session + env allowlist consistently

5. **Clarify ownership: features vs security plugins vs remote functions**
   - define expectations so `src/lib/auth/index.ts` stays an intentional public API

## 6.5) Consistency Checklist (Standardization)

- **Naming**
  - avoid “Proposed …” language in files that are actually canonical exports
- **Logging**
  - no `console.*` outside tests/dev-only blocks
- **Error handling**
  - routes/actions should translate errors consistently and include structured context
- **Validation**
  - use Zod schemas for request payloads in endpoints/actions
- **Types**
  - avoid repeated ad-hoc session/user types; prefer a canonical shared type module

## 6.6) Testing Strategy Gaps

- Unit
  - security gating logic (temp blocks, captcha extraction, skip rules)
  - env validation edge cases
- Integration
  - sign-in cookie outcomes
  - 2FA-required path behaviors
  - session refresh
- E2E
  - optional (Playwright), or at minimum keep integration tests covering the top flows

## 6.7) Security & Reliability Notes

- **Auth/session**
  - avoid handler duplication to prevent cookie/header inconsistencies
- **Redis dependency**
  - define per-security-feature policy: fail-open vs fail-closed when Redis is unavailable
- **Overlapping rate limits**
  - clarify what is enforced by hooks vs plugins to avoid conflicting decisions

## 6.8) Clarifying Questions (Max 5)

1. Should Better Auth be served **only** from `/api/auth/[...all]`, with hooks only gating/headers?
2. What are the top 3 user journeys you care about shipping (auth, profile/2FA, admin, security analytics)?
3. Deployment target: Bun-native runtime only, or adapter-auto (Node/Vercel/etc.) today?
4. Is Directus used in production, or optional scaffolding?
5. Priority order: security correctness, dev speed, testability, performance?

## 7) Task Tracker

Status legend:

- [ ] todo
- [~] in progress
- [x] done

### 7.1 P0 (Production blockers)

- [ ] Confirm auth handler authority model is fully enforced (hooks gating only; auth handler only)
- [ ] 2FA stale cookie handling + UX (clear reason + safe redirect)
- [ ] Verify Directus fail-open boundary behavior in production deployment (timeouts, circuit open/close)
- [ ] Add CI pipeline: `bun run check` + `bun run test`

### 7.2 P1 (Hardening)

- [ ] Add structured error responses for CMS failures surfaced to UI actions (avatar upload/import)
- [ ] Add telemetry for security decisions (rate limit, captcha challenge, blocks)
- [ ] Centralize redirect handling for auth flows (safe `redirectTo` allowlist)
- [ ] Add Playwright smoke tests for core flows

### 7.3 P2 (DX / UX / A11y)

- [ ] A11y audit of auth forms and error states
- [ ] Reduce log noise (sampling + consistent contexts)
- [ ] Document runbooks for production deploy/migrations

## 8) References

- Architecture overview: `docs/ARCHITECTURE.md`
- Error handling: `docs/ERROR_HANDLING.md`
- Environment validation: `docs/ENVIRONMENT_VALIDATION.md`
- Production readiness plan: `docs/PRODUCTION_READINESS_PLAN.md`
- Production backlog: `docs/PRODUCTION_READINESS_TASKS.md`
- Testing guide: `docs/TESTING_GUIDE.md`
