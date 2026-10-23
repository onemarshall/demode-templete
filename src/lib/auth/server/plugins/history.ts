import type { BetterAuthPlugin, HookEndpointContext } from 'better-auth';
import { createAuthMiddleware } from 'better-auth/api';
import { recordHistory, type HistoryCategory } from '../history.js';
import { logger } from '#lib/auth/shared/logger.js';

const TRACKED_PATHS: Record<string, { category: HistoryCategory; action: string }> = {
	'/change-password': { category: 'account', action: 'password_changed' },
	'/change-email': { category: 'account', action: 'email_change_requested' },
	'/update-user': { category: 'account', action: 'profile_updated' },
	'/two-factor/enable': { category: 'account', action: 'two_factor_setup_started' },
	'/two-factor/disable': { category: 'account', action: 'two_factor_disabled' },
	'/unlink-account': { category: 'account', action: 'account_unlinked' },
	'/passkey/verify-registration': { category: 'account', action: 'passkey_added' },
	'/passkey/delete-passkey': { category: 'account', action: 'passkey_deleted' },
	'/passkey/update-passkey': { category: 'account', action: 'passkey_updated' },
	'/delete-user': { category: 'account', action: 'account_deletion_requested' },
	'/admin/set-role': { category: 'admin', action: 'role_changed' },
	'/admin/remove-user': { category: 'admin', action: 'user_removed' }
};

function getOutcome(returned: unknown): 'success' | 'failure' {
	if (!returned || typeof returned !== 'object') return 'success';
	const result = returned as {
		status?: unknown;
		statusCode?: unknown;
		error?: unknown;
		response?: { status?: unknown };
	};
	if (
		(typeof result.status === 'number' && result.status >= 400) ||
		(typeof result.status === 'string' && result.status.length > 0) ||
		(typeof result.statusCode === 'number' && result.statusCode >= 400) ||
		(typeof result.response?.status === 'number' && result.response.status >= 400) ||
		result.error
	) return 'failure';
	return 'success';
}

export function historyPlugin(): BetterAuthPlugin {
	return {
		id: 'auth-history',
		hooks: {
			after: [
				{
					matcher: (ctx: HookEndpointContext) => Boolean(TRACKED_PATHS[ctx.path ?? '']),
					handler: createAuthMiddleware(async (ctx) => {
						const path = ctx.path ?? '';
						const tracked = TRACKED_PATHS[path];
						if (!tracked) return;
						const context = ctx.context as unknown as {
							session?: { user?: { id?: string } } | null;
							newSession?: { user?: { id?: string } } | null;
							returned?: unknown;
						};
						const body = (ctx as unknown as { body?: Record<string, unknown> }).body;
						const actorId = context.newSession?.user?.id ?? context.session?.user?.id;
						if (!actorId) return;
						const targetId = typeof body?.userId === 'string' ? body.userId : undefined;
						if (tracked.category === 'admin' && !targetId) return;
						try {
							await recordHistory({
								...tracked,
								outcome: getOutcome(context.returned),
								actorId,
								targetId,
								metadata: path === '/admin/set-role' && typeof body?.role === 'string' ? { role: body.role } : undefined
							});
						} catch {
							logger.error('[History] Failed to record authentication activity', { action: tracked.action });
						}
					})
				}
			]
		}
	};
}
