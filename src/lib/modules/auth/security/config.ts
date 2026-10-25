/**
 * Security Configuration (Optimized)
 *
 * Centralized configuration for all security plugins with sensible defaults.
 * Values can be overridden via environment variables in production.
 *
 * Performance optimizations:
 * - All config objects are frozen (immutable)
 * - Pre-computed lookup tables for common calculations
 * - Memoized temp block delay calculations
 */

import { getServerEnvSync } from '#lib/platform/config/server.server.js';
import {
	getRiskLevel as coreGetRiskLevel,
	shouldBlock as coreShouldBlock,
	shouldRequireCaptcha as coreShouldRequireCaptcha
} from './core/risk-engine';

// ============================================
// Type Definitions
// ============================================

export interface AbuseConfig {
	readonly requestWindowSeconds: number;
	readonly maxRequestsBeforeRisk: number;
	readonly highRequestRiskBonus: number;
	readonly botRiskBonus: number;
	readonly failedAttemptsRiskThreshold: number;
	readonly failedAttemptsRiskBonus: number;
	readonly captchaFailuresRiskThreshold: number;
	readonly captchaFailureRiskBonus: number;
	readonly captchaRequiredFailedAttempts: number;
	readonly captchaPenaltyForFailure: number;
	readonly captchaSuccessRiskReduction: number;
	readonly captchaBypassSeconds: number;
	readonly highRiskThreshold: number;
	readonly mediumRiskThreshold: number;
	readonly newUserRiskThreshold: number;
	readonly tempBlockTrigger: number;
	readonly tempBlockBase: number;
	readonly tempBlockDelayCapMinutes: number;
	readonly trustedUserRiskReduction: number;
	readonly failedAttemptPenalty: number;
	readonly maxRiskScore: number;
}

export interface FraudConfig {
	readonly riskThresholds: Readonly<{
		low: number;
		medium: number;
		high: number;
	}>;
	readonly captchaThreshold: number;
	readonly blockThreshold: number;
	readonly trustDecayRate: number;
	readonly sessionTimeoutMinutes: number;
}

export interface IPReputationConfig {
	readonly vpnPenalty: number;
	readonly torPenalty: number;
	readonly proxyPenalty: number;
	readonly maliciousPenalty: number;
	readonly datacenterPenalty: number;
	readonly cacheTtlSeconds: number;
}

export interface GeoConfig {
	readonly highRiskCountryPenalty: number;
	readonly newCountryPenalty: number;
	readonly rapidCountryChangePenalty: number;
	readonly locationHistoryDays: number;
	readonly maxLocationHistory: number;
	readonly cacheTtlHours: number;
	readonly trustThreshold: number;
}

export interface DeviceConfig {
	readonly newDevicePenalty: number;
	readonly automationPenalty: number;
	readonly headlessBrowserPenalty: number;
	readonly unusualScreenPenalty: number;
	readonly noPluginsPenalty: number;
	readonly unusualUserAgentPenalty: number;
	readonly missingTimezonePenalty: number;
	readonly unusualHardwarePenalty: number;
	readonly deviceCacheDays: number;
	readonly trustedDeviceThreshold: number;
}

export interface BehaviorConfig {
	readonly botBehaviorPenalty: number;
	readonly lowHumanScorePenalty: number;
	readonly rapidRequestsPenalty: number;
	readonly unusualTimingPenalty: number;
	readonly rapidPageBrowsingPenalty: number;
	readonly noInteractionPenalty: number;
	readonly excessiveInteractionPenalty: number;
	readonly mechanicalTimingPenalty: number;
	readonly rapidRequestThreshold: number;
	readonly humanScoreThreshold: number;
}

export interface AnalyticsEventStoreConfig {
	readonly provider: 'memory' | 'redis';
	readonly redis?: Readonly<{
		keyPrefix: string;
		maxEvents: number;
		redisName: string;
	}>;
}

export interface SecurityConfig {
	readonly abuse: AbuseConfig;
	readonly fraud: FraudConfig;
	readonly ipReputation: IPReputationConfig;
	readonly geo: GeoConfig;
	readonly device: DeviceConfig;
	readonly behavior: BehaviorConfig;
	readonly analyticsEventStore: AnalyticsEventStoreConfig;
}

// ============================================
// Environment Overrides (server-only, lazy-loaded)
// ============================================

let _serverEnv: ReturnType<typeof getServerEnvSync> | null = null;

