# Billing module

Owns the Creem Better Auth server plugin, subscription persistence queries,
guest-checkout remote function and billing UI. Product plans belong to the host
application (`#lib/app/plans.ts`), not to the reusable billing domain.

Use `components/index.ts` for UI and `remote/index.ts` for checkout RPC. Server code
lives under `server/`; `server/creem/index.ts` exports the plugin builder and
`server/subscription.ts` owns subscription reads. Keep server imports out of browser
code. Prefer shared type contracts over importing server implementation types.

The module requires auth's configured client/server, platform config/database/logger,
auth's captcha/rate-limit support for guest checkout, shared UI and styling. Direct
packages are `@creem_io/better-auth`, `creem`, `better-auth`, `zod` and SvelteKit,
plus dependencies of the auth and UI/platform code used.

The host supplies plan/product configuration, public URLs, Creem API credentials,
webhook secret, test/live mode and feature flags. Install the Creem plugin's Better
Auth schema (`creem_subscription` when persistence is enabled) and retain the auth
API route serving the plugin's endpoints/webhooks. This app connects subscription
checks and exports to auth via `app/billing-auth-policy.server.ts`; retain those
policies when billing is installed.

Copying this folder alone does not install auth, provider configuration, routes or
database tables. Follow `../../README.md` and replace host plan/UI integration for
the destination application.
