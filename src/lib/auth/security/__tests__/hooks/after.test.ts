/**
 * After Hook Tests
 *
 * Tests for the unified after hook including:
 * - Auth success path matching
 * - Feature recording
 * - Event emission
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createAfterHook, isAuthSuccessPath } from '../../hooks/after';
import { createTestSecurityContext, attachSecurityContext } from '../../core/context';
import type { SecurityFeature, SecurityConfig } from '../../core/feature';
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
		includePaths: ['/api/auth'],
		excludePaths: [],
		...overrides
	};
}

function createMockFeature(
	id: string,
	priority: number,
	recordFn?: (ctx: unknown) => Promise<void>
): SecurityFeature {
	return {
		id,
		name: `Mock ${id}`,
		priority,
		configKey: 'blocking',
		record: recordFn
	};
}

// ============================================
// Tests
// ============================================

describe('isAuthSuccessPath', () => {
	it('returns true for sign-in paths', () => {
		expect(isAuthSuccessPath('/sign-in')).toBe(true);
		expect(isAuthSuccessPath('/sign-in/email')).toBe(true);
		expect(isAuthSuccessPath('/api/auth/sign-in')).toBe(true);
		expect(isAuthSuccessPath('/api/auth/sign-in/email')).toBe(true);
	});

	it('returns true for sign-up paths', () => {
		expect(isAuthSuccessPath('/sign-up')).toBe(true);
		expect(isAuthSuccessPath('/api/auth/sign-up')).toBe(true);
	});

	it('returns true for callback paths', () => {
		expect(isAuthSuccessPath('/api/auth/callback')).toBe(true);
		expect(isAuthSuccessPath('/api/auth/callback/google')).toBe(true);
	});

	it('returns false for non-auth paths', () => {
		expect(isAuthSuccessPath('/api/users')).toBe(false);
		expect(isAuthSuccessPath('/dashboard')).toBe(false);
		expect(isAuthSuccessPath('/api/auth/status')).toBe(false);
	});
});

describe('createAfterHook', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('hook creation', () => {
		it('returns empty array when plugin is disabled', () => {
			const config = createMockConfig({ enabled: false });
			const hooks = createAfterHook({ config });

			expect(hooks).toEqual([]);
		});

		it('returns hook array when plugin is enabled', () => {
			const config = createMockConfig();
			const hooks = createAfterHook({ config });

			expect(hooks).toHaveLength(1);
			expect(hooks[0]).toHaveProperty('matcher');
			expect(hooks[0]).toHaveProperty('handler');
		});
	});

	describe('matcher', () => {
		it('matches when user is authenticated and path is auth success', () => {
			const config = createMockConfig();
			const hooks = createAfterHook({ config });
			const matcher = hooks[0]!.matcher;

			const context = {
				path: '/api/auth/sign-in',
				context: {
					session: {
						user: { id: 'user-123' }
					}
				}
			};

			expect(matcher(context as never)).toBe(true);
		});

		it('does not match when user is not authenticated', () => {
			const config = createMockConfig();
			const hooks = createAfterHook({ config });
			const matcher = hooks[0]!.matcher;

			const context = {
				path: '/api/auth/sign-in',
				context: {}
			};

			expect(matcher(context as never)).toBe(false);
		});

		it('does not match for non-auth paths even with user', () => {
			const config = createMockConfig();
			const hooks = createAfterHook({ config });
			const matcher = hooks[0]!.matcher;

			const context = {
				path: '/api/users',
				context: {
					session: {
						user: { id: 'user-123' }
					}
				}
			};

			expect(matcher(context as never)).toBe(false);
		});
	});

	describe('feature recording', () => {
		it('calls record on all features', async () => {
			const recordCalls: string[] = [];

			const feature1 = createMockFeature('device', FEATURE_PRIORITY.DEVICE, async () => {
				recordCalls.push('device');
			});

			const feature2 = createMockFeature('geo', FEATURE_PRIORITY.GEO, async () => {
				recordCalls.push('geo');
			});

			const config = createMockConfig();
			const hooks = createAfterHook({
				config,
				features: [feature1, feature2]
			});

			const securityCtx = createTestSecurityContext({ ip: '1.2.3.4' });

			const mockCtx = {
				request: new Request('http://localhost/api/auth/sign-in'),
				path: '/api/auth/sign-in',
				context: {
					session: {
						user: { id: 'user-123' }
					}
				}
			};

			attachSecurityContext(mockCtx, securityCtx);

			await hooks[0]!.handler(mockCtx as never);

			expect(recordCalls).toContain('device');
			expect(recordCalls).toContain('geo');
		});

		it('continues recording even if one feature throws', async () => {
			const recordCalls: string[] = [];

			const failingFeature = createMockFeature('failing', FEATURE_PRIORITY.BLOCKING, async () => {
				recordCalls.push('failing');
				throw new Error('Record failed');
			});

			const workingFeature = createMockFeature('working', FEATURE_PRIORITY.GEO, async () => {
				recordCalls.push('working');
			});

			const config = createMockConfig();
			const hooks = createAfterHook({
				config,
				features: [failingFeature, workingFeature]
			});

			const securityCtx = createTestSecurityContext({ ip: '1.2.3.4' });

			const mockCtx = {
				request: new Request('http://localhost/api/auth/sign-in'),
				path: '/api/auth/sign-in',
				context: {
					session: {
						user: { id: 'user-123' }
					}
				}
			};

			attachSecurityContext(mockCtx, securityCtx);

			await hooks[0]!.handler(mockCtx as never);

			expect(recordCalls).toEqual(['failing', 'working']);
		});
	});

	describe('event emission', () => {
		it('emits request_complete event', async () => {
			const config = createMockConfig();
			const hooks = createAfterHook({
				config,
				features: []
			});

			const securityCtx = createTestSecurityContext({
				ip: '1.2.3.4',
				riskScore: 25,
				riskLevel: 'low'
			});

			const mockCtx = {
				request: new Request('http://localhost/api/auth/sign-in'),
				path: '/api/auth/sign-in',
				context: {
					session: {
						user: { id: 'user-123' }
					}
				}
			};

			attachSecurityContext(mockCtx, securityCtx);

			await hooks[0]!.handler(mockCtx as never);

			const completeEvent = securityCtx.events.find((e) => e.type === 'request_complete');
			expect(completeEvent).toBeDefined();
			expect(completeEvent?.data).toMatchObject({
				userId: 'user-123',
				riskScore: 25,
				riskLevel: 'low'
			});
		});
	});

	describe('callback integration', () => {
		it('calls onRequestComplete callback', async () => {
			const callbackCalls: string[] = [];

			const config = createMockConfig();
			const hooks = createAfterHook({
				config,
				features: [],
				onRequestComplete: async (ctx) => {
					callbackCalls.push(ctx.userId ?? 'unknown');
				}
			});

			const securityCtx = createTestSecurityContext({ ip: '1.2.3.4' });

			const mockCtx = {
				request: new Request('http://localhost/api/auth/sign-in'),
				path: '/api/auth/sign-in',
				context: {
					session: {
						user: { id: 'user-456' }
					}
				}
			};

			attachSecurityContext(mockCtx, securityCtx);

			await hooks[0]!.handler(mockCtx as never);

			expect(callbackCalls).toContain('user-456');
		});

		it('handles callback errors gracefully', async () => {
			const config = createMockConfig();
			const hooks = createAfterHook({
				config,
				features: [],
				onRequestComplete: async () => {
					throw new Error('Callback failed');
				}
			});

			const securityCtx = createTestSecurityContext({ ip: '1.2.3.4' });

			const mockCtx = {
				request: new Request('http://localhost/api/auth/sign-in'),
				path: '/api/auth/sign-in',
				context: {
					session: {
						user: { id: 'user-789' }
					}
				}
			};

			attachSecurityContext(mockCtx, securityCtx);

			const result = await hooks[0]!.handler(mockCtx as never);

			expect(result).toHaveProperty('context');
		});
	});
});
