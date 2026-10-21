// src/lib/auth/server/database/types.ts
import type { User as BetterAuthUser } from 'better-auth';

// ============================================
// Re-export Better Auth types
// ============================================

export type User = BetterAuthUser;
export type { BetterAuthUser };

// ============================================
// Auth Provider Types
// ============================================

export type AuthProvider = 'email' | 'github' | 'google';

export type UserRole = 'admin' | 'user' | 'moderator';

export type UserStatus = 'active' | 'inactive' | 'suspended' | 'pending_verification';

// ============================================
// Session Types
// ============================================

export interface SessionContext {
	id: string;
	userId: string;
	expiresAt: Date;
	ipAddress?: string;
	userAgent?: string;
}

// ============================================
// Callback Contexts
// ============================================

export interface AuthSuccessContext {
	provider?: AuthProvider;
	isNewUser?: boolean;
	redirectTo?: string;
	session?: SessionContext;
}

export interface EmailContext {
	user: User;
	url: string;
	token?: string;
	expiresAt?: Date;
}

// ============================================
// Error Handling
// ============================================

export type AuthErrorCode =
	| 'AUTH_ERROR'
	| 'INVALID_CREDENTIALS'
	| 'USER_NOT_FOUND'
	| 'EMAIL_NOT_VERIFIED'
	| 'SESSION_EXPIRED'
	| 'CAPTCHA_REQUIRED'
	| 'RATE_LIMITED'
	| 'FORBIDDEN';

export class AuthError extends Error {
	readonly code: AuthErrorCode;
	readonly statusCode: number;
	readonly details?: unknown;

	constructor(
		message: string,
		code: AuthErrorCode = 'AUTH_ERROR',
		statusCode: number = 400,
		details?: unknown
	) {
		super(message);
		this.name = 'AuthError';
		this.code = code;
		this.statusCode = statusCode;
		this.details = details;

		Object.setPrototypeOf(this, new.target.prototype);
	}

	toJSON() {
		const error: Record<string, unknown> = {
			name: this.name,
			message: this.message,
			code: this.code,
			statusCode: this.statusCode
		};

		if (this.details !== undefined) {
			error.details = this.details;
		}

		return {
			success: false,
			error
		};
	}

	static invalidCredentials(message = 'Invalid email or password') {
		return new AuthError(message, 'INVALID_CREDENTIALS', 401);
	}

	static userNotFound(message = 'User not found') {
		return new AuthError(message, 'USER_NOT_FOUND', 404);
	}

	static emailNotVerified(message = 'Please verify your email address') {
		return new AuthError(message, 'EMAIL_NOT_VERIFIED', 403);
	}

	static sessionExpired(message = 'Session has expired') {
		return new AuthError(message, 'SESSION_EXPIRED', 401);
	}

	static rateLimited(message = 'Too many requests') {
		return new AuthError(message, 'RATE_LIMITED', 429);
	}
}
