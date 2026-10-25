/**
 * Unified After Hook for Security Plugin
 *
 * Handles post-request processing:
 * - Recording successful authentications
 * - Feature post-processing (device trust, etc.)
 * - Analytics event collection
 */

import { createAuthMiddleware } from 'better-auth/api';
import type { HookEndpointContext } from 'better-auth';
import { securityLogger } from '#lib/platform/logger.js';
import { getSecurityContext, type SecurityContext } from '../core/context';
import { getEnabledFeatures, type SecurityConfig, type SecurityFeature } from '../core/feature';

// ============================================
// Types
// ============================================

export type MatcherContext = HookEndpointContext;

// ============================================
// Path Matching
// ============================================

// ctx.path in hooks is the endpoint-relative path (e.g. '/sign-in/email',
// '/callback/google'), not the external '/api/auth/...' URL.
const AUTH_SUCCESS_PATHS = [
	'/sign-in',
	'/sign-up',
	'/callback',
	'/verify-email',
	'/magic-link/verify',
	'/email-otp/verify-email',
	'/one-tap/callback',
	'/passkey/verify-authentication',
	'/phone-number/verify',
	'/siwe/verify',
	'/api/auth/sign-in',
	'/api/auth/sign-up',
	'/api/auth/callback'
];

function isAuthSuccessPath(path: string): boolean {
	for (const authPath of AUTH_SUCCESS_PATHS) {
		if (path.startsWith(authPath)) {
			return true;
		}
	}
	return false;
}

// ============================================
// Feature Recording
// ============================================

async function runFeatureRecording(
	features: SecurityFeature[],
	ctx: SecurityContext,
	config: SecurityConfig
): Promise<void> {
	for (const feature of features) {
		if (!feature.record) {
			continue;
		}

		try {
			await feature.record(ctx, config);
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : String(error);

			securityLogger.error(`[Security] Feature ${feature.id} record error`, {
				featureId: feature.id,
				error: errorMessage
			});

			ctx.emit('feature_error', {
				featureId: feature.id,
				phase: 'record',
				error: errorMessage
			});
		}
	}
}

// ============================================
// After Hook Factory
// ============================================

export interface CreateAfterHookOptions {
	config: SecurityConfig;
	features?: SecurityFeature[];
	onRequestComplete?: (ctx: SecurityContext) => void | Promise<void>;
}

export function createAfterHook(options: CreateAfterHookOptions) {
	const { config, onRequestComplete } = options;

	if (!config.enabled) {
		return [];
	}

	const features = options.features ?? getEnabledFeatures(config);

	return [
		{
			matcher: (context: HookEndpointContext) => {
				// Sign-in/sign-up endpoints set context.newSession (via
				// setSessionCookie); context.session is only populated by
				// sessionMiddleware. Accept either.
				const authContext = context.context as unknown as
					| {
							session?: { user?: { id: string } } | null;
							newSession?: { user?: { id: string } } | null;
					  }
					| undefined;

				if (!authContext?.session?.user && !authContext?.newSession?.user) {
					return false;
				}

				return isAuthSuccessPath(context.path ?? '');
			},

			handler: createAuthMiddleware(async (ctx) => {
				const securityCtx = getSecurityContext(ctx);

				if (!securityCtx) {
					return { context: ctx };
				}

				try {
					const authContext = ctx.context as unknown as
						| {
								session?: { user?: { id: string } } | null;
								newSession?: { user?: { id: string } } | null;
						  }
						| undefined;

					const authedUserId = authContext?.newSession?.user?.id ?? authContext?.session?.user?.id;

					if (authedUserId) {
						securityCtx.userId = authedUserId;

						await runFeatureRecording(features, securityCtx, config);

						securityCtx.emit('request_complete', {
							userId: securityCtx.userId,
							riskScore: securityCtx.riskScore,
							riskLevel: securityCtx.riskLevel,
							blocked: securityCtx.blocked,
							captchaRequired: securityCtx.captchaRequired,
							eventCount: securityCtx.events.length
						});

						if (onRequestComplete) {
							try {
								await onRequestComplete(securityCtx);
							} catch (error) {
								securityLogger.error('[Security] onRequestComplete callback error', { error });
							}
						}

						securityLogger.debug('[Security] Auth success recorded', {
							userId: securityCtx.userId,
							riskScore: securityCtx.riskScore,
							path: securityCtx.path
						});
					}

					return { context: ctx };
				} catch (error) {
					securityLogger.error('[Security] After hook error', { error });
					return { context: ctx };
				}
			})
		}
	];
}

export { isAuthSuccessPath };
