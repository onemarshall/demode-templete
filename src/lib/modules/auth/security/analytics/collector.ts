/**
 * Analytics Event Collector
 *
 * Collects security events with:
 * - Event batching for performance
 * - Sampling rate for high-traffic scenarios
 * - Storage abstraction (not direct Redis)
 */

import { z } from 'zod';
import { securityLogger } from '#lib/platform/logger.js';
import { getRiskLevel } from '../core/risk-engine';
import { getSharedRedisClient, type ManagedRedisClient } from '#lib/platform/redis/index.js';
import { securityConfig } from '../config';
import type { SecurityContext } from '../core/context';

// ============================================
// Types
// ============================================

export interface SecurityAnalyticsEvent {
	id: string;
	type: string;
	timestamp: number;
	ip: string;
	userId?: string;
	sessionId?: string;
	path: string;
	method: string;
	riskScore: number;
	riskLevel: string;
	blocked: boolean;
	captchaRequired: boolean;
	rateLimited: boolean;
	factors: string[];
	metadata?: Record<string, unknown>;
}

// ============================================
// Redis Storage Adapter
// ============================================

const redisStorageOptionsSchema = z
	.object({
		keyPrefix: z.string().optional(),
		maxEvents: z.number().int().positive().optional(),
		redisClient: z.custom<ManagedRedisClient>().optional(),
		redisName: z.string().min(1).optional(),
		redisOptions: z.custom<Parameters<typeof getSharedRedisClient>[1]>().optional()
	})
	.strict();

const securityAnalyticsEventSchema = z.object({
	id: z.string(),
	type: z.string(),
	timestamp: z.number(),
	ip: z.string(),
	userId: z.string().optional(),
	sessionId: z.string().optional(),
	path: z.string(),
	method: z.string(),
	riskScore: z.number(),
	riskLevel: z.string(),
	blocked: z.boolean(),
	captchaRequired: z.boolean(),
	rateLimited: z.boolean(),
	factors: z.array(z.string()),
	metadata: z.record(z.string(), z.unknown()).optional()
});

class RedisStorageAdapter implements StorageAdapter {
	private readonly keyPrefix: string;
	private readonly maxEvents: number;
	private readonly redisName: string;
	private readonly redisOptions?: Parameters<typeof getSharedRedisClient>[1];
	private redisClient?: ManagedRedisClient;

	constructor(options: RedisStorageOptions = {}) {
		const parsed = redisStorageOptionsSchema.parse(options);
		this.keyPrefix = parsed.keyPrefix ?? 'security:analytics:';
		this.maxEvents = parsed.maxEvents ?? 10000;
		this.redisClient = parsed.redisClient;
		this.redisName = parsed.redisName ?? 'SecurityAnalyticsEventStore';
		this.redisOptions = parsed.redisOptions;
	}

	private async getClient(): Promise<ManagedRedisClient> {
		if (!this.redisClient) {
			this.redisClient = await getSharedRedisClient(this.redisName, this.redisOptions);
		}
		await this.redisClient.ensureConnected();
		return this.redisClient;
	}

	private get eventsKey(): string {
		return `${this.keyPrefix}events`;
	}

	async recordEvent(event: SecurityAnalyticsEvent): Promise<void> {
		const client = await this.getClient();
		const payload = JSON.stringify(event);
		const maxIndex = this.maxEvents - 1;
		await client.multi().lPush(this.eventsKey, payload).lTrim(this.eventsKey, 0, maxIndex).exec();
	}

	async recordEvents(events: SecurityAnalyticsEvent[]): Promise<void> {
		if (events.length === 0) return;
		const client = await this.getClient();
		const payloads = events.map((event) => JSON.stringify(event));
		const maxIndex = this.maxEvents - 1;
		await client.multi().lPush(this.eventsKey, payloads).lTrim(this.eventsKey, 0, maxIndex).exec();
	}

