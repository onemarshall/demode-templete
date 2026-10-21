import { form, getRequestEvent } from '$app/server';
import { auth } from '#lib/auth/server/config.js';
import { getCMSProvider } from '#lib/auth/server/cms/index.js';
import type { DirectusCMSProviderType } from '#lib/auth/server/cms/providers/directus/index.js';
import { logger } from '#lib/auth/shared/logger.js';
import { error } from '@sveltejs/kit';

export const uploadAvatar = form(async () => {
	const { request } = getRequestEvent();
	const data = await request.formData();

	const session = await auth.api.getSession({ headers: request.headers });
	if (!session?.user) {
		error(401, 'Not authenticated');
	}

	const cms = getCMSProvider() as DirectusCMSProviderType | null;
	if (!cms?.userSyncService) {
		error(500, 'CMS provider not available');
	}

	const file = data.get('avatar');

	if (!(file instanceof File) || file.size === 0) {
		error(400, 'No avatar file provided');
	}

	const directusUser = await cms.userSyncService.findUser({
		email: session.user.email,
		id: session.user.id
	});

	if (!directusUser) {
		logger.error('Directus user not found', { userId: session.user.id });
		error(500, 'Directus user not found');
	}

	const uploadedAvatarId = await cms.userSyncService.uploadAvatar(directusUser.id, file);
	if (!uploadedAvatarId) {
		error(500, 'Failed to upload avatar to Directus');
	}

	const imageUrl = cms.getAssetUrl(uploadedAvatarId);

	await auth.api.updateUser({
		headers: request.headers,
		body: { image: imageUrl }
	});

	logger.info('Avatar uploaded', { userId: session.user.id, imageUrl });

	return { image: imageUrl };
});

export const deleteAvatar = form(async () => {
	const { request } = getRequestEvent();

	const session = await auth.api.getSession({ headers: request.headers });
	if (!session?.user) {
		error(401, 'Not authenticated');
	}

	const cms = getCMSProvider() as DirectusCMSProviderType | null;

	if (cms?.userSyncService) {
		try {
			const directusUser = await cms.userSyncService.findUser({
				email: session.user.email,
				id: session.user.id
			});
			if (directusUser) {
				await cms.deleteUserAvatar(directusUser.id);
			}
		} catch (err) {
			logger.warn('Failed to delete Directus avatar', {
				error: err instanceof Error ? err.message : String(err)
			});
		}
	}

	await auth.api.updateUser({
		headers: request.headers,
		body: { image: null }
	});

	return { success: true };
});
