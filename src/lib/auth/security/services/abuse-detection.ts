/**
 * Abuse Detection for Security Services
 *
 * Provides suspicious activity detection and abuse protection configuration.
 * Consolidated from archived abuse-protection plugin.
 */

import { logger, enhancedLogger } from '#lib/auth/shared/logger.js';
import { securityConfig } from '../config';
import { getRedis } from './redis';
import { getClientIp as getSharedClientIp } from '../shared/client-ip';

// ============================================
// Types
// ============================================

export type SecurityLevel = 'low' | 'medium' | 'high';

export interface SuspiciousActivityResult {
	blocked: boolean;
	reason?: string;
	riskScore: number;
	requireCaptcha: boolean;
	securityLevel: SecurityLevel;
	riskFactors?: string[];
}

export interface AbuseProtectionConfig {
	enabled: boolean;
	captcha: {
		enabled: boolean;
		threshold: number;
		bypassDuration: number;
	};
	rateLimit: {
		enabled: boolean;
		windowSeconds: number;
		maxRequests: number;
		riskThreshold: number;
		riskPenalty: number;
	};
	tempBlock: {
		enabled: boolean;
		maxAttempts: number;
		baseDuration: number;
		maxDuration: number;
	};
	riskThresholds: {
		medium: number;
		high: number;
		block: number;
	};
	botDetection: {
		enabled: boolean;
		riskPenalty: number;
	};
	riskReduction: {
		onSuccess: number;
	};
	skipInDevelopment: boolean;
	includePaths: string[];
	excludePaths: string[];
}

// ============================================
// Default Configuration
// ============================================

let cachedConfig: AbuseProtectionConfig | null = null;

function createDefaultConfig(): AbuseProtectionConfig {
	const sc = securityConfig;

	return Object.freeze({
		enabled: true,
		captcha: Object.freeze({
			enabled: true,
			threshold: sc.abuse.mediumRiskThreshold,
			bypassDuration: sc.abuse.captchaBypassSeconds
		}),
		rateLimit: Object.freeze({
			enabled: true,
			windowSeconds: sc.abuse.requestWindowSeconds,
			maxRequests: sc.abuse.maxRequestsBeforeRisk,
			riskThreshold: sc.abuse.maxRequestsBeforeRisk,
			riskPenalty: sc.abuse.highRequestRiskBonus
		}),
		tempBlock: Object.freeze({
			enabled: true,
			maxAttempts: sc.abuse.tempBlockTrigger,
			baseDuration: sc.abuse.tempBlockBase,
			maxDuration: sc.abuse.tempBlockDelayCapMinutes * 60
		}),
		riskThresholds: Object.freeze({
			medium: sc.abuse.mediumRiskThreshold,
			high: sc.abuse.highRiskThreshold,
			block: sc.abuse.maxRiskScore
		}),
		botDetection: Object.freeze({
			enabled: true,
			riskPenalty: sc.abuse.botRiskBonus
		}),
		riskReduction: Object.freeze({
			onSuccess: sc.abuse.trustedUserRiskReduction
		}),
		skipInDevelopment: true,
		includePaths: ['/sign-in', '/sign-up', '/auth', '/api/auth'],
		excludePaths: [
			'/auth/session',
			'/auth/csrf',
			'/api/auth/session',
			'/api/health',
			'/api/metrics'
		]
	}) as AbuseProtectionConfig;
}

/**
 * Get default abuse protection configuration
 */
export function getDefaultConfig(): AbuseProtectionConfig {
	if (!cachedConfig) {
		cachedConfig = createDefaultConfig();
	}
	return cachedConfig;
}

/**
 * Exported as DEFAULT_OPTIONS for backward compatibility
 */
export const DEFAULT_OPTIONS = new Proxy({} as AbuseProtectionConfig, {
	get(_, prop) {
		return getDefaultConfig()[prop as keyof AbuseProtectionConfig];
	}
});

// ============================================
// Helper Functions
// ============================================

const BOT_PATTERN =
	/bot|crawler|spider|scraper|headless|phantom|selenium|automation|puppeteer|playwright|wget|curl|python-requests|node-fetch|axios/i;

const IPV4_REGEX = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;

/**
 * Get client IP from request
 */
export function getClientIp(request: Request): string {
	return getSharedClientIp(request);
}

/**
 * Check if IP is private/internal
 */
export function isPrivateIp(ip: string): boolean {
	if (ip === '::1') return true;
	if (ip === '127.0.0.1' || ip === 'localhost' || ip === '0.0.0.0') return true;
	if (ip.startsWith('192.168.')) return true;
	if (ip.startsWith('10.')) return true;

	if (ip.startsWith('172.')) {
		const match = IPV4_REGEX.exec(ip);
		if (match && match[2]) {
			const second = parseInt(match[2], 10);
			if (second >= 16 && second <= 31) return true;
		}
	}

	return false;
}

/**
 * Determine security level from risk score
 */
