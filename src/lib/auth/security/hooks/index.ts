/**
 * Unified Security Hooks
 *
 * Exports coordinated before and after hooks for the security plugin.
 */

export {
	createBeforeHook,
	createBlockedResponse,
	createCaptchaRequiredResponse,
	createRateLimitedResponse,
	type MatcherContext,
	type CreateBeforeHookOptions
} from './before';

export { createAfterHook, isAuthSuccessPath, type CreateAfterHookOptions } from './after';

// Re-export HookEndpointContext for test files
export type { HookEndpointContext } from '@better-auth/core';
