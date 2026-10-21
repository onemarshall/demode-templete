// src/lib/auth/server/user-context.ts
import { Pool } from 'pg';
import { auth } from '#lib/auth.js';
import { logger } from '#lib/auth/shared/logger.js';
import { getServerEnv } from '#lib/auth/shared/env/index.js';

export interface WalletAddress {
	id: string;
	userId: string;
	address: string;
	chainId: number;
	isPrimary: boolean;
	createdAt: Date;
}

export interface OAuthAccount {
	providerId: string;
	accountId: string;
}

export interface AuthUserContext {
	session: NonNullable<Awaited<ReturnType<typeof auth.api.getSession>>>['session'];
	user: Record<string, unknown>;
	rawUser: Record<string, unknown>;
	oauthAccounts: OAuthAccount[];
}

/**
 * Load the session plus the extended user fields the account pages need
 * (lastLoginMethod, password presence, wallet addresses, OAuth providers).
 * Returns null when there is no authenticated user.
 */
export async function loadAuthUserContext(headers: Headers): Promise<AuthUserContext | null> {
	const session = await auth.api.getSession({ headers });
	if (!session?.user) {
		return null;
	}

	let lastLoginMethod: string | null = null;
	let password: string | null = null;
	let walletAddresses: WalletAddress[] = [];

	try {
		const env = await getServerEnv();
		const databaseUrl =
			typeof env.BETTER_DATABASE_URL === 'string' ? env.BETTER_DATABASE_URL : undefined;
		if (!databaseUrl) {
			throw new Error('Database not configured');
		}
		const pool = new Pool({ connectionString: databaseUrl });
		const client = await pool.connect();
		try {
			const userResult = await client.query(
				'SELECT "lastLoginMethod" FROM "user" WHERE id = $1',
				[session.user.id]
			);
			if (userResult.rows.length > 0) {
				lastLoginMethod = userResult.rows[0].lastLoginMethod;
			}

			const accountResult = await client.query(
				'SELECT password FROM "account" WHERE "userId" = $1 AND "providerId" = $2',
				[session.user.id, 'email']
			);
			if (accountResult.rows.length > 0) {
				password = accountResult.rows[0].password;
			}

			try {
				const walletResult = await client.query(
					'SELECT id, "userId", address, "chainId", "isPrimary", "createdAt" FROM "walletAddress" WHERE "userId" = $1 ORDER BY "isPrimary" DESC, "createdAt" DESC',
					[session.user.id]
				);
				walletAddresses = walletResult.rows || [];
			} catch (walletError) {
				// walletAddress table might not exist if SIWE is not enabled
				logger.debug('walletAddress table query failed (SIWE may not be enabled)', {
					error: walletError
				});
			}
		} finally {
			client.release();
			await pool.end();
		}
	} catch (error) {
		logger.warn('Failed to fetch user data from database', { error });
	}

	let oauthProviders: string[] = [];
	let oauthAccounts: OAuthAccount[] = [];
	try {
		const accountsResponse = await auth.api.listUserAccounts({ headers });
		if (Array.isArray(accountsResponse)) {
			for (const account of accountsResponse) {
				if (!account || typeof account !== 'object') continue;
				const providerId =
					('providerId' in account && typeof account.providerId === 'string'
						? account.providerId
						: null) ??
					('provider' in account && typeof account.provider === 'string'
						? account.provider
						: null);
				const accountId =
					'accountId' in account && typeof account.accountId === 'string'
						? account.accountId
						: null;
				if (providerId) {
					oauthProviders.push(providerId);
					if (accountId) {
						oauthAccounts.push({ providerId, accountId });
					}
				}
			}
		}
	} catch (error) {
		logger.warn('Failed to list user accounts', { error });
	}

	// Exclude email/password/credential which are not OAuth providers
	const hasOauthProvider = oauthProviders.some(
		(provider) => provider !== 'email' && provider !== 'password' && provider !== 'credential'
	);

	const sessionUser = session.user as Record<string, unknown>;

	const normalizedUser = {
		...session.user,
		twoFactorEnabled:
			'twoFactorEnabled' in sessionUser ? Boolean(sessionUser.twoFactorEnabled) : false,
		lastLoginMethod,
		password,
		walletAddresses,
		connectedProviders: oauthProviders,
		isOAuthUser: hasOauthProvider
	} as Record<string, unknown>;

	return {
		session: session.session,
		user: normalizedUser,
		rawUser: sessionUser,
		oauthAccounts
	};
}