	async getRecentEvents(limit: number): Promise<SecurityAnalyticsEvent[]> {
		const safeLimit = Math.max(limit, 0);
		if (safeLimit === 0) return [];
		const client = await this.getClient();
		const results = await client.lRange(this.eventsKey, 0, safeLimit - 1);
		return results
			.map((value) => {
				try {
					const parsed = JSON.parse(value) as unknown;
					const validated = securityAnalyticsEventSchema.safeParse(parsed);
					return validated.success ? validated.data : null;
				} catch {
					return null;
				}
			})
			.filter((event): event is SecurityAnalyticsEvent => event !== null);
	}

	async clearEvents(): Promise<void> {
		const client = await this.getClient();
		await client.del(this.eventsKey);
	}
}

export interface CollectorConfig {
	enabled: boolean;
	samplingRate: number;
	batchSize: number;
	flushIntervalMs: number;
	maxBufferSize: number;
}

export interface StorageAdapter {
	recordEvent(event: SecurityAnalyticsEvent): Promise<void>;
	recordEvents(events: SecurityAnalyticsEvent[]): Promise<void>;
	getRecentEvents(limit: number): Promise<SecurityAnalyticsEvent[]>;
	clearEvents(): Promise<void>;
}

export interface RedisStorageOptions {
	keyPrefix?: string;
	maxEvents?: number;
	redisClient?: ManagedRedisClient;
	redisName?: string;
	redisOptions?: Parameters<typeof getSharedRedisClient>[1];
}

// ============================================
// Default Configuration
// ============================================

const DEFAULT_CONFIG: CollectorConfig = {
	enabled: true,
	samplingRate: 1.0,
	batchSize: 50,
	flushIntervalMs: 5000,
	maxBufferSize: 1000
};

// ============================================
// In-Memory Storage Adapter
// ============================================

class InMemoryStorageAdapter implements StorageAdapter {
	private events: SecurityAnalyticsEvent[] = [];
	private readonly maxEvents: number;

	constructor(maxEvents = 10000) {
		this.maxEvents = maxEvents;
	}

	async recordEvent(event: SecurityAnalyticsEvent): Promise<void> {
		this.events.push(event);
		if (this.events.length > this.maxEvents) {
			this.events = this.events.slice(-this.maxEvents);
		}
	}

	async recordEvents(events: SecurityAnalyticsEvent[]): Promise<void> {
		for (const event of events) {
			this.events.push(event);
		}
		if (this.events.length > this.maxEvents) {
			this.events = this.events.slice(-this.maxEvents);
		}
	}

	async getRecentEvents(limit: number): Promise<SecurityAnalyticsEvent[]> {
		return this.events.slice(-limit).reverse();
	}

	async clearEvents(): Promise<void> {
		this.clear();
	}

	clear(): void {
		this.events = [];
	}

	size(): number {
		return this.events.length;
	}
}

// ============================================
// Analytics Collector
// ============================================

export class AnalyticsCollector {
	private readonly config: CollectorConfig;
	private readonly storage: StorageAdapter;
	private buffer: SecurityAnalyticsEvent[] = [];
	private flushTimer: ReturnType<typeof setInterval> | null = null;
	private eventCount = 0;
	private sampledCount = 0;

	constructor(storage?: StorageAdapter, config?: Partial<CollectorConfig>) {
		this.config = { ...DEFAULT_CONFIG, ...config };
		this.storage = storage ?? new InMemoryStorageAdapter();

		if (this.config.enabled && this.config.flushIntervalMs > 0) {
			this.startFlushTimer();
		}
	}

	private startFlushTimer(): void {
		if (this.flushTimer) return;

		this.flushTimer = setInterval(() => {
			this.flush().catch((error) => {
				securityLogger.error('[Analytics] Flush error', { error });
			});
		}, this.config.flushIntervalMs);

		// Prevent the timer from keeping the process alive during shutdown
		if (typeof this.flushTimer === 'object' && 'unref' in this.flushTimer) {
			this.flushTimer.unref();
		}
	}

	private stopFlushTimer(): void {
		if (this.flushTimer) {
			clearInterval(this.flushTimer);
			this.flushTimer = null;
		}
	}

	private shouldSample(): boolean {
		if (this.config.samplingRate >= 1.0) return true;
		if (this.config.samplingRate <= 0) return false;
		return Math.random() < this.config.samplingRate;
	}

