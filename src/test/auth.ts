import { betterAuth } from 'better-auth';
import { testUtils } from 'better-auth/plugins';
import { admin } from 'better-auth/plugins/admin';
import { twoFactor } from 'better-auth/plugins/two-factor';
import { magicLink } from 'better-auth/plugins/magic-link';
import { passkey } from '@better-auth/passkey';
import Database from 'better-sqlite3';

export const db = new Database(':memory:');

/**
 * Magic-link tokens are generated inside better-auth, so they are captured from
 * the `sendMagicLink` callback instead of the OTP store used by the test-utils
 * plugin.
 */
export const magicLinkTokens = new Map<string, string>();

export const auth = betterAuth({
	database: db,
	secret: 'test-secret',
	baseURL: 'http://localhost:3000',
	appName: 'test-app',
	emailAndPassword: {
		enabled: true,
		sendResetPassword: async () => {},
	},
	user: {
		deleteUser: { enabled: true },
	},
	plugins: [
		testUtils({ captureOTP: true }),
		passkey(),
		magicLink({
			sendMagicLink: async ({ email, token }) => {
				magicLinkTokens.set(email, token);
			},
		}),
		twoFactor(),
		admin(),
	],
	advanced: {
		cookiePrefix: 'iam-studio',
	},
});

export async function getTestHelpers() {
	const ctx = await auth.$context;
	const helpers = ctx.test;
	const getOTP = helpers.getOTP;
	// Prefer the OTP store, but fall back to captured magic-link tokens so that
	// `getOTP(email)` works for both flows.
	helpers.getOTP = (identifier: string) =>
		getOTP?.(identifier) ?? magicLinkTokens.get(identifier);
	return helpers;
}

// Type exports to match production config ($lib/auth/server/config)
export type Auth = typeof auth;
export type User = Auth['$Infer']['Session']['user'];
export type Session = Auth['$Infer']['Session']['session'];
