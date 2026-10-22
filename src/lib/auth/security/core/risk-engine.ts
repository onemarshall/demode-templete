/**
 * Unified Risk Engine for Security Plugin
 *
 * Centralized risk calculation that replaces 3+ separate implementations
 * across plugins with a single, consistent scoring system.
 */

import { clamp } from './helpers';
import { RISK_LEVEL_THRESHOLDS } from './risk-levels.js';
export { RISK_LEVEL_THRESHOLDS } from './risk-levels.js';

// ============================================
// Types
// ============================================

export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

export interface RiskFactor {
	/** Source feature (e.g., 'geo', 'device', 'behavior') */
	source: string;
	/** Specific factor (e.g., 'vpn_detected', 'new_device') */
	factor: string;
	/** Risk score contribution (positive increases risk, negative decreases) */
	score: number;
	/** Additional details for logging/debugging */
	details?: Record<string, unknown>;
}

export interface RiskThresholds {
	/** Score at which CAPTCHA is required (default: 40) */
	captchaThreshold: number;
	/** Score at which request is blocked (default: 80) */
	blockThreshold: number;
}

export interface RiskAssessment {
	score: number;
	level: RiskLevel;
	factors: RiskFactor[];
	shouldBlock: boolean;
	shouldRequireCaptcha: boolean;
}

// ============================================
// Default Risk Score Contributions
// ============================================

export const DEFAULT_RISK_SCORES = {
	// Geo factors
	vpn: 20,
	tor: 35,
	proxy: 15,
	datacenter: 15,
	maliciousIp: 50,
	highRiskCountry: 20,
	hostingHigh: 30,
	hostingMedium: 15,

	// Device factors
	newDevice: 20,
	headlessBrowser: 40,
	automationDetected: 50,
	noFingerprint: 15,

	// Behavior factors
	botBehavior: 40,
	rapidRequests: 20,
	suspiciousHeaders: 15,

	// Blocking factors
	failedAttempts: 25,
	captchaFailures: 20,

	// Positive factors (reduce risk)
	trustedUser: -30,
	trustedDevice: -20,
	verifiedCaptcha: -10,
	successfulAuth: -5
} as const;

// ============================================
// Risk Calculation
// ============================================

/**
 * Calculate total risk score from accumulated factors
 * Score is clamped between 0 and 100
 */
export function calculateRiskScore(factors: RiskFactor[]): number {
	let score = 0;

	for (const factor of factors) {
		score += factor.score;
	}

	return clamp(score, 0, 100);
}

/**
 * Determine risk level from score
 */
export function getRiskLevel(score: number): RiskLevel {
	if (score >= RISK_LEVEL_THRESHOLDS.critical) return 'critical';
	if (score >= RISK_LEVEL_THRESHOLDS.high) return 'high';
	if (score >= RISK_LEVEL_THRESHOLDS.medium) return 'medium';
	return 'low';
}

/**
 * Check if score exceeds block threshold
 */
export function shouldBlock(score: number, thresholds: RiskThresholds): boolean {
	return score >= thresholds.blockThreshold;
}

/**
 * Check if score requires CAPTCHA (but not blocking)
 */
export function shouldRequireCaptcha(score: number, thresholds: RiskThresholds): boolean {
	return score >= thresholds.captchaThreshold && score < thresholds.blockThreshold;
}

/**
 * Perform complete risk assessment
 */
export function assessRisk(factors: RiskFactor[], thresholds: RiskThresholds): RiskAssessment {
	const score = calculateRiskScore(factors);
	const level = getRiskLevel(score);

	return {
		score,
		level,
		factors,
		shouldBlock: shouldBlock(score, thresholds),
		shouldRequireCaptcha: shouldRequireCaptcha(score, thresholds)
	};
}

// ============================================
// Risk Factor Builders
// ============================================

/**
 * Create a risk factor with standard structure
 */
export function createRiskFactor(
	source: string,
	factor: string,
	score: number,
	details?: Record<string, unknown>
): RiskFactor {
	return { source, factor, score, details };
}

/**
 * Create geo-related risk factors
 */
