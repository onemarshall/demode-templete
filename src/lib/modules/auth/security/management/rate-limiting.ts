/**
 * Rate Limiting Client Helpers
 *
 * Client-side utilities for rate limiting.
 */

export interface RateLimitState {
	remaining: number;
	reset: Date;
	limit: number;
	isLimited: boolean;
}

/**
 * Create rate limit state
 */
export function createRateLimitState(initial: Partial<RateLimitState> = {}): RateLimitState {
	return {
		remaining: 100,
		reset: new Date(Date.now() + 60000), // 1 minute from now
		limit: 100,
		isLimited: false,
		...initial
	};
}

/**
 * Check if rate limited
 */
export function isRateLimited(state: RateLimitState): boolean {
	return state.remaining <= 0 && new Date() < state.reset;
}

/**
 * Get remaining requests
 */
export function getRemainingRequests(state: RateLimitState): number {
	if (new Date() >= state.reset) {
		return state.limit; // Reset period has passed
	}
	return Math.max(0, state.remaining);
}
