/**
 * Auth Constants
 *
 * Centralized constants for the authentication system.
 */

// ============================================
// Auth Constants
// ============================================

export const AUTH_CONSTANTS = {
	// Session
	SESSION_COOKIE_NAME: 'auth-session',
	SESSION_TOKEN_PREFIX: 'Bearer ',

	// Rate Limiting
	RATE_LIMIT_WINDOW: 15 * 60 * 1000, // 15 minutes
	RATE_LIMIT_MAX_ATTEMPTS: 5,

	// Password Requirements
	PASSWORD_MIN_LENGTH: 8,
	PASSWORD_MAX_LENGTH: 128,

	// Token Expiration
	EMAIL_VERIFICATION_EXPIRES_IN: 24 * 60 * 60 * 1000, // 24 hours
	PASSWORD_RESET_EXPIRES_IN: 60 * 60 * 1000, // 1 hour
	MAGIC_LINK_EXPIRES_IN: 60 * 60 * 1000, // 1 hour
	TWO_FACTOR_BACKUP_CODES_COUNT: 10,

	// Security
	MAX_LOGIN_ATTEMPTS: 5,
	ACCOUNT_LOCKOUT_DURATION: 30 * 60 * 1000, // 30 minutes
	TRUSTED_DEVICE_DURATION: 30 * 24 * 60 * 60 * 1000, // 30 days

	// File Upload
	MAX_FILE_SIZE: 5 * 1024 * 1024, // 5MB
	ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],

	// Pagination
	DEFAULT_PAGE_SIZE: 20,
	MAX_PAGE_SIZE: 100,

	// Cache
	CACHE_TTL: 5 * 60 * 1000, // 5 minutes
	CACHE_MAX_SIZE: 1000
} as const;

// ============================================
// Error Messages
// ============================================

export const ERROR_MESSAGES = {
	// General
	INVALID_REQUEST: 'Invalid request',
	UNAUTHORIZED: 'Unauthorized access',
	FORBIDDEN: 'Access forbidden',
	NOT_FOUND: 'Resource not found',
	INTERNAL_ERROR: 'Internal server error',

	// Authentication
	INVALID_CREDENTIALS: 'Invalid email or password',
	ACCOUNT_NOT_FOUND: 'Account not found',
	ACCOUNT_DISABLED: 'Account is disabled',
	ACCOUNT_LOCKED: 'Account is temporarily locked',
	EMAIL_NOT_VERIFIED: 'Email address not verified',

	// Password
	PASSWORD_TOO_WEAK: 'Password does not meet security requirements',
	PASSWORD_INCORRECT: 'Current password is incorrect',
	PASSWORDS_DO_NOT_MATCH: 'Passwords do not match',

	// Two-Factor
	TWO_FACTOR_REQUIRED: 'Two-factor authentication required',
	TWO_FACTOR_INVALID: 'Invalid verification code',
	TWO_FACTOR_EXPIRED: 'Verification code has expired',
	BACKUP_CODE_INVALID: 'Invalid backup code',
	BACKUP_CODE_USED: 'Backup code has already been used',

	// Email
	EMAIL_ALREADY_EXISTS: 'Email address already exists',
	EMAIL_INVALID: 'Invalid email address',
	EMAIL_NOT_FOUND: 'Email address not found',
	EMAIL_ALREADY_VERIFIED: 'Email address is already verified',

	// Magic Link
	MAGIC_LINK_INVALID: 'Magic link is invalid or has expired',
	MAGIC_LINK_SENT: 'Magic link sent to your email',

	// Rate Limiting
	RATE_LIMIT_EXCEEDED: 'Too many attempts. Please try again later',

	// Session
	SESSION_EXPIRED: 'Session has expired',
	SESSION_INVALID: 'Invalid session',
	SESSION_REVOKED: 'Session has been revoked',

	// Files
	FILE_TOO_LARGE: 'File size exceeds maximum limit',
	FILE_TYPE_NOT_ALLOWED: 'File type not allowed',
	FILE_NOT_FOUND: 'File not found',

	// Social Auth
	SOCIAL_AUTH_ERROR: 'Social authentication failed',
	SOCIAL_AUTH_DISABLED: 'Social authentication is disabled',
	ACCOUNT_ALREADY_LINKED: 'Account is already linked',
	ACCOUNT_NOT_LINKED: 'Account is not linked'
} as const;