export function determineSecurityLevel(
	riskScore: number,
	config: AbuseProtectionConfig
): SecurityLevel {
	const thresholds = config.riskThresholds;

	if (riskScore >= thresholds.high) {
		return 'high';
	}

	if (riskScore >= thresholds.medium) {
		return 'medium';
	}

	return 'low';
}

/**
 * Check if user agent is a bot
 */
function isBotUserAgent(userAgent: string): boolean {
	if (!userAgent) return true;
	return BOT_PATTERN.test(userAgent);
}

/**
 * Check proxy-related headers
 */
function checkProxyHeaders(request: Request): number {
	let risk = 0;
	const headers = request.headers;

	const forwardedFor = headers.get('x-forwarded-for');
	if (forwardedFor) {
		const commaCount = (forwardedFor.match(/,/g) || []).length;
		if (commaCount > 1) {
			risk += 10;
		}
	}

	if (headers.get('via')) {
		risk += 5;
	}

	if (headers.get('x-proxy-id') || headers.get('proxy-connection')) {
		risk += 15;
	}

	return risk;
}

/**
 * Check for suspicious/missing headers
 */
function checkSuspiciousHeaders(request: Request): number {
	let risk = 0;
	const headers = request.headers;

	if (!headers.get('user-agent')) {
		risk += 20;
	}

	if (!headers.get('accept')) {
		risk += 10;
	}

	if (!headers.get('accept-language')) {
		risk += 5;
	}

	return risk;
}

// ============================================
// Main Detection Function
// ============================================

/**
 * Detect suspicious activity for a request
 */
export async function detectSuspiciousActivity(
	request: Request,
	config: AbuseProtectionConfig,
	userId?: string,
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	captchaToken?: string
): Promise<SuspiciousActivityResult> {
	const ip = getClientIp(request);
	const identifier = userId || ip;
	const userAgent = request.headers.get('user-agent') || '';

	// Skip security checks for private/local IPs
	if (isPrivateIp(ip)) {
		enhancedLogger.debug('[Abuse Detection] Skipping security checks for private IP:', { ip });
		return {
			blocked: false,
			riskScore: 0,
			requireCaptcha: false,
			securityLevel: 'low'
		};
	}

	try {
		const storage = await getRedis();

		// Check for temporary blocks
		const blockKey = `temp_block:${identifier}`;
		const isBlocked = await storage.get(blockKey);

		if (isBlocked) {
			return {
				blocked: true,
				reason: 'Temporarily blocked due to suspicious activity',
				riskScore: 100,
				requireCaptcha: false,
				securityLevel: 'high'
			};
		}

		// Calculate risk score from various factors
		let riskScore = 0;
		const riskFactors: string[] = [];

		// Bot detection
		if (config.botDetection?.enabled && isBotUserAgent(userAgent)) {
			riskScore += 30;
			riskFactors.push('bot_user_agent');
			logger.debug('[Abuse Detection] Bot user agent detected', { ip });
		}

		// Header checks
		const proxyRisk = checkProxyHeaders(request);
		if (proxyRisk > 0) {
			riskScore += proxyRisk;
			riskFactors.push('proxy_headers');
		}

		const headerRisk = checkSuspiciousHeaders(request);
		if (headerRisk > 0) {
			riskScore += headerRisk;
			riskFactors.push('suspicious_headers');
		}

		// Check failed attempts
		const failedKey = `failed_attempts:${identifier}`;
		const failedAttempts = parseInt((await storage.get(failedKey)) || '0', 10);

		if (failedAttempts > 5) {
			riskScore += 25;
			riskFactors.push('high_failed_attempts');
		} else if (failedAttempts > 2) {
			riskScore += 10;
			riskFactors.push('failed_attempts');
		}

		// Request frequency tracking is Redis-native (sorted set); skipped on other backends

		// Cap risk score
		riskScore = Math.min(riskScore, 100);

		// Determine security level and CAPTCHA requirement
		const securityLevel = determineSecurityLevel(riskScore, config);
		let requireCaptcha = false;

		const captchaThreshold = config.captcha?.threshold ?? 40;
		if (config.captcha?.enabled && riskScore >= captchaThreshold) {
			requireCaptcha = true;
		}

		// Block if risk is too high
		if (riskScore >= (config.riskThresholds?.block ?? 90)) {
			return {
				blocked: true,
				reason: 'Risk score too high',
				riskScore,
				requireCaptcha: true,
				securityLevel: 'high',
				riskFactors
			};
		}

		return {
			blocked: false,
			riskScore,
			requireCaptcha,
			securityLevel,
			riskFactors
		};
	} catch (error) {
		logger.error('[Abuse Detection] Detection error:', error);

		// Fail open with minimal risk score
		return {
			blocked: false,
			riskScore: 10,
			requireCaptcha: false,
			securityLevel: 'low'
		};
	}
}

/**
 * Clear cached configuration (for testing)
 */
export function clearConfigCache(): void {
	cachedConfig = null;
}
