# Billing module

Owns the Stripe Better Auth server plugin, subscription persistence reads,
guest-checkout remote function and billing UI. Product plans and Stripe price ids
belong to the host application (`#lib/app/plans.ts`,
`#lib/app/stripe-plans.server.ts`), not to the reusable billing domain.

Use `components/index.ts` for UI and `remote/index.ts` for checkout RPC. Server code
lives under `server/`; `server/stripe/index.ts` exports the plugin builder and
`server/subscription.ts` owns subscription reads. Keep server imports out of browser
code. Prefer shared type contracts over importing server implementation types.

The module requires auth's configured client/server, platform config/database/logger,
auth's captcha/rate-limit support for guest checkout, shared UI and styling. Direct
packages are `@better-auth/stripe`, `stripe`, `better-auth`, `zod` and SvelteKit,
plus dependencies of the auth and UI/platform code used.

The host supplies plan/price configuration, public URLs, Stripe secret key, webhook
secret and feature flags. The plugin owns the `subscription` table and
`user.stripeCustomerId`; install them with the Better Auth CLI. Retain the auth API
route serving the plugin's endpoints and webhook
(`/api/auth/stripe/webhook`). This app connects subscription checks and exports to
auth via `app/billing-auth-policy.server.ts`; retain those policies when billing is
installed.

Copying this folder alone does not install auth, provider configuration, routes or
database tables. Follow `../../README.md` and replace host plan/UI integration for
the destination application.
