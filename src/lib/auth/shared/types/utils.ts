/**
 * Utility Types
 *
 * Common utility types used throughout the auth system.
 */

// Generic utility types
export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>;

// Auth-specific utility types
export type AuthProvider = 'github' | 'google' | 'discord' | 'email';
export type UserRole = 'user' | 'admin' | 'moderator';

// Helper type for creating partial objects
export type DeepPartial<T> = {
	[P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

// Type guards
export function isString(value: unknown): value is string {
	return typeof value === 'string';
}

export function isObject(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}
