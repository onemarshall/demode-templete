/**
 * Security Dashboard Endpoints
 *
 * Provides data for the security dashboard:
 * - Metrics aggregation
 * - Alert listing
 * - Session overview
 */

import { createAuthEndpoint, sessionMiddleware } from 'better-auth/api';
import { z } from 'zod';
import { getAllFeatureCacheStats } from '../core/feature';
import { isAdminUser } from '$lib/auth/shared/roles';
import type { SecurityConfig } from '../core/feature';
import { getSharedRedisClient, type ManagedRedisClient } from '$lib/auth/shared/redis';

const REDIS_AVAILABLE = Boolean(process.env.REDIS_URL);

// ============================================
// Types
// ============================================

export interface DashboardMetrics {
	timestamp: number;
	period: string;
	requests: {
		total: number;
		blocked: number;
		captchaRequired: number;
		rateLimited: number;
	};
	riskDistribution: {
		low: number;
		medium: number;
		high: number;
		critical: number;
	};
	topBlockReasons: Array<{ reason: string; count: number }>;
	cacheStats: {
		totalEntries: number;
		hitRate: number;
	};
}

export interface DashboardAlert {
	id: string;
	type: 'warning' | 'error' | 'critical';
	message: string;
	timestamp: number;
	metadata?: Record<string, unknown>;
}

export interface DashboardSession {
	id: string;
	userId: string;
	ip: string;
	userAgent: string;
	riskScore: number;
	riskLevel: string;
	createdAt: number;
	lastActivity: number;
}

// ============================================
// Redis-backed Metrics Storage
// ============================================

const METRICS_HASH_KEY = 'security:dashboard:metrics';
const BLOCK_REASONS_HASH_KEY = 'security:dashboard:block_reasons';
const ALERTS_LIST_KEY = 'security:dashboard:alerts';
const MAX_ALERTS = 100;

let dashboardRedis: ManagedRedisClient | null = null;

async function getDashboardRedis(): Promise<ManagedRedisClient | null> {
	if (!REDIS_AVAILABLE) return null;
	if (!dashboardRedis) {
		try {
			dashboardRedis = await getSharedRedisClient('DashboardMetrics');
		} catch {
			return null;
		}
	}
	return dashboardRedis;
}

// In-memory cache (write-through)
const metricsStore = {
	requests: { total: 0, blocked: 0, captchaRequired: 0, rateLimited: 0 },
	riskDistribution: { low: 0, medium: 0, high: 0, critical: 0 },
	blockReasons: new Map<string, number>()
};

let metricsHydrated = false;

async function hydrateMetricsFromRedis(): Promise<void> {
	if (metricsHydrated) return;
	const redis = await getDashboardRedis();
	if (!redis) {
		metricsHydrated = true;
		return;
	}
	try {
		const data = await redis.hGetAll(METRICS_HASH_KEY);
		if (data) {
			metricsStore.requests.total = Number(data['req:total'] ?? 0);
			metricsStore.requests.blocked = Number(data['req:blocked'] ?? 0);
			metricsStore.requests.captchaRequired = Number(data['req:captcha'] ?? 0);
			metricsStore.requests.rateLimited = Number(data['req:rateLimit'] ?? 0);
			metricsStore.riskDistribution.low = Number(data['risk:low'] ?? 0);
			metricsStore.riskDistribution.medium = Number(data['risk:medium'] ?? 0);
			metricsStore.riskDistribution.high = Number(data['risk:high'] ?? 0);
			metricsStore.riskDistribution.critical = Number(data['risk:critical'] ?? 0);
		}

		const reasons = await redis.hGetAll(BLOCK_REASONS_HASH_KEY);
		if (reasons) {
			for (const [reason, count] of Object.entries(reasons)) {
				metricsStore.blockReasons.set(reason, Number(count));
			}
		}
		metricsHydrated = true;
	} catch {
		// Proceed with in-memory defaults
	}
}

