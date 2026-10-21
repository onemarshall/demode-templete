/**
 * Environment Variable Validation Schemas (Optimized)
 *
 * Provides comprehensive validation for all environment variables with clear error messages.
 *
 * Optimizations:
 * - Cached boolean parse values (Set lookup vs array iteration)
 * - DRY schema definitions for repeated patterns
 * - Reduced object allocations in hot paths
 * - Pre-computed sensitive keys Set
 */

import { z } from 'zod';

// ============================================
// Constants (Pre-computed at module load)
// ============================================

/** Truthy string values for boolean parsing */
const TRUTHY_VALUES = new Set(['true', '1', 'yes', 'on']);

/** Sensitive keys that should be redacted (Set for O(1) lookup) */
const SENSITIVE_KEYS = new Set([
	'BETTER_AUTH_SECRET',
	'OAUTH_PROXY_SECRET',
	'BETTER_DATABASE_URL',
	'EMAIL_USESEND_API_KEY',
	'GITHUB_CLIENT_SECRET',
	'GOOGLE_CLIENT_SECRET',
	'LINKEDIN_CLIENT_SECRET',
	'TWITTER_CLIENT_SECRET',
	'DIRECTUS_ADMIN_TOKEN',
	'DIRECTUS_DEFAULT_ROLE_ID',
	'REDIS_PASSWORD',
	'REDIS_URL',
	'S3_SECRET_ACCESS_KEY',
	'S3_ACCESS_KEY_ID',
	'CLOUDINARY_API_SECRET',
	'CLOUDINARY_API_KEY',
	'CAP_SECRET',
	'CREEM_API_KEY',
	'CREEM_WEBHOOK_SECRET',
	''
]);

/** Security feature configuration mapping */
const SECURITY_FEATURES = {
	abuse_protection: ['AUTH_ABUSE_PROTECTION_PLUGIN'],
	fraud_detection: ['AUTH_FRAUD_DETECTION_PLUGIN'],
	geo_intelligence: ['AUTH_GEO_INTELLIGENCE_PLUGIN'],
	rate_limit: ['AUTH_RATE_LIMIT_PLUGIN'],
	security_analytics: ['AUTH_SECURITY_ANALYTICS_PLUGIN']
} as const;

// ============================================
// Shared Transformers (Optimized)
// ============================================

/**
 * Parse string/boolean to boolean (optimized with Set lookup)
 */
function parseBoolean(val: string | boolean): boolean {
	if (typeof val === 'boolean') return val;
	return TRUTHY_VALUES.has(String(val).trim().toLowerCase());
}

/**
 * Transform string/boolean to boolean
 */
const envBoolean = z.union([z.boolean(), z.string()]).transform(parseBoolean);

/**
 * Coerce string to positive number
 */
const positiveNumber = z.coerce.number().positive('Must be a positive number');

/**
 * Coerce string to non-negative number
 */
const nonNegativeNumber = z.coerce.number().nonnegative('Must be a non-negative number');

/**
 * Coerce comma-separated or JSON string into string array
 */
const stringArray = z.preprocess((val) => {
	if (Array.isArray(val)) return val;
	if (typeof val === 'string') {
		try {
			const parsed = JSON.parse(val);
			if (Array.isArray(parsed)) {
				return parsed;
			}
		} catch {
			// fall through to comma split
		}
		return val
			.split(',')
			.map((item) => item.trim())
			.filter(Boolean);
	}
	return val;
}, z.array(z.string()));

/**
 * URL string with validation
 */
const urlString = (defaultValue?: string) => {
	const base = z.url('Must be a valid URL');
	return defaultValue !== undefined ? base.default(defaultValue) : base;
};

// ============================================
// Environment Variable Schemas
// ============================================

/**
 * Core application environment variables
 */
