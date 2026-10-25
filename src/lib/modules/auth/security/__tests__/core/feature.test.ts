import { describe, it, expect } from 'vitest';
import {
	FEATURE_PRIORITY,
	registerFeature,
	getFeature,
	getAllFeatures,
	getEnabledFeatures,
	isFeatureEnabled,
	clearAllFeatureCaches,
	getAllFeatureCacheStats,
	createFeature,
	type SecurityConfig
} from '../../core/feature';

// We need to reset the registry between tests, but it's a private Map.
// We'll create fresh features with unique IDs per test suite.
let testFeatureCounter = 0;
function uniqueId(base: string): string {
	return `${base}-${++testFeatureCounter}`;
}

describe('FEATURE_PRIORITY', () => {
	it('has correct priority ordering', () => {
		// CAPTCHA runs last so its risk-threshold check sees the risk
		// accumulated by geo/device/behavior earlier in the pass.
		expect(FEATURE_PRIORITY.BLOCKING).toBeLessThan(FEATURE_PRIORITY.RATE_LIMIT);
		expect(FEATURE_PRIORITY.RATE_LIMIT).toBeLessThan(FEATURE_PRIORITY.GEO);
		expect(FEATURE_PRIORITY.GEO).toBeLessThan(FEATURE_PRIORITY.DEVICE);
		expect(FEATURE_PRIORITY.DEVICE).toBeLessThan(FEATURE_PRIORITY.BEHAVIOR);
		expect(FEATURE_PRIORITY.BEHAVIOR).toBeLessThan(FEATURE_PRIORITY.CAPTCHA);
	});

	it('has blocking as lowest priority number', () => {
		expect(FEATURE_PRIORITY.BLOCKING).toBe(0);
	});
});

describe('createFeature', () => {
	it('creates feature with required fields', () => {
		const feature = createFeature({
			id: 'test-feature',
			name: 'Test Feature',
			priority: FEATURE_PRIORITY.GEO,
			configKey: 'geo'
		});

		expect(feature.id).toBe('test-feature');
		expect(feature.name).toBe('Test Feature');
		expect(feature.priority).toBe(FEATURE_PRIORITY.GEO);
		expect(feature.configKey).toBe('geo');
	});

	it('allows optional methods', () => {
		const checkMock = async () => null;
		const feature = createFeature({
			id: 'with-methods',
			name: 'With Methods',
			priority: 10,
			configKey: 'rateLimit',
			check: checkMock
		});

		expect(feature.check).toBe(checkMock);
	});
});

describe('Feature Registry', () => {
	it('registers and retrieves features', () => {
		const id = uniqueId('registry-test');
		const feature = createFeature({
			id,
			name: 'Registry Test',
			priority: 10,
			configKey: 'blocking'
		});

		registerFeature(feature);
		const retrieved = getFeature(id);

		expect(retrieved).toBe(feature);
	});

	it('silently replaces on duplicate registration (idempotent)', () => {
		const id = uniqueId('duplicate');
		const feature1 = createFeature({
			id,
			name: 'Original',
			priority: 10,
			configKey: 'blocking'
		});
		const feature2 = createFeature({
			id,
			name: 'Replacement',
			priority: 20,
			configKey: 'blocking'
		});

		registerFeature(feature1);
		registerFeature(feature2); // Should not throw

		const retrieved = getFeature(id);
		expect(retrieved?.name).toBe('Replacement');
		expect(retrieved?.priority).toBe(20);
	});

	it('returns undefined for unknown feature', () => {
		expect(getFeature('unknown-feature-id')).toBeUndefined();
	});
});

describe('getAllFeatures', () => {
	it('returns features sorted by priority', () => {
		const highPriority = createFeature({
			id: uniqueId('high'),
			name: 'High Priority',
			priority: 5,
			configKey: 'blocking'
		});
		const lowPriority = createFeature({
			id: uniqueId('low'),
			name: 'Low Priority',
			priority: 100,
			configKey: 'behavior'
		});
		const midPriority = createFeature({
			id: uniqueId('mid'),
			name: 'Mid Priority',
			priority: 50,
			configKey: 'device'
		});

		registerFeature(lowPriority);
		registerFeature(highPriority);
		registerFeature(midPriority);

		const all = getAllFeatures();
		const priorities = all.map((f) => f.priority);

		// Should be sorted ascending
		for (let i = 1; i < priorities.length; i++) {
			expect(priorities[i]!).toBeGreaterThanOrEqual(priorities[i - 1]!);
		}
	});
});

describe('isFeatureEnabled', () => {
	const baseConfig: SecurityConfig = {
		enabled: true,
		skipInDevelopment: false,
		captchaThreshold: 40,
		blockThreshold: 80,
		includePaths: [],
		excludePaths: []
	};

	it('returns false when security is disabled', () => {
		const config = { ...baseConfig, enabled: false };
		expect(isFeatureEnabled('blocking', config)).toBe(false);
	});

	it('returns true when feature not explicitly configured', () => {
		expect(isFeatureEnabled('blocking', baseConfig)).toBe(true);
	});

	it('respects boolean feature config', () => {
		const enabled = { ...baseConfig, features: { blocking: true } };
		const disabled = { ...baseConfig, features: { blocking: false } };

		expect(isFeatureEnabled('blocking', enabled)).toBe(true);
		expect(isFeatureEnabled('blocking', disabled)).toBe(false);
	});

	it('respects object feature config with enabled property', () => {
		const enabled = {
			...baseConfig,
			features: { geo: { enabled: true, blockedCountries: ['RU'] } }
		};
		const disabled = {
			...baseConfig,
			features: { geo: { enabled: false } }
		};

		expect(isFeatureEnabled('geo', enabled)).toBe(true);
		expect(isFeatureEnabled('geo', disabled)).toBe(false);
	});

	it('defaults to enabled for object config without enabled property', () => {
		const config = {
			...baseConfig,
			features: { rateLimit: { defaultLimit: { maxRequests: 100, windowSeconds: 60 } } }
		};

		expect(isFeatureEnabled('rateLimit', config)).toBe(true);
	});
});

