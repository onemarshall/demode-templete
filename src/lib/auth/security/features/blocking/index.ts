/**
 * Blocking Security Feature
 *
 * Implements SecurityFeature interface for IP/user blocking.
 * Priority: 0 (runs first - fastest rejection)
 */

import type { SecurityFeature, SecurityConfig, FeatureResult } from '../../core/feature';
import type { SecurityContext } from '../../core/context';
import type { BlockingFeatureConfig } from './types';
import { FEATURE_PRIORITY } from '../../core/feature';
import { getBlockStatus } from './temp-block';
import { isIPBlocked, getBlockReason } from './ip-block';
import { logger } from '#lib/auth/shared/logger.js';

export const blockingFeature: SecurityFeature = {
	id: 'blocking',
	name: 'IP/User Blocking',
	priority: FEATURE_PRIORITY.BLOCKING,
	configKey: 'blocking',

	async check(ctx: SecurityContext, config: SecurityConfig): Promise<FeatureResult | null> {
		const featureConfig = getBlockingConfig(config);

		if (!featureConfig.enabled) {
			return null;
		}

		// Check permanent IP blocklist first (fastest)
		const ipBlocked = await isIPBlocked(ctx.ip);
		if (ipBlocked) {
			const reason = await getBlockReason(ctx.ip);

			ctx.emit('blocked', { type: 'ip', ip: ctx.ip, reason });

			logger.warn('[Blocking] Request blocked - IP in blocklist', {
				requestId: ctx.requestId,
				ip: ctx.ip,
				reason
			});

			return {
				block: true,
				blockReason: reason ?? 'IP address is blocked',
				blockResponse: createBlockedResponse(reason ?? 'IP address is blocked')
			};
		}

		// Check temporary blocks (based on identifier)
		const identifier = ctx.userId ? `user:${ctx.userId}` : `ip:${ctx.ip}`;
		const blockStatus = await getBlockStatus(identifier, featureConfig);

		if (blockStatus.blocked) {
			ctx.emit('blocked', {
				type: 'temp',
				identifier,
				reason: blockStatus.reason,
				expiresIn: blockStatus.expiresIn
			});

			logger.warn('[Blocking] Request blocked - Temporary block active', {
				requestId: ctx.requestId,
				identifier,
				reason: blockStatus.reason,
				expiresIn: blockStatus.expiresIn
			});

			return {
				block: true,
				blockReason: blockStatus.reason ?? 'Too many failed attempts',
				blockResponse: createBlockedResponse(
					blockStatus.reason ?? 'Too many failed attempts',
					blockStatus.expiresIn
				)
			};
		}

		return null;
	}
};

/**
 * Extract blocking config from security config
 */
function getBlockingConfig(config: SecurityConfig): BlockingFeatureConfig & { enabled: boolean } {
	const featureConfig = config.features?.blocking;

	if (typeof featureConfig === 'boolean') {
		return { enabled: featureConfig };
	}

	if (featureConfig && typeof featureConfig === 'object') {
		return { enabled: featureConfig.enabled !== false, ...featureConfig };
	}

	return { enabled: true };
}

/**
 * Create 403 response for blocked requests
 */
function createBlockedResponse(reason: string, retryAfter?: number): Response {
	const headers: Record<string, string> = {
		'Content-Type': 'application/json'
	};

	if (retryAfter) {
		headers['Retry-After'] = retryAfter.toString();
	}

	return new Response(
		JSON.stringify({
			error: 'Forbidden',
			message: reason,
			retryAfter
		}),
		{
			status: 403,
			headers
		}
	);
}

export * from './types';
export { getBlockStatus, setTempBlock, clearTempBlock, calculateBlockDuration } from './temp-block';
export { isIPBlocked, blockIP, unblockIP, getBlockedIPs } from './ip-block';
