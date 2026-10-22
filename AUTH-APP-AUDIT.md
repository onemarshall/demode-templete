# Auth App — Functional Audit

Date: 2026-10-22 · Scope: the whole auth app (SvelteKit + Better Auth + Cloudflare Workers). Verified against the code; anything inferred is labelled.

## 1. What the app is

A complete, self-hosted authentication and account system: public auth flows, authenticated account area, admin area, a custom security engine with a triage control room, billing (Creem), CMS sync (Directus), email (Resend), and monitoring. Deployed as a Cloudflare Worker (static assets + server) with external services over HTTP (no KV/D1/R2 bindings in wrangler.jsonc).

## 2. Feature inventory

### Public auth flows (`/auth/(public)`)
| Feature | Route | Notes |
|---|---|---|
| Email/password sign-in (+captcha) | `sign-in` | captcha via @better-captcha |
| Sign-up | `sign-up` | email verification flow |
| Magic-link sign-in / sign-up + verify | `sign-in-magic-link`, `sign-up-magic-link` | MagicLink plugin (env-gated) |
| OTP sign-in + verify | `sign-in-otp` | EmailOTP plugin (env-gated) |
| Wallet sign-in (SIWE) + unlink | `sign-in-siwe`, `api/siwe/unlink-wallet` | SIWEPlugin (env-gated) |
| 2FA challenge | `2fa` | TwoFactor plugin; recently modernised |
| Forgot / reset password | `forgot-password`, `reset-password` | |
| Account recovery | `account-recovery` | |
| Verify email | `verify-email` | |
| OAuth consent | `consent` | |
| Pricing | `pricing` | |
| Account-deleted | `goodbye` | |

### Authenticated area (`/auth/(app)`)
| Feature | Route | Notes |
|---|---|---|
| Dashboard | `dashboard` | |
| Profile + avatar (upload + crop) | `profile`, `profile/avatar` | image-cropper UI |
| User security settings | `security` | 2FA/passkey management |
| Sessions | `sessions` | list/revoke |
| Trusted devices | `trusted-devices` | |
| Backup (recovery codes) | `backup` | |
| Billing | `billing` | Creem plugin (@creem_io/better-auth) |
| Change email / password | `change-email`, `change-password` | |
| Set password | `set-password` | for OAuth-only accounts |

### Admin area (`/(admin)/admin`)
| Feature | Route | Notes |
|---|---|---|
| Users admin | `users` | |
| Security control room | `security` | Today/Investigate/Trends; triage queue, review sheets, escalation policy, automation feed, infrastructure health; the newly rebuilt StatusHero (dial + CTA + 5 states) |
| Security test scenarios | `security-test` | dev-gated |
| Security data JSON | `security.json` | |

### APIs
`api/auth/[...all]` (Better Auth), `api/checkout/guest` (Creem), `api/confirm-delete`, `api/delete`, `api/email`, `api/health/security`, `api/system-health` (DB/Redis/geo/CMS probes), `api/mcp` (MCP integration), `api/test/directus`, `api/test-live-threats`, `api/admin/security/scenarios` + `inject` (**dev/test-gated — 404 in production**, verified).

### Better Auth plugins (all env-gated, verified in `modules/core.ts`)
Last Login Method (always on) · Admin · Passkey · Two-Factor · Magic Link · SIWE · Email OTP · One-Time Token · OAuth Proxy · Creem · custom Security plugin (risk engine) · CMS plugin (Directus bidirectional sync) · MCP plugins.

### Security engine (`lib/auth/security`)
Risk engine (0–100 score, levels) · geo feature (BigDataCloud; VPN/Tor/proxy/datacenter/malicious-IP reputation, high-risk-country, hosting likelihood) · device feature (new device, bot UA, suspicious headers) · session feature (impossible travel, hijack signals) · rate limiting · blocked IPs · threat feed generation · triage/derive layer (prioritised reviews, incident counts, filters) · automation actions (derived from what protection actually did) · escalation policy · infrastructure health probes · humanised risk-factor labels (added 2026-10-22).

