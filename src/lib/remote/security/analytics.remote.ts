/**
 * Security Analytics Remote Functions
 *
 * Replaces multiple API routes with type-safe remote functions.
 * Provides automatic caching and invalidation.
 *
 * Note: These functions wrap a custom SecurityDashboardSDK.
 * The SDK is application-specific and not part of Better Auth.
 */

import { query, command, getRequestEvent } from '$app/server'
import { error } from '@sveltejs/kit'
import { z } from 'zod'
import { SecurityDashboardSDK, SecurityDashboardError } from '#lib/auth/security/services/index.js'
import { logger } from '#lib/auth/shared/logger.js'

// ============================================
// Schemas
// ============================================

const sessionsFilterSchema = z.object({
	limit: z.number().min(1).max(100).default(50),
	offset: z.number().min(0).default(0),
	riskLevel: z.enum(['low', 'medium', 'high', 'critical']).optional(),
})

const emptySchema = z.object({}).optional()
const ipv4Regex = /^(?:(?:25[0-5]|2[0-4]\d|1?\d?\d)(?:\.(?!$)|$)){4}$/
const ipAddressSchema = z.string().trim().regex(ipv4Regex, 'Invalid IPv4 address')

// ============================================
// Helper Functions
// ============================================

/**
 * Get the current SvelteKit request event or throw a consistent server error.
 */
function requireRequestEvent() {
	const event = getRequestEvent()
	if (!event) {
		throw error(500, 'No request event available')
	}

	return event
}

/**
 * Create a new SDK instance and get authenticated context in one call
 */
async function getAuthenticatedContextWithSDK() {
	const event = requireRequestEvent()
	const sdk = new SecurityDashboardSDK({ baseUrl: event.url.origin })
	const context = await sdk.authenticateRequest(event.request)
	return { sdk, context }
}

function throwRemoteError(err: unknown, fallbackMessage: string): never {
	if (err instanceof SecurityDashboardError) {
		throw error(err.statusCode, err.message)
	}

	if (
		err &&
		typeof err === 'object' &&
		'status' in err &&
		typeof (err as { status?: unknown }).status === 'number'
	) {
		throw err
	}

	throw error(500, fallbackMessage)
}

// ============================================
// Query Functions - Data Retrieval
// ============================================

/**
 * Get comprehensive dashboard metrics
 * Replaces: GET /api/auth/security-analytics/metrics
 */
export const getDashboardMetrics = query(emptySchema, async () => {
	try {
		const { sdk, context } = await getAuthenticatedContextWithSDK()
		const data = await sdk.loadDashboardData(context)
		return data.metrics
	} catch (err) {
		logger.error('[Remote Functions] Failed to load dashboard metrics:', err)
		throwRemoteError(err, 'Failed to load dashboard metrics')
	}
})

/**
 * Get security sessions with filtering
 * Replaces: GET /api/auth/security-analytics/sessions
 */
export const getSecuritySessions = query(sessionsFilterSchema, async (filters) => {
	try {
		const { sdk, context } = await getAuthenticatedContextWithSDK()
		const data = await sdk.loadDashboardData(context)

		if (!data.sessions) {
			return []
		}

		// Apply filters
		let sessions = data.sessions

		if (filters?.riskLevel) {
			sessions = sessions.filter((s) => s.riskLevel === filters.riskLevel)
		}

		const offset = filters?.offset ?? 0
		const limit = filters?.limit ?? 50

		return sessions.slice(offset, offset + limit)
	} catch (err) {
		logger.error('[Remote Functions] Failed to load sessions:', err)
		throwRemoteError(err, 'Failed to load security sessions')
	}
})

/**
 * Get trusted devices
 * Replaces: GET /api/auth/security-analytics/trusted-devices
 */
export const getTrustedDevices = query(emptySchema, async () => {
	try {
		const { sdk, context } = await getAuthenticatedContextWithSDK()
		const data = await sdk.loadDashboardData(context)
		return data.devices
	} catch (err) {
		logger.error('[Remote Functions] Failed to load devices:', err)
		throwRemoteError(err, 'Failed to load trusted devices')
	}
})

