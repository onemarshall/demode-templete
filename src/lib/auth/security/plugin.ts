/**
 * Unified Security Plugin Factory
 *
 * Creates a single Better Auth plugin that consolidates all security features:
 * - Blocking (priority 0)
 * - Rate Limiting (priority 10)
 * - Geo Intelligence (priority 30)
 * - Device Trust (priority 40)
 * - Behavior Analysis (priority 50)
 * - CAPTCHA (priority 60, runs last so it sees accumulated risk)
 *
 * @example
 * ```ts
 * import { betterAuth } from 'better-auth';
 * import { securityPlugin } from '#lib/auth/security/index.js';
 *
 * export const auth = betterAuth({
 *   plugins: [
 *     securityPlugin({
 *       captchaThreshold: 40,
 *       blockThreshold: 80,
 *       features: {
 *         geo: { apiKey: '...' },
 *         captcha: { provider: 'capjs', siteKey: '...' }
 *       }
 *     })
 *   ]
 * });
 * ```
 */

import type { BetterAuthPlugin } from 'better-auth';
import type { SecurityConfig } from './core/feature';
import { createBeforeHook, createAfterHook } from './hooks';
import { createEndpoints } from './endpoints';
import { getEnabledFeatures } from './features';
import { logger } from '#lib/auth/shared/logger.js';
import { setTrustProxy } from './core/helpers';

// Import features to ensure they're registered
import './features';

// ============================================
// Plugin Options
// ============================================

export interface SecurityPluginOptions {
	/** Enable the security plugin (default: true) */
	enabled?: boolean;

	/** Skip security checks in development mode (default: true) */
	skipInDevelopment?: boolean;

	/** Risk score threshold to require CAPTCHA (default: 40) */
	captchaThreshold?: number;

	/** Endpoints that can display CAPTCHA (default: email sign-in and sign-up). */
	captchaPaths?: string[];

	/** Risk score threshold to block request (default: 80) */
	blockThreshold?: number;

	/**
	 * Paths to include for security checks (default: [] = all endpoints).
	 * NOTE: paths are Better Auth endpoint-relative (e.g. '/sign-in/email'),
	 * NOT the external '/api/auth/...' URL path.
	 */
	includePaths?: string[];

	/** Paths to exclude from security checks */
	excludePaths?: string[];

	/** Roles allowed to access admin security endpoints (default: ['admin', 'superadmin']) */
	adminRoles?: string[];

	/**
	 * Controls which IP headers are trusted for client IP extraction.
	 * - 'cloudflare': Only trust CF-Connecting-IP (safest, default)
	 * - 'proxy': Trust X-Forwarded-For, X-Real-IP (use only behind a trusted reverse proxy)
	 * - 'none': Do not trust any IP headers
	 * - string[]: Custom list of trusted header names
	 */
	trustProxy?: 'cloudflare' | 'proxy' | 'none' | string[];

	/** Resilience settings */
	resilience?: {
		/** Fail mode: 'open' continues on errors, 'closed' adds risk (default: 'open') */
		failMode?: 'open' | 'closed';
		/** Circuit breaker for external API calls */
		circuitBreaker?: {
			enabled?: boolean;
			failureThreshold?: number;
			resetTimeoutMs?: number;
		};
	};

	/** Feature-specific configuration */
	features?: {
		/** Blocking feature (check IP/user blocks first) */
		blocking?:
			| boolean
			| {
					enabled?: boolean;
					maxFailedAttempts?: number;
					blockDurationSeconds?: number;
					escalatingBlocks?: boolean;
			  };

		/** Rate limiting feature */
		rateLimit?:
			| boolean
			| {
					enabled?: boolean;
					defaultLimit?: { maxRequests: number; windowSeconds: number };
					rules?: Array<{
						id: string;
						name: string;
						pathPattern: string;
						maxRequests: number;
						windowSeconds: number;
						methods?: string[];
						skipAuthenticated?: boolean;
					}>;
					skipPaths?: string[];
			  };

		/** CAPTCHA feature */
		captcha?:
			| boolean
			| {
					enabled?: boolean;
					provider?: 'capjs' | 'hcaptcha' | 'recaptcha' | 'turnstile';
					/** Base URL of a self-hosted Cap standalone server (capjs provider). */
					endpoint?: string;
					siteKey?: string;
					secretKey?: string;
					bypassTtlSeconds?: number;
			  };

		/** Geo intelligence feature */
		geo?:
			| boolean
			| {
					enabled?: boolean;
					apiKey?: string;
					blockedCountries?: string[];
					allowedCountries?: string[];
					highRiskCountries?: string[];
					enableReputation?: boolean;
					cacheTtlSeconds?: number;
			  };

		/** Device trust feature */
		device?:
			| boolean
			| {
					enabled?: boolean;
					trustAfterSuccessfulAuths?: number;
					trustDurationDays?: number;
			  };

		/** Behavior analysis feature */
		behavior?:
			| boolean
			| {
					enabled?: boolean;
					enableBotDetection?: boolean;
					humanScoreThreshold?: number;
			  };
	};

