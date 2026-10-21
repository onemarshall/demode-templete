// src/lib/auth.cli.ts
import { betterAuth } from 'better-auth';
import { Pool } from 'pg';
// Import any plugins that CREATE TABLES directly (not from your builders)
import { twoFactor, admin, magicLink, siwe, lastLoginMethod, jwt } from 'better-auth/plugins';
import { passkey } from '@better-auth/passkey';
import { creem } from '@creem_io/better-auth';
import { mcp } from '@better-auth/mcp';
import { cimd } from '@better-auth/cimd';
// The CLI runs under Node, so the bundled Node transport is used here.
// The app itself (Bun) injects its own transport via server/plugins/mcp.
import { fetchClientMetadataResource } from '@better-auth/cimd/node';

const MCP_RESOURCE = process.env.PUBLIC_SITE_URL || 'http://localhost:3000';

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
		// MCP OAuth provider schema (oauthClient, oauthAccessToken, oauthRefreshToken, oauthConsent, oauthClientAssertion)
		jwt(),
		mcp({
			loginPage: '/auth/sign-in',
			consentPage: '/auth/consent',
			resource: MCP_RESOURCE
		}),
		cimd({
			fetchClientMetadataResource,
			metadataProfile: 'mcp-2026-07-28'
		}),
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
