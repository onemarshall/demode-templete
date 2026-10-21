/**
 * Security Health Check Endpoint
 *
 * Provides health status for monitoring systems.
 * Returns basic operational status without exposing sensitive data.
 */

import { createAuthEndpoint, getSessionFromCtx } from 'better-auth/api';
import { getAllFeatures, getAllFeatureCacheStats } from '../core/feature';
import { isAdminUser } from '#lib/auth/shared/roles.js';
import type { SecurityConfig } from '../core/feature';

// ============================================
// Types
// ============================================

export interface HealthResponsePublic {
	status: 'healthy' | 'degraded' | 'unhealthy';
	timestamp: number;
}

export interface HealthResponse extends HealthResponsePublic {
	uptime: number;
	version: string;
	features: {
		total: number;
		enabled: number;
		ids: string[];
	};
	cache?: {
		totalEntries: number;
		totalHits: number;
		totalMisses: number;
		hitRate: number;
	};
}

// ============================================
// State
// ============================================

const startTime = Date.now();
const VERSION = '1.0.0';

// ============================================
// Endpoint Factory
// ============================================

export function createHealthEndpoint(config: SecurityConfig) {
	return createAuthEndpoint(
		'/security/health',
		{
			method: 'GET'
		},
		async (ctx) => {
			// SECURITY: Public callers only get basic status.
			// Detailed info (features, cache, uptime) requires admin auth.
			// Session is optional here — resolve it explicitly since
			// ctx.context.session is only set when sessionMiddleware runs.
			const session = await getSessionFromCtx(ctx).catch(() => null);
			const user = session?.user as { id?: string; role?: string | string[] } | undefined;

			const adminRoles = config.adminRoles ?? ['admin', 'superadmin'];
			const isAdmin = user?.id
				? isAdminUser({ id: user.id, role: user.role }, { adminRoles })
				: false;

			const basicStatus: HealthResponsePublic = {
				status: config.enabled ? 'healthy' : 'degraded',
				timestamp: Date.now()
			};

			if (!isAdmin) {
				return ctx.json(basicStatus);
			}

			// Admin-only: full details
			const features = getAllFeatures();
			const enabledFeatures = features.filter((f) => {
				const featureConfig = config.features?.[f.configKey];
				if (featureConfig === undefined) return true;
				if (typeof featureConfig === 'boolean') return featureConfig;
				return featureConfig.enabled !== false;
			});

			let cacheStats: HealthResponse['cache'] | undefined;

			if (config.enabled) {
				const allStats = getAllFeatureCacheStats();
				if (allStats.length > 0) {
					let totalEntries = 0;
					let totalHits = 0;
					let totalMisses = 0;

					for (const { stats } of allStats) {
						totalEntries += stats.size;
						totalHits += stats.hits;
						totalMisses += stats.misses;
					}

					const totalRequests = totalHits + totalMisses;
					cacheStats = {
						totalEntries,
						totalHits,
						totalMisses,
						hitRate: totalRequests > 0 ? totalHits / totalRequests : 0
					};
				}
			}

			const response: HealthResponse = {
				...basicStatus,
				uptime: Date.now() - startTime,
				version: VERSION,
				features: {
					total: features.length,
					enabled: enabledFeatures.length,
					ids: enabledFeatures.map((f) => f.id)
				}
			};

			if (cacheStats) {
				response.cache = cacheStats;
			}

			return ctx.json(response);
		}
	);
}