const coreEnvSchema = z.object({
	// Application
	PUBLIC_ENV_MODE: z.enum(['development', 'production', 'staging']).default('development'),
	PUBLIC_APP_NAME: z.string().min(1, 'App name is required').default('Auth App'),
	PUBLIC_SITE_URL: urlString('http://localhost:3000'),
	APP_LOGGER_DISABLED: envBoolean.default(false),

	// Debug
	PUBLIC_AUTH_DEBUG_MODE: envBoolean.default(false),
	ENABLE_SECURITY_ANALYSIS: envBoolean.default(false),

	// Database
	BETTER_DATABASE_URL: z.string().min(1, 'Database URL is required'),
	DATABASE_URL: z.string().optional(), // Alias for compatibility

	// Auth
	BETTER_AUTH_SECRET: z.string().min(32, 'Auth secret must be at least 32 characters'),
	AUTH_SECRET: z.string().optional(), // Alias for compatibility
	// OAuth Proxy — shared secret across prod/preview/local (must match everywhere)
	OAUTH_PROXY_SECRET: z.string().min(32).optional(),

	// Auth URLs
	PUBLIC_BETTER_AUTH_URL: urlString('http://localhost:3000'),
	PUBLIC_AUTH_CALLBACK_URL: urlString('http://localhost:3000'),

	// Session
	PUBLIC_AUTH_SESSION_TOKEN_EXPIRES_IN: z.string().default('7d'),
	AUTH_SESSION_TOKEN_EXPIRES_IN: z.string().optional() // Alias for compatibility
});

/**
 * Email configuration schema
 */
const emailEnvSchema = z.object({
	// Email Service Provider (primary field)
	EMAIL_PROVIDER: z.enum(['usesend', 'resend', 'sendgrid', 'smtp', 'mock']).default('mock'),
	EMAIL_FROM: z.email().default('noreply@example.com'),
	EMAIL_FROM_NAME: z.string().default('Auth App'),
	EMAIL_PROVIDER_URL: z.string().optional(),
	EMAIL_REPLY_TO: z.string().optional(),
	EMAIL_TO: z.string().optional(),
	EMAIL_DEBUG: envBoolean.default(false),

	// API Keys
	EMAIL_USESEND_API_KEY: z.string().optional(),
	SMTP_HOST: z.string().optional(),
	SMTP_PORT: positiveNumber.default(587),
	SMTP_SECURE: envBoolean.default(false),
	SMTP_USER: z.string().optional(),
	SMTP_PASS: z.string().optional(),

	// SendGrid
	EMAIL_SENDGRID_API_KEY: z.string().optional(),

	// Resend
	EMAIL_RESEND_API_KEY: z.string().optional(),
	RESEND_DOMAIN: z.string().optional()
});

/**
 * Social authentication schema
 */
const socialAuthEnvSchema = z.object({
	AUTH_SOCIAL_LOGIN_ENABLED: envBoolean.default(false),

	// GitHub
	GITHUB_CLIENT_ID: z.string().optional(),
	GITHUB_CLIENT_SECRET: z.string().optional(),
	PUBLIC_AUTH_GITHUB_ENABLED: envBoolean.default(false),

	// Google
	GOOGLE_CLIENT_ID: z.string().optional(),
	GOOGLE_CLIENT_SECRET: z.string().optional(),
	PUBLIC_AUTH_GOOGLE_ENABLED: envBoolean.default(false),

	// Discord
	DISCORD_CLIENT_ID: z.string().optional(),
	DISCORD_CLIENT_SECRET: z.string().optional(),
	PUBLIC_AUTH_DISCORD_ENABLED: envBoolean.default(false),

	// LinkedIn
	LINKEDIN_CLIENT_ID: z.string().optional(),
	LINKEDIN_CLIENT_SECRET: z.string().optional(),
	PUBLIC_AUTH_LINKEDIN_ENABLED: envBoolean.default(false),

	// Twitter
	TWITTER_CLIENT_ID: z.string().optional(),
	TWITTER_CLIENT_SECRET: z.string().optional(),
	PUBLIC_AUTH_TWITTER_ENABLED: envBoolean.default(false)
});