// Circular buffer for O(1) alert insertion (replaces O(n) shift)
const alertsBuffer: (DashboardAlert | null)[] = new Array(MAX_ALERTS).fill(null);
let alertsWriteIndex = 0;
let alertsCount = 0;

function getAlerts(): DashboardAlert[] {
	const result: DashboardAlert[] = [];
	const total = Math.min(alertsCount, MAX_ALERTS);
	for (let i = 0; i < total; i++) {
		// Read newest first
		const idx = (alertsWriteIndex - 1 - i + MAX_ALERTS) % MAX_ALERTS;
		const entry = alertsBuffer[idx];
		if (entry) result.push(entry);
	}
	return result;
}

export function recordMetric(
	type: 'request' | 'blocked' | 'captcha' | 'rateLimit',
	riskLevel?: 'low' | 'medium' | 'high' | 'critical',
	blockReason?: string
): void {
	// Update in-memory cache synchronously
	metricsStore.requests.total++;

	switch (type) {
		case 'blocked':
			metricsStore.requests.blocked++;
			if (blockReason) {
				const count = metricsStore.blockReasons.get(blockReason) ?? 0;
				metricsStore.blockReasons.set(blockReason, count + 1);
			}
			break;
		case 'captcha':
			metricsStore.requests.captchaRequired++;
			break;
		case 'rateLimit':
			metricsStore.requests.rateLimited++;
			break;
	}

	if (riskLevel) {
		metricsStore.riskDistribution[riskLevel]++;
	}

	// Persist to Redis asynchronously (fire-and-forget)
	persistMetricToRedis(type, riskLevel, blockReason).catch(() => {});
}

async function persistMetricToRedis(
	type: 'request' | 'blocked' | 'captcha' | 'rateLimit',
	riskLevel?: string,
	blockReason?: string
): Promise<void> {
	try {
		const redis = await getDashboardRedis();
		if (!redis) return;
		const pipeline = redis.multi();
		pipeline.hIncrBy(METRICS_HASH_KEY, 'req:total', 1);

		switch (type) {
			case 'blocked':
				pipeline.hIncrBy(METRICS_HASH_KEY, 'req:blocked', 1);
				if (blockReason) {
					pipeline.hIncrBy(BLOCK_REASONS_HASH_KEY, blockReason, 1);
				}
				break;
			case 'captcha':
				pipeline.hIncrBy(METRICS_HASH_KEY, 'req:captcha', 1);
				break;
			case 'rateLimit':
				pipeline.hIncrBy(METRICS_HASH_KEY, 'req:rateLimit', 1);
				break;
		}

		if (riskLevel) {
			pipeline.hIncrBy(METRICS_HASH_KEY, `risk:${riskLevel}`, 1);
		}

		await pipeline.exec();
	} catch {
		// Non-critical — in-memory store still has the data
	}
}

export function addAlert(alert: Omit<DashboardAlert, 'id' | 'timestamp'>): void {
	const entry: DashboardAlert = {
		...alert,
		id: crypto.randomUUID(),
		timestamp: Date.now()
	};

	alertsBuffer[alertsWriteIndex] = entry;
	alertsWriteIndex = (alertsWriteIndex + 1) % MAX_ALERTS;
	alertsCount++;

	// Persist to Redis (fire-and-forget)
	persistAlertToRedis(entry).catch(() => {});
}

async function persistAlertToRedis(alert: DashboardAlert): Promise<void> {
	try {
		const redis = await getDashboardRedis();
		if (!redis) return;
		await redis
			.multi()
			.lPush(ALERTS_LIST_KEY, JSON.stringify(alert))
			.lTrim(ALERTS_LIST_KEY, 0, MAX_ALERTS - 1)
			.exec();
	} catch {
		// Non-critical
	}
}

// ============================================
// Query Schemas
// ============================================

const metricsQuerySchema = z.object({
	period: z.enum(['1h', '24h', '7d', '30d']).optional().default('24h')
});

