/**
 * Security Feature Interface and Priority Constants
 *
 * Defines the standard interface that all security features implement,
 * and the priority constants for execution ordering.
 */

import type { SecurityContext } from './context';
import type { RiskFactor } from './risk-engine';
import type { CacheStats } from './cache';

// ============================================
// Feature Priority Constants
// ============================================

/**
 * Feature execution priorities (lower runs first)
 * Features are sorted by priority before execution in the before hook.
 */
export const FEATURE_PRIORITY = {
	/** Check blocks first (fastest rejection) */
	BLOCKING: 0,
	/** Then rate limits */
	RATE_LIMIT: 10,
	/** Then geo/reputation (may call external API) */
	GEO: 30,
	/** Then device analysis */
	DEVICE: 40,
	/** Then behavior (most expensive) */
	BEHAVIOR: 50,
	/**
	 * CAPTCHA runs last so its risk-threshold check sees the risk score
	 * accumulated by all earlier features (ctx.riskScore is updated
	 * incrementally by the before hook between features).
	 */
	CAPTCHA: 60
} as const;

export type FeaturePriority = (typeof FEATURE_PRIORITY)[keyof typeof FEATURE_PRIORITY];

// ============================================
// Feature Configuration
// ============================================

export interface SecurityConfig {
	enabled: boolean;
	skipInDevelopment: boolean;
	captchaThreshold: number;
	blockThreshold: number;
	includePaths: string[];
	excludePaths: string[];

	/** Roles allowed to access admin security endpoints (default: ['admin', 'superadmin']) */
	adminRoles?: string[];

	/**
	 * Controls which IP headers are trusted for client IP extraction.
	 * - 'cloudflare': Only trust CF-Connecting-IP (recommended behind Cloudflare)
	 * - 'proxy': Trust X-Forwarded-For, X-Real-IP (only if behind a trusted reverse proxy that sets these)
	 * - 'none': Do not trust any IP headers — use socket IP / fallback only
	 * - string[]: Custom list of trusted header names (first match wins)
	 * Default: 'cloudflare'
	 */
	trustProxy?: 'cloudflare' | 'proxy' | 'none' | string[];

	resilience?: {
		failMode: 'open' | 'closed';
		circuitBreaker?: {
			enabled: boolean;
			failureThreshold: number;
			resetTimeoutMs: number;
		};
	};

	features?: {
		blocking?: boolean | BlockingFeatureConfig;
		rateLimit?: boolean | RateLimitFeatureConfig;
		captcha?: boolean | CaptchaFeatureConfig;
		geo?: boolean | GeoFeatureConfig;
		device?: boolean | DeviceFeatureConfig;
		behavior?: boolean | BehaviorFeatureConfig;
	};
}

export interface BlockingFeatureConfig {
	enabled?: boolean;
	maxFailedAttempts?: number;
	blockDurationSeconds?: number;
	escalatingBlocks?: boolean;
}

export interface RateLimitFeatureConfig {
	enabled?: boolean;
	defaultLimit?: {
		maxRequests: number;
		windowSeconds: number;
	};
	windowSeconds?: number;
	rules?: RateLimitRule[];
	tiers?: RateLimitTier[];
	defaultStrategy?: 'sliding-window' | 'fixed-window' | 'token-bucket' | 'leaky-bucket';
	defaultIdentifier?: 'ip' | 'user' | 'session' | 'api-key' | 'custom';
	includeHeaders?: boolean;
	skipPaths?: string[];
	keyPrefix?: string;
	warningThreshold?: number;
	getIdentifier?: (request: Request, context: unknown) => string | Promise<string>;
	getTier?: (userId: string | undefined, roles: string[]) => string | Promise<string>;
}

export interface RateLimitRule {
	id: string;
	name: string;
	pathPattern: string;
	methods?: string[];
	maxRequests: number;
	windowSeconds: number;
	strategy?: 'sliding-window' | 'fixed-window' | 'token-bucket' | 'leaky-bucket';
	identifier?: 'ip' | 'user' | 'session' | 'api-key' | 'custom';
	skipAuthenticated?: boolean;
	skipRoles?: string[];
	penaltySeconds?: number;
	enabled?: boolean;
	statusCode?: number;
	errorMessage?: string;
}

export interface RateLimitTier {
	name: string;
	multiplier: number;
	bonusRequests?: number;
	roles?: string[];
}

export interface CaptchaFeatureConfig {
	enabled?: boolean;
	provider?: 'capjs' | 'hcaptcha' | 'recaptcha' | 'turnstile';
	/** Base URL of a self-hosted Cap standalone server (capjs provider). */
	endpoint?: string;
	siteKey?: string;
	secretKey?: string;
	bypassTtlSeconds?: number;
	/** Per-feature override for the risk score that requires CAPTCHA */
	threshold?: number;
}