/**
 * Authentication features schema
 */
const authFeaturesEnvSchema = z.object({
	// Two-Factor Authentication
	AUTH_2FA_PLUGIN: envBoolean.default(false),
	PUBLIC_AUTH_2FA_PLUGIN: envBoolean.default(false),
	PUBLIC_AUTH_2FA_ISSUER: z.string().default('Auth App'),
	AUTH_2FA_ISSUER: z.string().optional(),
	AUTH_2FA_SKIP_VERIFICATION_ON_ENABLE: envBoolean.default(false),
	AUTH_2FA_TOTP_PERIOD: positiveNumber.default(30),
	AUTH_2FA_TOTP_DIGITS: positiveNumber.default(6),
	AUTH_2FA_OTP_PERIOD_MINUTES: positiveNumber.default(3),

	// Magic Links
	PUBLIC_AUTH_MAGIC_LINK_EXPIRES_IN: z.string().default('1h'),
	AUTH_MAGIC_LINK_EXPIRES_IN: positiveNumber.default(300),
	AUTH_MAGIC_LINK_DISABLE_SIGNUP: envBoolean.default(false),

	// Passkeys
	PUBLIC_AUTH_PASSKEYS_PLUGIN: envBoolean.default(false),
	// Deliberately optional: the passkey plugin derives the relying party ID
	// from the canonical URL when it is not set. A hardcoded default here would
	// silently advertise "localhost" to every deployed environment and make
	// the browser reject the ceremony with ERROR_INVALID_RP_ID.
	PUBLIC_AUTH_PASSKEY_RPID: z.string().optional(),
	PUBLIC_AUTH_PASSKEY_RP_NAME: z.string().optional(),
	PUBLIC_AUTH_PASSKEY_ORIGIN: z.string().optional(),
	PUBLIC_AUTH_PASSKEY_ATTACHMENT: z.enum(['platform', 'cross-platform']).default('cross-platform'),
	PUBLIC_AUTH_PASSKEY_RESIDENT_KEY: z
		.enum(['required', 'preferred', 'discouraged'])
		.default('preferred'),
	PUBLIC_AUTH_PASSKEY_USER_VERIFICATION: z
		.enum(['required', 'preferred', 'discouraged'])
		.default('preferred'),
	AUTH_PASSKEYS_PLUGIN: envBoolean.default(false),

	// OAuth Proxy (dev/preview OAuth through production callback URL)
	AUTH_OAUTH_PROXY_PLUGIN: envBoolean.default(false),

	// Social Login
	PUBLIC_AUTH_SOCIAL_LOGINS_ENABLED: envBoolean.default(false),

	// SIWE
	AUTH_SIWE_ENABLED: envBoolean.default(false),
	SIWE_DOMAIN: z.string().optional(),
	SIWE_EMAIL_DOMAIN: z.string().optional(),
	SIWE_ANONYMOUS: envBoolean.default(false),
	SIWE_RPC_URL: z.string().optional(),
	SIWE_ENABLE_ENS_LOOKUP: envBoolean.default(false),
	BIGDATACLOUD_API_KEY: z.string().optional(),

	// Passwordless
	PUBLIC_AUTH_PASSWORDLESS_ENABLED: envBoolean.default(false),

	// Email Verification
	PUBLIC_AUTH_EMAIL_VERIFICATION_REQUIRED: envBoolean.default(false),
	PUBLIC_AUTH_EMAIL_VERIFICATION_EXPIRES_IN: z.string().default('24h'),

	// Password Reset
	PUBLIC_AUTH_PASSWORD_RESET_ENABLED: envBoolean.default(true),
	PUBLIC_AUTH_PASSWORD_RESET_EXPIRES_IN: z.string().default('1h'),

	// Account Management
	PUBLIC_AUTH_ACCOUNT_MANAGEMENT_ENABLED: envBoolean.default(true),
	PUBLIC_AUTH_DELETE_ACCOUNT_ENABLED: envBoolean.default(false),
	PUBLIC_AUTH_ADMIN_PLUGIN: envBoolean.default(false),
	AUTH_ADMIN_ENABLED: envBoolean.default(false),
	AUTH_ADMIN_PLUGIN: envBoolean.default(false),
	AUTH_ADMIN_DEFAULT_ROLE: z.string().default('user'),
	AUTH_ADMIN_ROLES: stringArray.default(['admin']),
	AUTH_ADMIN_USER_IDS: stringArray.optional(),
	AUTH_ADMIN_IMPERSONATION_SESSION_DURATION: positiveNumber.default(3600),
	AUTH_ADMIN_DEFAULT_BAN_REASON: z.string().default('No reason'),
	AUTH_ADMIN_DEFAULT_BAN_EXPIRES_IN: positiveNumber.optional(),

	// Rate Limiting
	AUTH_RATE_LIMIT_ENABLED: envBoolean.default(true),
	AUTH_RATE_LIMIT_WINDOW: z.string().default('15m'),
	AUTH_RATE_LIMIT_MAX: positiveNumber.default(5),

	// Security Plugins (public flags for client-side detection) - Force TS refresh
	AUTH_RATE_LIMIT_PLUGIN: envBoolean.default(false),
	AUTH_FRAUD_DETECTION_PLUGIN: envBoolean.default(false),
	AUTH_GEO_INTELLIGENCE_PLUGIN: envBoolean.default(false),
	AUTH_ABUSE_PROTECTION_PLUGIN: envBoolean.default(false),
	AUTH_SECURITY_ANALYTICS_PLUGIN: envBoolean.default(false),
	AUTH_MAGIC_LINK_PLUGIN: envBoolean.default(false),
	AUTH_EMAIL_OTP_PLUGIN: envBoolean.default(false),
	AUTH_LAST_LOGIN_METHOD_PLUGIN: envBoolean.default(false),
	AUTH_EMAIL_OTP_OVERRIDE_VERIFICATION: envBoolean.default(false),
	AUTH_EMAIL_OTP_SEND_ON_SIGNUP: envBoolean.default(false),
	AUTH_EMAIL_OTP_DISABLE_SIGNUP: envBoolean.default(false),
	AUTH_EMAIL_OTP_LENGTH: positiveNumber.default(6),
	AUTH_EMAIL_OTP_EXPIRES_IN: positiveNumber.default(300),
	AUTH_EMAIL_OTP_ALLOWED_ATTEMPTS: positiveNumber.default(3),
	AUTH_EMAIL_OTP_STORE_STRATEGY: z.enum(['plain', 'hashed', 'encrypted']).default('plain'),

	// Session Management
	PUBLIC_AUTH_SESSION_MANAGEMENT_ENABLED: envBoolean.default(true),
	PUBLIC_AUTH_MAX_SESSIONS: positiveNumber.default(5),

	// Last Login In
	AUTH_LAST_LOGIN_METHOD_ENABLED: envBoolean.default(true),
	AUTH_LAST_LOGIN_METHOD_STORE_DB: envBoolean.default(true),
	AUTH_ONE_TIME_TOKEN_ENABLED: envBoolean.default(false),

	// MCP (Model Context Protocol) OAuth provider
	AUTH_MCP_PLUGIN: envBoolean.default(false)
});

