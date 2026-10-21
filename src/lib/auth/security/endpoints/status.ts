/**
 * Security Status Endpoint
 *
 * Returns current security status for the requesting client.
 * Used by client-side code to determine if CAPTCHA is required, etc.
 */

import { createAuthEndpoint } from 'better-auth/api';
import { createSecurityContext } from '../core/context';
import { calculateRiskScore, getRiskLevel } from '../core/risk-engine';
import { getEnabledFeatures, type SecurityConfig } from '../core/feature';

// ============================================
// Types
// ============================================

export interface SecurityStatusResponse {
	allowed: boolean;
	captchaRequired: boolean;
	retryAfter?: number;
}

// ============================================
// Disabled Response
// ============================================

const DISABLED_STATUS_RESPONSE: SecurityStatusResponse = {
	allowed: true,
	captchaRequired: false
};

// ============================================
// Endpoint Factory
// ============================================

export function createStatusEndpoint(config: SecurityConfig) {
	return createAuthEndpoint(
		'/security/status',
		{
			method: 'GET'
		},
		async (ctx) => {
			if (!config.enabled) {
				return ctx.json(DISABLED_STATUS_RESPONSE);
			}

			const request = ctx.request;
			if (!request) {
				return ctx.json({ error: 'Invalid request' }, { status: 400 });
			}

			try {
				const securityCtx = createSecurityContext(request);
				const features = getEnabledFeatures(config);

				for (const feature of features) {
					if (!feature.check) continue;

					try {
						const result = await feature.check(securityCtx, config);
						if (result?.riskFactors) {
							securityCtx.riskFactors.push(...result.riskFactors);
						}
						if (result?.block) {
							securityCtx.blocked = true;
							securityCtx.blockReason = result.blockReason;
							break;
						}
					} catch {
						// Fail open - continue to next feature
					}
				}

				securityCtx.riskScore = calculateRiskScore(securityCtx.riskFactors);
				securityCtx.riskLevel = getRiskLevel(securityCtx.riskScore);

				const captchaRequired =
					securityCtx.riskScore >= config.captchaThreshold &&
					securityCtx.riskScore < config.blockThreshold &&
					!securityCtx.captchaPassed;

				// SECURITY: Only expose minimal info to the client.
				// Do NOT leak riskScore, riskLevel, blockReason — these are probing vectors.
				const response: SecurityStatusResponse = {
					allowed: !securityCtx.blocked && !securityCtx.rateLimited,
					captchaRequired,
					retryAfter: securityCtx.rateLimitInfo?.retryAfter
				};

				return ctx.json(response);
			} catch {
				return ctx.json({ error: 'Status check failed' }, { status: 500 });
			}
		}
	);
}
