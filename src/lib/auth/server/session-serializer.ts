import type { SerializedSession, SerializedUser } from '#lib/auth/shared/types/serialized-auth.js';
import { getCMSProvider } from '#lib/auth/server/cms/index.js';
import { logger } from '#lib/auth/shared/logger.js';

const CMS_FILE_ID_PATTERN =
	/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Normalize a Better Auth `user.image` value to something an <img> can render.
 * Legacy rows may hold a bare CMS file UUID instead of a URL — resolve those
 * through the CMS provider's asset URL builder; non-URL values are dropped so
 * they never reach `src` as a relative path (which 404s against /auth/*).
 */
export function resolveUserImage(image: unknown): string | null {
	if (typeof image !== 'string' || !image.trim()) return null;

	try {
		return new URL(image).toString();
	} catch {
		// Not an absolute URL — may be a bare CMS file id
	}

	if (!CMS_FILE_ID_PATTERN.test(image)) return null;

	try {
		const cms = getCMSProvider() as { getAssetUrl?: (id: string) => string };
		return typeof cms.getAssetUrl === 'function' ? cms.getAssetUrl(image) : null;
	} catch (error) {
		logger.warn('Could not resolve legacy avatar file id', {
			image,
			error: error instanceof Error ? error.message : String(error)
		});
		return null;
	}
}

interface AuthSessionUser {
	id: string;
	email: string;
	name: string | null;
	image?: string | null;
	emailVerified: boolean;
	createdAt: Date | string;
	updatedAt: Date | string;
	twoFactorEnabled?: boolean;
}

interface AuthSession {
	id: string;
	userId: string;
	expiresAt: Date | string;
	token?: string;
	createdAt?: Date | string;
	updatedAt?: Date | string;
}

export function serializeUser(user: AuthSessionUser | null): SerializedUser | null {
	if (!user) return null;
	return {
		id: user.id,
		email: user.email,
		name: user.name,
		image: resolveUserImage(user.image),
		emailVerified: user.emailVerified,
		createdAt: user.createdAt instanceof Date ? user.createdAt : new Date(user.createdAt),
		updatedAt: user.updatedAt instanceof Date ? user.updatedAt : new Date(user.updatedAt),
		twoFactorEnabled: user.twoFactorEnabled ?? false
	};
}

export function serializeSession(session: AuthSession | null): SerializedSession | null {
	if (!session) return null;
	return {
		id: session.id,
		userId: session.userId,
		expiresAt: session.expiresAt instanceof Date ? session.expiresAt : new Date(session.expiresAt)
	};
}
