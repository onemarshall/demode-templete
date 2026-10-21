/**
 * Circuit Breaker for External API Calls
 *
 * Prevents cascading failures when external services (like BigDataCloud)
 * become unavailable. Implements the circuit breaker pattern with
 * closed, open, and half-open states.
 */

import { logger } from '#lib/auth/shared/logger.js';

// ============================================
// Types
// ============================================

export type CircuitState = 'closed' | 'open' | 'half-open';

export interface CircuitBreakerOptions {
	/** Number of failures before opening the circuit (default: 5) */
	failureThreshold?: number;
	/** Time in ms before attempting to close the circuit (default: 30000) */
	resetTimeoutMs?: number;
	/** Name for logging purposes */
	name: string;
}

export interface CircuitBreakerStats {
	name: string;
	state: CircuitState;
	failures: number;
	successes: number;
	lastFailure: number | null;
	lastSuccess: number | null;
}

// ============================================
// Circuit Breaker Class
// ============================================

export class CircuitBreaker {
	private failures = 0;
	private successes = 0;
	private lastFailure = 0;
	private lastSuccess = 0;
	private state: CircuitState = 'closed';

	private readonly failureThreshold: number;
	private readonly resetTimeoutMs: number;
	private readonly name: string;

	constructor(options: CircuitBreakerOptions) {
		this.name = options.name;
		this.failureThreshold = options.failureThreshold ?? 5;
		this.resetTimeoutMs = options.resetTimeoutMs ?? 30000;
	}

	/**
	 * Execute a function with circuit breaker protection
	 * Returns the result or fallback value if circuit is open
	 */
	async execute<T>(fn: () => Promise<T>, fallback?: T): Promise<T | null> {
		// Check if circuit should transition from open to half-open
		if (this.state === 'open') {
			if (Date.now() - this.lastFailure > this.resetTimeoutMs) {
				this.transitionTo('half-open');
			} else {
				// Circuit is open - return fallback without calling fn
				return fallback ?? null;
			}
		}

		try {
			const result = await fn();
			this.onSuccess();
			return result;
		} catch (error) {
			this.onFailure(error);
			return fallback ?? null;
		}
	}

	/**
	 * Execute with a custom fallback function
	 */
	async executeWithFallback<T>(fn: () => Promise<T>, fallbackFn: () => T | Promise<T>): Promise<T> {
		// Check if circuit should transition from open to half-open
		if (this.state === 'open') {
			if (Date.now() - this.lastFailure > this.resetTimeoutMs) {
				this.transitionTo('half-open');
			} else {
				// Circuit is open - call fallback
				return fallbackFn();
			}
		}

		try {
			const result = await fn();
			this.onSuccess();
			return result;
		} catch (error) {
			this.onFailure(error);
			return fallbackFn();
		}
	}

	/**
	 * Check if circuit is currently open (blocking calls)
	 */
	isOpen(): boolean {
		if (this.state === 'open') {
			// Check if we should transition to half-open
			if (Date.now() - this.lastFailure > this.resetTimeoutMs) {
				this.transitionTo('half-open');
				return false;
			}
			return true;
		}
		return false;
	}

	/**
	 * Get current circuit state
	 */
	getState(): CircuitState {
		return this.state;
	}

	/**
	 * Get configured failure threshold
	 */
	getFailureThreshold(): number {
		return this.failureThreshold;
	}

	/**
	 * Get configured reset timeout in ms
	 */
	getResetTimeoutMs(): number {
		return this.resetTimeoutMs;
	}

	/**
	 * Get circuit breaker statistics
	 */
	getStats(): CircuitBreakerStats {
		return {
			name: this.name,
			state: this.state,
			failures: this.failures,
			successes: this.successes,
			lastFailure: this.lastFailure || null,
			lastSuccess: this.lastSuccess || null
		};
	}

	/**
	 * Manually reset the circuit breaker
	 */
	reset(): void {
		this.failures = 0;
		this.successes = 0;
		this.lastFailure = 0;
		this.lastSuccess = 0;
		this.transitionTo('closed');
	}

	/**
	 * Handle successful execution
	 */
	private onSuccess(): void {
		this.successes++;
		this.lastSuccess = Date.now();

		if (this.state === 'half-open') {
			// Successful call in half-open state closes the circuit
			this.transitionTo('closed');
			this.failures = 0;
		}
	}

	/**
	 * Handle failed execution
	 */
	private onFailure(error: unknown): void {
		this.failures++;
		this.lastFailure = Date.now();

		if (this.state === 'half-open') {
			// Failed call in half-open state opens the circuit again
			this.transitionTo('open');
			return;
		}

		if (this.state === 'closed' && this.failures >= this.failureThreshold) {
			this.transitionTo('open');
			logger.warn(`[CircuitBreaker:${this.name}] Circuit opened after ${this.failures} failures`, {
				error: error instanceof Error ? error.message : 'Unknown error'
			});
		}
	}

	/**
	 * Transition to a new state
	 */
	private transitionTo(newState: CircuitState): void {
		if (this.state === newState) return;

		const oldState = this.state;
		this.state = newState;

		logger.info(`[CircuitBreaker:${this.name}] State transition: ${oldState} -> ${newState}`);
	}
}

// ============================================
// Circuit Breaker Registry
// ============================================

const circuitBreakers = new Map<string, CircuitBreaker>();

/**
 * Get or create a circuit breaker by name
 */
export function getCircuitBreaker(options: CircuitBreakerOptions): CircuitBreaker {
	const existing = circuitBreakers.get(options.name);

	if (existing) {
		const stats = existing.getStats();
		const currentThreshold = existing.getFailureThreshold();
		const currentTimeout = existing.getResetTimeoutMs();

		if (
			(options.failureThreshold !== undefined && options.failureThreshold !== currentThreshold) ||
			(options.resetTimeoutMs !== undefined && options.resetTimeoutMs !== currentTimeout)
		) {
			logger.warn(
				`[CircuitBreaker:${options.name}] Config mismatch on existing breaker (state: ${stats.state}). ` +
					`Re-creating with new options.`
			);
			const breaker = new CircuitBreaker(options);
			circuitBreakers.set(options.name, breaker);
			return breaker;
		}

		return existing;
	}

	const breaker = new CircuitBreaker(options);
	circuitBreakers.set(options.name, breaker);
	return breaker;
}

/**
 * Get all circuit breaker statistics
 */
export function getAllCircuitBreakerStats(): CircuitBreakerStats[] {
	return Array.from(circuitBreakers.values()).map((cb) => cb.getStats());
}

/**
 * Reset all circuit breakers
 */
export function resetAllCircuitBreakers(): void {
	for (const breaker of circuitBreakers.values()) {
		breaker.reset();
	}
}

// ============================================
// Pre-configured Circuit Breakers
// ============================================

/**
 * Circuit breaker for BigDataCloud API calls
 */
export const bigDataCloudCircuit = getCircuitBreaker({
	name: 'bigdatacloud',
	failureThreshold: 5,
	resetTimeoutMs: 30000
});
