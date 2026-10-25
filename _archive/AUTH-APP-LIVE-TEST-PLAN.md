# Auth App — Live Testing Plan

Date: 2026-10-22 · Purpose: verify the deployed app (Cloudflare Workers) actually works end-to-end — the part unit/component tests cannot reach. Companion to `AUTH-APP-AUDIT.md`.

## Principle

Test on **staging first** (same Worker, separate environment, dev flags on), then smoke-check production. Never test destructive or billing flows against production data. One throwaway test account per stage, deleted at the end.

## Preparation (one-time)

1. **Staging environment**: `wrangler` environment (e.g. `wrangler deploy --env staging`) with its own domain/subdomain, dev flags on (so `/api/admin/security/scenarios` works), test-mode Creem keys, test email settings.
2. **Test mailbox**: a catch-all mailbox you control (e.g. `test@yourdomain.com` catch-all → one inbox, or a Mailtrap/Resend test inbox) so verification/reset/magic-link/OTP emails are receivable.
3. **TOTP authenticator**: any authenticator app (or a browser extension) for 2FA enrolment.
4. **Logs running**: `npx wrangler tail --env staging --format pretty` in a terminal during every stage — this is your ground truth for what the Worker actually did.
5. **Admin account** on staging (and a second, non-admin account for permission checks).

## Stage 0 — Production smoke (safe, no accounts)

Run against the live domain; read-only GETs only:

- [ ] Every public page returns 200 and renders: `/`, `/auth/sign-in`, `/auth/sign-up`, `/auth/forgot-password`, `/auth/pricing`
- [ ] Health endpoints: `/api/health/security` and `/api/system-health` return 200 with expected JSON (DB/Redis/geo/CMS probes)
- [ ] Auth catch-all behaves: an unknown `/api/auth/xyz` returns a clean 4xx, not a 500
- [ ] Security headers present (CSP, HSTS, etc.) — check in browser devtools
- [ ] `wrangler tail --env production` during the checks: no unhandled errors
- [ ] APM shows the requests, no error spikes

## Stage 1 — Full account lifecycle (staging, test account #1)

The core loop, in order (each step depends on the last):

- [ ] **Sign up** with the test mailbox address → receive verification email → click link → verified
- [ ] **Sign in** with password (+captcha if enforced)
- [ ] **Profile**: change name; upload avatar; crop; confirm it persists after reload
- [ ] **Change email** → verify the *new* address → sign in again
- [ ] **Change password** → sign out → sign in with the new password
- [ ] **Sessions**: see the active session; sign out *that* session from the list; confirm revocation works (next request unauthenticated)
- [ ] **2FA**: enrol TOTP → confirm a code validates → sign out → sign in → **2FA challenge appears** → pass with a code
- [ ] **Recovery codes**: generate → view in `backup` → use one as a 2FA fallback → confirm it is consumed (single-use)
- [ ] **Passkey**: enrol a passkey → sign out → **sign in with the passkey** → confirm session
- [ ] **Trusted devices**: mark the current device trusted → confirm it appears in `trusted-devices`
- [ ] **Magic link**: request → receive email → click → signed in
- [ ] **OTP**: request → receive code → enter → signed in
- [ ] **Forgot password**: request reset → receive email → set new password → sign in with it
- [ ] **Last login method**: sign in twice with two methods; confirm the "last used" hint reflects reality
- [ ] **Delete account**: delete → confirm `goodbye` page → confirm the account can no longer sign in → check CMS user was removed/updated (sync)

## Stage 2 — Admin + security control room (staging, admin account)

- [ ] Non-admin account gets **403/redirect** on `/admin/*` (permission boundary)
- [ ] Admin signs in → **Users admin**: search, view, ban/unban a test user
- [ ] **Security dashboard, all five hero states live**: with criticals injected → red banner + dial + CTA; filter to criticals via the CTA; then clear/resolve to see high-only (amber), medium/low (no dial), and safe states
- [ ] **Inject scenarios** (staging only): new device, bot device, rapid requests, VPN/Tor/datacenter/malicious IP → each appears in the threat feed and triage queue with **humanised labels** ("traffic from the Tor network", not `tor_exit_node`)
- [ ] **Review flow**: open a review sheet → evidence shows matching events → acknowledge → status reflected; view-related jumps to the right investigate panel
- [ ] **Blocked IPs**: block a test IP → confirm it appears; (optionally) request from that IP and confirm enforcement
- [ ] **Rate limiting**: hammer a limited endpoint briefly → confirm throttle events appear in rate-limit stats
- [ ] **Escalation policy + automation feed**: confirm derived entries reflect what protection actually did
- [ ] **Infrastructure health panel**: probes show measured latencies, all operational

## Stage 3 — Billing (staging, Creem test mode)

- [ ] Start checkout (test mode) → complete with test card → webhook received (verify signature check in logs) → subscription state visible in `billing`
- [ ] Cancel/expire in Creem dashboard → webhook → billing page reflects the change
- [ ] Guest checkout API: `/api/checkout/guest` happy path + validation error path

## Stage 4 — Security engine under real conditions (staging)

- [ ] Geo enrichment: request from your real IP → BigDataCloud lookup recorded; check quota usage
- [ ] Bot signals: request with a curl user-agent → bot_device signal recorded
- [ ] Cookie inspection: session cookie flags (Secure, HttpOnly, SameSite) correct on the staging domain
- [ ] Concurrency: a few parallel sign-ins → no session corruption; Redis round-trip latencies sane in logs

## Stage 5 — Production go-live checks (after staging passes)

- [ ] Repeat Stage 0
- [ ] One real sign-in + 2FA + passkey with your own account (not a throwaway)
- [ ] Billing in live mode with a real (refunded) transaction, if applicable
- [ ] `wrangler tail` clean for 10 minutes of real traffic; APM baseline recorded
- [ ] Verify dev-gated test endpoints return **404 in production** (they must not be reachable)

## Automation notes (when you want it repeatable)

- A small Playwright suite can automate Stages 0–2: use Chrome's **virtual authenticator** (`--enable-features=WebAuthenticationPortable` / CDP WebAuthn) for passkeys, and a test-mailbox API (e.g. Mailtrap/Resend inbound) to fetch verification links and OTP codes programmatically.
- Keep the suite in the repo (`e2e/`), run it against staging in CI after deploy; production gets only Stage 0.
- The existing 600 unit/component tests stay the fast inner loop; E2E is the outer, slower gate.

## What "fully working" means here

Every feature in `AUTH-APP-AUDIT.md` §2 has been exercised once on staging end-to-end (Stage 1–4 checkboxes ticked), production smoke is clean (Stage 0/5), and `wrangler tail` showed no unhandled errors during any of it. That is the bar — after that, only changes need retesting.
