/**
 * Security Dashboard SDK
 *
 * SDK for interacting with security analytics endpoints.
 * Provides authentication, data loading, and action methods.
 *
 * Implementation is split across three sibling files:
 * - dashboard-types.ts      — interface surface + SecurityDashboardError
 * - dashboard-config.ts     — config factory, COOKIE_PATTERNS, API_ENDPOINTS
 * - dashboard-analytics.ts  — pure analytics calculators
 *
 * This file owns the SecurityDashboardSDK class (auth, orchestration,
 * action methods). Types and config are re-exported here so existing
 * importers see no breaking change.
 */

import { auth } from '$lib/auth';
import { securityLogger as logger, enhancedLogger } from '$lib/auth/shared/logger';
import { getDB } from '$lib/auth/server/database';
import type { FlaggedSession, TrustedDevice } from '../types';
import {
	getDefaultCollector,
	calculateMetrics,
	getCachedMetrics,
	cacheMetrics,
	type TimeRange,
	type SecurityAnalyticsEvent,
} from '../analytics';
import { getBlockedIPs } from './blocked-ips';
import {
	API_ENDPOINTS,
	COOKIE_PATTERNS,
	createSecurityDashboardConfig,
	twoFactorAdoptionStatsSchema,
} from './dashboard-config';
import {
	bucketByHour,
	calculateAPISecurityStats,
	calculateIPReputationScores,
	calculateRateLimitStats,
	calculateSessionAnalytics,
	calculateTimeAnalysis,
	calculateUserRiskProfiles,
	detectKnownBadActors,
	detectTorExitNodes,
	generateThreatFeed,
} from './dashboard-analytics';
import {
	SecurityDashboardError,
	type ActionResult,
	type AuthStats,
	type AuthenticatedContext,
	type BlockedIPInfo,
	type BruteForceAttempt,
	type CacheClearResult,
	type DashboardData,
	type HourlyAuthRate,
	type IPIntelligence,
	type SecurityDashboardConfig,
	type SystemHealthStatus,
} from './dashboard-types';

// Re-exports for backward compatibility — existing callers import these from sdk.ts.
export type {
	APISecurityStats,
	ActionResult,
	ApiStatus,
	AuthStats,
	AuthenticatedContext,
	AuthenticatedUser,
	BlockedIPInfo,
	BruteForceAttempt,
	CacheClearResult,
	DashboardData,
	HourlyAuthRate,
	IPIntelligence,
	RateLimitStats,
	SecurityDashboardConfig,
	SessionAnalytics,
	SystemHealthStatus,
	ThreatEvent,
	TimeAnalysis,
	UserRiskProfile,
} from './dashboard-types';
export { SecurityDashboardError } from './dashboard-types';
export {
	API_ENDPOINTS,
	COOKIE_PATTERNS,
	createSecurityDashboardConfig,
} from './dashboard-config';

export class SecurityDashboardSDK {
	private config: SecurityDashboardConfig;

	constructor(config?: Partial<SecurityDashboardConfig>) {
		this.config = createSecurityDashboardConfig(config);
		enhancedLogger.section('Security Dashboard SDK');
		enhancedLogger.security.info(
			'[Security Dashboard SDK] Initialized with baseUrl:',
			this.config.baseUrl,
		);
	}

