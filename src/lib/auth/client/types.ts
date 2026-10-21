/**
 * Client-side Auth Types
 *
 * Type definitions specific to client-side auth operations.
 */

import type { User, Session } from 'better-auth';

// ============================================
// Client State Types
// ============================================

/**
 * Client session state
 */
export interface ClientSessionState {
	readonly user: User | null;
	readonly session: Session | null;
	readonly isAuthenticated: boolean;
	readonly isLoading: boolean;
	readonly error: string | null;
}

/**
 * Auth client configuration
 */
export interface AuthClientConfig {
	readonly baseUrl?: string;
	readonly plugins?: unknown[];
	readonly fetchOptions?: RequestInit;
	readonly headers?: Record<string, string>;
}

// ============================================
// Event Types
// ============================================

/**
 * Auth event types
 */
export type AuthEventType =
	| 'sign_in'
	| 'sign_out'
	| 'sign_up'
	| 'session_updated'
	| 'error'
	| 'loading';

/**
 * Auth event payload
 */
export interface AuthEvent {
	readonly type: AuthEventType;
	readonly data?: unknown;
	readonly error?: string;
	readonly timestamp: number;
}

// ============================================
// Hook Types
// ============================================

/**
 * Custom hook return type for auth state
 */
export interface UseAuthReturn {
	readonly user: User | null;
	readonly session: Session | null;
	readonly isAuthenticated: boolean;
	readonly isLoading: boolean;
	readonly error: string | null;
	readonly actions: {
		readonly signIn: (credentials: Record<string, unknown>) => Promise<void>;
		readonly signOut: () => Promise<void>;
		readonly signUp: (data: Record<string, unknown>) => Promise<void>;
		readonly updateProfile: (data: Partial<User>) => Promise<void>;
	};
}

// ============================================
// Error Types
// ============================================

/**
 * Auth error types
 */
export type AuthErrorType =
	| 'network_error'
	| 'invalid_credentials'
	| 'session_expired'
	| 'user_not_found'
	| 'email_already_exists'
	| 'weak_password'
	| 'rate_limit_exceeded'
	| 'server_error'
	| 'unknown_error';

/**
 * Auth error interface
 */
export interface AuthError {
	readonly type: AuthErrorType;
	readonly message: string;
	readonly code?: string;
	readonly details?: Record<string, unknown>;
}

// ============================================
// Utility Types
// ============================================

/**
 * Result type for async operations
 */
export type AuthResult<T = void> =
	| { readonly success: true; readonly data: T }
	| { readonly success: false; readonly error: AuthError };

/**
 * Pagination parameters
 */
export interface PaginationParams {
	readonly page?: number;
	readonly limit?: number;
	readonly offset?: number;
}

/**
 * Sort options
 */
export interface SortOptions {
	readonly sortBy?: string;
	readonly sortOrder?: 'asc' | 'desc';
}

/**
 * Filter options
 */
export interface FilterOptions {
	readonly search?: string;
	readonly status?: string;
	readonly dateFrom?: Date;
	readonly dateTo?: Date;
}
