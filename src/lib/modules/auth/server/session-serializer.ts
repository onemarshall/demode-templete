import type { SerializedSession, SerializedUser } from '../shared/types/serialized-auth.js';
import { getCMSProvider } from '#lib/platform/cms/server.server.js';
import { getServerEnvSync } from '#lib/platform/config/server.server.js';
import { logger } from '#lib/platform/logger.js';

const CMS_FILE_ID_PATTERN =
	/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Pull a CMS file id out of either a bare UUID or a `<cms>/assets/<uuid>` URL. */
function extractCmsFileId(image: string): string | null {
	if (CMS_FILE_ID_PATTERN.test(image)) return image;

	try {
		const match = new URL(image).pathname.match(/\/assets\/([^/]+)$/);
		return match && CMS_FILE_ID_PATTERN.test(match[1]) ? match[1] : null;
	} catch {
		return null;
	}
}

/**
 * Normalize a Better Auth `user.image` value to something an <img> can render.
 *
 * CMS-backed images are re-resolved through the provider's asset URL builder
 * rather than passed through verbatim, so rows written against an old
 * `PUBLIC_CMS_URL` (e.g. a localhost origin baked in at upload time) come out
 * pointing at the currently configured host instead of being blocked as mixed
 * content. Non-CMS values are dropped unless they are absolute URLs, so they
 * never reach `src` as a relative path (which 404s against /auth/*).
 */
export function resolveUserImage(image: unknown): string | null {
	if (typeof image !== 'string' || !image.trim()) return null;

	const value = image.trim();
	const fileId = extractCmsFileId(value);

	if (fileId) {
		try {
			const cms = getCMSProvider() as { getAssetUrl?: (id: string) => string };
			if (typeof cms.getAssetUrl === 'function') return cms.getAssetUrl(fileId);
		} catch (error) {
			logger.warn('Could not resolve CMS avatar file id via provider', {
				image,
				error: error instanceof Error ? error.message : String(error)
			});
		}

		// Provider not initialised yet — fall back to the configured CMS origin
		// rather than returning a stale host baked into the stored URL.
		const base = getServerEnvSync().PUBLIC_CMS_URL;
		if (base) return `${base.replace(/\/+$/, '')}/assets/${fileId}`;
	}

	try {
		return new URL(value).toString();
	} catch {
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
