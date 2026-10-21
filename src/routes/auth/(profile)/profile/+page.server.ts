// src/routes/auth/profile/+page.server.ts
import { fail, redirect } from '@sveltejs/kit';
import { superValidate } from 'sveltekit-superforms';
import { zod4 } from 'sveltekit-superforms/adapters';
import { auth } from '$lib/auth';
import { profileSchema } from '$lib/components/forms/schema';
import { logger } from '$lib/auth/shared/logger';
import { getServerEnv } from '$lib/auth/shared/env';
import { getCMSProvider } from '$lib/auth/server/cms';
import { loadActiveSubscription } from '$lib/billing/subscription';
import type { DirectusCMSProviderType } from '$lib/auth/server/cms/providers/directus';
import type { Actions } from '@sveltejs/kit';
import { Pool } from 'pg';
export const load = async ({ request, depends, locals }) => {
	try {
		// Debug: Log request headers
		logger.info('Profile page request headers:', {
			cookie: request.headers.get('cookie'),
			authorization: request.headers.get('authorization'),
			userAgent: request.headers.get('user-agent')
		});

		// Get the session from Better Auth API
		const session = await auth.api.getSession({
			headers: request.headers
		});

		logger.info('Page load session:', {
			hasSession: !!session,
			hasUser: !!session?.user,
			userEmail: session?.user?.email,
			userId: session?.user?.id,
			sessionData: session?.session,
			fullSession: session
		});

		// Additional debugging for session structure
		if (session && !session.user) {
			logger.warn('Session exists but no user found - checking session structure:', {
				sessionKeys: session ? Object.keys(session) : [],
				sessionDataKeys: session?.session ? Object.keys(session.session) : [],
				hasSessionData: !!session?.session,
				sessionUserId: session?.session?.userId,
				sessionToken: session?.session?.token
			});

			// Try to manually validate the session token to see what's wrong
			const cookieHeader = request.headers.get('cookie');
			if (cookieHeader) {
				const sessionTokenMatch = cookieHeader.match(/better-auth\.session_token=([^;]+)/);
				if (sessionTokenMatch && sessionTokenMatch[1]) {
					const token = decodeURIComponent(sessionTokenMatch[1]);
					logger.info('Session token found:', {
						tokenLength: token.length,
						tokenPreview: token.substring(0, 50) + '...',
						hasDot: token.includes('.'),
						dotCount: (token.match(/\./g) || []).length
					});

					// Try to validate session by calling getSession with just the token
					try {
						// First, let's decode the session_data cookie manually to see what's in it
						const sessionDataCookie = cookieHeader.match(/better-auth\.session_data=([^;]+)/);
						if (sessionDataCookie && sessionDataCookie[1]) {
							const sessionData = decodeURIComponent(sessionDataCookie[1]);
							logger.info('Session data cookie found:', {
								dataLength: sessionData.length,
								dataPreview: sessionData.substring(0, 100) + '...',
								isBase64: sessionData.includes('.') && sessionData.split('.').length === 3,
								hasDots: sessionData.includes('.'),
								dotCount: (sessionData.match(/\./g) || []).length
							});

							// Try to decode the session data (it's base64 JSON, not JWT)
							try {
								// It's a base64-encoded JSON object, not a JWT
								const decodedData = JSON.parse(Buffer.from(sessionData, 'base64').toString());
								logger.info('Session data decoded successfully:', {
									hasSession: !!decodedData.session,
									hasUser: !!decodedData.session?.user,
									userId: decodedData.session?.session?.userId,
									userEmail: decodedData.session?.user?.email,
									userName: decodedData.session?.user?.name,
									lastLoginMethod: decodedData.session?.user?.lastLoginMethod
								});
							} catch (decodeError) {
								logger.warn('Failed to decode session data:', decodeError);
							}
						} else {
							logger.warn('No session_data cookie found');
						}

						const tokenSession = await auth.api.getSession({
							headers: {
								cookie: `better-auth.session_token=${token}`
							}
						});
						logger.info('Token session validation result:', {
							hasTokenSession: !!tokenSession,
							hasTokenUser: !!tokenSession?.user,
							tokenUserEmail: tokenSession?.user?.email,
							sessionData: tokenSession?.session,
							fullTokenSession: tokenSession
						});

						// Check if we can get the user ID from the session data
						if (tokenSession?.session?.userId) {
							logger.info('Session has userId, checking if user exists:', {
								userId: tokenSession.session.userId
							});

							// Try to find the user by querying the database directly
							try {
								// Use the imported Pool to check user directly
								const pool = new Pool({
									connectionString: process.env.BETTER_DATABASE_URL
								});

								const userQuery = await pool.query(
									'SELECT id, email, name FROM "user" WHERE id = $1',
									[tokenSession.session.userId]
								);

								logger.info('Direct database user lookup result:', {
									hasUser: userQuery.rows.length > 0,
									userEmail: userQuery.rows[0]?.email,
									userId: userQuery.rows[0]?.id,
									userName: userQuery.rows[0]?.name
								});

								await pool.end();
							} catch (dbError) {
								logger.error('Direct database user lookup failed:', dbError);
							}
						} else {
							logger.warn('Session has no userId - session data is incomplete');
						}
					} catch (tokenError) {
						logger.error('Token session validation failed:', tokenError);
					}
				}
			}
		}

		// If no user is found in the session, redirect to the sign-in page
		if (!session?.user) {
			logger.warn('No user in session, redirecting to sign-in');
			throw redirect(302, '/auth/sign-in');
		}

		// Mark dependencies for invalidation
		depends('auth:session');
		depends('auth:user');

		// Create form with user data pre-filled
		const form = await superValidate(
			{
				name: session.user.name || '',
				email: session.user.email,
				image: session.user.image || ''
			},
			zod4(profileSchema)
		);
		const allSessions = await auth.api.listSessions({ headers: request.headers }); // Check your auth library's API for the correct method

		// Fetch lastLoginMethod, password, and walletAddresses from database
		let lastLoginMethod: string | null = null;
		let password: string | null = null;
		let walletAddresses: Array<{
			id: string;
			userId: string;
			address: string;
			chainId: number;
			isPrimary: boolean;
			createdAt: Date;
		}> = [];
		try {
			const env = await getServerEnv();
			const databaseUrl =
				typeof env.BETTER_DATABASE_URL === 'string' ? env.BETTER_DATABASE_URL : undefined;
			if (!databaseUrl) {
				throw new Error('Database not configured');
			}
			const pool = new Pool({
				connectionString: databaseUrl
			});
			const client = await pool.connect();

			// Fetch lastLoginMethod from user table
			const userResult = await client.query('SELECT "lastLoginMethod" FROM "user" WHERE id = $1', [
				session.user.id
			]);
			if (userResult.rows.length > 0) {
				lastLoginMethod = userResult.rows[0].lastLoginMethod;
			}

			// Fetch password from account table (password is stored per provider)
			const accountResult = await client.query(
				'SELECT password FROM "account" WHERE "userId" = $1 AND "providerId" = $2',
				[session.user.id, 'email']
			);
			if (accountResult.rows.length > 0) {
				password = accountResult.rows[0].password;
			}

			// Fetch wallet addresses if SIWE is enabled
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

			client.release();
			await pool.end();
		} catch (error) {
			logger.warn('Failed to fetch user data from database', { error });
		}

		const cms = getCMSProvider() as DirectusCMSProviderType | null;
		let directusAvatarUrl: string | null | undefined = undefined;
		if (cms?.userSyncService) {
			try {
				const directusUser = await cms.userSyncService.findUser({
					email: session.user.email,
					id: session.user.id
				});

				const avatarField = directusUser?.avatar;
				let avatarAsset: string | { id: string } | null = null;
				if (typeof avatarField === 'string') {
					avatarAsset = avatarField;
				} else if (
					avatarField &&
					typeof avatarField === 'object' &&
					'id' in avatarField &&
					typeof (avatarField as { id?: unknown }).id === 'string'
				) {
					avatarAsset = { id: (avatarField as { id: string }).id };
				}

				directusAvatarUrl = avatarAsset ? cms.getAssetUrl(avatarAsset) : null;
			} catch (error) {
				logger.warn('Failed to read Directus avatar for profile page', { error });
				directusAvatarUrl = undefined;
			}
		} else {
			logger.warn('CMS provider (Directus) not initialized; skipping avatar lookup');
		}

		let oauthProviders: string[] = [];
		let oauthAccounts: Array<{ providerId: string; accountId: string }> = [];
		if (session.user) {
			try {
				const accountsResponse = await auth.api.listUserAccounts({ headers: request.headers });
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
				logger.warn('Failed to list user accounts during profile load', error);
			}
		}

		// Check if user has OAuth providers (exclude email, password, and credential which are not OAuth)
		const hasOauthProvider = oauthProviders.some(
			(provider) => provider !== 'email' && provider !== 'password' && provider !== 'credential'
		);

		const sessionUser = session.user as Record<string, unknown>;
		let currentImage =
			'image' in sessionUser && typeof sessionUser.image === 'string'
				? (sessionUser.image as string)
				: null;

		// Image resolution priority:
		// 1. Directus avatar (user-uploaded, source of truth)
		// 2. Stored image in user record (from OAuth or manual set)
		// 3. GitHub avatar constructed from account ID
		let resolvedImage = currentImage;
		if (directusAvatarUrl) {
			resolvedImage = directusAvatarUrl;
		}

		if (!resolvedImage) {
			const githubAccount = oauthAccounts.find((a) => a.providerId === 'github');
			if (githubAccount) {
				resolvedImage = `https://avatars.githubusercontent.com/u/${githubAccount.accountId}?s=200`;
				// Persist so subsequent loads don't need to reconstruct
				auth.api
					.updateUser({
						headers: request.headers,
						body: { image: resolvedImage }
					})
					.catch((err) => {
						logger.warn('Failed to persist OAuth avatar to user record', { error: err });
					});
			}
		}

		logger.info('Profile image resolution', {
			currentImage,
			directusAvatarUrl,
			resolvedImage
		});

		const normalizedUser = {
			...session.user,
			image: resolvedImage,
			twoFactorEnabled:
				'twoFactorEnabled' in sessionUser ? Boolean(sessionUser.twoFactorEnabled) : false,
			lastLoginMethod: lastLoginMethod,
			password: password,
			walletAddresses: walletAddresses,
			connectedProviders: oauthProviders,
			isOAuthUser: hasOauthProvider
		};

		logger.info('Normalized user with lastLoginMethod and walletAddresses:', {
			lastLoginMethod: normalizedUser.lastLoginMethod,
			walletAddressCount: walletAddresses.length,
			userKeys: Object.keys(session.user)
		});

		return {
			user: normalizedUser,
			session: session.session,
			allSessions,
			form,
			fraudAnalysis: locals.fraudAnalysis ?? null,
			subscription: await loadActiveSubscription(session.user.id)
		};
	} catch (error) {
		// Handle SvelteKit redirects properly
		if (error && typeof error === 'object' && 'status' in error) {
			throw error;
		}
		throw redirect(302, '/auth/sign-in');
	}
};

