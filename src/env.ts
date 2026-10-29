import { defineEnvVars } from '@sveltejs/kit/env';

/**
 * Environment variables exposed to the browser.
 *
 * SvelteKit 3 requires every variable that should reach the client to be
 * declared here. Each variable is declared as `public: true` and `static: false`,
 * which means the value is resolved at runtime (from `process.env` in Node, or
 * from the platform binding on Cloudflare Workers) and then delivered to the
 * browser through the SSR payload. That is what keeps the server and the
 * browser in agreement — no hydration mismatches.
 *
 * The schema below deliberately performs no coercion. The Zod schema in
 * `src/lib/auth/shared/env/env-schema.ts` stays the single source of truth for
 * parsing, defaults and validation, so the values are passed through as the
 * raw strings the platform provided.
 */
type PublicVar = {
	public: true;
	static: false;
	description: string;
	schema: (value: string | undefined) => string | undefined;
};

const publicVar = (description: string): PublicVar => ({
	public: true,
	static: false,
	description,
	schema: (value) => value
});

export const variables = defineEnvVars({
	// --- Core -------------------------------------------------------------
	PUBLIC_ENV_MODE: publicVar('Runtime mode: development | production | staging'),
	PUBLIC_APP_NAME: publicVar('Name shown in the UI and in auth pages'),
	PUBLIC_SITE_URL: publicVar('Public origin of the deployed site'),
	PUBLIC_AUTH_DEBUG_MODE: publicVar('Enables verbose auth debugging in the browser'),
	PUBLIC_BETTER_AUTH_URL: publicVar('Public URL of the better-auth server'),
	PUBLIC_AUTH_CALLBACK_URL: publicVar('Public URL used for auth callbacks'),
	PUBLIC_AUTH_SESSION_TOKEN_EXPIRES_IN: publicVar('Session token lifetime, e.g. "7d"'),

	// --- Auth features ----------------------------------------------------
	PUBLIC_AUTH_SOCIAL_LOGINS_ENABLED: publicVar('Renders the social sign-in buttons'),
	PUBLIC_AUTH_PASSKEYS_PLUGIN: publicVar('Enables passkey (WebAuthn) sign-in'),
	PUBLIC_AUTH_2FA_PLUGIN: publicVar('Enables two-factor authentication'),
	PUBLIC_AUTH_2FA_ISSUER: publicVar('Issuer shown by authenticator apps'),
	PUBLIC_AUTH_MAGIC_LINK_PLUGIN: publicVar('Enables magic-link sign-in'),
	PUBLIC_AUTH_ADMIN_PLUGIN: publicVar('Enables the admin plugin'),
	PUBLIC_AUTH_LAST_LOGIN_METHOD_PLUGIN: publicVar('Shows the last used sign-in method'),
	PUBLIC_AUTH_EMAIL_OTP_PLUGIN: publicVar('Enables email one-time-password sign-in'),
	PUBLIC_AUTH_MAX_SESSIONS: publicVar('Maximum number of concurrent sessions'),
	PUBLIC_AUTH_SIWE_PLUGIN: publicVar('Enables Sign-In With Ethereum'),
	PUBLIC_AUTH_SECURITY_PLUGIN: publicVar('Enables the unified security plugin'),
	PUBLIC_STRIPE_ENABLED: publicVar('Enables Stripe billing'),
	PUBLIC_WALLETCONNECT_ID: publicVar('WalletConnect Cloud project id'),

	// --- Social providers -------------------------------------------------
	PUBLIC_AUTH_GITHUB_ENABLED: publicVar('Shows the GitHub sign-in button'),
	PUBLIC_AUTH_GOOGLE_ENABLED: publicVar('Shows the Google sign-in button'),
	PUBLIC_AUTH_DISCORD_ENABLED: publicVar('Shows the Discord sign-in button'),
	PUBLIC_AUTH_LINKEDIN_ENABLED: publicVar('Shows the LinkedIn sign-in button'),
	PUBLIC_AUTH_TWITTER_ENABLED: publicVar('Shows the Twitter sign-in button'),

	// --- Security ---------------------------------------------------------
	PUBLIC_TRUSTED_IPS: publicVar('Comma separated list of trusted IP addresses'),
	PUBLIC_CAP_KEY: publicVar('Cap.js site key'),
	PUBLIC_CAP_ENDPOINT: publicVar('Cap.js API endpoint'),

	// --- CMS --------------------------------------------------------------
	PUBLIC_CMS_URL: publicVar('Public URL of the headless CMS'),

	// --- Storage ----------------------------------------------------------
	PUBLIC_STORAGE_TYPE: publicVar('Storage backend: local | s3 | cloudinary'),
	PUBLIC_S3_BUCKET: publicVar('S3 bucket name'),
	PUBLIC_S3_REGION: publicVar('S3 region'),
	PUBLIC_CLOUDINARY_CLOUD_NAME: publicVar('Cloudinary cloud name')
});
