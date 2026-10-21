/**
 * MCP (Model Context Protocol) OAuth provider plugins.
 *
 * Composes the required trio from the MCP plugin documentation
 * (better-auth.com/docs/plugins/mcp):
 * - `jwt()` — required: provides the stable signing key for ID/access tokens
 *   and exposes the `/jwks` endpoint resource servers use to verify them
 * - `mcp()` — OAuth 2.1 authorization server for MCP clients
 * - `cimd()` — Client ID Metadata Document discovery pinned to the MCP
 *   2026-07-28 profile
 */

import { jwt } from 'better-auth/plugins';
import { mcp } from '@better-auth/mcp';
import { cimd } from '@better-auth/cimd';
import type { BetterAuthPlugin } from 'better-auth';
import type { FullEnv } from '$lib/auth/shared/env';
import { logger } from '$lib/auth/shared/logger';
import { fetchClientMetadataResource } from './mcp/transport';

export function buildMcpPlugins(env: FullEnv): BetterAuthPlugin[] {
	if (!env.AUTH_MCP_PLUGIN) {
		return [];
	}

	logger.info('MCP plugin enabled : Server', {
		loginPage: '/auth/sign-in',
		consentPage: '/auth/consent',
		resource: env.PUBLIC_SITE_URL
	});

	return [
		jwt(),
		mcp({
			loginPage: '/auth/sign-in',
			consentPage: '/auth/consent',
			resource: env.PUBLIC_SITE_URL
		}),
		cimd({
			fetchClientMetadataResource,
			metadataProfile: 'mcp-2026-07-28'
		})
	];
}