function getEnv() {
	if (!_serverEnv) {
		_serverEnv = getServerEnvSync();
	}
	return _serverEnv;
}

// ============================================
// Frozen Configuration Objects
// ============================================

const abuseConfig: AbuseConfig = Object.freeze({
	requestWindowSeconds: 300,
	maxRequestsBeforeRisk: 100,
	highRequestRiskBonus: 40,
	botRiskBonus: 30,
	failedAttemptsRiskThreshold: 5,
	failedAttemptsRiskBonus: 25,
	captchaFailuresRiskThreshold: 2,
	captchaFailureRiskBonus: 20,
	captchaRequiredFailedAttempts: 2,
	captchaPenaltyForFailure: 15,
	captchaSuccessRiskReduction: 10,
	captchaBypassSeconds: 1800,
	highRiskThreshold: 70,
	mediumRiskThreshold: 40,
	newUserRiskThreshold: 25,
	tempBlockTrigger: 3,
	tempBlockBase: 2,
	tempBlockDelayCapMinutes: 60,
	trustedUserRiskReduction: 30,
	failedAttemptPenalty: 15,
	maxRiskScore: 100
});

const fraudConfig: FraudConfig = Object.freeze({
	riskThresholds: Object.freeze({
		low: 25,
		medium: 50,
		high: 75
	}),
	captchaThreshold: 40,
	blockThreshold: 80,
	trustDecayRate: 0.1,
	sessionTimeoutMinutes: 30
});

const ipReputationConfig: IPReputationConfig = Object.freeze({
	vpnPenalty: 20,
	torPenalty: 35,
	proxyPenalty: 10,
	maliciousPenalty: 50,
	datacenterPenalty: 15,
	cacheTtlSeconds: 3600 // 1 hour
});

const geoConfig: GeoConfig = Object.freeze({
	highRiskCountryPenalty: 20,
	newCountryPenalty: 20,
	rapidCountryChangePenalty: 15,
	locationHistoryDays: 7,
	maxLocationHistory: 5,
	cacheTtlHours: 4,
	trustThreshold: 20
});

const deviceConfig: DeviceConfig = Object.freeze({
	newDevicePenalty: 20,
	automationPenalty: 50,
	headlessBrowserPenalty: 40,
	unusualScreenPenalty: 10,
	noPluginsPenalty: 5,
	unusualUserAgentPenalty: 10,
	missingTimezonePenalty: 5,
	unusualHardwarePenalty: 15,
	deviceCacheDays: 30,
	trustedDeviceThreshold: 70
});

const behaviorConfig: BehaviorConfig = Object.freeze({
	botBehaviorPenalty: 40,
	lowHumanScorePenalty: 15,
	rapidRequestsPenalty: 20,
	unusualTimingPenalty: 20,
	rapidPageBrowsingPenalty: 15,
	noInteractionPenalty: 25,
	excessiveInteractionPenalty: 10,
	mechanicalTimingPenalty: 20,
	rapidRequestThreshold: 10,
	humanScoreThreshold: 60
});

function buildAnalyticsEventStoreConfig(): AnalyticsEventStoreConfig {
	const env = getEnv();
	const provider: AnalyticsEventStoreConfig['provider'] =
		env.SECURITY_ANALYTICS_STORE_PROVIDER === 'memory' ? 'memory' : 'redis';

	return Object.freeze({
		provider,
		redis:
			provider === 'redis'
				? Object.freeze({
						keyPrefix: String(env.SECURITY_ANALYTICS_REDIS_KEY_PREFIX),
						maxEvents: Number(env.SECURITY_ANALYTICS_REDIS_MAX_EVENTS),
						redisName: String(env.SECURITY_ANALYTICS_REDIS_NAME)
					})
				: undefined
	});
}

let _analyticsEventStoreConfig: AnalyticsEventStoreConfig | null = null;

function getAnalyticsEventStoreConfig(): AnalyticsEventStoreConfig {
	if (!_analyticsEventStoreConfig) {
		_analyticsEventStoreConfig = buildAnalyticsEventStoreConfig();
	}
	return _analyticsEventStoreConfig;
}

export const securityConfig: SecurityConfig = Object.freeze({
	abuse: abuseConfig,
	fraud: fraudConfig,
	ipReputation: ipReputationConfig,
	geo: geoConfig,
	device: deviceConfig,
	behavior: behaviorConfig,
	get analyticsEventStore() {
		return getAnalyticsEventStoreConfig();
	}
});