## 3. Test coverage (what exists)

61 test files, ~600 tests, all green (verified this session): unit + component tests via vitest / vitest-browser-svelte. Coverage is strong on: admin-security components and SDK, triage/derive logic, security engine units (risk engine, context, hooks), auth page components (sign-in, sign-up, 2FA, forgot/reset, profile, sessions, set-password, backup, change-email, trusted-devices), database hooks, session serializer, CMS boundary, remote functions, env mocks.

## 4. What unit/component tests cannot verify (the live gaps)

1. **Passkey E2E** — WebAuthn needs a real browser + authenticator (or a virtual authenticator in automation).
2. **Email round-trips** — verification, reset, magic link, OTP: links/codes must be received in a real mailbox and used.
3. **OAuth provider round-trips** — Google/GitHub/etc. callback → account link.
4. **Creem billing** — checkout session, webhook signature verification, subscription lifecycle states.
5. **SIWE wallet flow** — needs a wallet extension.
6. **Live geo/IP reputation** — BigDataCloud quotas and real-IP behaviour.
7. **Rate limiting under real load on Workers** — Redis round-trip latency, isolate behaviour.
8. **Session cookies on the deployed domain** — Secure/SameSite/domain attributes in production.
9. **CMS sync round-trip** — DB → Directus → webhook → DB invalidation.
10. **Ops realities** — cold starts, CPU limits, error rates under real traffic; APM visibility.
11. **Security scenario injection** — dev-gated endpoints are 404 in production; live scenario testing needs a staging deployment with dev flags.

## 5. Improvements for own-use (highest value first)

1. **Cloud-reachable Postgres** — the deploy blocker found 2026-10-22: `BETTER_DATABASE_URL` points at `localhost:5431` (the Directus dev DB), unreachable from Workers. A managed Postgres (or VPS Postgres + Tunnel) is the prerequisite for any live testing.
2. **Captcha wiring (security gap found 2026-10-22)** — CapWidget is mounted only on the pricing page; `AuthCaptchaPanel` is dead code (no page imports it). Server-side, `provider: 'capjs'` is hardcoded with no secret: the verifier auto-passes in dev and refuses under `NODE_ENV=production` — on the deployed Worker (`NODE_ENV` unset) every token auto-passes. Fix as one piece: real `siteverify` against the self-hosted cap instance (`POST {endpoint}/{siteKey}/siteverify`, `{ secret, response }` — reCAPTCHA-compatible), wire `CAP_SECRET` into the plugin config, put the site key into `PUBLIC_CAP_ENDPOINT`'s path (current `.env` has the bare domain; `PUBLIC_CAP_KEY` is never appended), and mount the panel on sign-in.
3. **Staging deployment** — same Worker, separate env with dev flags on. Unlocks live scenario testing and safe billing/email testing.
4. **Review-status persistence** — triage actions are hardcoded `'new'`; persisting acknowledge/resolve makes the review workflow and future progress indicators real.
5. **Cookie cache re-enable** — the config comment notes secondaryStorage was disabled for CMS-sync freshness; a short `cookieCache` maxAge (~30s) would cut DB load per request. Test against the sync behaviour.
6. **E2E smoke suite** — a small Playwright suite (10–15 flows) runnable against staging; use Chrome's virtual authenticator for passkeys.
7. **APM alerting** — apm.ts exists; wire alerts for auth error spikes and infrastructure-probe failures.
8. **Security-event export** — CSV/JSON export of the event sample for your own analysis/backup.
9. **Avatar storage on Workers** — `STORAGE_PROVIDER=local` cannot persist on Workers (no filesystem); avatar uploads need S3/Cloudinary configured before profile avatars work in production.

## 6. Verification status of this audit

Route/plugin inventory, dev-gating of test endpoints, plugin list, and test counts: verified by reading code and running the suite this session. Billing depth (Creem wiring completeness), social-provider configuration, and MCP integration depth: inferred from file presence and config structure — not verified end-to-end. The live test plan is designed to close exactly these.
