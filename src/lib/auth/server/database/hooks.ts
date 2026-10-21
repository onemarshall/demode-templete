// src/lib/auth/server/database/hooks.ts
import { getDirectusCMSProvider } from '#lib/auth/server/plugins/cms.js';
import { getServerEnv } from '#lib/auth/shared/env/index.js';
import { logger, securityLogger } from '#lib/auth/shared/logger.js';
import type { BetterAuthOptions } from 'better-auth';
import type { User } from './types';

// ============================================
// Types
// ============================================

interface SessionData {
	token: string;
	userId: string;
	ipAddress?: string | null;
	userAgent?: string | null;
	createdAt: Date;
}

// ============================================
// Internal Helpers
// ============================================

async function syncUserToCMS(user: User, action: 'create' | 'update'): Promise<void> {
	if (!user?.id) {
		logger.warn('[Hooks] Cannot sync user to CMS: missing user or user.id');
		return;
	}

	try {
		const env = await getServerEnv();
		if (!env.CMS_PROVIDER || env.CMS_PROVIDER === 'none') {
			return;
		}

		const cmsProvider = getDirectusCMSProvider();
		if (!cmsProvider) {
			logger.debug('[Hooks] CMS provider not initialized, skipping sync');
			return;
		}

		await cmsProvider.syncUser(user);
		logger.info(`[Hooks] User synced to CMS after ${action}`, {
			userId: user.id,
			email: user.email
		});
	} catch (error) {
		securityLogger.error(`[Hooks] Failed to sync user to CMS after ${action}`, {
			error: error instanceof Error ? error.message : String(error),
			userId: user.id
		});
	}
}

async function trackSession(session: SessionData): Promise<void> {
	try {
		const sessionData = {
			id: session.token,
			userId: session.userId,
			ip: session.ipAddress || '127.0.0.1',
			userAgent: session.userAgent || 'Unknown',
			timestamp: session.createdAt.getTime(),
			status: 'active'
		};

		try {
			const { getSharedRedisClient } = await import('#lib/auth/shared/redis/index.js');
			const redis = await getSharedRedisClient('security');
			const securityAnalyticsSessionData = await deriveSecurityAnalyticsSessionData(redis, session);
			await Promise.all([
				redis.setEx(`session_analytics:${session.token}`, 86400, JSON.stringify(sessionData)),
				redis.setEx(
					`security_analytics:session:${session.token}`,
					86400 * 7,
					JSON.stringify(securityAnalyticsSessionData)
				)
			]);
		} catch {
			// Redis unavailable - non-critical, skip silently
		}

		securityLogger.info('[Hooks] Session tracked', {
			sessionId: session.token,
			userId: session.userId
		});
	} catch (error) {
		securityLogger.error('[Hooks] Failed to track session', {
			error: error instanceof Error ? error.message : String(error)
		});
	}
}

function clampNumber(value: number, min: number, max: number): number {
	return Math.max(min, Math.min(max, value));
}

function safeParseInt(value: string | null, fallback: number): number {
	if (!value) return fallback;
	const n = parseInt(value, 10);
	return Number.isFinite(n) ? n : fallback;
}

async function safeGetJson<T>(
	redis: { get: (key: string) => Promise<string | null> },
	key: string
): Promise<T | undefined> {
	try {
		const raw = await redis.get(key);
		if (!raw) return undefined;
		return JSON.parse(raw) as T;
	} catch {
		return undefined;
	}
}