	async authenticateRequest(request: Request): Promise<AuthenticatedContext> {
		try {
			const session = await auth.api.getSession({ headers: request.headers });

			if (!session?.user) {
				throw new SecurityDashboardError(
					'Unauthorized - no session found',
					'NO_SESSION',
					401,
				);
			}

			const user = session.user as { id: string; role?: string; email?: string };
			const cookies = request.headers.get('cookie') ?? '';
			const sessionToken = this.extractSessionToken(cookies);
			const headers = this.buildAuthenticatedHeaders(cookies, sessionToken);

			const isAdmin = this.isAdminUser(user);
			const isDev = this.config.environment === 'development';

			if (!isAdmin) {
				throw new SecurityDashboardError(
					'Access denied - admin privileges required',
					'INSUFFICIENT_PERMISSIONS',
					403,
				);
			}

			return { user, sessionToken, cookies, headers, isAdmin, isDev };
		} catch (error) {
			if (error instanceof SecurityDashboardError) throw error;
			throw new SecurityDashboardError(
				`Authentication failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
				'AUTH_ERROR',
				401,
			);
		}
	}

	private extractSessionToken(cookies: string): string {
		for (const pattern of COOKIE_PATTERNS) {
			const match = cookies.match(pattern + '([^;]+)');
			if (match?.[1]) return decodeURIComponent(match[1]);
		}
		return '';
	}

	private buildAuthenticatedHeaders(
		cookies: string,
		sessionToken?: string,
	): Record<string, string> {
		const headers: Record<string, string> = {
			'Content-Type': 'application/json',
			Cookie: cookies,
		};
		if (sessionToken) headers['Authorization'] = `Bearer ${sessionToken}`;
		return headers;
	}

	private isAdminUser(user: { role?: string; email?: string }): boolean {
		const hasAdminRole = this.config.adminRoles?.includes(user.role || '');
		const hasAdminDomain = this.config.adminDomains?.some((domain) =>
			user.email?.endsWith(domain),
		);
		return !!(hasAdminRole || hasAdminDomain);
	}

	private async getTwoFactorAdoptionStats(): Promise<{
		totalUsersCount: number;
		twoFactorEnabledCount: number;
	}> {
		const db = await getDB();
		const result = await db.query(
			`SELECT
				COUNT(*)::int AS "totalUsersCount",
				COUNT(*) FILTER (WHERE COALESCE("twoFactorEnabled", false) = true)::int AS "twoFactorEnabledCount"
			 FROM "user"`,
		);

		const parsed = twoFactorAdoptionStatsSchema.safeParse(result.rows[0] ?? {});
		if (!parsed.success) {
			throw new SecurityDashboardError(
				'Invalid two-factor adoption stats shape',
				'INVALID_2FA_STATS',
			);
		}
		return parsed.data;
	}

	async loadDashboardData(context: AuthenticatedContext): Promise<DashboardData> {
		const startTime = Date.now();
		try {
			logger.debug('[Security Dashboard SDK] Loading dashboard data directly...');
			logger.debug('[Security Dashboard SDK] Loading dashboard for admin user', {
				userId: context.user.id,
			});

			const timeRange: TimeRange = '24h';
			const collector = getDefaultCollector();

			const eventsStart = Date.now();
			const events = await collector.getRecentEvents(200);
			enhancedLogger.security.info(
				`[Security Dashboard SDK] Events fetch took ${Date.now() - eventsStart}ms for ${events.length} events`,
			);

			if (events.length === 0 && this.config.environment === 'development') {
				logger.info(
					'[Security Dashboard SDK] No events found - try signing in or signing up to generate security events',
				);
			}

			let metricsData = getCachedMetrics(timeRange);
			if (!metricsData) {
				metricsData = calculateMetrics(events, timeRange);
				cacheMetrics(timeRange, metricsData);
			}

			const systemHealthData: SystemHealthStatus = {
				overallStatus: 'operational',
				summary: 'All systems operational',
				updatedAt: Date.now(),
				metrics: [
					{
						id: 'redis',
						label: 'Redis',
						value: 100,
						unit: '%',
						status: 'operational',
						description: 'Cache service',
						updatedAt: Date.now(),
					},
					{
						id: 'database',
						label: 'Database',
						value: 100,
						unit: '%',
						status: 'operational',
						description: 'Primary database',
						updatedAt: Date.now(),
					},
					{
						id: 'auth',
						label: 'Auth Service',
						value: 100,
						unit: '%',
						status: 'operational',
						description: 'Authentication service',
						updatedAt: Date.now(),
					},
				],
			};

			const apiStatus = { metrics: 200, sessions: 200, devices: 200, systemHealth: 200 };

			logger.debug('[Security Dashboard SDK] Dashboard data loaded successfully');

			const flaggedSessions: FlaggedSession[] = events
				.filter((e) => e.riskScore >= 25)
				.slice(0, 5)
				.map((e) => ({
					sessionId: e.sessionId ?? e.id,
					userId: e.userId,
					ip: e.ip,
					riskScore: e.riskScore,
					riskLevel: e.riskLevel as 'low' | 'medium' | 'high' | 'critical',
					factors: e.factors,
					riskFactors: e.factors,
					flaggedAt: e.timestamp,
					isBlocked: e.blocked,
					city: 'Unknown',
					countryCode: 'US',
				}));

			const trustedDevices: TrustedDevice[] = events
				.filter((e) => e.riskScore < 30 && e.userId)
				.slice(0, 3)
				.map((e, i) => ({
					deviceId: `device-${i}`,
					userId: e.userId ?? 'anonymous',
					userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
					trustLevel: Math.floor((100 - e.riskScore) / 20),
					trustScore: 100 - e.riskScore,
					lastSeen: e.timestamp,
					trustedAt: e.timestamp - 86400000,
					platform: 'macOS',
				}));

			let blockedIPs: BlockedIPInfo[] = [];
			try {
				const blockedIPsPromise = getBlockedIPs({
					limit: 5,
					sortBy: 'blockedAt',
					sortOrder: 'desc',
				});
				const blockedIPsResponse = await Promise.race([
					blockedIPsPromise,
					new Promise((_, reject) =>
						setTimeout(() => reject(new Error('Timeout')), 2000),
					),
				]);
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				blockedIPs = (blockedIPsResponse as any).ips.map((ip: any) => ({
					ip: ip.ip,
					reason: ip.reason,
					blockedAt: ip.blockedAt,
					expiresAt: ip.expiresAt,
					hitCount: ip.hitCount,
				}));
			} catch (error) {
				logger.warn(
					'[Security Dashboard SDK] Failed to get blocked IPs (using empty list):',
					error,
				);
			}

			const authSuccessEvents: SecurityAnalyticsEvent[] = [];
			const authFailureEvents: SecurityAnalyticsEvent[] = [];
			const passwordResetEvents: SecurityAnalyticsEvent[] = [];
			for (const e of events) {
				switch (e.type) {
					case 'auth_success':
						authSuccessEvents.push(e);
						break;
					case 'auth_failure':
						authFailureEvents.push(e);
						break;
					case 'password_reset':
						passwordResetEvents.push(e);
						break;
				}
			}
			const totalAuthEvents = authSuccessEvents.length + authFailureEvents.length;

			const hourMs = 60 * 60 * 1000;
			const authEvents = [...authSuccessEvents, ...authFailureEvents];
			const hourlyRates = bucketByHour<HourlyAuthRate>(
				authEvents,
				(hourEvents, hour) => {
					const hourSuccesses = hourEvents.filter(
						(e) => e.type === 'auth_success',
					).length;
					const hourFailures = hourEvents.filter(
						(e) => e.type === 'auth_failure',
					).length;
					const hourTotal = hourSuccesses + hourFailures;
					return {
						hour,
						timestamp: Date.now() - 24 * hourMs,
						successCount: hourSuccesses,
						failureCount: hourFailures,
						successRate: hourTotal > 0 ? (hourSuccesses / hourTotal) * 100 : 100,
					};
				},
			);

			const failuresByUserIp = new Map<
				string,
				{ count: number; lastAttempt: number; ip: string; userId: string }
			>();
			for (const event of authFailureEvents.slice(0, 200)) {
				const key = `${event.userId ?? 'anonymous'}:${event.ip}`;
				const existing = failuresByUserIp.get(key) ?? {
					count: 0,
					lastAttempt: 0,
					ip: event.ip,
					userId: event.userId ?? 'anonymous',
				};
				existing.count++;
				existing.lastAttempt = Math.max(existing.lastAttempt, event.timestamp);
				failuresByUserIp.set(key, existing);
			}
			const bruteForceAttempts: BruteForceAttempt[] = Array.from(
				failuresByUserIp.values(),
			)
				.filter((a) => a.count >= 3)
				.map((a) => ({
					userId: a.userId,
					ip: a.ip,
					failureCount: a.count,
					lastAttempt: a.lastAttempt,
					isBlocked: a.count >= 5,
				}))
				.sort((a, b) => b.failureCount - a.failureCount)
				.slice(0, 5);

			const passwordResetHourly = bucketByHour(
				passwordResetEvents,
				(hourEvents, hour) => ({ hour, count: hourEvents.length }),
			);

			let twoFactorAdoptionRate = 0;
			let totalUsersCount = 0;
			let twoFactorEnabledCount = 0;
			try {
				const twoFactorPromise = this.getTwoFactorAdoptionStats();
				const result = await Promise.race([
					twoFactorPromise,
					new Promise<never>((_, reject) =>
						setTimeout(() => reject(new Error('Timeout')), 1000),
					),
				]);
				totalUsersCount = result.totalUsersCount;
				twoFactorEnabledCount = result.twoFactorEnabledCount;
				twoFactorAdoptionRate =
					totalUsersCount > 0 ? (twoFactorEnabledCount / totalUsersCount) * 100 : 0;
			} catch (error) {
				logger.warn(
					'[Security Dashboard SDK] 2FA stats timeout, using default:',
					error,
				);
				twoFactorAdoptionRate = 0;
			}

			const authStats: AuthStats = {
				successCount: authSuccessEvents.length,
				failureCount: authFailureEvents.length,
				successRate:
					totalAuthEvents > 0
						? (authSuccessEvents.length / totalAuthEvents) * 100
						: 100,
				recentFailures: authFailureEvents.slice(0, 5).map((e) => ({
					timestamp: e.timestamp,
					ip: e.ip,
					reason: (e.metadata?.reason as string) ?? 'Unknown',
				})),
				hourlyRates,
				bruteForceAttempts,
				twoFactorAdoptionRate,
				twoFactorEnabledCount,
				totalUsersCount,
				passwordResetRequests: passwordResetEvents.length,
				passwordResetHourly,
			};

			const uniqueSessionIds = new Set(
				events.filter((e) => e.sessionId).map((e) => e.sessionId),
			);
			const activeSessionsCount = uniqueSessionIds.size;

			const FAST_MODE = false;

			const sessionStart = Date.now();
			const sessionAnalytics = FAST_MODE
				? null
				: calculateSessionAnalytics(events, uniqueSessionIds);
			enhancedLogger.security.info(
				`[Security Dashboard SDK] Session analytics took ${Date.now() - sessionStart}ms`,
			);

			const rateLimitStart = Date.now();
			const rateLimitStats = FAST_MODE ? null : calculateRateLimitStats(events);
			enhancedLogger.security.info(
				`[Security Dashboard SDK] Rate limit stats took ${Date.now() - rateLimitStart}ms`,
			);

			const ipIntelStart = Date.now();
			const ipIntelligence: IPIntelligence = FAST_MODE
				? {
						blockedIPs,
						ipReputationScores: [],
						knownBadActors: [],
						torExitNodes: [],
					}
				: {
						blockedIPs,
						ipReputationScores: calculateIPReputationScores(events),
						knownBadActors: detectKnownBadActors(events),
						torExitNodes: detectTorExitNodes(events),
					};
			enhancedLogger.security.info(
				`[Security Dashboard SDK] IP intelligence took ${Date.now() - ipIntelStart}ms`,
			);

			const userRiskStart = Date.now();
			const userRiskProfiles = FAST_MODE ? [] : calculateUserRiskProfiles(events);
			enhancedLogger.security.info(
				`[Security Dashboard SDK] User risk profiles took ${Date.now() - userRiskStart}ms`,
			);

			const apiStatsStart = Date.now();
			const apiSecurityStats = FAST_MODE ? null : calculateAPISecurityStats(events);
			enhancedLogger.security.info(
				`[Security Dashboard SDK] API security stats took ${Date.now() - apiStatsStart}ms`,
			);

			const timeAnalysisStart = Date.now();
			const timeAnalysis = FAST_MODE ? null : calculateTimeAnalysis(events);
			enhancedLogger.security.info(
				`[Security Dashboard SDK] Time analysis took ${Date.now() - timeAnalysisStart}ms`,
			);

			const threatFeedStart = Date.now();
			const threatFeed = FAST_MODE ? [] : generateThreatFeed(events);
			enhancedLogger.security.info(
				`[Security Dashboard SDK] Threat feed took ${Date.now() - threatFeedStart}ms`,
			);

			return {
				metrics: metricsData,
				sessions: flaggedSessions,
				devices: trustedDevices,
				systemHealth: systemHealthData,
				blockedIPs,
				activeSessionsCount,
				authStats,
				sessionAnalytics,
				rateLimitStats,
				ipIntelligence,
				userRiskProfiles,
				apiSecurityStats,
				timeAnalysis,
				threatFeed,
				apiStatus,
				error: null,
				lastUpdated: new Date().toISOString(),
			};
		} catch (error) {
			logger.error('[Security Dashboard SDK] Error loading dashboard data:', error);
			return {
				metrics: null,
				sessions: null,
				devices: null,
				systemHealth: null,
				blockedIPs: [],
				activeSessionsCount: 0,
				authStats: null,
				sessionAnalytics: null,
				rateLimitStats: null,
				ipIntelligence: null,
				userRiskProfiles: [],
				apiSecurityStats: null,
				timeAnalysis: null,
				threatFeed: [],
				apiStatus: { metrics: 0, sessions: 0, devices: 0, systemHealth: 0 },
				error: error instanceof Error ? error.message : 'Unknown error',
				lastUpdated: new Date().toISOString(),
			};
		} finally {
			enhancedLogger.security.info(
				`[Security Dashboard SDK] Total loadDashboardData time: ${Date.now() - startTime}ms`,
			);
		}
	}

	// ============================================
	// Action methods
	// ============================================

	private async parseResponseBody(
		response: Response,
	): Promise<Record<string, unknown> | undefined> {
		const toRecordOrUndefined = (
			value: unknown,
		): Record<string, unknown> | undefined => {
			if (value && typeof value === 'object' && !Array.isArray(value)) {
				return value as Record<string, unknown>;
			}
			return undefined;
		};

		if (response.status === 204) return undefined;

		const contentType = response.headers.get('content-type') ?? '';
		const rawBody = await response.text();
		if (!rawBody) return undefined;

		if (contentType.includes('application/json')) {
			return toRecordOrUndefined(JSON.parse(rawBody));
		}
		try {
			return toRecordOrUndefined(JSON.parse(rawBody));
		} catch {
			return undefined;
		}
	}

	async blockIp(
		ip: string,
		context: AuthenticatedContext,
		options: { reason?: string; durationMinutes?: number } = {},
	): Promise<ActionResult> {
		if (!ip) return { success: false, error: 'IP address required', action: 'blockIp' };
		try {
			const body: Record<string, unknown> = { ip };
			if (options.reason) body.reason = options.reason;
			if (options.durationMinutes !== undefined) body.duration = options.durationMinutes;

			const response = await this.fetchWithAuth(API_ENDPOINTS.BLOCK_IP, context.headers, {
				method: 'POST',
				body: JSON.stringify(body),
			});

			const result = await this.parseResponseBody(response);
			logger.info(`[Security Dashboard SDK] Blocked IP: ${ip}`, {
				blockedBy: context.user.id,
			});
			return { success: true, action: 'blockIp', ip, data: result };
		} catch (error) {
			logger.error('[Security Dashboard SDK] Error blocking IP:', error);
			return { success: false, error: 'Failed to block IP', action: 'blockIp' };
		}
	}

	async unblockIp(ip: string, context: AuthenticatedContext): Promise<ActionResult> {
		if (!ip) return { success: false, error: 'IP address required', action: 'unblockIp' };
		try {
			const response = await this.fetchWithAuth(
				API_ENDPOINTS.UNBLOCK_IP,
				context.headers,
				{ method: 'POST', body: JSON.stringify({ ip }) },
			);
			const result = await this.parseResponseBody(response);
			logger.info(`[Security Dashboard SDK] Unblocked IP: ${ip}`, {
				unblockedBy: context.user.id,
			});
			return { success: true, action: 'unblockIp', ip, data: result };
		} catch (error) {
			logger.error('[Security Dashboard SDK] Error unblocking IP:', error);
			return { success: false, error: 'Failed to unblock IP', action: 'unblockIp' };
		}
	}

	async whitelistDevice(
		deviceId: string,
		userId: string,
		context: AuthenticatedContext,
	): Promise<ActionResult> {
		if (!deviceId)
			return { success: false, error: 'Device ID required', action: 'whitelistDevice' };
		try {
			const response = await this.fetchWithAuth(
				API_ENDPOINTS.WHITELIST_DEVICE,
				context.headers,
				{ method: 'POST', body: JSON.stringify({ deviceId, userId }) },
			);
			const result = await this.parseResponseBody(response);
			logger.info(`[Security Dashboard SDK] Whitelisted device: ${deviceId}`, {
				whitelistedBy: context.user.id,
				forUser: userId,
			});
			return { success: true, action: 'whitelistDevice', visitorId: deviceId, data: result };
		} catch (error) {
			logger.error('[Security Dashboard SDK] Error whitelisting device:', error);
			return {
				success: false,
				error: 'Failed to whitelist device',
				action: 'whitelistDevice',
			};
		}
	}

	async dismissSession(
		sessionId: string,
		context: AuthenticatedContext,
	): Promise<ActionResult> {
		if (!sessionId)
			return { success: false, error: 'Session ID required', action: 'dismissSession' };
		try {
			const response = await this.fetchWithAuth(
				API_ENDPOINTS.DISMISS_SESSION,
				context.headers,
				{ method: 'POST', body: JSON.stringify({ sessionId, userId: context.user.id }) },
			);
			const result = await this.parseResponseBody(response);
			logger.info('[Security Dashboard SDK] Dismissed flagged session', {
				dismissedBy: context.user.id,
				sessionId,
			});
			return { success: true, action: 'dismissSession', sessionId, data: result };
		} catch (error) {
			logger.error('[Security Dashboard SDK] Error dismissing session:', error);
			return {
				success: false,
				error: 'Failed to dismiss session',
				action: 'dismissSession',
			};
		}
	}

	async clearCache(context: AuthenticatedContext): Promise<CacheClearResult> {
		try {
			logger.info('[Security Dashboard SDK] Clearing security analytics cache...');

			const headers = {
				...context.headers,
				Origin: this.config.baseUrl,
				Referer: `${this.config.baseUrl}/admin/security`,
			};

			const cacheResponse = await this.fetchWithAuth(
				API_ENDPOINTS.CLEAR_CACHE,
				headers,
				{ method: 'POST' },
			);
			const cacheResult = (await this.parseResponseBody(cacheResponse)) ?? null;
			logger.info('[Security Dashboard SDK] Analytics cache cleared:', cacheResult);

			const metricsResponse = await this.fetchWithAuth(
				API_ENDPOINTS.CLEAR_METRICS,
				headers,
				{ method: 'POST' },
			);
			const metricsResult = (await this.parseResponseBody(metricsResponse)) ?? null;
			logger.debug('[Security Dashboard SDK] Security metrics cleared:', metricsResult);

			return { success: true, cacheResult, metricsResult };
		} catch (error) {
			logger.error('[Security Dashboard SDK] Error clearing cache:', error);
			return {
				success: false,
				cacheResult: null,
				metricsResult: null,
				error: 'Failed to clear cache',
			};
		}
	}

	private async fetchWithAuth(
		endpoint: string,
		headers: Record<string, string>,
		options: RequestInit = {},
	): Promise<Response> {
		if (!endpoint) {
			logger.error('[Security Dashboard SDK] Endpoint is undefined');
			throw new SecurityDashboardError('Endpoint is undefined', 'INVALID_ENDPOINT', 500);
		}
		const url = `${this.config.baseUrl}${endpoint}`;
		logger.debug('[Security Dashboard SDK] Fetching:', url);
		return fetch(url, { headers, ...options });
	}
}