/**
 * Security features schema
 */
const securityFeaturesEnvSchema = z.object({
	// Abuse Protection

	// Master toggle for the unified security plugin (optional — enabled by
	// default in buildSecurityPlugins when unset)
	AUTH_SECURITY_PLUGIN: envBoolean.optional(),
	AUTH_ABUSE_PROTECTION_PLUGIN: envBoolean.default(false),
	AUTH_FRAUD_DETECTION_PLUGIN: envBoolean.default(false),
	AUTH_GEO_INTELLIGENCE_PLUGIN: envBoolean.default(false),
	AUTH_RATE_LIMIT_PLUGIN: envBoolean.default(false),
	AUTH_SECURITY_ANALYTICS_PLUGIN: envBoolean.default(false),

	// Trusted IPs
	PUBLIC_TRUSTED_IPS: z.string().optional(),

	// CAPTCHA
	CAPTCHA: envBoolean.default(false),
	PUBLIC_CAP_KEY: z.string().optional(),
	PUBLIC_CAP_ENDPOINT: z.string().optional(),
	CAP_SECRET: z.string().optional()
});

/**
 * CMS integration schema
 */
const cmsEnvSchema = z.object({
	// CMS Provider
	CMS_PROVIDER: z
		.enum(['directus', 'strapi', 'payload', 'sanity', 'temple', 'none'])
		.default('none'),

	// Directus
	DIRECTUS_URL: urlString().optional(),
	DIRECTUS_ADMIN_TOKEN: z.string().optional(),
	DIRECTUS_DEFAULT_ROLE_ID: z.string().optional(),
	DIRECTUS_WEBHOOK_SECRET: z.string().optional(),

	// Strapi
	STRAPI_API_TOKEN: z.string().optional(),
	STRAPI_API_VERSION: z.string().optional(),

	// Payload
	PAYLOAD_API_TOKEN: z.string().optional(),
	PAYLOAD_USERS_COLLECTION: z.string().optional(),
	PAYLOAD_MEDIA_COLLECTION: z.string().optional(),
	PAYLOAD_AVATAR_FIELD: z.string().optional(),

	// Sanity
	SANITY_API_TOKEN: z.string().optional(),
	SANITY_PROJECT_ID: z.string().optional(),
	SANITY_DATASET: z.string().optional(),
	SANITY_API_VERSION: z.string().optional(),

	// General CMS
	CMS_API_URL: urlString().optional(),
	PUBLIC_CMS_URL: urlString().optional()
});

