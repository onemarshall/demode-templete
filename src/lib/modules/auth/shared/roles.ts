/**
 * Pure role/authorization helpers.
 *
 * Kept free of Better Auth / SvelteKit / config imports so they can be used
 * from security endpoints, hooks, and unit tests without pulling in the
 * full auth configuration (which requires server env at module load).
 */

export interface AdminAuthorizationOptions {
	adminRoles?: readonly string[];
	adminUserIds?: readonly string[];
}

/**
 * Minimal user shape required for role checks.
 * Compatible with Better Auth session users.
 */
export interface UserWithRoles {
	id: string;
	role?: string | string[] | null;
}

/**
 * Roles considered as admin roles.
 * Should match your Better Auth admin plugin config.
 */
const ADMIN_ROLES: readonly string[] = ['admin'];

/**
 * User IDs that are always considered admin.
 * Should match your Better Auth admin plugin config.
 */
const ADMIN_USER_IDS: readonly string[] = [];

/**
 * Normalize the Better Auth `role` field (string, comma-separated
 * string, or string array) into a clean role list.
 */
export function getUserRoles(user: Pick<UserWithRoles, 'role'>): string[] {
	const roles = Array.isArray(user.role) ? user.role : user.role ? user.role.split(',') : [];

	return roles.map((role) => role.trim()).filter((role) => role.length > 0);
}

/**
 * Check whether a user holds an admin role (or an explicitly
 * allow-listed admin user ID).
 */
export function isAdminUser(
	user: Pick<UserWithRoles, 'id' | 'role'>,
	options: AdminAuthorizationOptions = {}
): boolean {
	const adminRoles = options.adminRoles ?? ADMIN_ROLES;
	const adminUserIds = options.adminUserIds ?? ADMIN_USER_IDS;

	if (adminUserIds.includes(user.id)) {
		return true;
	}

	const userRoles = getUserRoles(user);
	return userRoles.some((role) => adminRoles.includes(role));
}
