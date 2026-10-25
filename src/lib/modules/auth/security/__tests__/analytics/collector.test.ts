/**
 * Analytics Collector Tests
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

vi.mock('#lib/platform/config/server.server.js', () => ({
	getServerEnvSync: () => ({
		BETTER_AUTH_SECRET: 'test-secret',
		PUBLIC_SITE_URL: 'http://localhost:3000'
	}),
	getServerEnv: () =>
		Promise.resolve({
			BETTER_AUTH_SECRET: 'test-secret',
			PUBLIC_SITE_URL: 'http://localhost:3000'
		}),
	isDevelopment: () => false,
	isBrowser: () => false,
	isServer: () => true
}));
vi.mock('#lib/platform/config/index.js', () => ({
	getServerEnvSync: () => ({
		BETTER_AUTH_SECRET: 'test-secret',
		PUBLIC_SITE_URL: 'http://localhost:3000'
	}),
	getServerEnv: () =>
		Promise.resolve({
			BETTER_AUTH_SECRET: 'test-secret',
			PUBLIC_SITE_URL: 'http://localhost:3000'
		}),
	isDevelopment: () => false,
	isBrowser: () => false,
	isServer: () => true
}));

import {
	AnalyticsCollector,
	InMemoryStorageAdapter,
	createAnalyticsCollector,
	type SecurityAnalyticsEvent
} from '../../analytics/collector';
import { createTestSecurityContext } from '../../core/context';

// ============================================
// Test Helpers
// ============================================

function createMockEvent(overrides: Partial<SecurityAnalyticsEvent> = {}): SecurityAnalyticsEvent {
	return {
		id: crypto.randomUUID(),
		type: 'test',
		timestamp: Date.now(),
		ip: '1.2.3.4',
		path: '/api/auth/sign-in',
		method: 'POST',
		riskScore: 25,
		riskLevel: 'low',
		blocked: false,
		captchaRequired: false,
		rateLimited: false,
		factors: [],
		...overrides
	};
}

// ============================================
// Tests
// ============================================

describe('InMemoryStorageAdapter', () => {
	let storage: InMemoryStorageAdapter;

	beforeEach(() => {
		storage = new InMemoryStorageAdapter(100);
	});

	it('records single event', async () => {
		const event = createMockEvent();
		await storage.recordEvent(event);

		const events = await storage.getRecentEvents(10);
		expect(events).toHaveLength(1);
		expect(events[0]?.id).toBe(event.id);
	});

	it('records multiple events', async () => {
		const events = [createMockEvent(), createMockEvent(), createMockEvent()];
		await storage.recordEvents(events);

		const retrieved = await storage.getRecentEvents(10);
		expect(retrieved).toHaveLength(3);
	});

	it('limits stored events to maxEvents', async () => {
		const storage = new InMemoryStorageAdapter(5);

		for (let i = 0; i < 10; i++) {
			await storage.recordEvent(createMockEvent({ type: `event-${i}` }));
		}

		expect(storage.size()).toBe(5);
	});

	it('returns events in reverse order (most recent first)', async () => {
		await storage.recordEvent(createMockEvent({ type: 'first' }));
		await storage.recordEvent(createMockEvent({ type: 'second' }));
		await storage.recordEvent(createMockEvent({ type: 'third' }));

		const events = await storage.getRecentEvents(10);
		expect(events[0]?.type).toBe('third');
		expect(events[2]?.type).toBe('first');
	});

	it('clears all events', async () => {
		await storage.recordEvents([createMockEvent(), createMockEvent()]);
		storage.clear();

		expect(storage.size()).toBe(0);
	});

	it('handles large batch recordEvents without stack overflow', async () => {
		const largeStorage = new InMemoryStorageAdapter(50000);
		const largeBatch = Array.from({ length: 20000 }, (_, i) =>
			createMockEvent({ type: `batch-${i}` })
		);

		// This would throw "Maximum call stack size exceeded" with push(...events)
		await largeStorage.recordEvents(largeBatch);

		expect(largeStorage.size()).toBe(20000);
	});

	it('enforces maxEvents limit with batch recording', async () => {
		const tinyStorage = new InMemoryStorageAdapter(10);
		const batch = Array.from({ length: 25 }, (_, i) => createMockEvent({ type: `overflow-${i}` }));

		await tinyStorage.recordEvents(batch);

		expect(tinyStorage.size()).toBe(10);
		// Should keep the last 10 events
		const events = await tinyStorage.getRecentEvents(10);
		expect(events[0]?.type).toBe('overflow-24');
	});
});

describe('AnalyticsCollector', () => {
	let collector: AnalyticsCollector;
	let storage: InMemoryStorageAdapter;

	beforeEach(() => {
		storage = new InMemoryStorageAdapter();
		collector = new AnalyticsCollector(storage, {
			enabled: true,
			samplingRate: 1.0,
			batchSize: 1,
			flushIntervalMs: 0,
			maxBufferSize: 100
		});
	});

	afterEach(() => {
		collector.destroy();
	});

	describe('event recording', () => {
		it('records event from security context', async () => {
			const ctx = createTestSecurityContext({
				ip: '1.2.3.4',
				riskScore: 50,
				riskLevel: 'medium'
			});

			await collector.recordEvent(ctx, 'test_event');

			const events = await collector.getRecentEvents(10);
			expect(events).toHaveLength(1);
			expect(events[0]?.type).toBe('test_event');
			expect(events[0]?.ip).toBe('1.2.3.4');
			expect(events[0]?.riskScore).toBe(50);
		});

		it('includes metadata in event', async () => {
			const ctx = createTestSecurityContext();
			await collector.recordEvent(ctx, 'test', { customField: 'value' });

			const events = await collector.getRecentEvents(10);
			expect(events[0]?.metadata).toEqual({ customField: 'value' });
		});

		it('does not record when disabled', async () => {
			const disabledCollector = new AnalyticsCollector(storage, {
				enabled: false,
				samplingRate: 1.0,
				batchSize: 1,
				flushIntervalMs: 0,
				maxBufferSize: 100
			});

			const ctx = createTestSecurityContext();
			await disabledCollector.recordEvent(ctx, 'test');

			const events = await disabledCollector.getRecentEvents(10);
			expect(events).toHaveLength(0);

			disabledCollector.destroy();
		});
	});

	describe('sampling', () => {
		it('applies sampling rate', async () => {
			const sampledCollector = new AnalyticsCollector(storage, {
				enabled: true,
				samplingRate: 0.5,
				batchSize: 1,
				flushIntervalMs: 0,
				maxBufferSize: 1000
			});

			const ctx = createTestSecurityContext();

			for (let i = 0; i < 100; i++) {
				await sampledCollector.recordEvent(ctx, 'test');
			}

			const stats = sampledCollector.getStats();
			expect(stats.totalEvents).toBe(100);
			expect(stats.sampledEvents).toBeGreaterThan(30);
			expect(stats.sampledEvents).toBeLessThan(70);

			sampledCollector.destroy();
		});

		it('records all events with samplingRate 1.0', async () => {
			const ctx = createTestSecurityContext();

			for (let i = 0; i < 10; i++) {
				await collector.recordEvent(ctx, 'test');
			}

			const stats = collector.getStats();
			expect(stats.totalEvents).toBe(10);
			expect(stats.sampledEvents).toBe(10);
		});

		it('records no events with samplingRate 0', async () => {
			const zeroSampleCollector = new AnalyticsCollector(storage, {
				enabled: true,
				samplingRate: 0,
				batchSize: 1,
				flushIntervalMs: 0,
				maxBufferSize: 100
			});

			const ctx = createTestSecurityContext();

			for (let i = 0; i < 10; i++) {
				await zeroSampleCollector.recordEvent(ctx, 'test');
			}

			const stats = zeroSampleCollector.getStats();
			expect(stats.sampledEvents).toBe(0);

			zeroSampleCollector.destroy();
		});
	});

	describe('batching', () => {
		it('batches events before flushing', async () => {
			const batchedStorage = new InMemoryStorageAdapter();
			const batchedCollector = new AnalyticsCollector(batchedStorage, {
				enabled: true,
				samplingRate: 1.0,
				batchSize: 5,
				flushIntervalMs: 0,
				maxBufferSize: 100
			});

			const ctx = createTestSecurityContext();

			for (let i = 0; i < 3; i++) {
				await batchedCollector.recordEvent(ctx, 'test');
			}

			expect(batchedCollector.getStats().bufferSize).toBe(3);
			expect(batchedStorage.size()).toBe(0);

			for (let i = 0; i < 2; i++) {
				await batchedCollector.recordEvent(ctx, 'test');
			}

			expect(batchedStorage.size()).toBe(5);

			batchedCollector.destroy();
		});
	});

	describe('getStorage', () => {
		it('returns the storage adapter instance', () => {
			const retrievedStorage = collector.getStorage();
			expect(retrievedStorage).toBe(storage);
		});
	});

	describe('stats', () => {
		it('returns correct stats', async () => {
			const ctx = createTestSecurityContext();

			await collector.recordEvent(ctx, 'test1');
			await collector.recordEvent(ctx, 'test2');

			const stats = collector.getStats();
			expect(stats.totalEvents).toBe(2);
			expect(stats.sampledEvents).toBe(2);
			expect(stats.samplingRate).toBe(1.0);
		});
	});
});

describe('createAnalyticsCollector', () => {
	it('creates collector with default config', () => {
		const collector = createAnalyticsCollector();
		expect(collector).toBeInstanceOf(AnalyticsCollector);
		collector.destroy();
	});

	it('creates collector with custom storage', () => {
		const storage = new InMemoryStorageAdapter();
		const collector = createAnalyticsCollector(storage);
		expect(collector).toBeInstanceOf(AnalyticsCollector);
		collector.destroy();
	});

	it('creates collector with custom config', () => {
		const collector = createAnalyticsCollector(undefined, {
			samplingRate: 0.5,
			batchSize: 10
		});
		expect(collector.getStats().samplingRate).toBe(0.5);
		collector.destroy();
	});
});

describe('dashboard read availability', () => {
	it('surfaces a failed flush instead of returning a misleading healthy empty sample', async () => {
		const storage = new InMemoryStorageAdapter();
		const collector = new AnalyticsCollector(storage, { enabled: true, samplingRate: 1, batchSize: 100, flushIntervalMs: 0 });
		await collector.recordEvent(createTestSecurityContext(), 'test');
		const write = vi.spyOn(storage, 'recordEvents').mockRejectedValue(new Error('Write unavailable'));
		await expect(collector.getRecentEvents(200)).rejects.toThrow('Write unavailable');
		expect(collector.getStats().bufferSize).toBe(1);
		write.mockRestore();
		collector.destroy();
	});
});
