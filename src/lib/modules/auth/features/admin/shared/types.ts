import type { SubmitFunction } from '$app/forms';

/** Utility type for consistent date handling */
export type DateLike = string | Date | null;

/** Available user roles */
export type UserRole = 'admin' | 'user' | 'moderator' | string;

/** User status options */
export type UserStatus = 'active' | 'banned' | 'pending' | string;

export interface UserListItem {
	id: string;
	email?: string | null;
	name?: string | null;
	role?: UserRole | null;
	status?: UserStatus | null;
	createdAt?: DateLike;
	updatedAt?: DateLike;
	lastActive?: DateLike;
	mfaEnabled?: boolean | null;
	banned?: boolean | null;
	banReason?: string | null;
	banExpires?: DateLike;
}

export interface UserDetail extends UserListItem {
	updatedAt?: DateLike;
}

export interface SessionItem {
	token: string;
	userId: string;
	expiresAt?: DateLike;
	createdAt?: DateLike;
	impersonatedBy?: string | null;
}

/** Props for UserTable component */
export interface UserTableProps {
	users: UserListItem[];
	selectedUserId?: string | null;
	onSelect?: (id: string) => void;
	hasFilters?: boolean;
}

/** Props for UserSessions component */
export interface UserSessionsProps {
	sessions: SessionItem[];
	onRevoke?: (token: string) => void;
}

/** Props for UserDetail component */
export interface UserDetailProps {
	user: UserDetail | null;
}

/** Props for UserModal component */
export interface UserModalProps {
	open: boolean;
	user: UserDetail | null;
	sessions: SessionItem[];
	pendingAction: string | null;
	onClose: () => void;
	createEnhanceHandler: (actionName: string, confirmMessage?: string) => SubmitFunction;
	onStatusChange?: (id: string, banned: boolean) => void;
	confirmPrompt: (message: string) => Promise<boolean>;
}
