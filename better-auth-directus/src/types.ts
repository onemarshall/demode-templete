/**
 * Public types for Better Auth Directus Sync SDK
 */

// === Logger Interface ===

export interface SyncLogger {
	info(message: string, data?: unknown): void;
	warn(message: string, data?: unknown): void;
	error(message: string, data?: unknown): void;
	debug?(message: string, data?: unknown): void;
}

// === Boundary Config ===

export interface BoundaryConfig {
	requestTimeoutMs: number;
	openCircuitAfterFailures: number;
	cooldownMsTransient: number;
	cooldownMsAuth: number;
	cooldownMsForbidden: number;
	logIntervalMs: number;
}

// === Rate Limit Config ===

export interface RateLimitConfig {
	intervalCap: number;
	interval: number;
}

// === Main Config ===

export interface DirectusSyncConfig {
	directusUrl: string;
	directusToken: string;
	defaultRoleId?: string;
	logger?: SyncLogger;
	boundary?: Partial<BoundaryConfig>;
	rateLimit?: RateLimitConfig;
	onUserUpdatedFromDirectus?: (userData: BetterAuthUserInput) => Promise<void>;
}

// === User Types ===

/**
 * What syncUser() accepts — maps to Better Auth user shape.
 * Decoupled from Better Auth internals so the SDK stays stable
 * even if Better Auth's internal types shift.
 */
export interface BetterAuthUserInput {
	id: string;
	email: string;
	name?: string | null;
	image?: string | null;
}

/**
 * What the SDK returns from Directus.
 * Mirrors the Directus user fields the SDK touches.
 */
export interface DirectusSyncUser {
	id: string;
	email: string;
	first_name?: string | null;
	last_name?: string | null;
	avatar?: string | null;
	role?: string | null;
	status?: string;
	date_created?: string;
	external_identifier?: string | null;
}

// === File Types ===

export interface DirectusSyncFile {
	id: string;
	filename: string;
	url: string;
	size: number;
	type: string;
}

// === Webhook Types ===

export interface DirectusWebhookPayload {
	event: string;
	collection: string;
	key?: string;
	keys?: string[];
	payload?: Record<string, unknown>;
}

// === Boundary Internal Types ===

export type DirectusFailureKind =
	| 'auth'
	| 'forbidden'
	| 'timeout'
	| 'network'
	| 'server'
	| 'unknown';

export type DirectusRunOptions<T> =
	| {
			operation: string;
			op: () => Promise<T>;
			timeoutMs?: number;
			propagateErrors: true;
	  }
	| {
			operation: string;
			op: () => Promise<T>;
			fallback: T;
			timeoutMs?: number;
			propagateErrors?: false;
	  };
