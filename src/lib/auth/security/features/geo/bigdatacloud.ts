/**
 * BigDataCloud API Client
 *
 * Fetches geolocation and reputation data from BigDataCloud API.
 * Includes hostingLikelihood support for better datacenter detection.
 */

import type { GeoLocation, IPReputation, GeoFeatureConfig } from './types';
import { logger } from '#lib/auth/shared/logger.js';
import { CircuitBreaker } from '../../core/circuit-breaker';

const API_TIMEOUT_MS = 5000;

// Circuit breaker for API calls
const apiCircuit = new CircuitBreaker({
	name: 'bigdatacloud',
	failureThreshold: 5,
	resetTimeoutMs: 30000
});

/**
 * Fetch combined geolocation and reputation from BigDataCloud API
 */
export async function fetchFromBigDataCloud(
	ip: string,
	apiKey: string,
	config: GeoFeatureConfig
): Promise<{ location: GeoLocation | null; reputation: IPReputation }> {
	return apiCircuit.executeWithFallback(
		async () => {
			const url = `https://api.bigdatacloud.net/data/ip-geolocation-full?ip=${encodeURIComponent(ip)}&localityLanguage=en`;

			const controller = new AbortController();
			const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT_MS);

			try {
				const response = await fetch(url, {
					signal: controller.signal,
					headers: { 'X-Api-Key': apiKey }
				});

				clearTimeout(timeoutId);

				if (!response.ok) {
					logger.warn(`[Geo] BigDataCloud API error: ${response.status}`);
					return { location: null, reputation: getDefaultReputation(ip) };
				}

				const data = await response.json();
				return parseApiResponse(ip, data, config);
			} finally {
				clearTimeout(timeoutId);
			}
		},
		() => ({ location: null, reputation: getDefaultReputation(ip) })
	);
}

/**
 * Parse BigDataCloud API response
 */
function parseApiResponse(
	ip: string,
	data: Record<string, unknown>,
	config: GeoFeatureConfig
): { location: GeoLocation | null; reputation: IPReputation } {
	const location = extractLocation(data);
	const reputation = extractReputation(ip, data, config);
	return { location, reputation };
}

/**
 * Extract location data from API response
 */
function extractLocation(data: Record<string, unknown>): GeoLocation | null {
	const country = data.country as Record<string, unknown> | undefined;
	const location = data.location as Record<string, unknown> | undefined;
	const network = data.network as Record<string, unknown> | undefined;

	if (!country) return null;

	return {
		country: (country.name as string) || 'Unknown',
		countryCode: (country.isoAlpha2 as string) || 'XX',
		region: location?.principalSubdivision as string | undefined,
		regionCode: location?.principalSubdivisionCode as string | undefined,
		city: location?.city as string | undefined,
		postalCode: location?.postcode as string | undefined,
		latitude: location?.latitude as number | undefined,
		longitude: location?.longitude as number | undefined,
		timezone: (location?.timeZone as Record<string, unknown>)?.ianaTimeId as string | undefined,
		isp: network?.organisation as string | undefined,
		organization: network?.organisation as string | undefined,
		asn: network?.autonomousSystemNumber as number | undefined,
		asName: network?.autonomousSystemOrganisation as string | undefined,
		confidence: data.confidenceArea ? 'high' : 'medium'
	};
}

/**
 * Extract reputation data from API response
 * CRITICAL FIX: Includes hostingLikelihood support
 */
function extractReputation(
	ip: string,
	data: Record<string, unknown>,
	config: GeoFeatureConfig
): IPReputation {
	const hazard = (data.hazardReport as Record<string, unknown>) || {};
	const network = data.network as Record<string, unknown> | undefined;
	const carriers = network?.carriers as unknown[] | undefined;

	const isVpn = Boolean(hazard.isKnownAsVpn);
	const isTor = Boolean(hazard.isKnownAsTorServer);
	const isProxy = Boolean(hazard.isKnownAsProxy);
	const isDatacenter = Boolean(hazard.isHostingAsn) || Boolean(hazard.isCloudProvider);
	const isMalicious =
		Boolean(hazard.isSpamhausDrop) || Boolean(hazard.isSpamhausEdrop) || Boolean(hazard.isBogon);

	// NEW: Extract hostingLikelihood (0-10 scale from BigDataCloud)
	const hostingLikelihood = (hazard.hostingLikelihood as number) ?? undefined;

	// Calculate trust score with hostingLikelihood penalty
	let trustScore = 100;
	if (isVpn) trustScore -= 20;
	if (isTor) trustScore -= 35;
	if (isProxy) trustScore -= 15;
	if (isDatacenter) trustScore -= 15;
	if (isMalicious) trustScore -= 50;

	// Apply hostingLikelihood penalty
	if (hostingLikelihood !== undefined) {
		const hostingHighPenalty = config.hostingHighPenalty ?? 30;
		const hostingMediumPenalty = config.hostingMediumPenalty ?? 15;

		if (hostingLikelihood >= 7) {
			trustScore -= hostingHighPenalty;
		} else if (hostingLikelihood >= 4) {
			trustScore -= hostingMediumPenalty;
		}
	}

	trustScore = Math.max(0, trustScore);

	// Build threat types array
	const threatTypes: string[] = [];
	if (hazard.isKnownAsVpn) threatTypes.push('vpn');
	if (hazard.isKnownAsTorServer) threatTypes.push('tor');
	if (hazard.isKnownAsProxy) threatTypes.push('proxy');
	if (hazard.isHostingAsn) threatTypes.push('hosting');
	if (hazard.isCloudProvider) threatTypes.push('cloud');
	if (hazard.isSpamhausDrop) threatTypes.push('spamhaus_drop');
	if (hazard.isSpamhausEdrop) threatTypes.push('spamhaus_edrop');
	if (hazard.isBogon) threatTypes.push('bogon');
	if (hostingLikelihood !== undefined && hostingLikelihood >= 7) {
		threatTypes.push('high_hosting_likelihood');
	}

	return {
		ip,
		trustScore,
		riskScore: 100 - trustScore,
		isVpn,
		isTor,
		isProxy,
		isMalicious,
		isDatacenter,
		isResidential: !isDatacenter && !isVpn,
		isMobile: (carriers?.length ?? 0) > 0,
		isCrawler: Boolean(hazard.isSearchEngineRobot),
		hostingLikelihood,
		threatTypes,
		abuseConfidence: hazard.threatLevel ? (hazard.threatLevel as number) * 10 : 0,
		reportCount: 0,
		source: 'bigdatacloud'
	};
}

/**
 * Create default reputation for private/unknown IPs
 */
export function getDefaultReputation(ip: string): IPReputation {
	return {
		ip,
		trustScore: 100,
		riskScore: 0,
		isVpn: false,
		isTor: false,
		isProxy: false,
		isMalicious: false,
		isDatacenter: false,
		isResidential: true,
		isMobile: false,
		isCrawler: false,
		threatTypes: [],
		abuseConfidence: 0,
		reportCount: 0,
		source: 'default'
	};
}

/**
 * Get circuit breaker stats
 */
export function getApiCircuitStats() {
	return apiCircuit.getStats();
}

/**
 * Reset circuit breaker (for testing)
 */
export function resetApiCircuit(): void {
	apiCircuit.reset();
}
