import { describe, it, expect, beforeEach } from 'vitest';
import {
	createSecurityContext,
	createTestSecurityContext,
	getSecurityContext,
	attachSecurityContext,
	hasElevatedRisk,
	getContextSummary,
	type SecurityContext
} from '../../core/context';
import { setTrustProxy } from '../../core/helpers';

describe('createSecurityContext', () => {
	beforeEach(() => {
		setTrustProxy('proxy');
	});

	it('creates context from request', () => {
		const request = new Request('http://localhost/api/auth/login', {
			method: 'POST',
			headers: {
				'user-agent': 'Mozilla/5.0',
				'x-forwarded-for': '1.2.3.4'
			}
		});

		const ctx = createSecurityContext(request);

		expect(ctx.requestId).toBeDefined();
		expect(ctx.ip).toBe('1.2.3.4');
		expect(ctx.userAgent).toBe('Mozilla/5.0');
		expect(ctx.path).toBe('/api/auth/login');
		expect(ctx.method).toBe('POST');
		expect(ctx.timestamp).toBeLessThanOrEqual(Date.now());
	});

	it('has correct initial values', () => {
		const request = new Request('http://localhost/test');
		const ctx = createSecurityContext(request);

		expect(ctx.riskFactors).toEqual([]);
		expect(ctx.riskScore).toBe(0);
		expect(ctx.riskLevel).toBe('low');
		expect(ctx.blocked).toBe(false);
		expect(ctx.captchaRequired).toBe(false);
		expect(ctx.captchaPassed).toBe(false);
		expect(ctx.rateLimited).toBe(false);
		expect(ctx.events).toEqual([]);
	});

	it('handles missing headers gracefully', () => {
		const request = new Request('http://localhost/test');
		const ctx = createSecurityContext(request);

		expect(ctx.userAgent).toBe('');
		expect(ctx.ip).toBe('0.0.0.0');
	});
});

describe('createTestSecurityContext', () => {
	it('creates context with defaults', () => {
		const ctx = createTestSecurityContext();

		expect(ctx.requestId).toBeDefined();
		expect(ctx.ip).toBe('127.0.0.1');
		expect(ctx.userAgent).toBe('test-agent');
		expect(ctx.path).toBe('/test');
		expect(ctx.method).toBe('GET');
	});

	it('applies overrides', () => {
		const ctx = createTestSecurityContext({
			ip: '8.8.8.8',
			path: '/custom/path',
			userId: 'user-123',
			riskScore: 50,
			riskLevel: 'medium',
			blocked: true,
			blockReason: 'test block'
		});

		expect(ctx.ip).toBe('8.8.8.8');
		expect(ctx.path).toBe('/custom/path');
		expect(ctx.userId).toBe('user-123');
		expect(ctx.riskScore).toBe(50);
		expect(ctx.riskLevel).toBe('medium');
		expect(ctx.blocked).toBe(true);
		expect(ctx.blockReason).toBe('test block');
	});

	it('applies optional data overrides', () => {
		const geo = { country: 'US', countryCode: 'US' };
		const reputation = {
			ip: '1.2.3.4',
			trustScore: 80,
			riskScore: 20,
			isVpn: false,
			isTor: false,
			isProxy: false,
			isMalicious: false,
			isDatacenter: false,
			isResidential: true,
			isMobile: false,
			isCrawler: false,
			threatTypes: [],
			source: 'test'
		};

		const ctx = createTestSecurityContext({
			geo,
			reputation,
			sessionId: 'session-123',
			userRoles: ['admin']
		});

		expect(ctx.geo).toEqual(geo);
		expect(ctx.reputation).toEqual(reputation);
		expect(ctx.sessionId).toBe('session-123');
		expect(ctx.userRoles).toEqual(['admin']);
	});
});

describe('Event Emission', () => {
	let ctx: SecurityContext;

	beforeEach(() => {
		ctx = createTestSecurityContext();
	});

	it('emits and records events', () => {
		ctx.emit('blocked', { reason: 'test' });

		expect(ctx.events).toHaveLength(1);
		expect(ctx.events[0]?.type).toBe('blocked');
		expect(ctx.events[0]?.data).toEqual({ reason: 'test' });
		expect(ctx.events[0]?.timestamp).toBeDefined();
	});

	it('records multiple events', () => {
		ctx.emit('captcha_required');
		ctx.emit('captcha_passed');
		ctx.emit('request_complete');

		expect(ctx.events).toHaveLength(3);
		expect(ctx.events.map((e) => e.type)).toEqual([
			'captcha_required',
			'captcha_passed',
			'request_complete'
		]);
	});

	it('supports events without data', () => {
		ctx.emit('rate_limited');

		expect(ctx.events[0]?.data).toBeUndefined();
	});
});

