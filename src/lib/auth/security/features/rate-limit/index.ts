/**
 * Rate Limit Security Feature
 *
 * Implements SecurityFeature interface for rate limiting.
 * Priority: 10 (runs after blocking check)
 */

import type {
	SecurityFeature,
	SecurityConfig,
	FeatureResult,
	RateLimitFeatureConfig
} from '../../core/feature';
import type { SecurityContext } from '../../core/context';
import type { RateLimitStatus } from './types';
import { FEATURE_PRIORITY } from '../../core/feature';
import { slidingWindowCheck } from './sliding-window';
import { getMatchingRules, getClientIdentifier, shouldSkipPath, buildRateLimitKey } from './rules';
import { logger } from '$lib/auth/shared/logger';

export const rateLimitFeature: SecurityFeature = {
	id: 'rate-limit',
	name: 'Rate Limiting',
	priority: FEATURE_PRIORITY.RATE_LIMIT,
	configKey: 'rateLimit',

	async check(ctx: SecurityContext, config: SecurityConfig): Promise<FeatureResult | null> {
		const featureConfig = getRateLimitConfig(config);

		if (!featureConfig.enabled) {
			return null;
		}

		// Check skip paths
		const skipPaths = featureConfig.skipPaths ?? [];
		if (shouldSkipPath(ctx.path, skipPaths)) {
			return null;
		}

		// Get matching rules
		const rules = getMatchingRules(ctx.path, ctx.method, featureConfig);

		if (rules.length === 0) {
			return null;
		}

		const results: RateLimitStatus[] = [];
		let isLimited = false;
		let mostRestrictive: RateLimitStatus | null = null;

		// Check each rule
		for (const rule of rules) {
			// Skip for authenticated users if configured
			if (rule.skipAuthenticated && ctx.userId) {
				continue;
			}

			// Skip for specific roles
			if (rule.skipRoles && ctx.userRoles) {
				const shouldSkip = rule.skipRoles.some((role) => ctx.userRoles?.includes(role));
				if (shouldSkip) continue;
			}

			// Get identifier. The synthetic request must carry every trusted
			// proxy header or getClientIp() ignores it under the active
			// trustProxy mode (e.g. 'cloudflare' only reads cf-connecting-ip).
			const userContext = ctx.userId ? { user: { id: ctx.userId, roles: ctx.userRoles } } : null;
			const identifier = await getClientIdentifier(
				new Request(`http://localhost${ctx.path}`, {
					method: ctx.method,
					headers: {
						// cf-ray is required for cf-connecting-ip to be trusted
						// in 'cloudflare' mode — this request is server-built so
						// marking it as such is correct, not a spoof.
						'cf-ray': 'internal',
						'cf-connecting-ip': ctx.ip,
						'x-forwarded-for': ctx.ip,
						'x-real-ip': ctx.ip,
						'user-agent': ctx.userAgent
					}
				}),
				rule,
				userContext,
				featureConfig
			);

			// Build key
			const key = buildRateLimitKey(rule.id, identifier, featureConfig.keyPrefix);

			// Check rate limit (currently only sliding window is fully atomic)
			const status = await slidingWindowCheck(key, rule.maxRequests, rule.windowSeconds);
			status.triggeredRule = rule.id;

			results.push(status);

			if (status.limited) {
				isLimited = true;
				if (!mostRestrictive || status.retryAfter! > (mostRestrictive.retryAfter ?? 0)) {
					mostRestrictive = status;
				}
			}
		}

		// Store rate limit info in context
		ctx.rateLimited = isLimited;
		if (mostRestrictive) {
			ctx.rateLimitInfo = {
				limited: true,
				remaining: 0,
				resetAt: mostRestrictive.resetAt,
				retryAfter: mostRestrictive.retryAfter
			};
		}

		if (isLimited && mostRestrictive) {
			ctx.emit('rate_limited', {
				rule: mostRestrictive.triggeredRule,
				retryAfter: mostRestrictive.retryAfter
			});

			logger.warn('[RateLimit] Request rate limited', {
				requestId: ctx.requestId,
				ip: ctx.ip,
				path: ctx.path,
				rule: mostRestrictive.triggeredRule,
				retryAfter: mostRestrictive.retryAfter
			});

			return {
				block: true,
				blockReason: 'Rate limit exceeded',
				blockResponse: createRateLimitResponse(mostRestrictive)
			};
		}

		return {
			data: {
				rateLimitResults: results
			}
		};
	}
};

/**
 * Extract rate limit config from security config
 */
function getRateLimitConfig(config: SecurityConfig): RateLimitFeatureConfig & { enabled: boolean } {
	const featureConfig = config.features?.rateLimit;

	if (typeof featureConfig === 'boolean') {
		return { enabled: featureConfig };
	}

	if (featureConfig && typeof featureConfig === 'object') {
		return { enabled: featureConfig.enabled !== false, ...featureConfig };
	}

	return { enabled: true };
}

/**
 * Create 429 response for rate limiting
 */
function createRateLimitResponse(status: RateLimitStatus): Response {
	const headers: Record<string, string> = {
		'Content-Type': 'application/json',
		'X-RateLimit-Limit': status.limit.toString(),
		'X-RateLimit-Remaining': '0',
		'X-RateLimit-Reset': status.resetAt.toString()
	};

	if (status.retryAfter) {
		headers['Retry-After'] = status.retryAfter.toString();
	}

	return new Response(
		JSON.stringify({
			error: 'Too Many Requests',
			message: 'Rate limit exceeded. Please try again later.',
			retryAfter: status.retryAfter,
			resetAt: status.resetAt
		}),
		{
			status: 429,
			headers
		}
	);
}

export * from './types';
export { slidingWindowCheck } from './sliding-window';
export { getMatchingRules, matchPath, shouldSkipPath, buildRateLimitKey } from './rules';