describe('getEnabledFeatures', () => {
	const baseConfig: SecurityConfig = {
		enabled: true,
		skipInDevelopment: false,
		captchaThreshold: 40,
		blockThreshold: 80,
		includePaths: [],
		excludePaths: []
	};

	it('filters to enabled features only', () => {
		// Register features for this test
		const enabledId = uniqueId('enabled-feature');
		const disabledId = uniqueId('disabled-feature');

		registerFeature(
			createFeature({
				id: enabledId,
				name: 'Enabled',
				priority: 10,
				configKey: 'blocking'
			})
		);
		registerFeature(
			createFeature({
				id: disabledId,
				name: 'Disabled',
				priority: 20,
				configKey: 'captcha'
			})
		);

		const config = {
			...baseConfig,
			features: {
				blocking: true,
				captcha: false
			}
		};

		const enabled = getEnabledFeatures(config);
		const ids = enabled.map((f) => f.id);

		expect(ids).toContain(enabledId);
		expect(ids).not.toContain(disabledId);
	});

	it('returns sorted by priority', () => {
		const config = { ...baseConfig };
		const enabled = getEnabledFeatures(config);
		const priorities = enabled.map((f) => f.priority);

		for (let i = 1; i < priorities.length; i++) {
			expect(priorities[i]!).toBeGreaterThanOrEqual(priorities[i - 1]!);
		}
	});
});

describe('Feature Cache Management', () => {
	it('clearAllFeatureCaches calls clearCache on features', () => {
		let cacheClearCount = 0;

		const feature = createFeature({
			id: uniqueId('cache-test'),
			name: 'Cache Test',
			priority: 10,
			configKey: 'blocking',
			clearCache: () => {
				cacheClearCount++;
			}
		});

		registerFeature(feature);
		clearAllFeatureCaches();

		expect(cacheClearCount).toBeGreaterThanOrEqual(1);
	});

	it('getAllFeatureCacheStats collects stats from features', () => {
		const mockStats = {
			name: 'test-cache',
			size: 5,
			maxSize: 100,
			hits: 10,
			misses: 2,
			hitRate: 0.83,
			evictions: 0
		};

		const feature = createFeature({
			id: uniqueId('stats-test'),
			name: 'Stats Test',
			priority: 10,
			configKey: 'blocking',
			getCacheStats: () => mockStats
		});

		registerFeature(feature);
		const allStats = getAllFeatureCacheStats();

		const featureStats = allStats.find((s) => s.featureId === feature.id);
		expect(featureStats).toBeDefined();
		expect(featureStats?.stats).toEqual(mockStats);
	});

	it('skips features without cache stats', () => {
		const feature = createFeature({
			id: uniqueId('no-cache'),
			name: 'No Cache',
			priority: 10,
			configKey: 'blocking'
			// No getCacheStats method
		});

		registerFeature(feature);
		const allStats = getAllFeatureCacheStats();

		const featureStats = allStats.find((s) => s.featureId === feature.id);
		expect(featureStats).toBeUndefined();
	});
});

describe('Feature Configuration Types', () => {
	const baseConfig: SecurityConfig = {
		enabled: true,
		skipInDevelopment: false,
		captchaThreshold: 40,
		blockThreshold: 80,
		includePaths: ['/api/auth/'],
		excludePaths: ['/api/auth/health']
	};

	it('supports resilience configuration', () => {
		const config: SecurityConfig = {
			...baseConfig,
			resilience: {
				failMode: 'open',
				circuitBreaker: {
					enabled: true,
					failureThreshold: 5,
					resetTimeoutMs: 30000
				}
			}
		};

		expect(config.resilience?.failMode).toBe('open');
		expect(config.resilience?.circuitBreaker?.enabled).toBe(true);
	});

	it('supports blocking feature config', () => {
		const config: SecurityConfig = {
			...baseConfig,
			features: {
				blocking: {
					enabled: true,
					maxFailedAttempts: 5,
					blockDurationSeconds: 3600,
					escalatingBlocks: true
				}
			}
		};

		expect(isFeatureEnabled('blocking', config)).toBe(true);
	});

	it('supports rate limit feature config', () => {
		const config: SecurityConfig = {
			...baseConfig,
			features: {
				rateLimit: {
					enabled: true,
					defaultLimit: { maxRequests: 100, windowSeconds: 60 },
					rules: [
						{
							id: 'login-limit',
							name: 'Login Rate Limit',
							pathPattern: '/api/auth/login',
							maxRequests: 5,
							windowSeconds: 300
						}
					]
				}
			}
		};

		expect(isFeatureEnabled('rateLimit', config)).toBe(true);
	});

	it('supports geo feature config', () => {
		const config: SecurityConfig = {
			...baseConfig,
			features: {
				geo: {
					enabled: true,
					blockedCountries: ['KP'],
					highRiskCountries: ['RU', 'CN'],
					enableReputation: true
				}
			}
		};

		expect(isFeatureEnabled('geo', config)).toBe(true);
	});
});
