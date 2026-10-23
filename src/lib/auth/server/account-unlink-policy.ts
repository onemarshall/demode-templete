import { APIError, createAuthMiddleware, getSessionFromCtx } from 'better-auth/api';
import type { BetterAuthPlugin } from 'better-auth';

interface LoginAccount {
	id: string;
	providerId: string;
	password?: string | null;
}

/** Count only methods this installation can actually use to authenticate. */
export function hasUsableAlternative(
	accounts: LoginAccount[],
	removedId: string,
	configuredProviders: ReadonlySet<string>,
	passwordEnabled: boolean
): boolean {
	return accounts.some((account) => {
		if (account.id === removedId) return false;
		if (['credential', 'email', 'password'].includes(account.providerId)) {
			return passwordEnabled && typeof account.password === 'string' && account.password.length > 0;
		}
		return configuredProviders.has(account.providerId);
	});
}

/** Better Auth also enforces session freshness and its native last-account rule. */
export const accountUnlinkPolicyPlugin = {
	id: 'account-unlink-policy',
	hooks: {
		before: [{
			matcher: (ctx) => ctx.path === '/unlink-account',
			handler: createAuthMiddleware(async (ctx) => {
				const session = await getSessionFromCtx(ctx);
				if (!session?.user || typeof ctx.body?.accountId !== 'string') return;
				const accounts = await ctx.context.internalAdapter.findAccounts(session.user.id);
				// Leave invalid IDs and unauthenticated requests to the native endpoint.
				if (!accounts.some((account) => account.id === ctx.body.accountId)) return;
				const providers = new Set(ctx.context.socialProviders.map((provider) => provider.id));
				if (!hasUsableAlternative(accounts, ctx.body.accountId, providers, ctx.context.options.emailAndPassword?.enabled === true)) {
					throw new APIError('BAD_REQUEST', {
						code: 'LAST_USABLE_LOGIN_METHOD',
						message: 'Set a password or connect another enabled provider before disconnecting your last usable sign-in method.'
					});
				}
			})
		}]
	}
} satisfies BetterAuthPlugin;