/**
 * Get system health status
 * Replaces: GET /api/auth/security-analytics/system-health
 */
export const getSystemHealth = query(emptySchema, async () => {
	try {
		const { sdk, context } = await getAuthenticatedContextWithSDK()
		const data = await sdk.loadDashboardData(context)
		return data.systemHealth
	} catch (err) {
		logger.error('[Remote Functions] Failed to load system health:', err)
		throwRemoteError(err, 'Failed to load system health')
	}
})

/**
 * Get live threats
 * Replaces: GET /api/auth/security-analytics/live-threats
 */
export const getLiveThreats = query(emptySchema, async () => {
	try {
		const { sdk, context } = await getAuthenticatedContextWithSDK()
		const data = await sdk.loadDashboardData(context)

		// Filter sessions to only include active threats
		if (!data.sessions) {
			return []
		}

		return data.sessions.filter((s) => s.riskLevel === 'high' || s.riskLevel === 'critical')
	} catch (err) {
		logger.error('[Remote Functions] Failed to load live threats:', err)
		throwRemoteError(err, 'Failed to load live threats')
	}
})

/**
 * Get flagged sessions
 * Replaces: GET /api/auth/security-analytics/flagged-sessions
 */
export const getFlaggedSessions = query(emptySchema, async () => {
	try {
		const { sdk, context } = await getAuthenticatedContextWithSDK()
		const data = await sdk.loadDashboardData(context)

		// Derive flagged sessions from existing fields (blocked or high risk)
		if (!data.sessions) {
			return []
		}

		return data.sessions.filter(
			(s) => s.isBlocked || s.riskLevel === 'high' || s.riskLevel === 'critical'
		)
	} catch (err) {
		logger.error('[Remote Functions] Failed to load flagged sessions:', err)
		throwRemoteError(err, 'Failed to load flagged sessions')
	}
})

// ============================================
// Command Functions - Actions & Mutations
// ============================================

/**
 * Block IP address
 * Replaces: POST /api/auth/security-analytics/block-ip
 */
export const blockIp = command(
	z.object({
		ip: ipAddressSchema,
		reason: z.string().max(500).optional(),
		duration: z.number().int().positive().optional(),
	}),
	async ({ ip, reason, duration }) => {
		try {
			const { sdk, context } = await getAuthenticatedContextWithSDK()

			const result = await sdk.blockIp(ip, context, {
				reason,
				durationMinutes: duration,
			})

			if (!result.success) {
				throw error(500, result.error ?? 'Failed to block IP')
			}

			return { success: true, message: `IP ${ip} blocked successfully` }
		} catch (err) {
			logger.error('[Remote Functions] Failed to block IP:', err)
			throwRemoteError(
				err,
				`Failed to block IP: ${err instanceof Error ? err.message : 'Unknown error'}`
			)
		}
	}
)

/**
 * Unblock IP address
 * Replaces: POST /api/auth/security-analytics/unblock-ip
 */
export const unblockIp = command(
	z.object({
		ip: ipAddressSchema,
	}),
	async ({ ip }) => {
		try {
			const { sdk, context } = await getAuthenticatedContextWithSDK()
			const result = await sdk.unblockIp(ip, context)

			if (!result.success) {
				throw error(500, result.error ?? 'Failed to unblock IP')
			}

			return { success: true, message: `IP ${ip} unblocked successfully` }
		} catch (err) {
			logger.error('[Remote Functions] Failed to unblock IP:', err)
			throwRemoteError(
				err,
				`Failed to unblock IP: ${err instanceof Error ? err.message : 'Unknown error'}`
			)
		}
	}
)

/**
 * Whitelist device
 * Replaces: POST /api/auth/security-analytics/whitelist-device
 */
