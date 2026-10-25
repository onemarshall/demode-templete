// src/lib/auth.cli.ts
import { betterAuth } from 'better-auth';
import { Pool } from 'pg';
// Import any plugins that CREATE TABLES directly (not from your builders)
import { twoFactor, admin, magicLink, siwe, lastLoginMethod, organization } from 'better-auth/plugins';
import { passkey } from '@better-auth/passkey';
import { creem } from '@creem_io/better-auth';
import { ac, owner, admin as organizationAdmin, member } from '../src/lib/modules/auth/features/organization/permissions.js';

const PASSKEY_ENABLED = process.env.PUBLIC_AUTH_PASSKEYS_PLUGIN === 'true';
const PASSKEY_RPID = process.env.PUBLIC_AUTH_PASSKEY_RPID;
const PASSKEY_ORIGIN = process.env.PUBLIC_AUTH_PASSKEY_ORIGIN;
const PASSKEY_RP_NAME = process.env.PUBLIC_AUTH_PASSKEY_RP_NAME || process.env.PUBLIC_APP_NAME;
const DATABASE_URL = process.env.BETTER_DATABASE_URL;

if (!DATABASE_URL) {
	throw new Error('BETTER_DATABASE_URL is required');
}

export const auth = betterAuth({
	database: new Pool({
		connectionString: DATABASE_URL
	}),
	emailAndPassword: {
		enabled: true
	},
	session: {
		expiresIn: 60 * 60 * 24 * 7,
		updateAge: 60 * 60 * 24
	},
	plugins: [
		lastLoginMethod({
			storeInDatabase: true
		}),
		admin(),
		// Montsel tenancy foundation (Appendix B.3 decisions; hooks are not
		// needed for schema generation).
		organization({
			ac,
			roles: { owner, admin: organizationAdmin, member },
			allowUserToCreateOrganization: true,
			organizationLimit: 10,
			membershipLimit: 100,
			requireEmailVerificationOnInvitation: true,
			disableOrganizationDeletion: true,
			cancelPendingInvitationsOnReInvite: true,
			async sendInvitationEmail() {}
		}),
		// Minimal config to satisfy required args; this file is only for migrations
		magicLink({
			async sendMagicLink() {
				return;
			}
		}),
		// Minimal config; CLI only needs schema generation
		siwe({
			// placeholder config to satisfy signature; adjust if you need SIWE tables
			domain: process.env.PUBLIC_SIWE_DOMAIN || 'localhost',
			getNonce: async () => 'nonce',
			verifyMessage: async () => true
		}),
		twoFactor(),
		creem({
			apiKey: process.env.CREEM_API_KEY || 'cli-placeholder',
			webhookSecret: process.env.CREEM_WEBHOOK_SECRET,
			testMode: true,
			persistSubscriptions: true
		}),
		...(PASSKEY_ENABLED && PASSKEY_RPID && PASSKEY_ORIGIN
			? [passkey({ rpID: PASSKEY_RPID, rpName: PASSKEY_RP_NAME || 'App', origin: PASSKEY_ORIGIN })]
			: [])
	]
});

export default auth;
