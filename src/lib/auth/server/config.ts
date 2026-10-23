/**
 * Server Auth Configuration
 *
 * Clean configuration using unified email module.
 * No more options/email.ts needed!
 */

import { betterAuth, type BetterAuthOptions } from 'better-auth';
import { testUtils } from 'better-auth/plugins';

// Email - single import, clean API
import { initializeEmail, getEmailVerificationConfig, getEmailAndPasswordConfig } from './email';

// Core imports
import { buildCorePlugins } from './plugins/core';
import { buildSecurityPlugins } from './plugins/security';
import { buildCMSPlugin } from './plugins/cms';
import { getDatabaseOptions } from './options/database';
import { getUserOptions } from './options/user';
import { getSocialProviders } from './options/socials';
import { databaseHooks } from './options/databaseHooks';
import { getServerEnv } from '#lib/auth/shared/env/index.js';
import { accountDeletionPolicyPlugin } from './deletion-policy';
import { accountUnlinkPolicyPlugin } from './account-unlink-policy';
import { historyPlugin } from './plugins/history';

const env = await getServerEnv();

// ============================================
// Initialize Email FIRST
// ============================================
await initializeEmail(env);

const handleBackgroundTask = (promise: Promise<unknown>) => {
	void promise.catch((error) => {
		console.error('[better-auth background task failed]', error);
	});
};

const trustedOrigins = Array.from(
	new Set(
		[
			env.PUBLIC_SITE_URL,
			env.PUBLIC_BETTER_AUTH_URL,
			env.PUBLIC_AUTH_CALLBACK_URL,
			// OAuth proxy: the dev origin must be trusted so it can receive the
			// encrypted profile redirect back from the production callback.
			'http://localhost:7101'
		].filter(Boolean)
	)
);

// ============================================
// Build Plugins
// ============================================
const cmsPlugin = await buildCMSPlugin(env);

// ============================================
// Better Auth Configuration
// ============================================
export const auth = betterAuth({
	appName: env.PUBLIC_APP_NAME,
	baseURL: env.PUBLIC_BETTER_AUTH_URL,

	// Database
	...(await getDatabaseOptions()),

	// Email - clean, single-line configs from ./email module
	emailVerification: getEmailVerificationConfig(),
	emailAndPassword: getEmailAndPasswordConfig(),

	// User
	user: getUserOptions(),

	// Social providers
	socialProviders: await getSocialProviders(env),

	// Storage — disabled to allow Directus bidirectional sync to reflect immediately
	// The trade-off is slightly more DB load per page request without the session caches. For production, you could re-enable cookieCache with a short maxAge (e.g., 30 seconds) if needed — the secondaryStorage
	// is the one that was causing stale data since Better Auth's internal instance couldn't be invalidated from the webhook.

	// secondaryStorage: await secondaryStorage(env),

	// Plugins
	plugins: [
		accountDeletionPolicyPlugin,
		accountUnlinkPolicyPlugin,
		historyPlugin(),
		...buildCorePlugins(env),
		...buildSecurityPlugins(env),
		...(cmsPlugin ? [cmsPlugin] : []),
		// Add test utils in test environment
		...(process.env.NODE_ENV === 'test' ? [testUtils({ captureOTP: true })] : [])
	],

	// Database hooks
	databaseHooks,

	// Account management
	account: {
		accountLinking: {
			enabled: true,
			trustedProviders: ['google', 'github'], // Auto-link trusted providers
			allowDifferentEmails: false, // Require same email for linking
			updateUserInfoOnLink: true // Update user info when linking
		}
	},

	// Session
	// Sessions persist to the database by default (no secondaryStorage configured),
	// so `storage: "database"` is not a valid 1.7 option and is omitted.
	session: {
		expiresIn: 60 * 60 * 24 * 7,
		updateAge: 60 * 60 * 24,
		freshAge: 60 * 60, // 1 hour freshness for sensitive operations
		cookieCache: {
			enabled: false,
			maxAge: 5 * 60 // 5 minutes in seconds
		}
	},

	trustedOrigins,

	// Advanced cookie configuration
	advanced: {
		disableCSRFCheck: false,
		useSecureCookies: process.env.NODE_ENV === 'production',
		cookiePrefix: 'iam-studio',
		backgroundTasks: {
			handler: handleBackgroundTask
		},
		crossSubDomainCookies: {
			enabled: false // Set to true if using subdomains
		}
	}
} as BetterAuthOptions);

// Type exports
export type Auth = typeof auth;
export type User = Auth['$Infer']['Session']['user'];
export type Session = Auth['$Infer']['Session']['session'];