	private createEventFromContext(
		ctx: SecurityContext,
		type: string,
		metadata?: Record<string, unknown>
	): SecurityAnalyticsEvent {
		return {
			id: crypto.randomUUID(),
			type,
			timestamp: Date.now(),
			ip: ctx.ip,
			userId: ctx.userId,
			sessionId: ctx.sessionId,
			path: ctx.path,
			method: ctx.method,
			riskScore: ctx.riskScore,
			riskLevel: ctx.riskLevel,
			blocked: ctx.blocked,
			captchaRequired: ctx.captchaRequired,
			rateLimited: ctx.rateLimited,
			factors: ctx.riskFactors.map((f) => f.factor),
			metadata
		};
	}

	async recordEvent(
		ctx: SecurityContext,
		type: string,
		metadata?: Record<string, unknown>
	): Promise<void> {
		if (!this.config.enabled) return;

		this.eventCount++;

		if (!this.shouldSample()) return;

		this.sampledCount++;

		const event = this.createEventFromContext(ctx, type, metadata);

		if (this.config.batchSize <= 1) {
			await this.storage.recordEvent(event);
			return;
		}

		this.buffer.push(event);

		if (this.buffer.length >= this.config.maxBufferSize) {
			this.buffer = this.buffer.slice(-this.config.maxBufferSize);
			securityLogger.warn('[Analytics] Buffer overflow, events dropped');
		}

		if (this.buffer.length >= this.config.batchSize) {
			await this.flush();
		}
	}

	async recordContextEvents(ctx: SecurityContext): Promise<void> {
		if (!this.config.enabled) return;

		for (const event of ctx.events) {
			await this.recordEvent(ctx, event.type, event.data);
		}
	}

	async flush(throwOnError = false): Promise<void> {
		if (this.buffer.length === 0) return;

		const events = [...this.buffer];
		this.buffer = [];

		try {
			await this.storage.recordEvents(events);
			securityLogger.debug('[Analytics] Flushed events', { count: events.length });
		} catch (error) {
			this.buffer.unshift(...events);
			securityLogger.error('[Analytics] Flush failed, events re-queued', { error });
			if (throwOnError) throw error;
		}
	}

	async getRecentEvents(limit = 100): Promise<SecurityAnalyticsEvent[]> {
		await this.flush(true);
		return this.storage.getRecentEvents(limit);
	}

	async clearEvents(): Promise<void> {
		this.buffer = [];
		await this.storage.clearEvents();
		this.eventCount = 0;
		this.sampledCount = 0;
	}

	getStats(): {
		totalEvents: number;
		sampledEvents: number;
		bufferSize: number;
		samplingRate: number;
	} {
		return {
			totalEvents: this.eventCount,
			sampledEvents: this.sampledCount,
			bufferSize: this.buffer.length,
			samplingRate: this.config.samplingRate
		};
	}

	/**
	 * Get the underlying storage adapter (for seeding/testing)
	 */
	getStorage(): StorageAdapter {
		return this.storage;
	}

	destroy(): void {
		this.stopFlushTimer();
		this.flush().catch(() => {});
	}
}

// ============================================
// Factory Functions
// ============================================

let defaultCollector: AnalyticsCollector | null = null;

export function createAnalyticsCollector(
	storage?: StorageAdapter,
	config?: Partial<CollectorConfig>
): AnalyticsCollector {
	return new AnalyticsCollector(storage, config);
}

export function createRedisStorageAdapter(options?: RedisStorageOptions): StorageAdapter {
	return new RedisStorageAdapter(options);
}

export function getDefaultCollector(): AnalyticsCollector {
	if (!defaultCollector) {
		const storeConfig = securityConfig.analyticsEventStore;
		const storage =
			storeConfig.provider === 'redis'
				? createRedisStorageAdapter({
						keyPrefix: storeConfig.redis?.keyPrefix,
						maxEvents: storeConfig.redis?.maxEvents,
						redisName: storeConfig.redis?.redisName
					})
				: new InMemoryStorageAdapter();
		defaultCollector = new AnalyticsCollector(storage);
	}
	return defaultCollector;
}

