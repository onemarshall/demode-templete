/**
 * Behavior Security Feature
 *
 * Implements SecurityFeature interface for behavior analysis and bot detection.
 * Priority: 50 (runs last - most expensive)
 *
 * CRITICAL FIX: Reduced suspicious header false positives
 */

import type { SecurityFeature, SecurityConfig, FeatureResult } from '../../core/feature';
import type { SecurityContext } from '../../core/context';
import type { BehaviorFeatureConfig, SuspiciousHeaderCheck } from './types';
import { FEATURE_PRIORITY } from '../../core/feature';
import { logger } from '#lib/platform/logger.js';
import { createRiskFactor } from '../../core/risk-engine';

export const behaviorFeature: SecurityFeature = {
	id: 'behavior',
	name: 'Behavior Analysis',
	priority: FEATURE_PRIORITY.BEHAVIOR,
	configKey: 'behavior',

	async check(ctx: SecurityContext, config: SecurityConfig): Promise<FeatureResult | null> {
		const featureConfig = getBehaviorConfig(config);

		if (!featureConfig.enabled) {
			return null;
		}

		const riskFactors = [];
		const warnings: string[] = [];

		// Check for suspicious headers (reduced false positives)
		if (featureConfig.enableBotDetection !== false) {
			const headerCheck = checkSuspiciousHeaders(ctx, featureConfig);

			if (headerCheck.suspicious) {
				const penalty = featureConfig.suspiciousHeaderPenalty ?? 10;
				riskFactors.push(
					createRiskFactor('behavior', 'suspicious_headers', penalty, {
						reasons: headerCheck.reasons
					})
				);

				warnings.push(...headerCheck.reasons);
			}
		}

		// Check user agent anomalies
		const uaCheck = checkUserAgentAnomalies(ctx.userAgent);
		if (uaCheck.suspicious) {
			riskFactors.push(
				createRiskFactor('behavior', 'ua_anomaly', uaCheck.score, {
					reasons: uaCheck.reasons
				})
			);
		}

		if (riskFactors.length > 0) {
			logger.debug('[Behavior] Risk factors detected', {
				requestId: ctx.requestId,
				factors: riskFactors.map((f) => f.factor)
			});
		}

		return {
			riskFactors,
			warnings: warnings.length > 0 ? warnings : undefined
		};
	}
};

/**
 * Check for suspicious request headers
 *
 * CRITICAL FIX: Reduced false positive rate by:
 * 1. Only flagging truly suspicious patterns
 * 2. Ignoring common legitimate variations
 * 3. Requiring multiple indicators for high scores
 */
function checkSuspiciousHeaders(
	ctx: SecurityContext,
	_config: BehaviorFeatureConfig
): SuspiciousHeaderCheck {
	const reasons: string[] = [];
	let score = 0;

	// Missing User-Agent is suspicious
	if (!ctx.userAgent || ctx.userAgent.length < 10) {
		reasons.push('missing_or_short_user_agent');
		score += 15;
	}

	// Check for known bot patterns (be conservative)
	const botPatterns = [
		/^curl\//i,
		/^wget\//i,
		/^python-requests/i,
		/^Go-http-client/i,
		/^Java\//i,
		/^axios\//i
	];

	for (const pattern of botPatterns) {
		if (pattern.test(ctx.userAgent)) {
			reasons.push('programmatic_client');
			score += 10;
			break;
		}
	}

	// Very old browser versions are suspicious (but allow reasonable versions)
	// CRITICAL FIX: Only flag truly ancient browsers, not just older versions
	const ancientBrowserPatterns = [
		/MSIE [1-6]\./i, // IE 6 and below
		/Chrome\/[1-3][0-9]\./i, // Chrome < 40
		/Firefox\/[1-3][0-9]\./i // Firefox < 40
	];

	for (const pattern of ancientBrowserPatterns) {
		if (pattern.test(ctx.userAgent)) {
			reasons.push('ancient_browser');
			score += 5;
			break;
		}
	}

	// CRITICAL FIX: Removed overly aggressive checks that caused false positives:
	// - Accept-Language missing (many legitimate clients don't send this)
	// - Accept header variations (too many false positives)
	// - Connection header checks (proxies modify these)

	return {
		suspicious: score >= 15, // Raised threshold to reduce false positives
		reasons,
		score
	};
}

/**
 * Check for user agent anomalies
 */
function checkUserAgentAnomalies(userAgent: string): SuspiciousHeaderCheck {
	const reasons: string[] = [];
	let score = 0;

	if (!userAgent) {
		return { suspicious: false, reasons: [], score: 0 };
	}

	// Check for impossible combinations
	if (userAgent.includes('Windows') && userAgent.includes('Macintosh')) {
		reasons.push('impossible_os_combination');
		score += 20;
	}

	// Check for truncated user agents
	if (userAgent.length > 10 && userAgent.length < 50) {
		// Very short but not empty - might be truncated or fake
		if (!userAgent.includes('Mozilla') && !userAgent.includes('Opera')) {
			reasons.push('possibly_truncated');
			score += 5;
		}
	}

	// Check for obviously fake user agents
	if (/^[a-zA-Z]{1,10}$/.test(userAgent)) {
		reasons.push('fake_user_agent');
		score += 25;
	}

	return {
		suspicious: score >= 15,
		reasons,
		score
	};
}

/**
 * Extract behavior config from security config
 */
function getBehaviorConfig(config: SecurityConfig): BehaviorFeatureConfig & { enabled: boolean } {
	const featureConfig = config.features?.behavior;

	if (typeof featureConfig === 'boolean') {
		return { enabled: featureConfig };
	}

	if (featureConfig && typeof featureConfig === 'object') {
		return { enabled: featureConfig.enabled !== false, ...featureConfig };
	}

	return { enabled: true };
}

export * from './types';
