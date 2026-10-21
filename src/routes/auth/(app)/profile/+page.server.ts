// src/routes/auth/profile/+page.server.ts
import { fail, redirect } from '@sveltejs/kit';
import { superValidate } from 'sveltekit-superforms';
import { zod4 } from 'sveltekit-superforms/adapters';
import { auth } from '#lib/auth.js';
import { profileSchema } from '#lib/components/forms/schema.js';
import { logger } from '#lib/auth/shared/logger.js';
import { getCMSProvider } from '#lib/auth/server/cms/index.js';
import { loadAuthUserContext } from '#lib/auth/server/user-context.js';
import type { DirectusCMSProviderType } from '#lib/auth/server/cms/providers/directus/index.js';
import type { Actions } from '@sveltejs/kit';

export const load = async ({ request, depends, locals }) => {
	try {
		const context = await loadAuthUserContext(request.headers);
		if (!context) {
			throw redirect(302, '/auth/sign-in');
		}
		const { session, user, oauthAccounts } = context;

		// Mark dependencies for invalidation
		depends('auth:session');
		depends('auth:user');

		// Create form with user data pre-filled
		const form = await superValidate(
			{
				name: (user.name as string) || '',
				email: user.email as string,
				image: (user.image as string) || ''
			},
			zod4(profileSchema)
		);

		const cms = getCMSProvider() as DirectusCMSProviderType | null;
		let directusAvatarUrl: string | null | undefined = undefined;
		if (cms?.userSyncService) {
			try {
				const directusUser = await cms.userSyncService.findUser({
					email: user.email as string,
					id: user.id as string
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

		let currentImage = typeof user.image === 'string' ? (user.image as string) : null;

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

		return {
			user: { ...user, image: resolvedImage },
			session,
			form,
			fraudAnalysis: locals.fraudAnalysis ?? null
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