export const geoRiskFactors = {
	vpn: (details?: Record<string, unknown>) =>
		createRiskFactor('geo', 'vpn_detected', DEFAULT_RISK_SCORES.vpn, details),

	tor: (details?: Record<string, unknown>) =>
		createRiskFactor('geo', 'tor_exit_node', DEFAULT_RISK_SCORES.tor, details),

	proxy: (details?: Record<string, unknown>) =>
		createRiskFactor('geo', 'proxy_detected', DEFAULT_RISK_SCORES.proxy, details),

	datacenter: (details?: Record<string, unknown>) =>
		createRiskFactor('geo', 'datacenter_ip', DEFAULT_RISK_SCORES.datacenter, details),

	malicious: (details?: Record<string, unknown>) =>
		createRiskFactor('geo', 'malicious_ip', DEFAULT_RISK_SCORES.maliciousIp, details),

	highRiskCountry: (countryCode: string) =>
		createRiskFactor('geo', 'high_risk_country', DEFAULT_RISK_SCORES.highRiskCountry, {
			countryCode
		}),

	hostingHigh: (likelihood: number) =>
		createRiskFactor('geo', 'hosting_high', DEFAULT_RISK_SCORES.hostingHigh, {
			hostingLikelihood: likelihood
		}),

	hostingMedium: (likelihood: number) =>
		createRiskFactor('geo', 'hosting_medium', DEFAULT_RISK_SCORES.hostingMedium, {
			hostingLikelihood: likelihood
		})
};

/**
 * Create device-related risk factors
 */
export const deviceRiskFactors = {
	newDevice: (deviceId: string) =>
		createRiskFactor('device', 'new_device', DEFAULT_RISK_SCORES.newDevice, { deviceId }),

	headless: (details?: Record<string, unknown>) =>
		createRiskFactor('device', 'headless_browser', DEFAULT_RISK_SCORES.headlessBrowser, details),

	automation: (details?: Record<string, unknown>) =>
		createRiskFactor(
			'device',
			'automation_detected',
			DEFAULT_RISK_SCORES.automationDetected,
			details
		),

	noFingerprint: () =>
		createRiskFactor('device', 'no_fingerprint', DEFAULT_RISK_SCORES.noFingerprint),

	trusted: (deviceId: string) =>
		createRiskFactor('device', 'trusted_device', DEFAULT_RISK_SCORES.trustedDevice, { deviceId })
};

/**
 * Create behavior-related risk factors
 */
export const behaviorRiskFactors = {
	bot: (details?: Record<string, unknown>) =>
		createRiskFactor('behavior', 'bot_detected', DEFAULT_RISK_SCORES.botBehavior, details),

	rapidRequests: (count: number, windowSeconds: number) =>
		createRiskFactor('behavior', 'rapid_requests', DEFAULT_RISK_SCORES.rapidRequests, {
			count,
			windowSeconds
		}),

	suspiciousHeaders: (headers: string[]) =>
		createRiskFactor('behavior', 'suspicious_headers', DEFAULT_RISK_SCORES.suspiciousHeaders, {
			headers
		})
};

/**
 * Create blocking-related risk factors
 */
export const blockingRiskFactors = {
	failedAttempts: (count: number) =>
		createRiskFactor('blocking', 'failed_attempts', DEFAULT_RISK_SCORES.failedAttempts, { count }),

	captchaFailures: (count: number) =>
		createRiskFactor('captcha', 'captcha_failures', DEFAULT_RISK_SCORES.captchaFailures, { count })
};

/**
 * Create positive (risk-reducing) factors
 */
export const positiveRiskFactors = {
	trustedUser: (userId: string) =>
		createRiskFactor('trust', 'trusted_user', DEFAULT_RISK_SCORES.trustedUser, { userId }),

	trustedDevice: (deviceId: string) =>
		createRiskFactor('device', 'trusted_device', DEFAULT_RISK_SCORES.trustedDevice, { deviceId }),

	verifiedCaptcha: () =>
		createRiskFactor('captcha', 'verified', DEFAULT_RISK_SCORES.verifiedCaptcha),

	successfulAuth: (userId: string) =>
		createRiskFactor('auth', 'successful', DEFAULT_RISK_SCORES.successfulAuth, { userId })
};

// ============================================
// Risk Level Utilities
// ============================================

/**
 * Get color for risk level (for UI/logging)
 */
export function getRiskLevelColor(level: RiskLevel): string {
	switch (level) {
		case 'critical':
			return '#dc2626'; // red-600
		case 'high':
			return '#ea580c'; // orange-600
		case 'medium':
			return '#ca8a04'; // yellow-600
		case 'low':
			return '#16a34a'; // green-600
	}
}

/**
 * Get numeric weight for risk level (for sorting/comparison)
 */
export function getRiskLevelWeight(level: RiskLevel): number {
	switch (level) {
		case 'critical':
			return 4;
		case 'high':
			return 3;
		case 'medium':
			return 2;
		case 'low':
			return 1;
	}
}

/**
 * Compare two risk levels
 * Returns positive if a > b, negative if a < b, 0 if equal
 */
export function compareRiskLevels(a: RiskLevel, b: RiskLevel): number {
	return getRiskLevelWeight(a) - getRiskLevelWeight(b);
}