export const actions: Actions = {
	uploadAvatar: async ({ request }) => {
		try {
			const formData = await request.formData();
			const file = formData.get('avatar');

			if (!(file instanceof File) || file.size === 0) {
				return fail(400, { error: 'No avatar file provided.' });
			}

			const cms = getCMSProvider() as DirectusCMSProviderType | null;
			if (!cms?.userSyncService) {
				logger.error('CMS provider (Directus) not initialized for avatar upload');
				return fail(500, { error: 'Avatar uploads are not available.' });
			}

			// Get current session to find user
			const session = await auth.api.getSession({
				headers: request.headers
			});

			if (!session?.user) {
				return fail(401, { error: 'User not authenticated.' });
			}

			const directusUser = await cms.userSyncService.findUser({
				email: session.user.email,
				id: session.user.id
			});

			if (!directusUser) {
				logger.error('Directus user not found for avatar upload', {
					userId: session.user.id,
					email: session.user.email
				});
				return fail(500, { error: 'Unable to find Directus user for avatar upload.' });
			}

			const uploadedAvatarId = await cms.userSyncService.uploadAvatar(directusUser.id, file);

			if (!uploadedAvatarId) {
				return fail(500, { error: 'Failed to save avatar to Directus.' });
			}

			const imageUrl = cms.getAssetUrl(uploadedAvatarId);

			// Update Better Auth user
			await auth.api.updateUser({
				headers: request.headers,
				body: {
					image: imageUrl
				}
			});

			logger.info('Avatar uploaded and persisted', {
				betterAuthUserId: session.user.id,
				directusUserId: directusUser.id,
				uploadedAvatarId,
				imageUrl
			});

			return {
				image: imageUrl
			};
		} catch (error) {
			logger.error('Avatar upload failed', {
				error: error instanceof Error ? error.message : String(error),
				stack: error instanceof Error ? error.stack : undefined
			});
			let message = 'Failed to upload avatar. Please try again.';
			if (error instanceof Error) {
				message = error.message;
				// Check for common Directus errors
				if (message.includes('401') || message.includes('Unauthorized')) {
					message =
						'Directus authentication failed. Please check DIRECTUS_ADMIN_TOKEN configuration.';
				} else if (message.includes('403') || message.includes('Forbidden')) {
					message = 'Directus permission denied. Please check DIRECTUS_ADMIN_TOKEN permissions.';
				} else if (message.includes('404')) {
					message = 'Directus server not found. Please check DIRECTUS_URL configuration.';
				}
			} else if (typeof error === 'object' && error !== null) {
				try {
					message = JSON.stringify(error);
				} catch (stringifyError) {
					logger.warn('Failed to stringify avatar upload error', stringifyError);
				}
			} else if (typeof error === 'string') {
				message = error;
			}
			return fail(500, { error: message });
		}
	},
	importAvatar: async ({ request, fetch }) => {
		try {
			const formData = await request.formData();
			const urlValue = formData.get('url');
			const url = typeof urlValue === 'string' ? urlValue.trim() : '';

			if (!url) {
				return fail(400, { error: 'No avatar URL provided.' });
			}

			const cms = getCMSProvider() as DirectusCMSProviderType | null;
			if (!cms?.fileService) {
				logger.error('CMS provider (Directus) not initialized for avatar import');
				return fail(500, { error: 'Avatar imports are not available.' });
			}

			// Reuse CMS file upload by fetching the external URL and uploading via CMS
			const externalResponse = await fetch(url);
			if (!externalResponse.ok) {
				return fail(500, { error: 'Unable to fetch avatar URL.' });
			}
			const blob = await externalResponse.blob();
			const filename = url.split('/').pop() || 'avatar';
			const file = new File([blob], filename, { type: blob.type || 'application/octet-stream' });

			const uploaded = await cms.fileService.uploadFile(file);

			const imageUrl = cms.getAssetUrl(uploaded.id);

			await auth.api.updateUser({
				headers: request.headers,
				body: {
					image: imageUrl
				}
			});

			return {
				image: imageUrl
			};
		} catch (error) {
			logger.error('Avatar import failed', error);
			let message = 'Failed to import avatar. Please try again.';
			if (error instanceof Error) {
				message = error.message;
			} else if (typeof error === 'object' && error !== null) {
				try {
					message = JSON.stringify(error);
				} catch (stringifyError) {
					logger.warn('Failed to stringify avatar import error', stringifyError);
				}
			} else if (typeof error === 'string') {
				message = error;
			}
			return fail(500, { error: message });
		}
	},
	deleteAvatar: async ({ request }) => {
		try {
			// Get current session to find user
			const session = await auth.api.getSession({
				headers: request.headers
			});

			if (!session?.user) {
				return fail(401, { error: 'User not authenticated.' });
			}

			const cms = getCMSProvider() as DirectusCMSProviderType | null;

			// Remove avatar from Directus if CMS is available
			if (cms?.userSyncService) {
				try {
					// Find the Directus user
					const directusUser = await cms.userSyncService.findUser({
						email: session.user.email,
						id: session.user.id
					});

					if (directusUser) {
						// Delete the avatar from Directus
						await cms.deleteUserAvatar(directusUser.id);
						logger.info('Directus user avatar deleted', { 
							userId: session.user.id 
						});
					}
				} catch (syncError) {
					logger.warn('Failed to delete avatar from Directus user record', {
						error: syncError instanceof Error ? syncError.message : String(syncError),
						userId: session.user.id
					});
					// Don't fail the deletion, just log the sync issue
				}
			}

			// Clear the user's avatar
			await auth.api.updateUser({
				headers: request.headers,
				body: {
					image: null
				}
			});

			logger.info('Avatar deleted successfully');

			return {
				success: true
			};
		} catch (error) {
			logger.error('Avatar deletion failed', error);
			let message = 'Failed to delete avatar. Please try again.';
			if (error instanceof Error) {
				message = error.message;
			} else if (typeof error === 'object' && error !== null) {
				try {
					message = JSON.stringify(error);
				} catch (stringifyError) {
					logger.warn('Failed to stringify avatar deletion error', stringifyError);
				}
			} else if (typeof error === 'string') {
				message = error;
			}
			return fail(500, { error: message });
		}
	}
};
