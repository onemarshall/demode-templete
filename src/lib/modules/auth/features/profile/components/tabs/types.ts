/**
 * Type definitions for profile tab components
 */

import type { SuperValidated } from 'sveltekit-superforms';
import type { BetterAuthUser as BaseBetterAuthUser } from '../../../../shared/types/database.js';
import type { ProfileSchema } from '../../../../components/forms/schema.js';

/**
 * Extended BetterAuthUser with additional custom fields
 */
export interface BetterAuthUser extends BaseBetterAuthUser {
	/**
	 * The last authentication method used by the user
	 * Examples: 'email', 'github', 'google', 'passkey'
	 */
	lastLoginMethod?: string | null;

	/**
	 * List of connected OAuth providers
	 */
	connectedProviders?: string[];

	/**
	 * Whether the user is only logged in via OAuth (no email/password)
	 */
	isOAuthUser?: boolean;

	/**
	 * Whether two-factor authentication is enabled
	 */
	twoFactorEnabled?: boolean;
}

/**
 * Props for the GeneralTab component
 * Handles user profile information display and editing
 */
export interface GeneralTabProps {
	/**
	 * The authenticated user object from Better Auth with extended fields
	 */
	user: BetterAuthUser;

	/**
	 * The superform instance for profile form handling
	 * Contains form state, validation, and submission handling
	 */
	form: SuperValidated<ProfileSchema>;

	/**
	 * Whether the user is only logged in via social providers (no email/password)
	 * Used to show/hide certain UI elements like password management
	 * @default false
	 */
	isSocialLoginOnly?: boolean;
}

/**
 * Avatar upload response format
 */
export interface AvatarUploadResponse {
	type: 'success' | 'error';
	status: number;
	data?: unknown;
}

/**
 * Parsed avatar result from server response
 */
export interface ParsedAvatarResult {
	image: string | null;
	error: string | null;
}
