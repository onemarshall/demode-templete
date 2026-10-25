/**
 * Unified Security Endpoints
 *
 * Exports all security plugin endpoints.
 */

import type { SecurityConfig } from '../core/feature';
import { createHealthEndpoint } from './health';
import { createStatusEndpoint } from './status';
import { createCaptchaEndpoint } from './captcha';
import { createMetricsEndpoint, createAlertsEndpoint, createSessionsEndpoint } from './dashboard';
import {
	createBlockIpEndpoint,
	createUnblockIpEndpoint,
	createClearCacheEndpoint,
	createListBlockedIpsEndpoint
} from './admin';

// Health
export { createHealthEndpoint, type HealthResponse } from './health';

// Status
export { createStatusEndpoint, type SecurityStatusResponse } from './status';

// CAPTCHA
export {
	createCaptchaEndpoint,
	validateBypassToken,
	clearBypassToken,
	type CaptchaVerifyResponse
} from './captcha';

// Dashboard
export {
	createMetricsEndpoint,
	createAlertsEndpoint,
	createSessionsEndpoint,
	recordMetric,
	addAlert,
	type DashboardMetrics,
	type DashboardAlert,
	type DashboardSession
} from './dashboard';

// Admin
export {
	createBlockIpEndpoint,
	createUnblockIpEndpoint,
	createClearCacheEndpoint,
	createListBlockedIpsEndpoint,
	isIpBlocked,
	getIpBlockInfo,
	type BlockIpResponse,
	type UnblockIpResponse,
	type ClearCacheResponse
} from './admin';

// ============================================
// Endpoint Factory
// ============================================

export function createEndpoints(config: SecurityConfig) {
	if (!config.enabled) {
		return undefined;
	}

	return {
		// Public endpoints
		getHealth: createHealthEndpoint(config),
		getStatus: createStatusEndpoint(config),
		verifyCaptcha: createCaptchaEndpoint(config),

		// Dashboard endpoints (admin only)
		getDashboardMetrics: createMetricsEndpoint(config),
		getDashboardAlerts: createAlertsEndpoint(config),
		getDashboardSessions: createSessionsEndpoint(config),

		// Admin endpoints
		blockIp: createBlockIpEndpoint(config),
		unblockIp: createUnblockIpEndpoint(config),
		clearCache: createClearCacheEndpoint(config),
		listBlockedIps: createListBlockedIpsEndpoint(config)
	} as const;
}
