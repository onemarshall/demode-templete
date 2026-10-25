/**
 * Unified Security Client Exports
 *
 * Single entry point for all client-side security functionality.
 */

// Unified client plugin
export { securityClient, type SecurityClientPlugin } from './plugin';

// Standalone client
export {
	createSecurityClient,
	getSecurityClient,
	resetSecurityClient,
	security,
	type StandaloneClientOptions
} from './standalone';

// SSR-safe store
export {
	createSecurityStore,
	getSecurityStore,
	resetSecurityStore,
	type SecurityState,
	type SecurityStore,
	type CreateSecurityStoreOptions
} from './store';

// Client utilities
export {
	isBrowser,
	isSecureContext,
	formatRiskScore,
	getRiskLevelColor,
	getRiskLevelLabel,
	formatTimestamp,
	formatRelativeTime,
	formatRetryAfter,
	isRateLimitError,
	getRateLimitRetryAfter,
	waitForRateLimit,
	collectBasicFingerprint,
	loadCaptchaScript,
	isCaptchaLoaded,
	createBehaviorTracker,
	getBypassToken,
	setBypassToken,
	clearBypassToken,
	type RiskLevel,
	type BasicFingerprint,
	type CaptchaProvider,
	type BehaviorMetrics
} from './utils';

// Legacy exports for backward compatibility
export * from './client';
