# Auth-Svelte Maintainability Audit

_Generated: 2026-05-14_

## TL;DR

- **No LICENSE file**, `package.json` name is `better-auth-sveltekit5-example` and marked `private: true` — cannot publish or sell as-is.
- **Auth pages are ~80% duplicated** across 6 files (2,272 lines total) — sign-in vs sign-up differ mainly by 3 strings and `signIn.email` → `signUp.email`. Easy 1,200+ line saving.
- **`src/lib/auth/` is a kitchen sink** (1,400-line `security/services/sdk.ts`, 5 `.md` docs inside `security/`, 2 `.DS_Store` files committed, a `_template/` dir, an unimplemented S3 provider with TODOs).
- **Two parallel auth-client import paths** coexist (`#lib/auth-client` ×36 vs `$lib/auth/client/config` ×5).
- **Creem guest-checkout endpoint creates real user accounts from unauthenticated POSTs with no rate-limit, captcha, or email-ownership proof.** `iamstudios.cc` is hardcoded in `csp.config.mjs` and `vite.config.ts`.

## Top 5 Prioritized Actions

1. **Extract `<AuthForm>` + `useAuthFlow` hook.** Pages diff in ~3 strings + which `authClient.signIn/signUp` method they call. ~1,200 lines saved, eliminates per-page bug drift. Files: `src/routes/auth/(sign-in)/sign-in/+page.svelte`, `(sign-up)/sign-up/+page.svelte`, magic-link pair, OTP, SIWE. **Effort: 1-2 days.**

2. **LICENSE + rename + README + scrub `iamstudios.cc`.** Hardcoded host in `csp.config.mjs:22,31` and `vite.config.ts:20` should read from `PUBLIC_APP_URL`. **Effort: ½ day.**

3. **Harden `src/routes/api/checkout/guest/+server.ts`.** No rate limit, no captcha, no email-ownership proof. `findOrCreateUser` does direct SQL bypassing Better Auth hooks. Magic-link send is fire-and-forget. **Effort: ½ day.**

4. **Collapse security module's surface area.** `src/lib/auth/security/` has `MIGRATION.md`, `MIGRATION_CHECKLIST.md`, `ARCHITECTURE.md`, `SECURITY-AUDIT.md`, `REVIEW.md`, `.claude/settings.local.json`, plus 1,400-line `services/sdk.ts` and a 612-line test endpoint at `src/routes/api/test/security/+server.ts`. Move docs to `/docs`, split sdk.ts, delete test route from prod. **Effort: 1 day.**

5. **Pick one auth-client import path.** `src/lib/auth-client.ts` and `src/lib/auth/client/config.ts` both exist; 41 importers split. **Effort: 2 hours codemod.**

## Before-Going-Public Checklist

- [ ] Add `LICENSE` (MIT/Apache-2 OSS; commercial EULA if sold)
- [ ] `package.json`: real name, drop `private: true`, fill description/repository/author/keywords
- [ ] Write README: features, install, env vars, architecture diagram, quickstart
- [ ] Remove committed `.DS_Store` from `src/lib/auth/.DS_Store`, `src/lib/auth/security/.DS_Store`, `src/lib/auth/server/email/.DS_Store`, `src/lib/auth/shared/.DS_Store`, `src/lib/auth/modules/.DS_Store`; add to `.gitignore`
- [ ] Replace `auth.iamstudios.cc` in `csp.config.mjs:22,31` and `vite.config.ts:20` with env-driven config
- [ ] Delete or guard `src/routes/api/test/security/+server.ts` (612 lines exposed in route tree)
- [ ] Remove `src/lib/auth/modules/_template/` from prod builds (move under `/docs/templates`)
- [ ] Resolve TODOs in `src/lib/auth/server/storage/providers/s3.ts` (5 unimplemented methods)
- [ ] Remove `console.log` in `src/lib/auth/server/options/user.ts:75` and `src/test/suite/auth-system.test.ts:15,20`
- [ ] Resolve `// TODO: Implement providers initialization` in `src/hooks.server.ts:48`
- [ ] Sanity-check 43 test files actually run in CI
- [ ] Harden `src/routes/api/checkout/guest/+server.ts` for abuse
- [ ] Rewrite `src/lib/auth/index.ts` opening comment ("Proposed Better Auth Structure" → canonical)
- [ ] Move `MIGRATION*.md`, `SECURITY-AUDIT.md`, `REVIEW.md` from `src/lib/auth/security/` to `/docs/`

## Architectural Recommendations

**1. Decompose `src/lib/auth/` into clear public-API layers.** Today, `index.ts` re-exports server, client, security, and modules from one file with type aliases for conflicts. Define three separate entrypoints: `auth/server`, `auth/client`, `auth/shared` — each with own `index.ts` and _no cross-imports between server and client_. The single re-export barrel produces SvelteKit "X imported on client" leaks. `client/helpers.ts` (476 lines) and `server/email/index.ts` (386 lines) both reach into `shared/logger.ts` (603 lines) which knows about both runtimes.

**2. Make auth pages thin adapters over `<CredentialAuthForm>`.** Sign-in/sign-up should be ~30-line files passing config (`{ mode, schema, onSuccess, copy }`) into one component owning captcha, error scheduling, social buttons, "verified" query handler. Same pattern for magic-link.

**Risk hotspots** to revisit after extraction: `src/lib/auth/security/services/sdk.ts` (1,404 lines), `src/hooks.server.ts` (594 lines), `src/lib/auth/shared/env/env-schema.ts` (595 lines).
