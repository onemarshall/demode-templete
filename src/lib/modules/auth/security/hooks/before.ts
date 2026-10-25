/**
 * Unified Before Hook for Security Plugin
 *
 * Coordinates all security features in priority order with:
 * - Partial failure handling (fail-open by default)
 * - Event emission for analytics
 * - Risk score accumulation
 */

import { createAuthMiddleware, getSessionFromCtx } from 'better-auth/api';
import type { HookEndpointContext } from 'better-auth';
import { securityLogger } from '#lib/platform/logger.js';
import {
	createSecurityContext,
	attachSecurityContext,
	type SecurityContext
} from '../core/context';
import {
	calculateRiskScore,
	getRiskLevel,
	shouldBlock,
	shouldRequireCaptcha,
	type RiskThresholds
} from '../core/risk-engine';
import {
	getEnabledFeatures,
	isFeatureEnabled,
	type SecurityConfig,
	type SecurityFeature,
	type FeatureResult
} from '../core/feature';
import { shouldProcessPath, isDevelopment } from '../core/helpers';
import { securityLogger as beforeHookLogger } from '#lib/platform/logger.js';

// ============================================
// Types
// ============================================

export type MatcherContext = HookEndpointContext;

// ============================================
// Response Factories
// ============================================

const BLOCKED_RESPONSE_BASE = {
	error: 'Request blocked due to security policy',
	code: 'BLOCKED'
};

const CAPTCHA_REQUIRED_RESPONSE_BASE = {
	error: 'Security verification required',
	code: 'CAPTCHA_REQUIRED'
};

const RATE_LIMITED_RESPONSE_BASE = {
	error: 'Too many requests. Please slow down.',
	code: 'RATE_LIMITED'
};

function createBlockedResponse(
	ctx: SecurityContext,
	reason?: string,
	retryAfter?: number
): Response {
	const body = {
		...BLOCKED_RESPONSE_BASE,
		reason: reason ?? ctx.blockReason
	};

	const headers: Record<string, string> = {
		'Content-Type': 'application/json'
	};

	if (retryAfter) {
		headers['Retry-After'] = String(retryAfter);
	}

	return new Response(JSON.stringify(body), {
		status: 403,
		headers
	});
}

function createCaptchaRequiredResponse(): Response {
	const body = {
		...CAPTCHA_REQUIRED_RESPONSE_BASE,
		captchaRequired: true
	};

	return new Response(JSON.stringify(body), {
		status: 428,
		headers: { 'Content-Type': 'application/json' }
	});
}

function createRateLimitedResponse(retryAfter: number): Response {
	const body = {
		...RATE_LIMITED_RESPONSE_BASE,
		retryAfter
	};

	return new Response(JSON.stringify(body), {
		status: 429,
		headers: {
			'Content-Type': 'application/json',
			'Retry-After': String(retryAfter)
		}
	});
}

// ============================================
// Feature Execution
// ============================================

interface FeatureExecutionResult {
	blocked: boolean;
	blockResponse?: Response;
	warnings: string[];
}

async function executeFeature(
	feature: SecurityFeature,
	ctx: SecurityContext,
	config: SecurityConfig,
	failMode: 'open' | 'closed'
): Promise<FeatureResult | null> {
	if (!feature.check) {
		return null;
	}

	try {
		const result = await feature.check(ctx, config);
		return result;
	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : String(error);

		securityLogger.error(`[Security] Feature ${feature.id} error`, {
			featureId: feature.id,
			error: errorMessage
		});

		ctx.emit('feature_error', {
			featureId: feature.id,
			error: errorMessage
		});

		if (failMode === 'closed') {
			ctx.riskFactors.push({
				source: feature.id,
				factor: 'feature_error',
				score: 10,
				details: { error: errorMessage }
			});
		}

		return null;
	}
}

async function runFeatures(
	features: SecurityFeature[],
	ctx: SecurityContext,
	config: SecurityConfig
): Promise<FeatureExecutionResult> {
	const failMode = config.resilience?.failMode ?? 'open';
	const warnings: string[] = [];

	for (const feature of features) {
		const result = await executeFeature(feature, ctx, config, failMode);

		if (!result) {
			continue;
		}

		if (result.riskFactors) {
			ctx.riskFactors.push(...result.riskFactors);
			// Keep riskScore current so later features (e.g. CAPTCHA) can
			// react to risk accumulated by earlier features in this pass.
			ctx.riskScore = calculateRiskScore(ctx.riskFactors);
			ctx.riskLevel = getRiskLevel(ctx.riskScore);
		}

		if (result.warnings) {
			warnings.push(...result.warnings);
			for (const warning of result.warnings) {
				ctx.emit('feature_warning', { featureId: feature.id, warning });
			}
		}

		if (result.block) {
			ctx.blocked = true;
			ctx.blockReason = result.blockReason;

			ctx.emit('blocked', {
				featureId: feature.id,
				reason: result.blockReason
			});

			return {
				blocked: true,
				blockResponse: result.blockResponse,
				warnings
			};
		}
	}

	return { blocked: false, warnings };
}

