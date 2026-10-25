import { APIError, createAuthMiddleware, getSessionFromCtx, getAuthoritativeSessionFromCtx } from 'better-auth/api';
import type { BetterAuthPlugin } from 'better-auth';
import type { AdminOptions } from 'better-auth/plugins/admin';
import { defaultRoles } from 'better-auth/plugins/admin/access';
import { getAuthIntegrations } from './integrations';
import { isAdminUser, type UserWithRoles } from '../shared/roles';
import { logger } from '#lib/platform/logger.js';

export interface DeletionEligibility {
	allowed: boolean;
	reason: 'admin' | 'subscription' | 'unavailable' | null;
	message: string | null;
}

export interface DeletionSubscription {
	status: string;
	periodEnd: Date | string | null;
}

/** Cancellation scheduled for the future is not a completed subscription. */
export function subscriptionPreventsDeletion(subscription: DeletionSubscription, now = Date.now()): boolean {
	if (!['canceled', 'expired'].includes(subscription.status)) return true;
	const end = subscription.periodEnd === null ? NaN : new Date(subscription.periodEnd).getTime();
	return !Number.isFinite(end) || end > now;
}

export async function loadDeletionEligibility(user: UserWithRoles): Promise<DeletionEligibility> {
	if (isAdminUser(user)) {
		return { allowed: false, reason: 'admin', message: 'Administrator accounts cannot be deleted. Ask another administrator to remove your administrator role first.' };
	}
	try {
		// Inspect every subscription: the newest record can hide an older live subscription.
		const subscriptions = await getAuthIntegrations().loadDeletionSubscriptions(user.id);
		if (subscriptions.some((subscription) => subscriptionPreventsDeletion(subscription))) {
			return { allowed: false, reason: 'subscription', message: 'Resolve or cancel your subscription in billing and wait until its paid period has ended before deleting your account.' };
		}
		return { allowed: true, reason: null, message: null };
	} catch (error) {
		logger.error('[account deletion] Unable to verify billing eligibility', { userId: user.id, error: error instanceof Error ? error.message : String(error) });
		return { allowed: false, reason: 'unavailable', message: 'We could not check your subscription. Please try again later before deleting your account.' };
	}
}

export async function assertCanDeleteAccount(user: UserWithRoles): Promise<void> {
	// Retained tenancy obligations survive turning the feature flag off.
	await getAuthIntegrations().assertNoRetainedMemberships(user.id);
	const eligibility = await loadDeletionEligibility(user);
	if (!eligibility.allowed) {
		throw new APIError(eligibility.reason === 'unavailable' ? 'SERVICE_UNAVAILABLE' : 'FORBIDDEN', {
			code: 'ACCOUNT_DELETION_BLOCKED', message: eligibility.message ?? 'Account deletion is unavailable.'
		});
	}
}

/** Reject in the foreground, before Better Auth schedules its email hook. */
export const accountDeletionPolicyPlugin = {
	id: 'account-deletion-policy',
	hooks: {
		before: [{
			matcher: (ctx) => ctx.path === '/delete-user' || ctx.path === '/admin/remove-user',
			handler: createAuthMiddleware(async (ctx) => {
				if (ctx.path === '/admin/remove-user') {
					// Match the installed admin plugin's own permission calculation.
					// Resolve the caller first so unauthorised requests cannot inspect a target.
					const session = await getAuthoritativeSessionFromCtx(ctx);
					if (!session?.user) return;
					const adminPlugin = ctx.context.options.plugins?.find((plugin) => plugin.id === 'admin');
					if (!adminPlugin) return;
					const options = adminPlugin.options as AdminOptions | undefined;
					const callerRole = (session.user as { role?: string }).role ?? options?.defaultRole ?? 'user';
					const roles = (options?.roles ?? defaultRoles) as typeof defaultRoles;
					const allowed = options?.adminUserIds?.includes(session.user.id) || callerRole.split(',').some((role) =>
						roles[role as keyof typeof roles]?.authorize({ user: ['delete'] }).success
					);
					if (!allowed) return;
					const userId = ctx.body?.userId;
					if (typeof userId !== 'string' || userId === session.user.id) return;
					const target = await ctx.context.internalAdapter.findUserById(userId);
					if (target) await assertCanDeleteAccount(target);
					return;
				}
				const session = await getSessionFromCtx(ctx);
				if (session?.user) await assertCanDeleteAccount(session.user);
			})
		}]
	}
} satisfies BetterAuthPlugin;