describe('Context Attachment', () => {
	it('attaches security context to auth context', () => {
		const authCtx = { context: {} };
		const securityCtx = createTestSecurityContext();

		attachSecurityContext(authCtx, securityCtx);

		expect((authCtx.context as Record<string, unknown>).securityContext).toBe(securityCtx);
	});

	it('retrieves attached security context', () => {
		const securityCtx = createTestSecurityContext();
		const authCtx = {
			context: { securityContext: securityCtx }
		};

		const retrieved = getSecurityContext(authCtx);
		expect(retrieved).toBe(securityCtx);
	});

	it('returns null when no security context', () => {
		expect(getSecurityContext({})).toBeNull();
		expect(getSecurityContext({ context: {} })).toBeNull();
	});

	it('initializes context object when missing and attaches', () => {
		const authCtx: { context?: unknown } = {};
		const securityCtx = createTestSecurityContext();

		attachSecurityContext(authCtx, securityCtx);

		expect(authCtx.context).toBeDefined();
		expect((authCtx.context as Record<string, unknown>).securityContext).toBe(securityCtx);
	});

	it('initializes context object when null and attaches', () => {
		const authCtx: { context?: unknown } = { context: null };
		const securityCtx = createTestSecurityContext();

		attachSecurityContext(authCtx, securityCtx);

		expect(authCtx.context).toBeDefined();
		expect((authCtx.context as Record<string, unknown>).securityContext).toBe(securityCtx);
	});
});

describe('hasElevatedRisk', () => {
	it('returns false for low risk', () => {
		const ctx = createTestSecurityContext({ riskLevel: 'low' });
		expect(hasElevatedRisk(ctx)).toBe(false);
	});

	it('returns true for medium risk', () => {
		const ctx = createTestSecurityContext({ riskLevel: 'medium' });
		expect(hasElevatedRisk(ctx)).toBe(true);
	});

	it('returns true for high risk', () => {
		const ctx = createTestSecurityContext({ riskLevel: 'high' });
		expect(hasElevatedRisk(ctx)).toBe(true);
	});

	it('returns true for critical risk', () => {
		const ctx = createTestSecurityContext({ riskLevel: 'critical' });
		expect(hasElevatedRisk(ctx)).toBe(true);
	});
});

describe('getContextSummary', () => {
	it('returns summary object with key fields', () => {
		const ctx = createTestSecurityContext({
			ip: '1.2.3.4',
			path: '/api/test',
			method: 'POST',
			userId: 'user-123',
			riskScore: 45,
			riskLevel: 'medium',
			blocked: false,
			captchaRequired: true,
			rateLimited: false,
			riskFactors: [{ source: 'test', factor: 'test_factor', score: 10 }]
		});
		ctx.emit('captcha_required');

		const summary = getContextSummary(ctx);

		expect(summary.requestId).toBe(ctx.requestId);
		expect(summary.ip).toBe('1.2.3.4');
		expect(summary.path).toBe('/api/test');
		expect(summary.method).toBe('POST');
		expect(summary.userId).toBe('user-123');
		expect(summary.riskScore).toBe(45);
		expect(summary.riskLevel).toBe('medium');
		expect(summary.blocked).toBe(false);
		expect(summary.captchaRequired).toBe(true);
		expect(summary.rateLimited).toBe(false);
		expect(summary.factorCount).toBe(1);
		expect(summary.eventCount).toBe(1);
	});
});

describe('Context Mutability', () => {
	it('allows modifying mutable fields', () => {
		const ctx = createTestSecurityContext();

		ctx.userId = 'new-user';
		ctx.riskScore = 75;
		ctx.riskLevel = 'high';
		ctx.blocked = true;
		ctx.blockReason = 'Too risky';
		ctx.riskFactors.push({ source: 'test', factor: 'test_factor', score: 25 });

		expect(ctx.userId).toBe('new-user');
		expect(ctx.riskScore).toBe(75);
		expect(ctx.riskLevel).toBe('high');
		expect(ctx.blocked).toBe(true);
		expect(ctx.blockReason).toBe('Too risky');
		expect(ctx.riskFactors).toHaveLength(1);
	});

	it('has readonly request identification fields', () => {
		const ctx = createTestSecurityContext({
			requestId: 'fixed-id',
			ip: '1.2.3.4',
			path: '/test'
		});

		// These are readonly - attempting to assign would be a TS error
		expect(ctx.requestId).toBe('fixed-id');
		expect(ctx.ip).toBe('1.2.3.4');
		expect(ctx.path).toBe('/test');
	});
});
