/**
 * Security Dashboard SDK — configuration & constants.
 *
 * Holds the config schema, factory, cookie patterns, and API endpoint
 * paths. Extracted from sdk.ts so the class file stays focused on
 * behaviour. Re-exported from sdk.ts.
 */

import { z } from 'zod';
import { publicEnv } from '#lib/platform/config/index.js';
import type { SecurityDashboardConfig } from './dashboard-types';

const configSchema = z.object({
	baseUrl: z.string().url(),
	environment: z.enum(['development', 'production']),
	adminDomains: z.array(z.string()).optional(),
	adminRoles: z.array(z.string()).optional(),
});

export const twoFactorAdoptionStatsSchema = z.object({
	totalUsersCount: z.coerce.number().int().nonnegative(),
	twoFactorEnabledCount: z.coerce.number().int().nonnegative(),
});

function normalizeBaseUrl(url: string): string {
	return url.endsWith('/') ? url.slice(0, -1) : url;
}

function getEnvironmentFromPublicEnv(): SecurityDashboardConfig['environment'] {
	return publicEnv.PUBLIC_ENV_MODE === 'development' ? 'development' : 'production';
}

export function createSecurityDashboardConfig(
	overrides?: Partial<SecurityDashboardConfig>,
): SecurityDashboardConfig {
	const defaultBaseUrl = z.string().url().parse(publicEnv.PUBLIC_SITE_URL);

	const defaultConfig: SecurityDashboardConfig = {
		baseUrl: normalizeBaseUrl(defaultBaseUrl),
		environment: getEnvironmentFromPublicEnv(),
		adminDomains: [],
		adminRoles: ['admin'],
	};

	const merged: SecurityDashboardConfig = {
		...defaultConfig,
		...overrides,
		baseUrl: normalizeBaseUrl(overrides?.baseUrl ?? defaultConfig.baseUrl),
	};

	const parsed = configSchema.safeParse(merged);
	if (!parsed.success) {
		throw new Error('Invalid SecurityDashboardSDK config');
	}

	if (
		parsed.data.environment === 'production' &&
		parsed.data.baseUrl === 'http://localhost:3000'
	) {
		throw new Error('SecurityDashboardSDK baseUrl must be set for production');
	}

	return parsed.data;
}

export const COOKIE_PATTERNS = [
	'better-auth.session_token=',
	'session-token=',
	'auth_token=',
] as const;

export const API_ENDPOINTS = {
	METRICS: '/api/auth/security-analytics/metrics',
	DEVICES: '/api/auth/security-analytics/trusted-devices',
	FLAGGED_SESSIONS: '/api/auth/security-analytics/flagged-sessions',
	SYSTEM_HEALTH: '/api/auth/security-analytics/system-health',
	BLOCKED_IPS: '/api/auth/security-analytics/blocked-ips',
	BLOCK_IP: '/api/auth/security-analytics/block-ip',
	UNBLOCK_IP: '/api/auth/security-analytics/unblock-ip',
	WHITELIST_DEVICE: '/api/auth/security-analytics/whitelist-device',
	DISMISS_SESSION: '/api/auth/security-analytics/unblock-session',
	ALERTS: '/api/auth/security-analytics/alerts',
	CACHE_STATS: '/api/auth/security-analytics/cache/stats',
	CLEAR_CACHE: '/api/auth/security-analytics/cache/clear',
	CLEAR_METRICS: '/api/auth/security-analytics/metrics/clear',
} as const;