export function resetDefaultCollector(): void {
	if (defaultCollector) {
		defaultCollector.destroy();
		defaultCollector = null;
	}
}

// ============================================
// Convenience Functions
// ============================================

export async function recordSecurityEvent(
	ctx: SecurityContext,
	type: string,
	metadata?: Record<string, unknown>
): Promise<void> {
	await getDefaultCollector().recordEvent(ctx, type, metadata);
}

export async function recordBlock(
	ctx: SecurityContext,
	featureId: string,
	reason: string
): Promise<void> {
	await recordSecurityEvent(ctx, 'blocked', { featureId, reason });
}

export async function recordCaptchaRequired(ctx: SecurityContext): Promise<void> {
	await recordSecurityEvent(ctx, 'captcha_required');
}

export async function recordCaptchaPassed(ctx: SecurityContext): Promise<void> {
	await recordSecurityEvent(ctx, 'captcha_passed');
}

export async function recordCaptchaFailed(ctx: SecurityContext): Promise<void> {
	await recordSecurityEvent(ctx, 'captcha_failed');
}

export async function recordRateLimited(ctx: SecurityContext): Promise<void> {
	await recordSecurityEvent(ctx, 'rate_limited');
}

export async function recordAuthSuccess(ctx: SecurityContext): Promise<void> {
	await recordSecurityEvent(ctx, 'auth_success');
}

export async function recordAuthFailure(ctx: SecurityContext, reason: string): Promise<void> {
	await recordSecurityEvent(ctx, 'auth_failure', { reason });
}

/**
 * Seed the collector with sample events for development/testing
 */
export async function seedSampleEvents(): Promise<void> {
	const collector = getDefaultCollector();
	const storage = collector.getStorage();

	const now = Date.now();
	const hourMs = 60 * 60 * 1000;

	const eventTypes = [
		'auth_success',
		'auth_success',
		'auth_success',
		'auth_failure',
		'auth_failure',
		'password_reset',
		'blocked',
		'rate_limited',
		'captcha_required',
		'captcha_passed'
	];
	const paths = ['/auth/sign-in', '/auth/sign-up', '/api/auth/session', '/dashboard', '/admin'];
	const ips = ['192.168.1.100', '10.0.0.50', '172.16.0.25', '8.8.8.8', '1.1.1.1'];

	const events: SecurityAnalyticsEvent[] = [];

	// Generate 100 sample events over the last 24 hours
	for (let i = 0; i < 100; i++) {
		const hoursAgo = Math.floor(Math.random() * 24);
		const minutesAgo = Math.floor(Math.random() * 60);
		const timestamp = now - hoursAgo * hourMs - minutesAgo * 60 * 1000;

		const riskScore = Math.floor(Math.random() * 100);
		const riskLevel = getRiskLevel(riskScore);
		const blocked = riskScore > 70 && Math.random() > 0.5;
		const captchaRequired = riskScore > 50 && Math.random() > 0.6;
		const rateLimited = Math.random() > 0.9;

		const eventType = eventTypes[Math.floor(Math.random() * eventTypes.length)] ?? 'auth_success';
		const ip = ips[Math.floor(Math.random() * ips.length)] ?? '127.0.0.1';
		const path = paths[Math.floor(Math.random() * paths.length)] ?? '/';

		events.push({
			id: crypto.randomUUID(),
			type: eventType,
			timestamp,
			ip,
			userId: Math.random() > 0.3 ? `user-${Math.floor(Math.random() * 10)}` : undefined,
			sessionId: Math.random() > 0.2 ? `session-${Math.floor(Math.random() * 20)}` : undefined,
			path,
			method: Math.random() > 0.3 ? 'POST' : 'GET',
			riskScore,
			riskLevel,
			blocked,
			captchaRequired,
			rateLimited,
			factors: riskScore > 30 ? ['suspicious_ip', 'unusual_behavior'] : []
		});
	}

	await storage.recordEvents(events);
	securityLogger.info('[Analytics] Seeded sample events', { count: events.length });
}

export { InMemoryStorageAdapter, RedisStorageAdapter };