	/** Callback after successful authentication */
	onAuthSuccess?: (ctx: { userId: string; ip: string; riskScore: number }) => void | Promise<void>;
}

// ============================================
// Default Configuration
// ============================================

const defaultConfig: SecurityConfig = {
	enabled: true,
	skipInDevelopment: true,
	captchaThreshold: 40,
	captchaPaths: ['/sign-in/email', '/sign-up/email'],
	blockThreshold: 80,
	includePaths: [],
	excludePaths: ['/sign-out', '/get-session', '/ok', '/error', '/security/', '/delete-user/callback'],
	resilience: {
		failMode: 'open',
		circuitBreaker: {
			enabled: true,
			failureThreshold: 5,
			resetTimeoutMs: 30000
		}
	}
};

// ============================================
// Plugin Factory
// ============================================

/**
 * Create the unified security plugin
 */
export function securityPlugin(options: SecurityPluginOptions = {}): BetterAuthPlugin {
	// Merge options with defaults
	const config: SecurityConfig = {
		enabled: options.enabled ?? defaultConfig.enabled,
		skipInDevelopment: options.skipInDevelopment ?? defaultConfig.skipInDevelopment,
		captchaThreshold: options.captchaThreshold ?? defaultConfig.captchaThreshold,
		captchaPaths: options.captchaPaths ?? defaultConfig.captchaPaths,
		blockThreshold: options.blockThreshold ?? defaultConfig.blockThreshold,
		includePaths: options.includePaths ?? defaultConfig.includePaths,
		excludePaths: options.excludePaths ?? defaultConfig.excludePaths,
		adminRoles: options.adminRoles ?? ['admin', 'superadmin'],
		trustProxy: options.trustProxy ?? 'cloudflare',
		resilience: {
			failMode: options.resilience?.failMode ?? defaultConfig.resilience!.failMode,
			circuitBreaker: {
				enabled:
					options.resilience?.circuitBreaker?.enabled ??
					defaultConfig.resilience!.circuitBreaker!.enabled,
				failureThreshold:
					options.resilience?.circuitBreaker?.failureThreshold ??
					defaultConfig.resilience!.circuitBreaker!.failureThreshold,
				resetTimeoutMs:
					options.resilience?.circuitBreaker?.resetTimeoutMs ??
					defaultConfig.resilience!.circuitBreaker!.resetTimeoutMs
			}
		},
		features: {
			blocking: options.features?.blocking ?? true,
			rateLimit: options.features?.rateLimit ?? true,
			captcha: options.features?.captcha ?? true,
			geo: options.features?.geo ?? true,
			device: options.features?.device ?? true,
			behavior: options.features?.behavior ?? true
		}
	};

	// Check if plugin is disabled
	if (!config.enabled) {
		logger.info('[Security] Plugin disabled');
		return {
			id: 'security',
			init() {
				// No-op
			}
		};
	}

	// Get enabled features for logging
	const enabledFeatures = getEnabledFeatures(config);
	const featureIds = enabledFeatures.map((f) => f.id);

	// Create hooks
	const beforeHooks = createBeforeHook({ config });

	const afterHooks = createAfterHook({
		config,
		onRequestComplete: options.onAuthSuccess
			? async (ctx) => {
					if (ctx.userId) {
						await options.onAuthSuccess?.({
							userId: ctx.userId,
							ip: ctx.ip,
							riskScore: ctx.riskScore
						});
					}
				}
			: undefined
	});

	// Create endpoints
	const endpoints = createEndpoints(config);

	return {
		id: 'security',

		init() {
			// Configure trusted proxy mode for IP extraction
			if (config.trustProxy) {
				setTrustProxy(config.trustProxy);
			}

			logger.info('[Security] Plugin initialized', {
				features: featureIds,
				captchaThreshold: config.captchaThreshold,
				blockThreshold: config.blockThreshold,
				includePaths: config.includePaths,
				excludePaths: config.excludePaths,
				failMode: config.resilience?.failMode
			});

			// Initialize features that need it
			for (const feature of enabledFeatures) {
				feature.init?.(config).catch((err) => {
					logger.error(`[Security] Feature ${feature.id} init error:`, err);
				});
			}
		},

		hooks: {
			before: beforeHooks,
			after: afterHooks
		},

		endpoints
	} satisfies BetterAuthPlugin;
}

// ============================================
// Type Exports
// ============================================

export type { SecurityConfig } from './core/feature';