async function deriveSecurityAnalyticsSessionData(
	redis: {
		get: (key: string) => Promise<string | null>;
		setEx: (key: string, ttlSeconds: number, value: string) => Promise<unknown>;
	},
	session: SessionData
): Promise<Record<string, unknown>> {
	const ip = session.ipAddress || '127.0.0.1';
	const userAgent = session.userAgent || 'Unknown';
	const now = session.createdAt.getTime();

	const abuseMetricsUser = await safeGetJson<{
		requests?: number;
		failedAttempts?: number;
		lastActivity?: number;
		riskScore?: number;
		captchaRequired?: boolean;
		captchaFailures?: number;
	}>(redis, `security_metrics:${session.userId}`);

	const abuseMetricsIp = await safeGetJson<{
		requests?: number;
		failedAttempts?: number;
		lastActivity?: number;
		riskScore?: number;
		captchaRequired?: boolean;
		captchaFailures?: number;
	}>(redis, `security_metrics:${ip}`);

	const abuseRisk = clampNumber(
		Math.max(abuseMetricsUser?.riskScore ?? 0, abuseMetricsIp?.riskScore ?? 0),
		0,
		100
	);
	const failedAttempts = Math.max(
		abuseMetricsUser?.failedAttempts ?? 0,
		abuseMetricsIp?.failedAttempts ?? 0
	);

	const captchaBypassUser = (await redis.get(`captcha_bypass:${session.userId}`)) === 'verified';
	const captchaBypassIp = (await redis.get(`captcha_bypass:${ip}`)) === 'verified';
	const hasCaptchaBypass = captchaBypassUser || captchaBypassIp;

	const captchaRequiredRaw =
		(abuseMetricsUser?.captchaRequired ?? false) || (abuseMetricsIp?.captchaRequired ?? false);
	const captchaRequired = captchaRequiredRaw && !hasCaptchaBypass;
	const captchaCompleted = hasCaptchaBypass;

	const geo = await safeGetJson<{
		location?: { countryCode?: string; city?: string } | null;
		reputation?: { isVpn?: boolean; isTor?: boolean; isProxy?: boolean; threatTypes?: string[] };
		risk?: { score?: number; factors?: string[]; requireCaptcha?: boolean; shouldBlock?: boolean };
	}>(redis, `geo_intelligence:${ip}`);

	const geoRisk = clampNumber(geo?.risk?.score ?? 0, 0, 100);
	const isVpn = geo?.reputation?.isVpn ?? false;
	const isTor = geo?.reputation?.isTor ?? false;
	const isProxy = geo?.reputation?.isProxy ?? false;

	const userTrustScore = clampNumber(
		safeParseInt(await redis.get(`trust_score:${session.userId}`), 50),
		0,
		100
	);
	const behaviorTrust = clampNumber(userTrustScore / 100, 0, 1);
	const locationTrust = clampNumber(1 - geoRisk / 100, 0, 1);
	const deviceTrust = 1;

	const reasons: string[] = [];
	if (geoRisk >= 30) reasons.push('suspicious_ip');
	if (isVpn) reasons.push('vpn_detected');
	if (isTor) reasons.push('tor_detected');
	if (isProxy) reasons.push('proxy_detected');
	if (failedAttempts > 0) reasons.push('failed_login_attempts');
	if (captchaRequired) reasons.push('captcha_required');
	if (abuseRisk >= 40) reasons.push('abuse_risk');
	if (userTrustScore <= 30) reasons.push('low_user_trust');
	if (Array.isArray(geo?.risk?.factors)) reasons.push(...geo.risk.factors);
	if (Array.isArray(geo?.reputation?.threatTypes)) reasons.push(...geo.reputation.threatTypes);

	const uniqueReasons = Array.from(new Set(reasons)).slice(0, 15);

	const trustPenalty = 100 - userTrustScore;
	const riskScore = clampNumber(
		Math.round(0.5 * geoRisk + 0.4 * abuseRisk + 0.3 * trustPenalty + (captchaRequired ? 10 : 0)),
		0,
		100
	);

	const automationDetected = behaviorTrust < 0.6 || failedAttempts >= 3;

	return {
		id: session.token,
		userId: session.userId,
		email: undefined,
		deviceId: undefined,
		ip,
		userAgent,
		timestamp: now,
		lastActivity: now,
		riskScore,
		reasons: uniqueReasons,
		analysis: {
			overallRisk: clampNumber(Math.max(geoRisk, abuseRisk, trustPenalty) / 100, 0, 1),
			deviceTrust,
			behaviorTrust,
			locationTrust
		},
		signals: {
			vpnDetected: isVpn,
			torDetected: isTor,
			proxyDetected: isProxy,
			captchaTriggered: captchaRequired,
			automationDetected
		},
		failedAttempts,
		isVpn,
		isTor,
		isProxy,
		captchaRequired,
		captchaCompleted,
		automationDetected,
		isBlocked: geo?.risk?.shouldBlock ?? false,
		countryCode: geo?.location?.countryCode,
		city: geo?.location?.city
	};
}

// ============================================
// Better Auth Database Hooks
// ============================================

export const betterAuthDatabaseHooks: BetterAuthOptions['databaseHooks'] = {
	user: {
		create: {
			after: async (user) => {
				await syncUserToCMS(user as User, 'create');
			}
		},
		update: {
			after: async (user) => {
				await syncUserToCMS(user as User, 'update');
			}
		}
	},
	session: {
		create: {
			after: async (session) => {
				await trackSession({
					token: session.token,
					userId: session.userId,
					ipAddress: session.ipAddress,
					userAgent: session.userAgent,
					createdAt: session.createdAt
				});
			}
		}
	}
};

// ============================================
// Manual Hooks (for direct usage outside Better Auth)
// ============================================

export const manualHooks = {
	user: {
		afterCreate: (user: User) => syncUserToCMS(user, 'create'),
		afterUpdate: (user: User) => syncUserToCMS(user, 'update'),
		afterDelete: (userId: string) => {
			logger.info(`[Hooks] User ${userId} deleted`);
		}
	},
	session: {
		afterCreate: trackSession
	}
};

// ============================================
// Avatar Hooks
// ============================================

export const avatarHooks = {
	async update(userId: string, avatarUrl: string): Promise<void> {
		const cmsProvider = getDirectusCMSProvider();
		if (!cmsProvider) {
			logger.debug('[Hooks] CMS provider not available for avatar sync');
			return;
		}

		try {
			await cmsProvider.updateUserAvatar(userId, avatarUrl);
			logger.info(`[Hooks] Avatar synced for user ${userId}`);
		} catch (error) {
			logger.error(`[Hooks] Failed to sync avatar for user ${userId}`, {
				error: error instanceof Error ? error.message : String(error)
			});
		}
	},

	async delete(userId: string): Promise<void> {
		const cmsProvider = getDirectusCMSProvider();
		if (!cmsProvider) {
			logger.debug('[Hooks] CMS provider not available for avatar deletion');
			return;
		}

		try {
			await cmsProvider.deleteUserAvatar(userId);
			logger.info(`[Hooks] Avatar deleted for user ${userId}`);
		} catch (error) {
			logger.error(`[Hooks] Failed to delete avatar for user ${userId}`, {
				error: error instanceof Error ? error.message : String(error)
			});
		}
	}
};

// Default export for convenience
export { betterAuthDatabaseHooks as databaseHooks };
