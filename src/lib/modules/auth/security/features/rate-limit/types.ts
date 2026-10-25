/**
 * Rate Limit Feature Types
 */

export type RateLimitStrategy = 'sliding-window' | 'fixed-window' | 'token-bucket' | 'leaky-bucket';

export type RateLimitIdentifier = 'ip' | 'user' | 'session' | 'api-key' | 'custom';

export interface RateLimitRule {
	id: string;
	name: string;
	pathPattern: string;
	methods?: string[];
	maxRequests: number;
	windowSeconds: number;
	strategy?: RateLimitStrategy;
	identifier?: RateLimitIdentifier;
	skipAuthenticated?: boolean;
	skipRoles?: string[];
	penaltySeconds?: number;
	enabled?: boolean;
	statusCode?: number;
	errorMessage?: string;
}

export interface RateLimitStatus {
	limited: boolean;
	current: number;
	limit: number;
	remaining: number;
	resetIn: number;
	resetAt: number;
	retryAfter?: number;
	triggeredRule?: string;
	identifier: string;
}

export interface RateLimitInfo {
	rules: Record<string, RateLimitStatus>;
	limited: boolean;
	remaining: number;
	resetIn: number;
}

export interface RateLimitHeaders {
	'x-ratelimit-limit': string;
	'x-ratelimit-remaining': string;
	'x-ratelimit-reset': string;
	'Retry-After'?: string;
}

export interface RateLimitTier {
	name: string;
	multiplier: number;
	bonusRequests?: number;
	roles?: string[];
}

export interface RateLimitFeatureConfig {
	enabled?: boolean;
	defaultLimit?: {
		maxRequests: number;
		windowSeconds: number;
	};
	rules?: RateLimitRule[];
	tiers?: RateLimitTier[];
	defaultStrategy?: RateLimitStrategy;
	defaultIdentifier?: RateLimitIdentifier;
	includeHeaders?: boolean;
	skipPaths?: string[];
	keyPrefix?: string;
	warningThreshold?: number;
	getIdentifier?: (request: Request, context: unknown) => string | Promise<string>;
	getTier?: (userId: string | undefined, roles: string[]) => string | Promise<string>;
}
