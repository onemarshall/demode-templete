import type { RequestHandler } from './$types';
import { auth } from '#lib/auth/server/config.js';
import { isAdminUser, type UserWithRoles } from '#lib/auth/shared/roles.js';
import { logger } from '#lib/auth/shared/logger.js';
import { getSharedRedisClient } from '#lib/auth/shared/redis/index.js';
import { getDB } from '#lib/auth/server/database/db.js';
import { getServerEnv } from '#lib/auth/shared/env/index.js';
import { emitSystemHealth } from '#lib/monitoring/apm.js';
import * as os from 'node:os';

type CheckStatus = 'operational' | 'degraded' | 'critical';

type HealthCheckResult = {
	name: string;
	status: CheckStatus;
	latencyMs: number;
	error?: string;
};

function statusFromError(error?: unknown): CheckStatus {
	if (!error) return 'operational';
	return 'critical';
}

export const GET: RequestHandler = async ({ request }) => {
	const startedAt = performance.now();

	// Detailed output (error messages, memory/CPU) leaks internals —
	// only expose it to admin sessions.
	let detailed = false;
	try {
		const session = await auth.api.getSession({ headers: request.headers });
		detailed = !!session?.user && isAdminUser(session.user as UserWithRoles);
	} catch {
		detailed = false;
	}

	const checks: HealthCheckResult[] = [];
	const env = await getServerEnv();

	// Database check
	const dbStart = performance.now();
	try {
		const db = await getDB();
		await db.query('SELECT 1');
		checks.push({
			name: 'database',
			status: 'operational',
			latencyMs: performance.now() - dbStart
		});
	} catch (error) {
		logger.error('[SystemHealth] Database check failed', { error });
		checks.push({
			name: 'database',
			status: statusFromError(error),
			latencyMs: performance.now() - dbStart,
			error: error instanceof Error ? error.message : String(error)
		});
	}

	// Redis check (optional — only if REDIS_URL is configured)
	const redisStart = performance.now();
	if (env.REDIS_URL) {
		try {
			const redis = await getSharedRedisClient('SystemHealth');
			await redis.ping();
			checks.push({
				name: 'redis',
				status: 'operational',
				latencyMs: performance.now() - redisStart
			});
		} catch (error) {
			logger.error('[SystemHealth] Redis check failed', { error });
			checks.push({
				name: 'redis',
				status: statusFromError(error),
				latencyMs: performance.now() - redisStart,
				error: error instanceof Error ? error.message : String(error)
			});
		}
	} else {
		checks.push({
			name: 'redis',
			status: 'degraded',
			latencyMs: 0,
			error: 'not configured (using in-memory/postgres storage)'
		});
	}

	// BigDataCloud check (geo intelligence dependency)
	const bdcStart = performance.now();
	if (env.BIGDATACLOUD_API_KEY) {
		const controller = new AbortController();
		const timeout = setTimeout(() => controller.abort(), 2500);
		try {
			const res = await fetch('https://api.bigdatacloud.net/data/client-ip', {
				method: 'GET',
				signal: controller.signal,
				headers: { 'X-Api-Key': String(env.BIGDATACLOUD_API_KEY) }
			});
			clearTimeout(timeout);
			checks.push({
				name: 'bigdatacloud',
				status: res.ok ? 'operational' : 'degraded',
				latencyMs: performance.now() - bdcStart,
				error: res.ok ? undefined : `status ${res.status}`
			});
		} catch (error) {
			clearTimeout(timeout);
			logger.error('[SystemHealth] BigDataCloud check failed', { error });
			checks.push({
				name: 'bigdatacloud',
				status: statusFromError(error),
				latencyMs: performance.now() - bdcStart,
				error: error instanceof Error ? error.message : String(error)
			});
		}
	} else {
		checks.push({
			name: 'bigdatacloud',
			status: 'degraded',
			latencyMs: performance.now() - bdcStart,
			error: 'BIGDATACLOUD_API_KEY not set'
		});
	}

	const overallStatus: CheckStatus = checks.some((c) => c.status === 'critical')
		? 'critical'
		: checks.some((c) => c.status === 'degraded')
			? 'degraded'
			: 'operational';

	const [load1m = 0, load5m = 0, load15m = 0] = os.loadavg();

	// Internal payload — full detail for logging/APM (never sent to clients)
	const payload = {
		overallStatus,
		timestamp: new Date().toISOString(),
		latencyMs: Math.round(performance.now() - startedAt),
		checks,
		system: {
			memory: {
				rssMb: Math.round((process.memoryUsage().rss / 1024 / 1024) * 10) / 10,
				heapUsedMb: Math.round((process.memoryUsage().heapUsed / 1024 / 1024) * 10) / 10
			},
			cpu: {
				load1m: Math.round(load1m * 100) / 100,
				load5m: Math.round(load5m * 100) / 100,
				load15m: Math.round(load15m * 100) / 100
			},
			uptimeSec: Math.round(process.uptime())
		}
	};

	// Monitoring hook: log and emit to APM
	if (overallStatus !== 'operational') {
		logger.warn('[SystemHealth] Degraded', payload);
	} else {
		logger.info('[SystemHealth] OK', { latencyMs: payload.latencyMs });
	}
	await emitSystemHealth(payload);

	// Public response — error messages and system metrics only for admins
	const responsePayload = {
		overallStatus: payload.overallStatus,
		timestamp: payload.timestamp,
		latencyMs: payload.latencyMs,
		checks: checks.map((c) => ({
			name: c.name,
			status: c.status,
			latencyMs: Math.round(c.latencyMs),
			...(detailed && c.error ? { error: c.error } : {})
		})),
		...(detailed ? { system: payload.system } : {})
	};

	return new Response(JSON.stringify(responsePayload), {
		status: overallStatus === 'critical' ? 503 : 200,
		headers: {
			'Content-Type': 'application/json',
			'Cache-Control': 'no-store'
		}
	});
};
