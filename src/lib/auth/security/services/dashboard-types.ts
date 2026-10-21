/**
 * Security Dashboard SDK — type surface.
 *
 * Extracted from sdk.ts so types live in one place and the SDK class
 * file stays focused on behaviour. Re-exported from sdk.ts.
 */

import type { DashboardMetrics, FlaggedSession, TrustedDevice } from '../types';

export interface SecurityDashboardConfig {
	baseUrl: string;
	environment: 'development' | 'production';
	adminDomains?: string[];
	adminRoles?: string[];
}

export interface AuthenticatedUser {
	id: string;
	role?: string;
	email?: string;
	[key: string]: unknown;
}

export interface AuthenticatedContext {
	user: AuthenticatedUser;
	sessionToken: string;
	cookies: string;
	headers: Record<string, string>;
	isAdmin: boolean;
	isDev: boolean;
}

export interface SystemHealthStatus {
	overallStatus: 'operational' | 'degraded' | 'critical';
	summary: string;
	updatedAt: number;
	recommendations?: string[];
	metrics: Array<{
		id: string;
		label: string;
		value: number;
		unit?: string;
		status: 'operational' | 'degraded' | 'critical';
		description?: string;
		trend?: number[];
		details?: Record<string, unknown>;
		updatedAt: number;
	}>;
}

export interface ApiStatus {
	metrics: number;
	sessions: number;
	devices: number;
	systemHealth: number;
}

export interface BlockedIPInfo {
	ip: string;
	reason: string;
	blockedAt: number;
	expiresAt?: number;
	hitCount: number;
}

export interface HourlyAuthRate {
	hour: number;
	timestamp: number;
	successCount: number;
	failureCount: number;
	successRate: number;
}

export interface BruteForceAttempt {
	userId: string;
	ip: string;
	failureCount: number;
	lastAttempt: number;
	isBlocked: boolean;
}

export interface AuthStats {
	successCount: number;
	failureCount: number;
	successRate: number;
	recentFailures: Array<{
		timestamp: number;
		ip: string;
		reason: string;
	}>;
	hourlyRates: HourlyAuthRate[];
	bruteForceAttempts: BruteForceAttempt[];
	twoFactorAdoptionRate: number;
	twoFactorEnabledCount: number;
	totalUsersCount: number;
	passwordResetRequests: number;
	passwordResetHourly: Array<{ hour: number; count: number }>;
}

export interface SessionAnalytics {
	activeSessionsCount: number;
	averageSessionDuration: number;
	sessionDurationDistribution: Array<{ range: string; count: number }>;
	concurrentSessionsPerUser: Array<{ userId: string; sessionCount: number }>;
	invalidationReasons: Array<{ reason: string; count: number }>;
}

export interface RateLimitStats {
	totalBlocked: number;
	topRateLimitedIPs: Array<{ ip: string; blockedCount: number; lastBlocked: number }>;
	thresholdBreaches: Array<{ endpoint: string; breachCount: number; lastBreach: number }>;
	hourlyBlocked: Array<{ hour: number; count: number }>;
}

export interface IPIntelligence {
	blockedIPs: BlockedIPInfo[];
	ipReputationScores: Array<{ ip: string; score: number; category: string }>;
	knownBadActors: Array<{ ip: string; reason: string; firstSeen: number }>;
	torExitNodes: Array<{ ip: string; detectedAt: number }>;
}

export interface UserRiskProfile {
	userId: string;
	riskScore: number;
	riskLevel: 'low' | 'medium' | 'high' | 'critical';
	suspiciousActivities: number;
	lastActivity: number;
	isLocked: boolean;
	lockoutHistory: Array<{ lockedAt: number; reason: string; duration: number }>;
}

export interface APISecurityStats {
	endpointAbuse: Array<{
		endpoint: string;
		requestCount: number;
		uniqueIPs: number;
		isAbusive: boolean;
	}>;
	unusualPatterns: Array<{
		pattern: string;
		occurrences: number;
		severity: 'low' | 'medium' | 'high';
	}>;
	apiKeyUsage: Array<{ keyId: string; requestCount: number; lastUsed: number }>;
}

export interface TimeAnalysis {
	peakAttackTimes: Array<{ hour: number; attackCount: number }>;
	dayOfWeekPatterns: Array<{ day: string; totalEvents: number; blockedEvents: number }>;
	hourlyTrends: Array<{ hour: number; avgRisk: number; eventCount: number }>;
}

export interface ThreatEvent {
	id: string;
	timestamp: number;
	type: 'attack' | 'anomaly' | 'blocked' | 'warning';
	severity: 'low' | 'medium' | 'high' | 'critical';
	ip: string;
	description: string;
	details?: Record<string, unknown>;
}

export interface DashboardData {
	metrics: DashboardMetrics | null;
	sessions: FlaggedSession[] | null;
	devices: TrustedDevice[] | null;
	systemHealth: SystemHealthStatus | null;
	blockedIPs: BlockedIPInfo[];
	activeSessionsCount: number;
	authStats: AuthStats | null;
	sessionAnalytics: SessionAnalytics | null;
	rateLimitStats: RateLimitStats | null;
	ipIntelligence: IPIntelligence | null;
	userRiskProfiles: UserRiskProfile[];
	apiSecurityStats: APISecurityStats | null;
	timeAnalysis: TimeAnalysis | null;
	threatFeed: ThreatEvent[];
	apiStatus: ApiStatus;
	error?: string | null;
	lastUpdated?: string;
}

export interface ActionResult {
	success: boolean;
	action: string;
	error?: string;
	data?: Record<string, unknown>;
	ip?: string;
	visitorId?: string;
	sessionId?: string;
}

export interface CacheClearResult {
	success: boolean;
	cacheResult: Record<string, unknown> | null;
	metricsResult: Record<string, unknown> | null;
	error?: string;
}

export class SecurityDashboardError extends Error {
	constructor(
		message: string,
		public readonly code: string,
		public readonly statusCode: number = 500,
	) {
		super(message);
		this.name = 'SecurityDashboardError';
	}
}
