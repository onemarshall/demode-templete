import { json, error } from '@sveltejs/kit';
import { auth } from '$lib/auth';
import { logger } from '$lib/auth/shared/logger';
import { getCMSProvider } from '$lib/auth/server/cms';
import type { DirectusCMSProviderType } from '$lib/auth/server/cms/providers/directus';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request }) => {
	const session = await auth.api.getSession({ headers: request.headers });
	if (!session?.user) {
		throw error(401, 'Not authenticated');
	}

	const cms = getCMSProvider() as DirectusCMSProviderType | null;
	if (!cms?.userSyncService) {
		logger.error('CMS provider not available for avatar upload');
		throw error(500, 'Avatar uploads not available — CMS provider not initialized');
	}

	const formData = await request.formData();
	const file = formData.get('avatar');

	if (!(file instanceof File) || file.size === 0) {
		throw error(400, 'No avatar file provided');
	}

	const MAX_AVATAR_BYTES = 5 * 1024 * 1024;
	const ALLOWED_TYPES = new Set([
		'image/jpeg',
		'image/png',
		'image/webp',
		'image/gif',
		'image/avif'
	]);
	if (file.size > MAX_AVATAR_BYTES) {
		throw error(400, 'Avatar must be 5MB or smaller');
	}
	if (!ALLOWED_TYPES.has(file.type)) {
		throw error(400, 'Avatar must be a JPEG, PNG, WebP, GIF, or AVIF image');
	}

	// Find Directus user
	const directusUser = await cms.userSyncService.findUser({
		email: session.user.email,
		id: session.user.id
	});

	if (!directusUser) {
		logger.error('Directus user not found for avatar upload', {
			userId: session.user.id,
			email: session.user.email
		});
		throw error(500, 'Directus user not found');
	}

	// Upload avatar to Directus and set on user
	const uploadedAvatarId = await cms.userSyncService.uploadAvatar(directusUser.id, file);

	if (!uploadedAvatarId) {
		throw error(500, 'Failed to upload avatar to Directus');
	}

	const imageUrl = cms.getAssetUrl(uploadedAvatarId);

	// Update Better Auth user
	await auth.api.updateUser({
		headers: request.headers,
		body: { image: imageUrl }
	});

	logger.info('Avatar uploaded successfully', {
		userId: session.user.id,
		directusUserId: directusUser.id,
		fileId: uploadedAvatarId,
		imageUrl
	});

	return json({ image: imageUrl });
};

export const DELETE: RequestHandler = async ({ request }) => {
	const session = await auth.api.getSession({ headers: request.headers });
	if (!session?.user) {
		throw error(401, 'Not authenticated');
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

	return json({ success: true });
};
