/**
 * MCP protected resource route (MCP 2026-07-28 stateless profile).
 *
 * Serves JSON-RPC MCP requests over POST, protected by Better Auth's
 * `requireMcpAuth` (RFC 9728 protected resource): access tokens are verified
 * against the auth server's JWKS with DPoP enforcement when bound.
 *
 * Only `POST` is exported, so the framework answers other methods with
 * `405 Method Not Allowed`. Requires `AUTH_MCP_PLUGIN=true` (and the
 * `mcp({ resource })` plugin registration) to work.
 */

import { z } from 'zod';
import { McpServer, createMcpHandler } from '@modelcontextprotocol/server';
import { requireMcpAuth } from '@better-auth/mcp';
import { auth } from '#lib/auth/server/index.js';
import { getServerEnv } from '#lib/auth/shared/env/index.js';

const env = await getServerEnv();
// Must match `mcp({ resource })` in server/plugins/mcp.ts
const resource = env.PUBLIC_SITE_URL;

const mcpServerHandler = createMcpHandler(
	() => {
		const server = new McpServer({
			name: 'iam-studio-mcp',
			version: '0.1.0'
		});

		server.registerTool(
			'echo',
			{
				description: 'Echo a message back to the caller',
				inputSchema: z.object({ message: z.string() })
			},
			async ({ message }) => ({
				content: [{ type: 'text', text: `Tool echo: ${message}` }]
			})
		);

		return server;
	},
	{
		// Accept only the MCP 2026-07-28 protocol; reject the session-oriented 2025 protocol
		legacy: 'reject'
	}
);

export const POST = requireMcpAuth(
	auth,
	(request) => mcpServerHandler.fetch(request),
	{
		resource
	}
);
