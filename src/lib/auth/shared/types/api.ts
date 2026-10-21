/**
 * API Response Types
 *
 * Type definitions for API responses from auth endpoints.
 */

// Generic API response wrapper
export interface ApiResponse<T = unknown> {
	data: T | null;
	error: {
		message: string;
		code?: string;
	} | null;
}

// Alternative response format
export interface ApiResult<T = unknown> {
	data?: T;
	error?: {
		message: string;
		code?: string;
	};
}

// Success response
export interface SuccessResponse<T = unknown> {
	success: true;
	data: T;
	message?: string;
}

// Error response
export interface ErrorResponse {
	success: false;
	error: {
		message: string;
		code?: string;
		details?: unknown;
	};
}

// Auth-specific responses
export interface AuthResponse {
	user: unknown; // Would be User type
	session: unknown; // Would be Session type
}

export interface TwoFactorResponse {
	success: boolean;
	totpURI?: string;
	backupCodes?: string[];
	message?: string;
}
