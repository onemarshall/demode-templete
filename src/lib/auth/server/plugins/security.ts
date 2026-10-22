/**
 * Unified Security Plugin
 *
 * Security plugin configuration with environment-based toggles.
 * Uses the unified securityPlugin instead of 5 separate plugins.
 */

import type { BetterAuthPlugin } from 'better-auth';
import { securityPlugin, type SecurityPluginOptions } from '#lib/auth/security/index.js';
import { logger } from '#lib/auth/shared/logger.js';

// Default configuration constants
const DEFAULTS = {
	thresholds: {
		captcha: 40,
		block: 80
	},
	rateLimit: {
		maxRequests: 100,
		windowSeconds: 60
	},
	blocking: {
		maxFailedAttempts: 3,
		blockDurationSeconds: 3600
	},
	geo: {
		blockedCountries: ['KP', 'IR', 'SY'],
		highRiskCountries: ['NG', 'GH', 'PK', 'RU', 'CN']
	}
} as const;

/**
 * Build security plugins based on environment configuration
 */
export function buildSecurityPlugins(env: Record<string, unknown>): BetterAuthPlugin[] {
	const isDev = env.NODE_ENV === 'development';
	const debugMode = parseBool(env.AUTH_DEBUG_MODE);
	const skipInDev = isDev && debugMode !== false;
	const failMode = isDev ? 'open' : 'closed';

	// Check if security is completely disabled
	const enableSecurity = parseBool(env.AUTH_SECURITY_PLUGIN) ?? !skipInDev;

	if (!enableSecurity) {
		logger.info('[Security] Plugin disabled via environment');
		return [];
	}

	// Build unified security plugin options
	const options: SecurityPluginOptions = {
		enabled: true,
		skipInDevelopment: skipInDev,
		captchaThreshold: DEFAULTS.thresholds.captcha,
		blockThreshold: DEFAULTS.thresholds.block,
		// NOTE: ctx.path in hooks is the Better Auth endpoint path
		// (e.g. '/sign-in/email'), not the '/api/auth/...' URL. Empty
		// includePaths = process all endpoints; excludePaths lists
		// endpoint-relative paths to skip.
		includePaths: [],
		excludePaths: ['/get-session', '/ok', '/error', '/security/', '/delete-user/callback'],

		resilience: {
			failMode,
			circuitBreaker: {
				enabled: true,
				failureThreshold: 5,
				resetTimeoutMs: 30000
			}
		},

		features: {
			// Blocking feature
			blocking: {
				enabled: parseBool(env.AUTH_ABUSE_PROTECTION_PLUGIN) ?? true,
				maxFailedAttempts: DEFAULTS.blocking.maxFailedAttempts,
				blockDurationSeconds: DEFAULTS.blocking.blockDurationSeconds,
				escalatingBlocks: true
			},

			// Rate limiting feature
			rateLimit: {
				enabled: parseBool(env.AUTH_RATE_LIMIT_PLUGIN) ?? true,
				defaultLimit: DEFAULTS.rateLimit,
				// Rate-limit rules match against the request URL pathname
				// (e.g. '/api/auth/sign-in/email'). Trailing '/*' = prefix match.
				rules: [
					{
						id: 'auth-login',
						name: 'Login Rate Limit',
						pathPattern: '/api/auth/sign-in/*',
						methods: ['POST'],
						maxRequests: 5,
						windowSeconds: 60
					},
					{
						id: 'auth-register',
						name: 'Register Rate Limit',
						pathPattern: '/api/auth/sign-up/*',
						methods: ['POST'],
						maxRequests: 3,
						windowSeconds: 300
					},
					{
						id: 'auth-reset',
						name: 'Password Reset Rate Limit',
						pathPattern: '/api/auth/request-password-reset*',
						methods: ['POST'],
						maxRequests: 3,
						windowSeconds: 900
					}
				]
			},

			// CAPTCHA feature
			captcha: {
				enabled: parseBool(env.AUTH_CAPTCHA_ENABLED) ?? true,
				provider: 'capjs',
				secretKey: env.CAP_SECRET as string | undefined,
				endpoint: env.PUBLIC_CAP_ENDPOINT as string | undefined,
				siteKey: env.PUBLIC_CAP_KEY as string | undefined,
				bypassTtlSeconds: 1800
			},

			// Geo intelligence feature
			geo: {
				enabled: parseBool(env.AUTH_GEO_INTELLIGENCE_PLUGIN) ?? true,
				apiKey: env.BIGDATACLOUD_API_KEY as string | undefined,
				blockedCountries: [...DEFAULTS.geo.blockedCountries],
				highRiskCountries: [...DEFAULTS.geo.highRiskCountries],
				enableReputation: true,
				cacheTtlSeconds: 3600
			},

			// Device trust feature
			device: {
				enabled: parseBool(env.AUTH_FRAUD_DETECTION_PLUGIN) ?? true,
				trustAfterSuccessfulAuths: 3,
				trustDurationDays: 30
			},

			// Behavior analysis feature
			behavior: {
				enabled: parseBool(env.AUTH_FRAUD_DETECTION_PLUGIN) ?? true,
				enableBotDetection: true,
				humanScoreThreshold: 30
			}
		}
	};

	const plugin = securityPlugin(options);

	logger.info('[Security] Unified security plugin initialized', {
		skipInDev,
		failMode,
		features: Object.entries(options.features || {})
			.filter(([, v]) => (typeof v === 'boolean' ? v : v?.enabled !== false))
			.map(([k]) => k)
	});

	return [plugin];
}

/**
 * Parse boolean from various formats
 */
function parseBool(value: unknown): boolean | undefined {
	if (typeof value === 'boolean') return value;
	if (typeof value === 'string') {
		const v = value.trim().toLowerCase();
		if (['true', '1', 'yes', 'on'].includes(v)) return true;
		if (['false', '0', 'no', 'off'].includes(v)) return false;
	}
	return undefined;
}

// Re-export unified plugin for direct usage
export { securityPlugin, type SecurityPluginOptions } from '#lib/auth/security/index.js';