export const whitelistDevice = command(
	z.object({
		deviceId: z.string().min(1).max(200),
		userId: z.string().min(1).max(200),
	}),
	async ({ deviceId, userId }) => {
		try {
			const { sdk, context } = await getAuthenticatedContextWithSDK()
			const result = await sdk.whitelistDevice(deviceId, userId, context)

			if (!result.success) {
				throw error(500, result.error ?? 'Failed to whitelist device')
			}

			return { success: true, message: 'Device whitelisted successfully' }
		} catch (err) {
			logger.error('[Remote Functions] Failed to whitelist device:', err)
			throwRemoteError(
				err,
				`Failed to whitelist device: ${err instanceof Error ? err.message : 'Unknown error'}`
			)
		}
	}
)

/**
 * Dismiss flagged session
 * Replaces: POST /api/auth/security-analytics/unblock-session
 */
export const dismissSession = command(
	z.object({
		sessionId: z.string().min(1),
		action: z.enum(['dismiss', 'trust', 'block']),
	}),
	async ({ sessionId, action }) => {
		try {
			const { sdk, context } = await getAuthenticatedContextWithSDK()
			const result = await sdk.dismissSession(sessionId, context)

			if (!result.success) {
				throw error(500, result.error ?? 'Failed to dismiss session')
			}

			return { success: true, message: `Session ${action}ed successfully` }
		} catch (err) {
			logger.error('[Remote Functions] Failed to dismiss session:', err)
			throwRemoteError(
				err,
				`Failed to dismiss session: ${err instanceof Error ? err.message : 'Unknown error'}`
			)
		}
	}
)

/**
 * Clear security metrics cache
 * Replaces: POST /api/auth/security-analytics/cache/clear
 */
export const clearMetricsCache = command(z.void(), async () => {
	try {
		const { sdk, context } = await getAuthenticatedContextWithSDK()
		const result = await sdk.clearCache(context)

		if (!result.success) {
			throw error(500, result.error ?? 'Failed to clear cache')
		}

		return { success: true, message: 'Cache cleared successfully' }
	} catch (err) {
		logger.error('[Remote Functions] Failed to clear cache:', err)
		throwRemoteError(
			err,
			`Failed to clear cache: ${err instanceof Error ? err.message : 'Unknown error'}`
		)
	}
})

// ============================================
// Batch Operations
// ============================================

/**
 * Get complete security dashboard data
 * Combines all data in a single SDK call for efficiency
 */
export const getSecurityDashboard = query(emptySchema, async () => {
	try {
		const { sdk, context } = await getAuthenticatedContextWithSDK()
		const data = await sdk.loadDashboardData(context)

		// Derive threats and flagged from sessions
		const threats =
			data.sessions?.filter((s) => s.riskLevel === 'high' || s.riskLevel === 'critical') ?? []

		// Treat flagged sessions as blocked or high-risk
		const flagged =
			data.sessions?.filter(
				(s) => s.isBlocked || s.riskLevel === 'high' || s.riskLevel === 'critical'
			) ?? []

		return {
			metrics: data.metrics,
			sessions: data.sessions,
			devices: data.devices,
			systemHealth: data.systemHealth,
			blockedIPs: data.blockedIPs,
			activeSessionsCount: data.activeSessionsCount,
			authStats: data.authStats,
			sessionAnalytics: data.sessionAnalytics,
			rateLimitStats: data.rateLimitStats,
			ipIntelligence: data.ipIntelligence,
			userRiskProfiles: data.userRiskProfiles,
			apiSecurityStats: data.apiSecurityStats,
			timeAnalysis: data.timeAnalysis,
			threatFeed: data.threatFeed,
			threats,
			flagged,
			apiStatus: data.apiStatus,
			error: data.error,
			lastUpdated: new Date().toISOString(),
		}
	} catch (err) {
		logger.error('[Remote Functions] Failed to load security dashboard:', err)
		throwRemoteError(err, 'Failed to load security dashboard')
	}
})
