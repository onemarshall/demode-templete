import type { SerializedSession, SerializedUser } from '$lib/auth/shared/types/serialized-auth';

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
		image: user.image ?? null,
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
