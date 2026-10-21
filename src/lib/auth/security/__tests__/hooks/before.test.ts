/**
 * Before Hook Tests
 *
 * Tests for the unified before hook including:
 * - Feature execution in priority order
 * - Partial failure handling
 * - Risk score calculation
 * - Blocking and CAPTCHA responses
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createBeforeHook } from '../../hooks/before';
import { createTestSecurityContext } from '../../core/context';
import type { SecurityFeature, SecurityConfig, FeatureResult } from '../../core/feature';
import { FEATURE_PRIORITY } from '../../core/feature';

// ============================================
// Test Helpers
// ============================================

function createMockConfig(overrides: Partial<SecurityConfig> = {}): SecurityConfig {
	return {
		enabled: true,
		skipInDevelopment: false,
		captchaThreshold: 40,
		blockThreshold: 80,
		// ctx.path in Better Auth hooks is endpoint-relative (e.g.
		// '/sign-in/email'), not the '/api/auth/...' URL path.
		includePaths: [],
		excludePaths: ['/security/', '/get-session'],
		...overrides
	};
}

function createMockFeature(
	id: string,
	priority: number,
	checkFn?: (ctx: unknown) => Promise<FeatureResult | null>
): SecurityFeature {
	return {
		id,
		name: `Mock ${id}`,
		priority,
		configKey: 'blocking',
		check: checkFn ?? (async () => null)
	};
}

function createMockRequest(path: string = '/api/auth/sign-in'): Request {
	return new Request(`http://localhost${path}`, {
		method: 'POST',
		headers: {
			'user-agent': 'test-agent',
			'x-forwarded-for': '1.2.3.4'
		}
	});
}

// ============================================
// Tests
// ============================================

describe('createBeforeHook', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('hook creation', () => {
		it('returns empty array when plugin is disabled', () => {
			const config = createMockConfig({ enabled: false });
			const hooks = createBeforeHook({ config });

			expect(hooks).toEqual([]);
		});

		it('returns hook array when plugin is enabled', () => {
			const config = createMockConfig();
			const hooks = createBeforeHook({ config });

			expect(hooks).toHaveLength(1);
			expect(hooks[0]).toHaveProperty('matcher');
			expect(hooks[0]).toHaveProperty('handler');
		});
	});

	describe('path matching', () => {
		it('processes all endpoints when includePaths is empty', () => {
			const config = createMockConfig({
				includePaths: [],
				excludePaths: []
			});
			const hooks = createBeforeHook({ config });
			const matcher = hooks[0]!.matcher;

			// Endpoint-relative paths as produced by Better Auth
			expect(matcher({ path: '/sign-in/email', context: {} } as never)).toBe(true);
			expect(matcher({ path: '/sign-up/email', context: {} } as never)).toBe(true);
			expect(matcher({ path: '/request-password-reset', context: {} } as never)).toBe(true);
		});

		it('excludes excluded endpoint-relative paths', () => {
			const config = createMockConfig({
				includePaths: [],
				excludePaths: ['/security/', '/get-session']
			});
			const hooks = createBeforeHook({ config });
			const matcher = hooks[0]!.matcher;

			expect(matcher({ path: '/security/verify-captcha', context: {} } as never)).toBe(false);
			expect(matcher({ path: '/get-session', context: {} } as never)).toBe(false);
			expect(matcher({ path: '/sign-in/email', context: {} } as never)).toBe(true);
		});

		it('does not match paths outside includePaths', () => {
			const config = createMockConfig({
				includePaths: ['/sign-in', '/sign-up'],
				excludePaths: []
			});
			const hooks = createBeforeHook({ config });
			const matcher = hooks[0]!.matcher;

			expect(matcher({ path: '/sign-in/email', context: {} } as never)).toBe(true);
			expect(matcher({ path: '/get-session', context: {} } as never)).toBe(false);
		});
	});

	describe('feature execution order', () => {
		it('runs features in priority order', async () => {
			const executionOrder: string[] = [];

			const feature1 = createMockFeature('geo', FEATURE_PRIORITY.GEO, async () => {
				executionOrder.push('geo');
				return null;
			});

			const feature2 = createMockFeature('blocking', FEATURE_PRIORITY.BLOCKING, async () => {
				executionOrder.push('blocking');
				return null;
			});

			const feature3 = createMockFeature('rateLimit', FEATURE_PRIORITY.RATE_LIMIT, async () => {
				executionOrder.push('rateLimit');
				return null;
			});

			const config = createMockConfig();
			const hooks = createBeforeHook({
				config,
				features: [feature1, feature2, feature3].sort((a, b) => a.priority - b.priority)
			});

			const mockCtx = {
				request: createMockRequest(),
				path: '/api/auth/sign-in',
				context: {}
			};

			await hooks[0]!.handler(mockCtx as never);

			expect(executionOrder).toEqual(['blocking', 'rateLimit', 'geo']);
		});
	});

	describe('blocking behavior', () => {
		it('stops execution and returns block response when feature blocks', async () => {
			const executionOrder: string[] = [];

			const blockingFeature = createMockFeature('blocking', FEATURE_PRIORITY.BLOCKING, async () => {
				executionOrder.push('blocking');
				return {
					block: true,
					blockReason: 'ip_blocked'
				};
			});

			const geoFeature = createMockFeature('geo', FEATURE_PRIORITY.GEO, async () => {
				executionOrder.push('geo');
				return null;
			});

			const config = createMockConfig();
			const hooks = createBeforeHook({
				config,
				features: [blockingFeature, geoFeature]
			});

			const mockCtx = {
				request: createMockRequest(),
				path: '/api/auth/sign-in',
				context: {}
			};

			const result = await hooks[0]!.handler(mockCtx as never);

			expect(executionOrder).toEqual(['blocking']);
			expect(result).toHaveProperty('response');
			expect(result.response?.status).toBe(403);
		});

		it('blocks when risk score exceeds block threshold', async () => {
			const highRiskFeature = createMockFeature('geo', FEATURE_PRIORITY.GEO, async () => {
				return {
					riskFactors: [
						{ source: 'geo', factor: 'vpn', score: 50 },
						{ source: 'geo', factor: 'tor', score: 35 }
					]
				};
			});

			const config = createMockConfig({ blockThreshold: 80 });
			const hooks = createBeforeHook({
				config,
				features: [highRiskFeature]
			});

			const mockCtx = {
				request: createMockRequest(),
				path: '/api/auth/sign-in',
				context: {}
			};

			const result = await hooks[0]!.handler(mockCtx as never);

			expect(result).toHaveProperty('response');
			expect(result.response?.status).toBe(403);

			const body = await result.response?.json();
			expect(body.code).toBe('BLOCKED');
		});
	});

	describe('CAPTCHA requirement', () => {
		it('requires CAPTCHA when risk score is between thresholds', async () => {
			const mediumRiskFeature = createMockFeature('geo', FEATURE_PRIORITY.GEO, async () => {
				return {
					riskFactors: [{ source: 'geo', factor: 'vpn', score: 50 }]
				};
			});

			const config = createMockConfig({
				captchaThreshold: 40,
				blockThreshold: 80
			});

			const hooks = createBeforeHook({
				config,
				features: [mediumRiskFeature]
			});

			const mockCtx = {
				request: createMockRequest(),
				path: '/api/auth/sign-in',
				context: {}
			};

			const result = await hooks[0]!.handler(mockCtx as never);

			expect(result).toHaveProperty('response');
			expect(result.response?.status).toBe(428);

			const body = await result.response?.json();
			expect(body.code).toBe('CAPTCHA_REQUIRED');
			expect(body.captchaRequired).toBe(true);
		});

		it('does not require CAPTCHA when risk score is below threshold', async () => {
			const lowRiskFeature = createMockFeature('geo', FEATURE_PRIORITY.GEO, async () => {
				return {
					riskFactors: [{ source: 'geo', factor: 'new_country', score: 20 }]
				};
			});

			const config = createMockConfig({
				captchaThreshold: 40,
				blockThreshold: 80
			});

			const hooks = createBeforeHook({
				config,
				features: [lowRiskFeature]
			});

			const mockCtx = {
				request: createMockRequest(),
				path: '/api/auth/sign-in',
				context: {}
			};

			const result = await hooks[0]!.handler(mockCtx as never);

			expect(result.response).toBeUndefined();
		});
	});

	describe('partial failure handling', () => {
		it('continues execution when feature throws (fail-open mode)', async () => {
			const executionOrder: string[] = [];

			const failingFeature = createMockFeature('failing', FEATURE_PRIORITY.BLOCKING, async () => {
				executionOrder.push('failing');
				throw new Error('Feature failed');
			});

			const workingFeature = createMockFeature('working', FEATURE_PRIORITY.GEO, async () => {
				executionOrder.push('working');
				return null;
			});

			const config = createMockConfig({
				resilience: { failMode: 'open' }
			});

			const hooks = createBeforeHook({
				config,
				features: [failingFeature, workingFeature]
			});

			const mockCtx = {
				request: createMockRequest(),
				path: '/api/auth/sign-in',
				context: {}
			};

			const result = await hooks[0]!.handler(mockCtx as never);

			expect(executionOrder).toEqual(['failing', 'working']);
			expect(result.response).toBeUndefined();
		});

		it('adds risk score when feature throws in fail-closed mode', async () => {
			const failingFeature = createMockFeature('failing', FEATURE_PRIORITY.BLOCKING, async () => {
				throw new Error('Feature failed');
			});

			const config = createMockConfig({
				resilience: { failMode: 'closed' },
				captchaThreshold: 5,
				blockThreshold: 80
			});

			const hooks = createBeforeHook({
				config,
				features: [failingFeature]
			});

			const mockCtx = {
				request: createMockRequest(),
				path: '/api/auth/sign-in',
				context: {}
			};

			const result = await hooks[0]!.handler(mockCtx as never);

			expect(result.response?.status).toBe(428);
		});
	});

	describe('risk factor accumulation', () => {
		it('accumulates risk factors from multiple features', async () => {
			const feature1 = createMockFeature('geo', FEATURE_PRIORITY.GEO, async () => {
				return {
					riskFactors: [{ source: 'geo', factor: 'vpn', score: 20 }]
				};
			});

			const feature2 = createMockFeature('device', FEATURE_PRIORITY.DEVICE, async () => {
				return {
					riskFactors: [{ source: 'device', factor: 'new_device', score: 20 }]
				};
			});

			const config = createMockConfig({
				captchaThreshold: 35,
				blockThreshold: 80
			});

			const hooks = createBeforeHook({
				config,
				features: [feature1, feature2]
			});

			const mockCtx = {
				request: createMockRequest(),
				path: '/api/auth/sign-in',
				context: {}
			};

			const result = await hooks[0]!.handler(mockCtx as never);

			expect(result.response?.status).toBe(428);
		});
	});

	describe('context attachment', () => {
		it('attaches security context when request passes', async () => {
			const config = createMockConfig();
			const hooks = createBeforeHook({
				config,
				features: []
			});

			const mockCtx = {
				request: createMockRequest(),
				path: '/api/auth/sign-in',
				context: {}
			};

			await hooks[0]!.handler(mockCtx as never);

			expect(mockCtx.context).toHaveProperty('securityContext');
		});
	});
});

describe('SecurityContext creation', () => {
	it('creates context with correct IP from x-forwarded-for', () => {
		const ctx = createTestSecurityContext({ ip: '1.2.3.4' });
		expect(ctx.ip).toBe('1.2.3.4');
	});

	it('creates context with default risk values', () => {
		const ctx = createTestSecurityContext();
		expect(ctx.riskScore).toBe(0);
		expect(ctx.riskLevel).toBe('low');
		expect(ctx.riskFactors).toEqual([]);
	});

	it('emits events correctly', () => {
		const ctx = createTestSecurityContext();
		ctx.emit('blocked', { reason: 'test' });

		expect(ctx.events).toHaveLength(1);
		expect(ctx.events[0]?.type).toBe('blocked');
		expect(ctx.events[0]?.data).toEqual({ reason: 'test' });
	});
});
