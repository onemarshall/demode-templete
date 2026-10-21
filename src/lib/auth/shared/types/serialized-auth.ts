export interface SerializedUser {
	id: string;
	email: string;
	name: string | null;
	image: string | null;
	emailVerified: boolean;
	createdAt: Date;
	updatedAt: Date;
	twoFactorEnabled: boolean;
}

export interface SerializedSession {
	id: string;
	userId: string;
	expiresAt: Date;
}
