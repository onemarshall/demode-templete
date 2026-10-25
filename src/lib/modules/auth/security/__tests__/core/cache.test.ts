import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CacheManager, PendingRequests, clearAllCaches, getAllCacheStats } from '../../core/cache';

describe('CacheManager', () => {
	let cache: CacheManager<string, string>;

	beforeEach(() => {
		cache = new CacheManager<string, string>('test', 100, 60000);
	});

	describe('basic operations', () => {
		it('sets and gets values', () => {
			cache.set('key1', 'value1');
			expect(cache.get('key1')).toBe('value1');
		});

		it('returns undefined for missing keys', () => {
			expect(cache.get('missing')).toBeUndefined();
		});

		it('deletes values', () => {
			cache.set('key1', 'value1');
			expect(cache.delete('key1')).toBe(true);
			expect(cache.get('key1')).toBeUndefined();
		});

		it('checks existence with has()', () => {
			cache.set('key1', 'value1');
			expect(cache.has('key1')).toBe(true);
			expect(cache.has('missing')).toBe(false);
		});

		it('clears all entries', () => {
			cache.set('key1', 'value1');
			cache.set('key2', 'value2');
			cache.clear();
			expect(cache.size).toBe(0);
		});
	});

	describe('TTL expiration', () => {
		it('expires entries after TTL', () => {
			vi.useFakeTimers();

			const shortTtlCache = new CacheManager<string, string>('short', 100, 1000);
			shortTtlCache.set('key1', 'value1');

			expect(shortTtlCache.get('key1')).toBe('value1');

			vi.advanceTimersByTime(1001);

			expect(shortTtlCache.get('key1')).toBeUndefined();

			vi.useRealTimers();
		});

		it('supports custom TTL per entry', () => {
			vi.useFakeTimers();

			cache.set('short', 'value', 500);
			cache.set('long', 'value', 2000);

			vi.advanceTimersByTime(600);

			expect(cache.get('short')).toBeUndefined();
			expect(cache.get('long')).toBe('value');

			vi.useRealTimers();
		});
	});

	describe('statistics', () => {
		it('tracks hits and misses', () => {
			cache.set('key1', 'value1');

			cache.get('key1'); // hit
			cache.get('key1'); // hit
			cache.get('missing'); // miss

			const stats = cache.getStats();
			expect(stats.hits).toBe(2);
			expect(stats.misses).toBe(1);
			expect(stats.hitRate).toBeCloseTo(0.666, 2);
		});

		it('reports correct size', () => {
			cache.set('key1', 'value1');
			cache.set('key2', 'value2');

			const stats = cache.getStats();
			expect(stats.size).toBe(2);
			expect(stats.maxSize).toBe(100);
		});
	});

	describe('LRU promotion', () => {
		it('promotes accessed entries to most-recently-used', () => {
			const smallCache = new CacheManager<string, string>('lru-test', 5, 60000);

			// Fill the cache
			for (let i = 0; i < 5; i++) {
				smallCache.set(`key${i}`, `value${i}`);
			}

			// Access key0 and key1 to promote them
			smallCache.get('key0');
			smallCache.get('key1');

			// Add more entries to trigger eviction — should evict key2, key3, key4 (least recently used)
			smallCache.set('new1', 'newvalue1');
			smallCache.set('new2', 'newvalue2');
			smallCache.set('new3', 'newvalue3');

			// Promoted entries should survive
			expect(smallCache.get('key0')).toBe('value0');
			expect(smallCache.get('key1')).toBe('value1');

			// Non-promoted entries should be evicted
			expect(smallCache.get('key2')).toBeUndefined();
		});
	});

	describe('eviction', () => {
		it('evicts entries when exceeding max size', () => {
			const smallCache = new CacheManager<string, string>('small', 5, 60000);

			for (let i = 0; i < 10; i++) {
				smallCache.set(`key${i}`, `value${i}`);
			}

			expect(smallCache.size).toBeLessThanOrEqual(5);
		});

		it('prunes expired entries', () => {
			vi.useFakeTimers();

			cache.set('key1', 'value1', 500);
			cache.set('key2', 'value2', 500);
			cache.set('key3', 'value3', 5000);

			vi.advanceTimersByTime(600);

			const pruned = cache.prune();
			expect(pruned).toBe(2);
			expect(cache.size).toBe(1);

			vi.useRealTimers();
		});
	});
});

describe('PendingRequests', () => {
	let pending: PendingRequests<string, string>;

	beforeEach(() => {
		pending = new PendingRequests<string, string>();
	});

	it('deduplicates concurrent requests', async () => {
		let callCount = 0;

		const factory = async () => {
			callCount++;
			await new Promise((r) => setTimeout(r, 10));
			return 'result';
		};

		// Start 3 concurrent requests for the same key
		const promises = [
			pending.getOrCreate('key1', factory),
			pending.getOrCreate('key1', factory),
			pending.getOrCreate('key1', factory)
		];

		const results = await Promise.all(promises);

		expect(callCount).toBe(1); // Only one call made
		expect(results).toEqual(['result', 'result', 'result']);
	});

	it('allows different keys to run in parallel', async () => {
		const calls: string[] = [];

		const factory = (key: string) => async () => {
			calls.push(key);
			await new Promise((r) => setTimeout(r, 10));
			return key;
		};

		const promises = [
			pending.getOrCreate('key1', factory('key1')),
			pending.getOrCreate('key2', factory('key2'))
		];

		await Promise.all(promises);

		expect(calls).toContain('key1');
		expect(calls).toContain('key2');
	});

	it('cleans up after completion', async () => {
		await pending.getOrCreate('key1', async () => 'result');
		expect(pending.has('key1')).toBe(false);
	});

	it('cleans up after error', async () => {
		try {
			await pending.getOrCreate('key1', async () => {
				throw new Error('test');
			});
		} catch {
			// Expected
		}

		expect(pending.has('key1')).toBe(false);
	});
});

describe('Global Cache Management', () => {
	it('clears all registered caches', () => {
		// The global caches are registered automatically
		clearAllCaches();

		const stats = getAllCacheStats();
		for (const stat of stats) {
			expect(stat.size).toBe(0);
		}
	});

	it('reports stats for all registered caches', () => {
		const stats = getAllCacheStats();
		expect(stats.length).toBeGreaterThan(0);

		for (const stat of stats) {
			expect(stat.name).toBeDefined();
			expect(stat.maxSize).toBeGreaterThan(0);
		}
	});
});
