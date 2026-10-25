/**
 * IP Reputation Scoring
 *
 * Calculates risk scores based on IP reputation data.
 */

import type { GeoLocation, IPReputation, GeoRiskAssessment, GeoFeatureConfig } from './types';
import { securityConfig } from '../../config';

/**
 * Assess risk based on location and reputation
 */
export function assessGeoRisk(
	location: GeoLocation | null,
	reputation: IPReputation,
	config: GeoFeatureConfig
): GeoRiskAssessment {
	const factors: string[] = [];
	let score = 0;

	// Check country blocking
	if (location?.countryCode) {
		const blockedCountries = config.blockedCountries ?? [];
		const highRiskCountries = config.highRiskCountries ?? [];

		if (blockedCountries.includes(location.countryCode)) {
			return {
				score: 100,
				level: 'critical',
				factors: ['blocked_country'],
				blocked: true,
				blockReason: `Access from ${location.country} is not allowed`
			};
		}

		if (highRiskCountries.includes(location.countryCode)) {
			score += securityConfig.geo.highRiskCountryPenalty;
			factors.push(`high_risk_country:${location.countryCode}`);
		}
	}

	// Reputation-based scoring
	if (reputation.isVpn) {
		score += securityConfig.ipReputation.vpnPenalty;
		factors.push('vpn_detected');
	}

	if (reputation.isTor) {
		score += securityConfig.ipReputation.torPenalty;
		factors.push('tor_exit_node');
	}

	if (reputation.isProxy) {
		score += securityConfig.ipReputation.proxyPenalty;
		factors.push('proxy_detected');
	}

	if (reputation.isDatacenter) {
		score += securityConfig.ipReputation.datacenterPenalty;
		factors.push('datacenter_ip');
	}

	if (reputation.isMalicious) {
		score += securityConfig.ipReputation.maliciousPenalty;
		factors.push('malicious_ip');
	}

	// NEW: hostingLikelihood penalty
	if (reputation.hostingLikelihood !== undefined) {
		const hostingHighPenalty = config.hostingHighPenalty ?? 30;
		const hostingMediumPenalty = config.hostingMediumPenalty ?? 15;

		if (reputation.hostingLikelihood >= 7) {
			score += hostingHighPenalty;
			factors.push(`hosting_likelihood:${reputation.hostingLikelihood}`);
		} else if (reputation.hostingLikelihood >= 4) {
			score += hostingMediumPenalty;
			factors.push(`hosting_likelihood:${reputation.hostingLikelihood}`);
		}
	}

	// Clamp score
	score = Math.min(100, Math.max(0, score));

	// Determine level
	let level: 'low' | 'medium' | 'high' | 'critical';
	if (score >= 80) level = 'critical';
	else if (score >= 60) level = 'high';
	else if (score >= 40) level = 'medium';
	else level = 'low';

	return {
		score,
		level,
		factors,
		blocked: false
	};
}

/**
 * Check if country is allowed
 */
export function isCountryAllowed(countryCode: string, config: GeoFeatureConfig): boolean {
	const allowedCountries = config.allowedCountries;
	const blockedCountries = config.blockedCountries ?? [];

	// If allowed list is specified, only allow those
	if (allowedCountries && allowedCountries.length > 0) {
		return allowedCountries.includes(countryCode);
	}

	// Otherwise, check blocked list
	return !blockedCountries.includes(countryCode);
}

/**
 * Check if country is high risk
 */
export function isHighRiskCountry(countryCode: string, config: GeoFeatureConfig): boolean {
	const highRiskCountries = config.highRiskCountries ?? [];
	return highRiskCountries.includes(countryCode);
}