// ============================================
// Success Messages
// ============================================

export const SUCCESS_MESSAGES = {
	// Authentication
	SIGN_IN_SUCCESS: 'Signed in successfully',
	SIGN_UP_SUCCESS: 'Account created successfully',
	SIGN_OUT_SUCCESS: 'Signed out successfully',

	// Email
	EMAIL_VERIFICATION_SENT: 'Verification email sent',
	EMAIL_VERIFIED: 'Email address verified successfully',

	// Password
	PASSWORD_CHANGED: 'Password changed successfully',
	PASSWORD_RESET_SENT: 'Password reset email sent',
	PASSWORD_RESET_SUCCESS: 'Password reset successfully',

	// Two-Factor
	TWO_FACTOR_ENABLED: 'Two-factor authentication enabled',
	TWO_FACTOR_DISABLED: 'Two-factor authentication disabled',
	TWO_FACTOR_VERIFIED: 'Two-factor authentication verified',

	// Magic Link
	MAGIC_LINK_SENT: 'Magic link sent to your email',

	// Social Auth
	SOCIAL_ACCOUNT_LINKED: 'Social account linked successfully',
	SOCIAL_ACCOUNT_UNLINKED: 'Social account unlinked successfully',

	// Profile
	PROFILE_UPDATED: 'Profile updated successfully',
	ACCOUNT_DELETED: 'Account deleted successfully'
} as const;

// ============================================
// Event Types
// ============================================

export const EVENT_TYPES = {
	// Authentication
	AUTH_SIGN_IN: 'auth:sign_in',
	AUTH_SIGN_UP: 'auth:sign_up',
	AUTH_SIGN_OUT: 'auth:sign_out',
	AUTH_FAILED: 'auth:failed',

	// Security
	SECURITY_LOGIN_ATTEMPT: 'security:login_attempt',
	SECURITY_ACCOUNT_LOCKED: 'security:account_locked',
	SECURITY_SUSPICIOUS_ACTIVITY: 'security:suspicious_activity',
	SECURITY_TWO_FACTOR_FAILED: 'security:two_factor_failed',

	// Email
	EMAIL_VERIFICATION_SENT: 'email:verification_sent',
	EMAIL_VERIFIED: 'email:verified',
	EMAIL_PASSWORD_RESET_SENT: 'email:password_reset_sent',

	// Session
	SESSION_CREATED: 'session:created',
	SESSION_REVOKED: 'session:revoked',
	SESSION_EXPIRED: 'session:expired',

	// Profile
	PROFILE_UPDATED: 'profile:updated',
	PROFILE_DELETED: 'profile:deleted'
} as const;

// ============================================
// HTTP Status Codes
// ============================================

export const HTTP_STATUS = {
	OK: 200,
	CREATED: 201,
	NO_CONTENT: 204,
	BAD_REQUEST: 400,
	UNAUTHORIZED: 401,
	FORBIDDEN: 403,
	NOT_FOUND: 404,
	CONFLICT: 409,
	TOO_MANY_REQUESTS: 429,
	INTERNAL_SERVER_ERROR: 500,
	SERVICE_UNAVAILABLE: 503
} as const;

// ============================================
// Type Guards
// ============================================

/**
 * Check if value is a valid HTTP status code
 */
export function isValidHTTPStatus(code: number): boolean {
	return (Object.values(HTTP_STATUS) as number[]).includes(code);
}

/**
 * Check if value is a known error message
 */
export function isErrorMessage(message: string): boolean {
	return (Object.values(ERROR_MESSAGES) as string[]).includes(message);
}

/**
 * Check if value is a known success message
 */
export function isSuccessMessage(message: string): boolean {
	return (Object.values(SUCCESS_MESSAGES) as string[]).includes(message);
}