const alertsQuerySchema = z.object({
	limit: z.coerce.number().min(1).max(100).optional().default(20),
	type: z.enum(['warning', 'error', 'critical']).optional()
});

// ============================================
// Admin Role Check
// ============================================

interface AuthContext {
	session?: {
		user?: {
			id: string;
			role?: string | string[];
		};
	} | null;
}

function isAdmin(ctx: { context?: unknown }, config: SecurityConfig): boolean {
	const authContext = ctx.context as unknown as AuthContext | undefined;
	const user = authContext?.session?.user;

	if (!user?.id) return false;

	return isAdminUser(
		{ id: user.id, role: user.role },
		{ adminRoles: config.adminRoles ?? ['admin', 'superadmin'] }
	);
}

// ============================================
// Endpoint Factories
// ============================================

export function createMetricsEndpoint(config: SecurityConfig) {
	return createAuthEndpoint(
		'/security/dashboard/metrics',
		{
			method: 'GET',
			use: [sessionMiddleware]
		},
		async (ctx) => {
			if (!isAdmin(ctx, config)) {
				return ctx.json({ error: 'Admin access required' }, { status: 403 });
			}

			// Hydrate from Redis on first read
			await hydrateMetricsFromRedis();

			const url = new URL(ctx.request?.url ?? 'http://localhost');
			const periodParam = url.searchParams.get('period') ?? '24h';
			const parsed = metricsQuerySchema.safeParse({ period: periodParam });
			const period = parsed.success ? parsed.data.period : '24h';

			const cacheStats = getAllFeatureCacheStats();
			let totalEntries = 0;
			let totalHits = 0;
			let totalMisses = 0;

			for (const { stats } of cacheStats) {
				totalEntries += stats.size;
				totalHits += stats.hits;
				totalMisses += stats.misses;
			}

			const totalRequests = totalHits + totalMisses;

			const topBlockReasons = Array.from(metricsStore.blockReasons.entries())
				.map(([reason, count]) => ({ reason, count }))
				.sort((a, b) => b.count - a.count)
				.slice(0, 10);

			const response: DashboardMetrics = {
				timestamp: Date.now(),
				period,
				requests: { ...metricsStore.requests },
				riskDistribution: { ...metricsStore.riskDistribution },
				topBlockReasons,
				cacheStats: {
					totalEntries,
					hitRate: totalRequests > 0 ? totalHits / totalRequests : 0
				}
			};

			return ctx.json(response);
		}
	);
}

export function createAlertsEndpoint(config: SecurityConfig) {
	return createAuthEndpoint(
		'/security/dashboard/alerts',
		{
			method: 'GET',
			use: [sessionMiddleware]
		},
		async (ctx) => {
			if (!isAdmin(ctx, config)) {
				return ctx.json({ error: 'Admin access required' }, { status: 403 });
			}

			const url = new URL(ctx.request?.url ?? 'http://localhost');
			const limitParam = url.searchParams.get('limit') ?? '20';
			const typeParam = url.searchParams.get('type');

			const parsed = alertsQuerySchema.safeParse({
				limit: limitParam,
				type: typeParam ?? undefined
			});

			const limit = parsed.success ? parsed.data.limit : 20;
			const typeFilter = parsed.success ? parsed.data.type : undefined;

			let alerts = getAlerts();

			if (typeFilter) {
				alerts = alerts.filter((a) => a.type === typeFilter);
			}

			alerts = alerts.slice(0, limit);

			return ctx.json({ alerts, total: Math.min(alertsCount, MAX_ALERTS) });
		}
	);
}

export function createSessionsEndpoint(config: SecurityConfig) {
	return createAuthEndpoint(
		'/security/dashboard/sessions',
		{
			method: 'GET',
			use: [sessionMiddleware]
		},
		async (ctx) => {
			if (!isAdmin(ctx, config)) {
				return ctx.json({ error: 'Admin access required' }, { status: 403 });
			}

			const sessions: DashboardSession[] = [];

			return ctx.json({ sessions, total: 0 });
		}
	);
}