/**
 * Storage schema
 */
const storageEnvSchema = z.object({
	STORAGE_PROVIDER: z.enum(['local', 's3', 'cloudinary', 'mock']).default('local'),
	STORAGE_UPLOAD_DIR: z.string().default('./uploads'),
	STORAGE_BASE_URL: z.string().optional(),
	LOCAL_STORAGE_PATH: z.string().optional(),
	// Local Storage
	PUBLIC_STORAGE_TYPE: z.enum(['local', 's3', 'cloudinary']).default('local'),

	// S3 Storage
	S3_ACCESS_KEY_ID: z.string().optional(),
	S3_SECRET_ACCESS_KEY: z.string().optional(),
	S3_BUCKET: z.string().optional(),
	S3_REGION: z.string().default('us-east-1'),
	S3_ENDPOINT: urlString().optional(),
	PUBLIC_S3_BUCKET: z.string().optional(),
	PUBLIC_S3_REGION: z.string().default('us-east-1'),

	// Cloudinary
	CLOUDINARY_API_KEY: z.string().optional(),
	CLOUDINARY_API_SECRET: z.string().optional(),
	CLOUDINARY_CLOUD_NAME: z.string().optional(),
	CLOUDINARY_FOLDER: z.string().optional(),
	PUBLIC_CLOUDINARY_CLOUD_NAME: z.string().optional()
});

/**
 * Redis schema
 */
const redisEnvSchema = z.object({
	REDIS_URL: z
		.string()
		.transform((v) => v.trim() || undefined)
		.pipe(z.url().optional()),
	REDIS_HOST: z.string().optional(),
	REDIS_PORT: positiveNumber.default(6379),
	REDIS_PASSWORD: z.string().optional(),
	REDIS_DB: nonNegativeNumber.default(0),
	REDIS_TLS: envBoolean.default(false),
	// Security storage backend selection: 'redis' (default if REDIS_URL set) | 'postgres' | 'memory'
	SECURITY_STORAGE: z
		.string()
		.transform((v) => v.trim() || undefined)
		.pipe(z.enum(['redis', 'postgres', 'memory']).optional()),
	PG_KV_STORE: envBoolean.default(false)
});

