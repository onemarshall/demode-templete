/**
 * Rate Limit Rule Matching
 *
 * Consolidated from plugins/rate-limiting/services/helpers.ts
 */

import type { RateLimitRule, RateLimitFeatureConfig, RateLimitIdentifier } from './types';
import { getClientIp } from '../../core/helpers';

// Regex cache for pattern matching
const regexCache = new Map<string, RegExp>();
const REGEX_CACHE_MAX_SIZE = 200;

// Path match result cache
const pathMatchCache = new Map<string, boolean>();
const PATH_CACHE_MAX_SIZE = 1000;

/**
 * Safely convert a glob pattern to a regex string.
 * Escapes all regex-special characters except `*`, which becomes `[^/]*`
 * (matches any character except `/`, preventing catastrophic backtracking).
 */
function safeGlobToRegex(pattern: string): string {
	let result = '';
	for (const ch of pattern) {
		if (ch === '*') {
			result += '[^/]*';
		} else if ('.+?^${}()|[]\\'.includes(ch)) {
			result += '\\' + ch;
		} else {
			result += ch;
		}
	}
	return result;
}

const MAX_PATTERN_LENGTH = 200;

/**
 * Get or create regex for pattern
 */
function getRegex(pattern: string): RegExp {
	let regex = regexCache.get(pattern);
	if (!regex) {
		if (regexCache.size > REGEX_CACHE_MAX_SIZE) {
			const firstKey = regexCache.keys().next().value;
			if (firstKey) regexCache.delete(firstKey);
		}
		// SECURITY: Reject overly long patterns to prevent resource exhaustion
		if (pattern.length > MAX_PATTERN_LENGTH) {
			regex = /^$/; // Will never match — effectively disables the rule
		} else {
			regex = new RegExp('^' + safeGlobToRegex(pattern) + '$');
		}
		regexCache.set(pattern, regex);
	}
	return regex;
}

/**
 * Evict path cache if needed
 */
function evictPathCacheIfNeeded(): void {
	if (pathMatchCache.size > PATH_CACHE_MAX_SIZE) {
		const deleteCount = Math.ceil(PATH_CACHE_MAX_SIZE * 0.2);
		const keys = pathMatchCache.keys();
		for (let i = 0; i < deleteCount; i++) {
			const key = keys.next().value;
			if (key) pathMatchCache.delete(key);
		}
	}
}

/**
 * Match a path against a pattern (cached)
 */
export function matchPath(pattern: string, path: string): boolean {
	if (pattern === path) return true;

	const cacheKey = `${pattern}|${path}`;
	const cached = pathMatchCache.get(cacheKey);
	if (cached !== undefined) return cached;

	let result: boolean;

	if (pattern.endsWith('/*')) {
		const prefix = pattern.slice(0, -2);
		result = path.startsWith(prefix);
	} else if (pattern.includes('*')) {
		const regex = getRegex(pattern);
		result = regex.test(path);
	} else {
		result = false;
	}

	evictPathCacheIfNeeded();
	pathMatchCache.set(cacheKey, result);

	return result;
}

/**
 * Get matching rules for a path and method
 */
export function getMatchingRules(
	path: string,
	method: string,
	config: RateLimitFeatureConfig
): RateLimitRule[] {
	const methodUpper = method.toUpperCase();
	const matchedRules: RateLimitRule[] = [];
	const rules = config.rules ?? [];

	for (const rule of rules) {
		if (rule.enabled === false) continue;
		if (!matchPath(rule.pathPattern, path)) continue;

		if (rule.methods && rule.methods.length > 0) {
			if (!rule.methods.includes(methodUpper)) continue;
		}

		matchedRules.push(rule);
	}

	// Return default rule if no matches
	if (matchedRules.length === 0) {
		const defaultLimit = config.defaultLimit ?? { maxRequests: 100, windowSeconds: 60 };
		return [
			{
				id: 'default',
				name: 'Default Limit',
				pathPattern: '*',
				maxRequests: defaultLimit.maxRequests,
				windowSeconds: defaultLimit.windowSeconds,
				strategy: config.defaultStrategy ?? 'sliding-window',
				identifier: config.defaultIdentifier ?? 'ip'
			}
		];
	}

	return matchedRules;
}

/**
 * Check if path should be skipped
 */
export function shouldSkipPath(path: string, skipPaths: string[]): boolean {
	for (const skipPath of skipPaths) {
		if (path === skipPath || path.startsWith(skipPath)) return true;
	}
	return false;
}

/**
 * Get client identifier based on rule configuration
 */
export async function getClientIdentifier(
	request: Request,
	rule: RateLimitRule,
	context: { user?: { id: string; role?: string; roles?: string[] } } | null,
	config: RateLimitFeatureConfig
): Promise<string> {
	const identifierType: RateLimitIdentifier = rule.identifier ?? config.defaultIdentifier ?? 'ip';

	switch (identifierType) {
		case 'ip':
			return getClientIp(request);

		case 'user':
			return context?.user?.id ?? 'anonymous';

		case 'session':
			return request.headers.get('x-session-id') ?? 'no-session';

		case 'api-key':
			return request.headers.get('x-api-key') ?? 'no-api-key';

		case 'custom':
			if (config.getIdentifier) {
				return config.getIdentifier(request, context);
			}
			return getClientIp(request);

		default:
			return getClientIp(request);
	}
}

/**
 * Get tier multiplier for user
 */
export function getTierMultiplier(
	userId: string | undefined,
	roles: string[],
	config: RateLimitFeatureConfig
): number {
	const tiers = config.tiers ?? [];

	for (const tier of tiers) {
		if (tier.roles) {
			for (const role of roles) {
				if (tier.roles.includes(role)) {
					return tier.multiplier;
				}
			}
		}
	}

	return 1;
}

/**
 * Build rate limit key
 */
export function buildRateLimitKey(
	ruleId: string,
	identifier: string,
	prefix: string = 'rl'
): string {
	return `${prefix}:${ruleId}:${identifier}`;
}

/**
 * Clear rule caches (for testing)
 */
export function clearRuleCaches(): void {
	regexCache.clear();
	pathMatchCache.clear();
}