// ============================================
// Pre-computed Temp Block Delays
// ============================================

// Pre-compute common temp block delays (for fail counts 0-20)
const TEMP_BLOCK_DELAY_CACHE: readonly number[] = Object.freeze(
	Array.from({ length: 21 }, (_, failCount) => {
		const exponent = Math.max(failCount - abuseConfig.tempBlockTrigger, 0);
		return Math.min(
			Math.pow(abuseConfig.tempBlockBase, exponent),
			abuseConfig.tempBlockDelayCapMinutes
		);
	})
);

/**
 * Get temp block delay in minutes for a given fail count (optimized)
 */
export const getTempBlockDelayMinutes = (failCount: number): number => {
	const safeCount = Math.max(0, failCount);

	// Use pre-computed value if available
	if (safeCount < TEMP_BLOCK_DELAY_CACHE.length) {
		return TEMP_BLOCK_DELAY_CACHE[safeCount]!;
	}

	// Fall back to calculation for high fail counts
	const exponent = Math.max(safeCount - abuseConfig.tempBlockTrigger, 0);
	return Math.min(
		Math.pow(abuseConfig.tempBlockBase, exponent),
		abuseConfig.tempBlockDelayCapMinutes
	);
};

// ============================================
// Utility Functions
// ============================================

/**
 * Get risk level from score
 * Delegates to the canonical risk-engine implementation
 */
export const getRiskLevel = (score: number): 'low' | 'medium' | 'high' | 'critical' => {
	return coreGetRiskLevel(score);
};

/**
 * Check if score requires captcha
 * Delegates to the canonical risk-engine implementation
 */
export const requiresCaptcha = (score: number): boolean => {
	return coreShouldRequireCaptcha(score, {
		captchaThreshold: fraudConfig.captchaThreshold,
		blockThreshold: fraudConfig.blockThreshold
	});
};

/**
 * Check if score should block
 * Delegates to the canonical risk-engine implementation
 */
export const shouldBlock = (score: number): boolean => {
	return coreShouldBlock(score, {
		captchaThreshold: fraudConfig.captchaThreshold,
		blockThreshold: fraudConfig.blockThreshold
	});
};

/**
 * Clamp risk score to valid range
 */
export const clampRiskScore = (score: number): number => {
	return Math.max(0, Math.min(abuseConfig.maxRiskScore, Math.round(score)));
};

/**
 * Get all penalties for IP reputation type
 */
export const getIPReputationPenalty = (
	type: 'vpn' | 'tor' | 'proxy' | 'malicious' | 'datacenter'
): number => {
	switch (type) {
		case 'vpn':
			return ipReputationConfig.vpnPenalty;
		case 'tor':
			return ipReputationConfig.torPenalty;
		case 'proxy':
			return ipReputationConfig.proxyPenalty;
		case 'malicious':
			return ipReputationConfig.maliciousPenalty;
		case 'datacenter':
			return ipReputationConfig.datacenterPenalty;
		default:
			return 0;
	}
};

/**
 * Calculate total IP reputation penalty
 */
export const calculateIPReputationPenalty = (reputation: {
	isVpn?: boolean;
	isTor?: boolean;
	isProxy?: boolean;
	isMalicious?: boolean;
	isDatacenter?: boolean;
}): number => {
	let penalty = 0;
	if (reputation.isVpn) penalty += ipReputationConfig.vpnPenalty;
	if (reputation.isTor) penalty += ipReputationConfig.torPenalty;
	if (reputation.isProxy) penalty += ipReputationConfig.proxyPenalty;
	if (reputation.isMalicious) penalty += ipReputationConfig.maliciousPenalty;
	if (reputation.isDatacenter) penalty += ipReputationConfig.datacenterPenalty;
	return penalty;
};

// ============================================
// Redis Key Prefixes
// ============================================

/**
 * Redis key patterns used across security features
 */
export const REDIS_KEY_PREFIXES = Object.freeze({
	ABUSE: 'abuse_protection:',
	FRAUD: 'fraud_detection:',
	GEO: 'geo_intelligence:',
	RATE_LIMIT: 'rate_limit:',
	ANALYTICS: 'security_analytics:',
	SESSION: 'session:',
	DEVICE: 'device:',
	IP: 'ip:',
	ALERT: 'alert:',
	BLOCK: 'block:',
	SECURITY: 'security:'
} as const);