/**
 * Security analytics event store schema
 */
const securityAnalyticsEnvSchema = z.object({
	SECURITY_ANALYTICS_STORE_PROVIDER: z.enum(['memory', 'redis']).default('redis'),
	SECURITY_ANALYTICS_REDIS_KEY_PREFIX: z.string().default('security:analytics:'),
	SECURITY_ANALYTICS_REDIS_MAX_EVENTS: positiveNumber.default(10000),
	SECURITY_ANALYTICS_REDIS_NAME: z.string().default('SecurityAnalyticsEventStore')
});

/**
 * Creem payment/subscription schema
 */
const creemEnvSchema = z.object({
	CREEM_API_KEY: z.string().optional(),
	CREEM_WEBHOOK_SECRET: z.string().optional(),
	CREEM_TEST_MODE: envBoolean.default(true),
	CREEM_PERSIST_SUBSCRIPTIONS: envBoolean.default(true),
	CREEM_DEFAULT_SUCCESS_URL: z.string().default('/dashboard'),
	PUBLIC_CREEM_ENABLED: envBoolean.default(false)
});

// ============================================
// Combined Schemas
// ============================================

// Public schemas by concern
const publicCoreSchema = z.object({
	PUBLIC_ENV_MODE: z.enum(['development', 'production', 'staging']).default('development'),
	PUBLIC_APP_NAME: z.string().min(1, 'App name is required').default('Auth App'),
	PUBLIC_SITE_URL: urlString('http://localhost:3000'),
	PUBLIC_AUTH_DEBUG_MODE: envBoolean.default(false),
	PUBLIC_BETTER_AUTH_URL: urlString('http://localhost:3000'),
	PUBLIC_AUTH_CALLBACK_URL: urlString('http://localhost:3000'),
	PUBLIC_AUTH_SESSION_TOKEN_EXPIRES_IN: z.string().default('7d')
});

const publicAuthFeaturesSchema = z.object({
	PUBLIC_AUTH_PASSKEYS_PLUGIN: envBoolean.default(false),
	PUBLIC_AUTH_SOCIAL_LOGINS_ENABLED: envBoolean.default(false),
	PUBLIC_AUTH_2FA_PLUGIN: envBoolean.default(false),
	PUBLIC_AUTH_2FA_ISSUER: z.string().default('Auth App'),
	PUBLIC_AUTH_MAGIC_LINK_PLUGIN: envBoolean.default(false),
	PUBLIC_AUTH_ADMIN_PLUGIN: envBoolean.default(false),
	PUBLIC_AUTH_LAST_LOGIN_METHOD_PLUGIN: envBoolean.default(true),
	PUBLIC_AUTH_EMAIL_OTP_PLUGIN: envBoolean.default(false),
	PUBLIC_AUTH_MAX_SESSIONS: positiveNumber.default(5),
	PUBLIC_WALLETCONNECT_ID: z.string().optional(),
	PUBLIC_AUTH_SIWE_PLUGIN: envBoolean.default(false),
	PUBLIC_CREEM_ENABLED: envBoolean.default(false)
});

const publicSocialFlagsSchema = z.object({
	PUBLIC_AUTH_GITHUB_ENABLED: envBoolean.default(false),
	PUBLIC_AUTH_GOOGLE_ENABLED: envBoolean.default(false),
	PUBLIC_AUTH_DISCORD_ENABLED: envBoolean.default(false),
	PUBLIC_AUTH_LINKEDIN_ENABLED: envBoolean.default(false),
	PUBLIC_AUTH_TWITTER_ENABLED: envBoolean.default(false)
});

