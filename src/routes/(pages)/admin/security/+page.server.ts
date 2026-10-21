// src/routes/admin/security/+page.server.ts

import { redirect, error } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { auth } from '$lib/auth/server/config';
import { isAdminUser, type SessionUser } from '$lib/auth/server/auth-helpers';
import { logger, enhancedLogger } from '$lib/auth/shared/logger';
import {
	getSecurityDashboard,
	blockIp as blockIpCommand,
	unblockIp as unblockIpCommand,
	clearMetricsCache as clearRemoteMetricsCache
} from '$lib/remote';
import {
	getDefaultCollector,
	clearMetricsCache as clearLocalMetricsCache
} from '$lib/auth/security/analytics';

async function requireAdmin(request: Request): Promise<SessionUser> {
	const session = await auth.api.getSession({ headers: request.headers });
	const user = session?.user as SessionUser | undefined;
	if (!user || !isAdminUser(user)) {
		throw error(403, 'Admin access required');
	}
	return user;
}

export const load: PageServerLoad = async ({ request }) => {
	const pageLoadStart = Date.now()
	
	enhancedLogger.section('Security Page Load')
	
	// Check authentication and authorization using Better Auth's built-in handler
	const authStart = Date.now()
	const session = await auth.api.getSession({
		headers: request.headers
	});
	enhancedLogger.info(`[Security Page] Auth check took ${Date.now() - authStart}ms`)

	if (!session?.user) {
		throw redirect(302, '/auth/sign-in');
	}

	// Basic admin check (you may want to implement proper role-based access)
	const user = session.user as SessionUser;
	if (!isAdminUser(user)) {
		throw error(403, 'Admin access required');
	}

	try {
		const dashboardStart = Date.now()
		const dashboard = await getSecurityDashboard({});
		enhancedLogger.info(`[Security Page] Dashboard call took ${Date.now() - dashboardStart}ms`)
		const deviceList = dashboard.devices ?? [];

		// Lightweight version string for client-side change detection on polling
		const eventCount = dashboard.metrics?.summary?.totalRequests ?? 0;
		const latestTimestamp = dashboard.lastUpdated ?? Date.now();
		const dataVersion = `${eventCount}:${latestTimestamp}`;

		return {
			user: session.user,
			dataVersion,
			metrics: dashboard.metrics,
			sessions: dashboard.sessions ?? [],
			devices: {
				devices: deviceList,
				total: deviceList.length,
				page: 1,
				limit: deviceList.length,
				hasMore: false
			},
			systemHealth: dashboard.systemHealth,
			blockedIPs: dashboard.blockedIPs ?? [],
			activeSessionsCount: dashboard.activeSessionsCount ?? 0,
			authStats: dashboard.authStats ?? null,
			sessionAnalytics: dashboard.sessionAnalytics ?? null,
			rateLimitStats: dashboard.rateLimitStats ?? null,
			ipIntelligence: dashboard.ipIntelligence ?? null,
			userRiskProfiles: dashboard.userRiskProfiles ?? [],
			apiSecurityStats: dashboard.apiSecurityStats ?? null,
			timeAnalysis: dashboard.timeAnalysis ?? null,
			threatFeed: dashboard.threatFeed ?? [],
			threats: dashboard.threats ?? [],
			flagged: dashboard.flagged ?? [],
			apiStatus: dashboard.apiStatus,
			error: dashboard.error,
			lastUpdated: dashboard.lastUpdated,
			debugData: dashboard
		};
	} catch (err) {
		logger.error('Security dashboard error:', err);
		throw error(500, 'Failed to load security dashboard');
	} finally {
		enhancedLogger.info(`[Security Page] Total page load time: ${Date.now() - pageLoadStart}ms`)
	}
};

export const actions: Actions = {
	blockIp: async ({ request }) => {
		await requireAdmin(request);

		const formData = await request.formData();
		const ip = String(formData.get('ip') ?? '').trim();
		if (!ip) {
			throw error(400, 'IP address is required');
		}

		const result = await blockIpCommand({ ip });
		return result;
	},

	unblockIp: async ({ request }) => {
		await requireAdmin(request);

		const formData = await request.formData();
		const ip = String(formData.get('ip') ?? '').trim();
		if (!ip) {
			throw error(400, 'IP address is required');
		}

		const result = await unblockIpCommand({ ip });
		return result;
	},

	clearCache: async ({ request }) => {
		await requireAdmin(request);

		try {
			let remoteClearFailed = false;

			try {
				await clearRemoteMetricsCache();
			} catch (remoteErr) {
				remoteClearFailed = true;
				logger.warn('Remote cache clear failed; proceeding with local data reset', remoteErr);
			}

			const collector = getDefaultCollector();
			await collector.clearEvents();
			clearLocalMetricsCache();

			return {
				success: true,
				message: remoteClearFailed
					? 'Dashboard data reset locally. Remote cache clear failed.'
					: 'Cache and dashboard data cleared successfully'
			};
		} catch (err) {
			logger.error('Failed to clear cache:', err);
			return { success: false, error: 'Failed to clear cache' };
		}
	}
};
