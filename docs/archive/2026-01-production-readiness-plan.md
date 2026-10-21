# Production Readiness Plan

Status legend: [] todo · 🔄 in-progress · ✅ done

## 0. Scope & Goals

- Deliver a Bun + SvelteKit (runes) Better Auth app ready for production.
- Harden auth/2FA flows, security middleware, admin UX, monitoring, and release process.
- Add automated tests (unit, integration, E2E) and observability.

## 1. Testing & QA

- [] Vitest setup for Svelte 5 components with auth/client mocks.
- [] Integration tests for auth flows (email sign-in, 2FA pending → redirect, session refresh).
- [] Playwright smoke: sign-in, 2FA verification, admin list users, ban/unban.
- [] Regression test for withheld-session + `better-auth.two_factor` cookie.
- [] Component tests for key UI: security dashboard widgets, UserModal, UserSessions, 2FA pages.
- ✅ API health endpoint tests (system-health healthy/DB-failure status paths).

## 2. Health, Monitoring, Observability

- ✅ `/api/system-health`: DB, Redis, BigDataCloud checks + CPU/memory/uptime + perf timings.
- ✅ Request/response timing + rate-limit headers surfaced on auth endpoints.
- ✅ Monitoring hook: emit system-health payload to APM (replace stub with provider client).
- [] Centralized error/log forwarding (APM) with sampling and PII scrubbing.
- [] Metrics: API latency, Redis hit/miss, security-block counts, captcha challenges.

## 3. Auth & 2FA Robustness

- ✅ Handle stale `better-auth.two_factor` cookie and add clear UX copy + redirect reasons.
- [] Trust-device + backup-code UX with explicit telemetry on outcomes.
- ✅ Session finalization after 2FA: invalidate + goto; add loading/error states.
- [] Passkey + magic link + email OTP edge cases covered with tests.

## 4. Admin UX Hardening

- ✅ Enforce confirmAction-only ban flow; remove stray local confirm state.
- [] Role/permission presets and effective-permissions summary in UserModal.
- [] MFA/last-active badges, empty/filtered states in users table and UserModal.
- ✅ Server-side guard tests for admin roles/ids (env-driven).

## 5. Security & CSP

- ✅ Integrate CSP nonce into rendered pages; ensure inline scripts use nonce.
- [] Finalize provider initialization TODOs (email/storage/CMS) in hooks/startup.
- [] Surface abuse/fraud telemetry and rate-limit headers on responses.
- [] Add IP/block event logging and retention policy.

## 6. Performance & DX

- [] API latency metrics and Redis hit/miss counters wired to monitoring.
- [] Bundle analysis; code-split heavy security charts; lazy-load plugins.
- [] Lightweight RUM beacon for auth flows (page, LCP/TTI, route change times).
- [] Developer ergonomics: faster test fixtures, seed scripts, mock providers.

## 7. Accessibility & UX Polish

- [] A11y audit on forms (labels, aria-live errors, focus management, keyboard traps).
- [] Loading, skeleton, and empty states across dashboards and admin pages.
- [] Clear inline error messaging for auth/2FA/admin actions.

## 8. CI/CD & Release Readiness

- [] Pipeline: lint, typecheck, test, build, Playwright smoke; block on failures.
- [] Preview deploys with feature-flagged auth configs.
- [] Release checklist: env validation, migrations, backups, rollback plan, health checks.

## 9. Ownership & Tracking

- Define owners per area (Testing/QA, Observability, Auth, Admin UX, Security, Perf, A11y, CI/CD).
- Track status in this document; update weekly with ✅/🔄/[] and links to PRs.

## 10. Next Up (suggested sprint 1)

- Testing & QA: Vitest + Playwright smoke + 2FA regression.
- Health/Observability: `/api/system-health`, timing middleware, error/log forwarding.
- Auth & 2FA: stale cookie handling, trust-device UX, session finalization.

## References

- Architecture: `docs/ARCHITECTURE.md`
- Architecture & design review: `docs/ARCHITECTURE_DESIGN_REVIEW.md`
- Production readiness tasks (expanded backlog): `docs/PRODUCTION_READINESS_TASKS.md`
- Env validation: `docs/ENVIRONMENT_VALIDATION.md`
- Error handling: `docs/ERROR_HANDLING.md`

Implementation notes (recent):

- Auth timing/rate-limit headers: `src/hooks.server.ts`, `src/hooks.server.headers.test.ts`
- 2FA stale-cookie handling + session finalization: `src/routes/auth/(profile)/2fa/*`, `src/routes/auth/(sign-in)/sign-in/+page.svelte`
- CSP nonce: `src/hooks.server.ts`, `csp.config.mjs`
