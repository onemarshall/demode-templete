import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
	CircuitBreaker,
	getCircuitBreaker,
	getAllCircuitBreakerStats,
	resetAllCircuitBreakers
} from '../../core/circuit-breaker';

describe('CircuitBreaker', () => {
	let breaker: CircuitBreaker;

	beforeEach(() => {
		vi.useFakeTimers();
		breaker = new CircuitBreaker({
			name: 'test',
			failureThreshold: 3,
			resetTimeoutMs: 1000
		});
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	describe('initial state', () => {
		it('starts in closed state', () => {
			expect(breaker.getState()).toBe('closed');
		});

		it('is not open initially', () => {
			expect(breaker.isOpen()).toBe(false);
		});

		it('has correct initial stats', () => {
			const stats = breaker.getStats();
			expect(stats.name).toBe('test');
			expect(stats.state).toBe('closed');
			expect(stats.failures).toBe(0);
			expect(stats.successes).toBe(0);
		});
	});

	describe('execute()', () => {
		it('returns successful result when closed', async () => {
			const result = await breaker.execute(async () => 'success');
			expect(result).toBe('success');
		});

		it('tracks successful calls', async () => {
			await breaker.execute(async () => 'success');
			await breaker.execute(async () => 'success');

			const stats = breaker.getStats();
			expect(stats.successes).toBe(2);
			expect(stats.lastSuccess).not.toBeNull();
		});

		it('returns fallback on failure', async () => {
			const result = await breaker.execute(async () => {
				throw new Error('fail');
			}, 'fallback');
			expect(result).toBe('fallback');
		});

		it('returns null on failure without fallback', async () => {
			const result = await breaker.execute(async () => {
				throw new Error('fail');
			});
			expect(result).toBeNull();
		});

		it('tracks failed calls', async () => {
			await breaker.execute(async () => {
				throw new Error('fail');
			});

			const stats = breaker.getStats();
			expect(stats.failures).toBe(1);
			expect(stats.lastFailure).not.toBeNull();
		});
	});

	describe('state transitions', () => {
		it('opens after reaching failure threshold', async () => {
			for (let i = 0; i < 3; i++) {
				await breaker.execute(async () => {
					throw new Error('fail');
				});
			}

			expect(breaker.getState()).toBe('open');
			expect(breaker.isOpen()).toBe(true);
		});

		it('stays closed below failure threshold', async () => {
			await breaker.execute(async () => {
				throw new Error('fail');
			});
			await breaker.execute(async () => {
				throw new Error('fail');
			});

			expect(breaker.getState()).toBe('closed');
		});

		it('returns fallback immediately when open', async () => {
			// Open the circuit
			for (let i = 0; i < 3; i++) {
				await breaker.execute(async () => {
					throw new Error('fail');
				});
			}

			let called = false;
			const result = await breaker.execute(async () => {
				called = true;
				return 'success';
			}, 'fallback');

			expect(result).toBe('fallback');
			expect(called).toBe(false);
		});

		it('transitions to half-open after reset timeout', async () => {
			// Open the circuit
			for (let i = 0; i < 3; i++) {
				await breaker.execute(async () => {
					throw new Error('fail');
				});
			}
			expect(breaker.getState()).toBe('open');

			// Advance time past reset timeout
			vi.advanceTimersByTime(1001);

			// Next check should transition to half-open
			expect(breaker.isOpen()).toBe(false);
			expect(breaker.getState()).toBe('half-open');
		});

		it('closes on success in half-open state', async () => {
			// Open the circuit
			for (let i = 0; i < 3; i++) {
				await breaker.execute(async () => {
					throw new Error('fail');
				});
			}

			// Transition to half-open
			vi.advanceTimersByTime(1001);
			breaker.isOpen(); // Trigger transition

			// Successful call should close circuit
			await breaker.execute(async () => 'success');

			expect(breaker.getState()).toBe('closed');
			expect(breaker.getStats().failures).toBe(0);
		});

		it('re-opens on failure in half-open state', async () => {
			// Open the circuit
			for (let i = 0; i < 3; i++) {
				await breaker.execute(async () => {
					throw new Error('fail');
				});
			}

			// Transition to half-open
			vi.advanceTimersByTime(1001);
			breaker.isOpen();

			// Failed call should re-open circuit
			await breaker.execute(async () => {
				throw new Error('fail');
			});

			expect(breaker.getState()).toBe('open');
		});
	});

	describe('executeWithFallback()', () => {
		it('returns result on success', async () => {
			const result = await breaker.executeWithFallback(
				async () => 'success',
				() => 'fallback'
			);
			expect(result).toBe('success');
		});

		it('calls fallback function on failure', async () => {
			const result = await breaker.executeWithFallback(
				async () => {
					throw new Error('fail');
				},
				() => 'fallback-result'
			);
			expect(result).toBe('fallback-result');
		});

		it('calls fallback function when circuit is open', async () => {
			// Open the circuit
			for (let i = 0; i < 3; i++) {
				await breaker.execute(async () => {
					throw new Error('fail');
				});
			}

			let fallbackCalled = false;
			const result = await breaker.executeWithFallback(
				async () => 'success',
				() => {
					fallbackCalled = true;
					return 'fallback';
				}
			);

			expect(result).toBe('fallback');
			expect(fallbackCalled).toBe(true);
		});

		it('supports async fallback functions', async () => {
			const result = await breaker.executeWithFallback(
				async () => {
					throw new Error('fail');
				},
				async () => {
					await Promise.resolve();
					return 'async-fallback';
				}
			);
			expect(result).toBe('async-fallback');
		});
	});

	describe('reset()', () => {
		it('resets all counters and state', async () => {
			// Create some history
			await breaker.execute(async () => 'success');
			await breaker.execute(async () => {
				throw new Error('fail');
			});

			breaker.reset();

			const stats = breaker.getStats();
			expect(stats.failures).toBe(0);
			expect(stats.successes).toBe(0);
			expect(stats.lastFailure).toBeNull();
			expect(stats.lastSuccess).toBeNull();
			expect(stats.state).toBe('closed');
		});

		it('resets open circuit to closed', async () => {
			// Open the circuit
			for (let i = 0; i < 3; i++) {
				await breaker.execute(async () => {
					throw new Error('fail');
				});
			}
			expect(breaker.getState()).toBe('open');

			breaker.reset();
			expect(breaker.getState()).toBe('closed');
		});
	});
});

describe('Circuit Breaker Registry', () => {
	beforeEach(() => {
		resetAllCircuitBreakers();
	});

	it('creates new breaker if not exists', () => {
		const breaker = getCircuitBreaker({ name: 'registry-test' });
		expect(breaker).toBeDefined();
		expect(breaker.getStats().name).toBe('registry-test');
	});

	it('returns existing breaker for same name and same config', () => {
		const breaker1 = getCircuitBreaker({ name: 'shared', failureThreshold: 5 });
		const breaker2 = getCircuitBreaker({ name: 'shared', failureThreshold: 5 });

		expect(breaker1).toBe(breaker2);
	});

	it('re-creates breaker on config mismatch', () => {
		const breaker1 = getCircuitBreaker({ name: 'mismatch-test', failureThreshold: 5 });
		const breaker2 = getCircuitBreaker({ name: 'mismatch-test', failureThreshold: 10 });

		expect(breaker1).not.toBe(breaker2);
		expect(breaker2.getFailureThreshold()).toBe(10);
	});

	it('re-creates breaker on resetTimeoutMs mismatch', () => {
		const breaker1 = getCircuitBreaker({ name: 'timeout-mismatch', resetTimeoutMs: 1000 });
		const breaker2 = getCircuitBreaker({ name: 'timeout-mismatch', resetTimeoutMs: 5000 });

		expect(breaker1).not.toBe(breaker2);
		expect(breaker2.getResetTimeoutMs()).toBe(5000);
	});

	it('getAllCircuitBreakerStats returns stats for all breakers', () => {
		getCircuitBreaker({ name: 'breaker-a' });
		getCircuitBreaker({ name: 'breaker-b' });

		const stats = getAllCircuitBreakerStats();
		const names = stats.map((s) => s.name);

		expect(names).toContain('breaker-a');
		expect(names).toContain('breaker-b');
	});

	it('resetAllCircuitBreakers resets all registered breakers', async () => {
		const breaker = getCircuitBreaker({ name: 'reset-test', failureThreshold: 1 });

		await breaker.execute(async () => {
			throw new Error('fail');
		});
		expect(breaker.getState()).toBe('open');

		resetAllCircuitBreakers();
		expect(breaker.getState()).toBe('closed');
	});
});