const publicSecuritySchema = z.object({
	PUBLIC_TRUSTED_IPS: z.string().optional(),
	PUBLIC_AUTH_SECURITY_PLUGIN: envBoolean.optional(),
	PUBLIC_CAP_KEY: z.string().optional(),
	PUBLIC_CAP_ENDPOINT: z.string().optional()
});

const publicCmsSchema = z.object({
	PUBLIC_CMS_URL: urlString().optional()
});

const publicStorageSchema = z.object({
	PUBLIC_STORAGE_TYPE: z.enum(['local', 's3', 'cloudinary']).default('local'),
	PUBLIC_S3_BUCKET: z.string().optional(),
	PUBLIC_S3_REGION: z.string().default('us-east-1'),
	PUBLIC_CLOUDINARY_CLOUD_NAME: z.string().optional()
});

/**
 * Public environment variables (safe to expose to client)
 *
 * Built by spreading each concern's `.shape` so the inferred output type keeps
 * the precise field types (zod `.merge()` on a `Record<string, ZodTypeAny>`
 * erases them to `unknown` under zod 4). Later spreads win for duplicate keys,
 * matching the previous merge order.
 */
export const publicEnvSchema = z.object({
	...publicCoreSchema.shape,
	...publicAuthFeaturesSchema.shape,
	...publicSocialFlagsSchema.shape,
	...publicSecuritySchema.shape,
	...publicCmsSchema.shape,
	...publicStorageSchema.shape
});

/**
 * Server environment variables (private + public)
 */
export const fullEnvSchema = z.object({
	...coreEnvSchema.shape,
	...emailEnvSchema.shape,
	...socialAuthEnvSchema.shape,
	...authFeaturesEnvSchema.shape,
	...securityFeaturesEnvSchema.shape,
	...cmsEnvSchema.shape,
	...storageEnvSchema.shape,
	...redisEnvSchema.shape,
	...securityAnalyticsEnvSchema.shape,
	...creemEnvSchema.shape,
	...publicAuthFeaturesSchema.shape,
	...publicSocialFlagsSchema.shape,
	...publicSecuritySchema.shape,
	...publicCmsSchema.shape,
	...publicStorageSchema.shape
});

// ============================================
// Type Exports
// ============================================

export type PublicEnv = z.infer<typeof publicEnvSchema>;
export type ServerEnv = z.infer<typeof fullEnvSchema>;
export type FullEnv = z.infer<typeof fullEnvSchema>;

// ============================================
// Validation Functions
// ============================================

/**
 * Validate environment variables with schema
 */
export function validateEnv<T>(
	env: Record<string, unknown>,
	schema: z.ZodSchema<T>,
	context: string
): T {
	try {
		return schema.parse(env);
	} catch (error) {
		if (error instanceof z.ZodError) {
			const issues = error.issues.map((issue) => {
				const path = issue.path.join('.');
				const message = issue.message;
				return `${context}: ${path} - ${message}`;
			});

			throw new Error(`Environment validation failed:\n${issues.join('\n')}`);
		}
		throw error;
	}
}

/**
 * Check if a security feature is enabled
 */
export function isSecurityFeatureEnabled(
	feature: keyof typeof SECURITY_FEATURES,
	env: FullEnv
): boolean {
	const keys = SECURITY_FEATURES[feature];
	if (!keys) return false;

	return keys.some((key) => env[key as keyof FullEnv] === true);
}

/**
 * Get safe representation of environment for logging
 * Redacts sensitive values
 */
export function getSafeEnvLog(env: Record<string, unknown>): Record<string, unknown> {
	const safe: Record<string, unknown> = {};

	for (const [key, value] of Object.entries(env)) {
		if (SENSITIVE_KEYS.has(key)) {
			safe[key] = '[REDACTED]';
		} else if (typeof value === 'string' && value.length > 100) {
			safe[key] = value.substring(0, 100) + '...';
		} else {
			safe[key] = value;
		}
	}

	return safe;
}
