/**
 * Device Security Feature
 *
 * Implements SecurityFeature interface for device fingerprinting and trust.
 * Priority: 40 (runs after geo)
 */

import { z } from 'zod';
import type { SecurityFeature, SecurityConfig, FeatureResult } from '../../core/feature';
import type { SecurityContext } from '../../core/context';
import type { DeviceFeatureConfig, TrustedDevice } from './types';
import { FEATURE_PRIORITY } from '../../core/feature';
import { logger } from '$lib/auth/shared/logger';
import { CacheManager } from '../../core/cache';
import { hashString, generateShortId } from '../../core/helpers';
import { deviceRiskFactors, positiveRiskFactors } from '../../core/risk-engine';
import { createStorageAdapter, type StorageAdapter } from '../../core/storage';

const trustedDeviceSchema = z.object({
	id: z.string(),
	userId: z.string(),
	fingerprint: z.string(),
	userAgent: z.string(),
	lastSeen: z.number(),
	createdAt: z.number(),
	successfulAuths: z.number().default(0),
	trusted: z.boolean().default(false)
});

const TRUST_KEY_PREFIX = 'device:trust:';

// Cache for device trust lookups
const trustCache = new CacheManager<string, TrustedDevice | null>('device-trust', 500, 60000);

let storageAdapter: StorageAdapter | null = null;

async function getStorage(): Promise<StorageAdapter> {
	if (!storageAdapter) {
		storageAdapter = await createStorageAdapter();
	}
	return storageAdapter;
}

export const deviceFeature: SecurityFeature = {
	id: 'device',
	name: 'Device Trust',
	priority: FEATURE_PRIORITY.DEVICE,
	configKey: 'device',

	async check(ctx: SecurityContext, config: SecurityConfig): Promise<FeatureResult | null> {
		const featureConfig = getDeviceConfig(config);

		if (!featureConfig.enabled) {
			return null;
		}

		// Generate device fingerprint from available data
		const deviceId = generateDeviceId(ctx);

		// Check if device is trusted (for authenticated users)
		if (ctx.userId) {
			const trustedDevice = await getTrustedDevice(ctx.userId, deviceId);

			if (trustedDevice?.trusted) {
				logger.debug('[Device] Trusted device detected', {
					requestId: ctx.requestId,
					deviceId,
					userId: ctx.userId
				});

				return {
					riskFactors: [positiveRiskFactors.trustedDevice(deviceId)],
					data: { deviceId, trusted: true }
				};
			}
		}

		// Check for automation/headless indicators
		const riskFactors = [];

		if (isHeadlessBrowser(ctx.userAgent)) {
			riskFactors.push(deviceRiskFactors.headless());
		}

		if (hasAutomationIndicators(ctx.userAgent)) {
			riskFactors.push(deviceRiskFactors.automation());
		}

		if (riskFactors.length > 0) {
			logger.debug('[Device] Risk factors detected', {
				requestId: ctx.requestId,
				deviceId,
				factors: riskFactors.map((f) => f.factor)
			});
		}

		return {
			riskFactors,
			data: { deviceId, trusted: false }
		};
	},

	clearCache() {
		trustCache.clear();
	},

	getCacheStats() {
		return trustCache.getStats();
	}
};

/**
 * Generate device ID from context data.
 * Uses multiple server-available signals to improve fingerprint entropy
 * beyond just user-agent + IP prefix.
 */
function generateDeviceId(ctx: SecurityContext): string {
	const components = [
		ctx.userAgent,
		ctx.ip.split('.').slice(0, 2).join('.'), // First two octets only for privacy
		ctx.getHeader('accept-language') ?? '',
		ctx.getHeader('accept-encoding') ?? '',
		// Client hints (Chromium-based browsers send these automatically)
		ctx.getHeader('sec-ch-ua') ?? '',
		ctx.getHeader('sec-ch-ua-platform') ?? '',
		ctx.getHeader('sec-ch-ua-mobile') ?? ''
	].join('|');

	return hashString(components).slice(0, 16);
}

/**
 * Get trusted device record
 */
async function getTrustedDevice(userId: string, deviceId: string): Promise<TrustedDevice | null> {
	const cacheKey = `${userId}:${deviceId}`;
	const cached = trustCache.get(cacheKey);
	if (cached !== undefined) {
		return cached;
	}

	try {
		const storage = await getStorage();
		const key = `${TRUST_KEY_PREFIX}${userId}:${deviceId}`;
		const data = await storage.get(key);

		if (!data) {
			trustCache.set(cacheKey, null);
			return null;
		}

		const parsed = trustedDeviceSchema.safeParse(JSON.parse(data));
		if (!parsed.success) {
			trustCache.set(cacheKey, null);
			return null;
		}
		const device = parsed.data as TrustedDevice;
		trustCache.set(cacheKey, device);
		return device;
	} catch (error) {
		logger.error('[Device] Failed to get trusted device:', error);
		return null;
	}
}

/**
 * Record device for user (called after successful auth)
 */
export async function recordDeviceForUser(
	userId: string,
	deviceId: string,
	userAgent: string,
	config: DeviceFeatureConfig
): Promise<void> {
	try {
		const storage = await getStorage();
		const key = `${TRUST_KEY_PREFIX}${userId}:${deviceId}`;
		const existing = await storage.get(key);

		const now = Date.now();
		const trustAfter = config.trustAfterSuccessfulAuths ?? 3;
		const trustDays = config.trustDurationDays ?? 30;
		const ttl = trustDays * 24 * 60 * 60;

		let device: TrustedDevice;

		if (existing) {
			const parsed = trustedDeviceSchema.safeParse(JSON.parse(existing));
			if (parsed.success) {
				device = parsed.data;
				device.successfulAuths += 1;
				device.lastSeen = now;
				device.trusted = device.successfulAuths >= trustAfter;
			} else {
				device = {
					id: generateShortId(),
					userId,
					fingerprint: deviceId,
					userAgent,
					lastSeen: now,
					createdAt: now,
					successfulAuths: 1,
					trusted: trustAfter <= 1
				};
			}
		} else {
			device = {
				id: generateShortId(),
				userId,
				fingerprint: deviceId,
				userAgent,
				lastSeen: now,
				createdAt: now,
				successfulAuths: 1,
				trusted: trustAfter <= 1
			};
		}

		await storage.set(key, JSON.stringify(device), ttl);
		trustCache.delete(`${userId}:${deviceId}`);
	} catch (error) {
		logger.error('[Device] Failed to record device:', error);
	}
}

/**
 * Check for headless browser indicators
 */
function isHeadlessBrowser(userAgent: string): boolean {
	const headlessPatterns = [
		/HeadlessChrome/i,
		/PhantomJS/i,
		/SlimerJS/i,
		/Playwright/i,
		/Puppeteer/i
	];

	return headlessPatterns.some((pattern) => pattern.test(userAgent));
}

/**
 * Check for automation tool indicators
 */
function hasAutomationIndicators(userAgent: string): boolean {
	const automationPatterns = [/Selenium/i, /WebDriver/i, /bot/i, /crawler/i, /spider/i, /scraper/i];

	return automationPatterns.some((pattern) => pattern.test(userAgent));
}

/**
 * Extract device config from security config
 */
function getDeviceConfig(config: SecurityConfig): DeviceFeatureConfig & { enabled: boolean } {
	const featureConfig = config.features?.device;

	if (typeof featureConfig === 'boolean') {
		return { enabled: featureConfig };
	}

	if (featureConfig && typeof featureConfig === 'object') {
		return { enabled: featureConfig.enabled !== false, ...featureConfig };
	}

	return { enabled: true };
}

export * from './types';
