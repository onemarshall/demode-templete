/**
 * Geo Intelligence Security Feature
 *
 * Implements SecurityFeature interface for geo-based security.
 * Priority: 30 (runs after rate limiting and CAPTCHA)
 */

import type { SecurityFeature, SecurityConfig, FeatureResult } from '../../core/feature';
import type { SecurityContext } from '../../core/context';
import type { GeoFeatureConfig, GeoIntelligence } from './types';
import { FEATURE_PRIORITY } from '../../core/feature';
import { fetchFromBigDataCloud, getDefaultReputation } from './bigdatacloud';
import { assessGeoRisk } from './reputation';
import { isPrivateIp } from '../../core/helpers';
import { logger } from '$lib/auth/shared/logger';
import { CacheManager, PendingRequests } from '../../core/cache';
import { geoRiskFactors } from '../../core/risk-engine';

// Cache for geo intelligence lookups
const geoCache = new CacheManager<string, GeoIntelligence>('geo-intelligence', 500, 30000);
const pendingLookups = new PendingRequests<string, GeoIntelligence>();

export const geoFeature: SecurityFeature = {
	id: 'geo',
	name: 'Geo Intelligence',
	priority: FEATURE_PRIORITY.GEO,
	configKey: 'geo',

	async check(ctx: SecurityContext, config: SecurityConfig): Promise<FeatureResult | null> {
		const featureConfig = getGeoConfig(config);

		if (!featureConfig.enabled) {
			return null;
		}

		// Skip private IPs
		if (isPrivateIp(ctx.ip)) {
			return null;
		}

		// Get geo intelligence (with caching and request coalescing)
		const intelligence = await getGeoIntelligence(ctx.ip, featureConfig);

		// Store in context
		ctx.geo = intelligence.location ?? undefined;
		ctx.reputation = intelligence.reputation;

		// Check if blocked by country
		if (intelligence.risk.blocked) {
			ctx.emit('blocked', {
				type: 'geo',
				reason: intelligence.risk.blockReason,
				country: intelligence.location?.countryCode
			});

			logger.warn('[Geo] Request blocked by country', {
				requestId: ctx.requestId,
				ip: ctx.ip,
				country: intelligence.location?.countryCode,
				reason: intelligence.risk.blockReason
			});

			return {
				block: true,
				blockReason: intelligence.risk.blockReason ?? 'Access denied from your location',
				blockResponse: createBlockedResponse(
					intelligence.risk.blockReason ?? 'Access denied from your location'
				)
			};
		}

		// Build risk factors
		const riskFactors = buildRiskFactors(intelligence);

		if (riskFactors.length > 0) {
			logger.debug('[Geo] Risk factors detected', {
				requestId: ctx.requestId,
				ip: ctx.ip,
				factors: riskFactors.map((f) => f.factor)
			});
		}

		return {
			riskFactors,
			data: {
				geoIntelligence: intelligence
			}
		};
	},

	clearCache() {
		geoCache.clear();
	},

	getCacheStats() {
		return geoCache.getStats();
	}
};

/**
 * Get geo intelligence with caching and request coalescing
 */
async function getGeoIntelligence(ip: string, config: GeoFeatureConfig): Promise<GeoIntelligence> {
	// Check cache first
	const cached = geoCache.get(ip);
	if (cached) {
		return { ...cached, cached: true };
	}

	// Use request coalescing
	return pendingLookups.getOrCreate(ip, async () => {
		const now = Date.now();

		// Check API key
		if (!config.bigDataCloudApiKey) {
			const reputation = getDefaultReputation(ip);
			const risk = assessGeoRisk(null, reputation, config);
			return {
				ip,
				location: null,
				reputation,
				risk,
				timestamp: now,
				cached: false
			};
		}

		// Fetch from API
		const { location, reputation } = await fetchFromBigDataCloud(
			ip,
			config.bigDataCloudApiKey,
			config
		);
		const risk = assessGeoRisk(location, reputation, config);

		const intelligence: GeoIntelligence = {
			ip,
			location,
			reputation,
			risk,
			timestamp: now,
			cached: false
		};

		// Cache result
		const cacheTtl = (config.cacheTtlSeconds ?? 300) * 1000;
		geoCache.set(ip, intelligence, cacheTtl);

		return intelligence;
	});
}

/**
 * Build risk factors from geo intelligence
 */
function buildRiskFactors(intelligence: GeoIntelligence) {
	const factors = [];
	const rep = intelligence.reputation;

	if (rep.isVpn) {
		factors.push(geoRiskFactors.vpn());
	}

	if (rep.isTor) {
		factors.push(geoRiskFactors.tor());
	}

	if (rep.isProxy) {
		factors.push(geoRiskFactors.proxy());
	}

	if (rep.isDatacenter) {
		factors.push(geoRiskFactors.datacenter());
	}

	if (rep.isMalicious) {
		factors.push(geoRiskFactors.malicious());
	}

	if (intelligence.location?.countryCode) {
		// High risk country factor would be added here if configured
	}

	// NEW: hostingLikelihood factor
	if (rep.hostingLikelihood !== undefined && rep.hostingLikelihood >= 7) {
		factors.push({
			source: 'geo',
			factor: 'high_hosting_likelihood',
			score: 30,
			details: { hostingLikelihood: rep.hostingLikelihood }
		});
	} else if (rep.hostingLikelihood !== undefined && rep.hostingLikelihood >= 4) {
		factors.push({
			source: 'geo',
			factor: 'medium_hosting_likelihood',
			score: 15,
			details: { hostingLikelihood: rep.hostingLikelihood }
		});
	}

	return factors;
}

/**
 * Extract geo config from security config
 */
function getGeoConfig(config: SecurityConfig): GeoFeatureConfig & { enabled: boolean } {
	const featureConfig = config.features?.geo;

	if (typeof featureConfig === 'boolean') {
		return { enabled: featureConfig };
	}

	if (featureConfig && typeof featureConfig === 'object') {
		return { enabled: featureConfig.enabled !== false, ...featureConfig };
	}

	return { enabled: true };
}

/**
 * Create 403 response for geo-blocked requests
 */
function createBlockedResponse(reason: string): Response {
	return new Response(
		JSON.stringify({
			error: 'Forbidden',
			message: reason
		}),
		{
			status: 403,
			headers: { 'Content-Type': 'application/json' }
		}
	);
}

export * from './types';
export { fetchFromBigDataCloud, getDefaultReputation } from './bigdatacloud';
export { assessGeoRisk, isCountryAllowed, isHighRiskCountry } from './reputation';