export interface GeoFeatureConfig {
	enabled?: boolean;
	apiKey?: string;
	blockedCountries?: string[];
	allowedCountries?: string[];
	highRiskCountries?: string[];
	enableGeolocation?: boolean;
	enableReputation?: boolean;
	enableVelocityCheck?: boolean;
	cacheTtlSeconds?: number;
	hostingHighPenalty?: number;
	hostingMediumPenalty?: number;
}

export interface DeviceFeatureConfig {
	enabled?: boolean;
	trustAfterSuccessfulAuths?: number;
	trustDurationDays?: number;
}

export interface BehaviorFeatureConfig {
	enabled?: boolean;
	enableBotDetection?: boolean;
	enablePatternAnalysis?: boolean;
	humanScoreThreshold?: number;
}

// ============================================
// Feature Result
// ============================================

export interface FeatureResult {
	/** Should this feature block the request? */
	block?: boolean;
	/** Reason for blocking */
	blockReason?: string;
	/** Custom response to return if blocking */
	blockResponse?: Response;

	/** Risk factors to add to context */
	riskFactors?: RiskFactor[];

	/** Feature-specific data to merge into context */
	data?: Record<string, unknown>;

	/** Partial failure warnings (feature ran but had issues) */
	warnings?: string[];
}

// ============================================
// Feature Interface
// ============================================

export interface SecurityFeature {
	/** Unique feature identifier */
	readonly id: string;

	/** Human-readable feature name */
	readonly name: string;

	/** Execution priority (lower runs first) */
	readonly priority: FeaturePriority | number;

	/** Config key for this feature */
	readonly configKey: keyof NonNullable<SecurityConfig['features']>;

	/**
	 * Initialize the feature (called during plugin init)
	 */
	init?(config: SecurityConfig): Promise<void>;

	/**
	 * Check security for this feature
	 * Return null to skip (feature disabled or N/A for this request)
	 */
	check?(ctx: SecurityContext, config: SecurityConfig): Promise<FeatureResult | null>;

	/**
	 * Record results after request completes (called in after hook)
	 */
	record?(ctx: SecurityContext, config: SecurityConfig): Promise<void>;

	/**
	 * Clear feature-specific caches
	 */
	clearCache?(): void;

	/**
	 * Get feature cache statistics
	 */
	getCacheStats?(): CacheStats;
}

// ============================================
// Feature Registry
// ============================================

const featureRegistry = new Map<string, SecurityFeature>();

/**
 * Register a security feature
 */
export function registerFeature(feature: SecurityFeature): void {
	featureRegistry.set(feature.id, feature);
}

/**
 * Get a registered feature by ID
 */
export function getFeature(id: string): SecurityFeature | undefined {
	return featureRegistry.get(id);
}

/**
 * Get all registered features sorted by priority
 */
export function getAllFeatures(): SecurityFeature[] {
	return Array.from(featureRegistry.values()).sort((a, b) => a.priority - b.priority);
}

/**
 * Get enabled features based on config, sorted by priority
 */
export function getEnabledFeatures(config: SecurityConfig): SecurityFeature[] {
	return getAllFeatures().filter((feature) => isFeatureEnabled(feature.configKey, config));
}

/**
 * Check if a feature is enabled in config
 */
export function isFeatureEnabled(
	configKey: keyof NonNullable<SecurityConfig['features']>,
	config: SecurityConfig
): boolean {
	if (!config.enabled) return false;

	const featureConfig = config.features?.[configKey];

	if (featureConfig === undefined) {
		// Default to enabled if not explicitly configured
		return true;
	}

	if (typeof featureConfig === 'boolean') {
		return featureConfig;
	}

	// It's an object config - check enabled property
	return featureConfig.enabled !== false;
}

/**
 * Clear all feature caches
 */
export function clearAllFeatureCaches(): void {
	for (const feature of featureRegistry.values()) {
		feature.clearCache?.();
	}
}

/**
 * Get all feature cache statistics
 */
export function getAllFeatureCacheStats(): Array<{ featureId: string; stats: CacheStats }> {
	const stats: Array<{ featureId: string; stats: CacheStats }> = [];

	for (const feature of featureRegistry.values()) {
		const featureStats = feature.getCacheStats?.();
		if (featureStats) {
			stats.push({ featureId: feature.id, stats: featureStats });
		}
	}

	return stats;
}

// ============================================
// Feature Creation Helper
// ============================================

/**
 * Create a security feature with required fields
 */
export function createFeature(
	config: Pick<SecurityFeature, 'id' | 'name' | 'priority' | 'configKey'> & Partial<SecurityFeature>
): SecurityFeature {
	return {
		...config
	};
}