// ============================================
// Before Hook Factory
// ============================================

export interface CreateBeforeHookOptions {
	config: SecurityConfig;
	features?: SecurityFeature[];
}

export function createBeforeHook(options: CreateBeforeHookOptions) {
	const { config } = options;

	if (!config.enabled) {
		return [];
	}

	const features = options.features ?? getEnabledFeatures(config);

	const thresholds: RiskThresholds = {
		captchaThreshold: config.captchaThreshold,
		blockThreshold: config.blockThreshold
	};

	return [
		{
			matcher: (context: HookEndpointContext) => {
				return shouldProcessPath(context.path ?? '', {
					includePaths: config.includePaths,
					excludePaths: config.excludePaths
				});
			},

			handler: createAuthMiddleware(async (ctx) => {
				if (config.skipInDevelopment && isDevelopment()) {
					// SECURITY: Double-check — never skip if NODE_ENV is explicitly 'production'
					if (typeof process !== 'undefined' && process.env?.NODE_ENV === 'production') {
						beforeHookLogger.error(
							'[Security] CRITICAL: skipInDevelopment is true but NODE_ENV is production. ' +
								'Security will NOT be skipped. Check your environment configuration.'
						);
					} else {
						return { context: ctx };
					}
				}

				const request = ctx.request;
				if (!request) {
					return { context: ctx };
				}

				const securityCtx = createSecurityContext(request);

				// Resolve the session explicitly — ctx.context.session is only
				// populated for endpoints that declare use: [sessionMiddleware],
				// which sign-in/sign-up endpoints do not.
				try {
					const session = await getSessionFromCtx(ctx);
					const sessionUser = session?.user as
						| { id?: string; role?: string | string[] }
						| undefined;
					if (sessionUser?.id) {
						securityCtx.userId = sessionUser.id;
						const role = sessionUser.role;
						securityCtx.userRoles = Array.isArray(role)
							? role
							: typeof role === 'string'
								? role
										.split(',')
										.map((r) => r.trim())
										.filter(Boolean)
								: undefined;
					}
					if (session?.session?.id) {
						securityCtx.sessionId = session.session.id;
					}
				} catch {
					// Session resolution is best-effort — proceed unauthenticated
				}

				// Only issue challenges on endpoints whose forms can present and
				// complete them. Keep other security features on all matched paths.
				const captchaApplies = isFeatureEnabled('captcha', config) &&
					(config.captchaPaths === undefined || config.captchaPaths.includes(ctx.path ?? ''));
				const requestFeatures = captchaApplies
					? features
					: features.filter((feature) => feature.configKey !== 'captcha');
				const executionResult = await runFeatures(requestFeatures, securityCtx, config);

				if (executionResult.blocked) {
					const response =
						executionResult.blockResponse ??
						createBlockedResponse(securityCtx, securityCtx.blockReason);

					// A context update does not stop Better Auth's endpoint dispatch.
					return response;
				}

				securityCtx.riskScore = calculateRiskScore(securityCtx.riskFactors);
				securityCtx.riskLevel = getRiskLevel(securityCtx.riskScore);

				if (securityCtx.riskScore > 0) {
					securityCtx.emit('risk_elevated', {
						score: securityCtx.riskScore,
						level: securityCtx.riskLevel,
						factorCount: securityCtx.riskFactors.length
					});
				}

				if (shouldBlock(securityCtx.riskScore, thresholds)) {
					securityCtx.blocked = true;
					securityCtx.blockReason = 'high_risk_score';

					securityCtx.emit('blocked', {
						featureId: 'risk-engine',
						reason: 'high_risk_score',
						score: securityCtx.riskScore
					});

					securityLogger.warn('[Security] Request blocked due to high risk score', {
						ip: securityCtx.ip,
						riskScore: securityCtx.riskScore,
						riskLevel: securityCtx.riskLevel,
						factors: securityCtx.riskFactors.map((f) => f.factor)
					});

					return createBlockedResponse(securityCtx, 'high_risk_score');
				}

				if (captchaApplies && shouldRequireCaptcha(securityCtx.riskScore, thresholds) && !securityCtx.captchaPassed) {
					securityCtx.captchaRequired = true;

					securityCtx.emit('captcha_required', {
						score: securityCtx.riskScore,
						level: securityCtx.riskLevel
					});

					securityLogger.info('[Security] CAPTCHA required due to elevated risk', {
						ip: securityCtx.ip,
						riskScore: securityCtx.riskScore,
						riskLevel: securityCtx.riskLevel
					});

					return createCaptchaRequiredResponse();
				}

				if (securityCtx.rateLimited && securityCtx.rateLimitInfo) {
					securityCtx.emit('rate_limited', {
						retryAfter: securityCtx.rateLimitInfo.retryAfter
					});

					return createRateLimitedResponse(securityCtx.rateLimitInfo.retryAfter ?? 60);
				}

				attachSecurityContext(ctx, securityCtx);

				return { context: ctx };
			})
		}
	];
}

export { createBlockedResponse, createCaptchaRequiredResponse, createRateLimitedResponse };
