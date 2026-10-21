import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { auth } from '$lib/auth/server/config';
import { isAdminUser, type SessionUser } from '$lib/auth/server/auth-helpers';
import { isDevelopment } from '$lib/auth/shared/env';
import { getDefaultCollector } from '$lib/auth/security/analytics';
import { createSecurityContext } from '$lib/auth/security/core/context';
import type { SecurityContext } from '$lib/auth/security/core/context';
import type { RiskFactor, RiskLevel } from '$lib/auth/security/core/risk-engine';

export interface TestEvent {
	type?: string;
	userId?: string;
	sessionId?: string;
	success?: boolean;
	factors?: RiskFactor[];
	ip?: string;
	userAgent?: string;
	path?: string;
	method?: string;
	riskScore?: number;
	riskLevel?: RiskLevel;
	blocked?: boolean;
	captchaRequired?: boolean;
	rateLimited?: boolean;
	metadata?: Record<string, unknown>;
}

async function ensureTestAccess(request: Request): Promise<void> {
	const isTestRuntime = process.env.NODE_ENV === 'test';
	if (!isDevelopment() && !isTestRuntime) {
		throw error(404, 'Not found');
	}

	const session = await auth.api.getSession({ headers: request.headers });
	const user = session?.user as SessionUser | undefined;
	if (!user || !isAdminUser(user)) {
		throw error(403, 'Admin access required');
	}
}

export async function _injectEvents(
	events: TestEvent[],
	userId: string = 'test-user',
	clientIP?: string,
	request?: Request
) {
	const collector = getDefaultCollector();
	const ip = clientIP || '127.0.0.1';
	const req = request || new Request('http://localhost/api/admin/security/scenarios/inject');

	// Inject test events
	for (const eventData of events) {
		const eventUserId = eventData.userId ?? userId;
		const eventPath =
			typeof eventData.path === 'string' && eventData.path.startsWith('/')
				? eventData.path
				: '/api/admin/security/scenarios/inject';
		const eventMethod = eventData.method ?? 'POST';

		// Create a mock request with custom headers for testing
		const mockRequest = new Request(`http://localhost${eventPath}`, {
			method: eventMethod,
			headers: {
				'User-Agent': eventData.userAgent || req.headers.get('user-agent') || 'Test Agent',
				'X-Forwarded-For': eventData.ip || ip,
				'X-Test-Event': 'true',
				'X-Test-User-Id': eventUserId,
				'X-Test-Session-Id': eventData.sessionId ?? ''
			}
		});

		// Create SecurityContext from the mock request
		const ctx: SecurityContext = createSecurityContext(mockRequest);

		// Override some values for testing
		if (eventUserId) ctx.userId = eventUserId;
		if (eventData.sessionId) ctx.sessionId = eventData.sessionId;
		if (eventData.factors) ctx.riskFactors = eventData.factors;
		if (typeof eventData.riskScore === 'number') {
			ctx.riskScore = eventData.riskScore;
		} else if (eventData.factors && eventData.factors.length > 0) {
			ctx.riskScore = eventData.factors.reduce((sum, factor) => sum + factor.score, 0);
		}
		if (eventData.riskLevel) ctx.riskLevel = eventData.riskLevel;
		if (typeof eventData.blocked === 'boolean') ctx.blocked = eventData.blocked;
		if (typeof eventData.captchaRequired === 'boolean')
			ctx.captchaRequired = eventData.captchaRequired;
		if (typeof eventData.rateLimited === 'boolean') ctx.rateLimited = eventData.rateLimited;

		// Record the event with the collector
		await collector.recordEvent(ctx, eventData.type || 'auth_success', {
			...eventData.metadata,
			test: true,
			injectedAt: new Date().toISOString(),
			success: eventData.success ?? true,
			sessionId: eventData.sessionId,
			path: eventPath,
			method: eventMethod
		});
	}

	return {
		success: true,
		injected: events.length,
		message: `Successfully injected ${events.length} test events`
	};
}

export const POST: RequestHandler = async ({ request, getClientAddress }) => {
	try {
		await ensureTestAccess(request);

		const body = await request.json();
		const { events, userId = 'test-user' }: { events: TestEvent[]; userId?: string } = body;

		if (!Array.isArray(events) || events.length === 0) {
			throw error(400, 'Events array is required');
		}

		const result = await _injectEvents(events, userId, getClientAddress(), request);
		return json(result);
	} catch (err) {
		if (err && typeof err === 'object' && 'status' in err) {
			throw err;
		}

		console.error('Failed to inject test events:', err);
		throw error(500, 'Failed to inject test events');
	}
};

// Predefined test event sets
export const GET: RequestHandler = async ({ request }) => {
	await ensureTestAccess(request);

	const presets: Record<string, TestEvent[]> = {
		brute_force: [
			{
				type: 'auth_failure',
				success: false,
				factors: [{ source: 'auth', factor: 'invalid_password', score: 10 }]
			},
			{
				type: 'auth_failure',
				success: false,
				factors: [{ source: 'auth', factor: 'invalid_password', score: 10 }]
			},
			{
				type: 'auth_failure',
				success: false,
				factors: [{ source: 'auth', factor: 'invalid_password', score: 10 }]
			},
			{
				type: 'auth_failure',
				success: false,
				factors: [{ source: 'auth', factor: 'invalid_password', score: 10 }]
			},
			{
				type: 'auth_failure',
				success: false,
				factors: [{ source: 'auth', factor: 'invalid_password', score: 10 }]
			}
		],
		suspicious_ip: [
			{
				type: 'auth_success',
				ip: '192.168.1.100',
				factors: [
					{ source: 'geo', factor: 'vpn_detected', score: 30 },
					{ source: 'device', factor: 'new_device', score: 20 }
				],
				metadata: { country: 'CN', asn: 'Unknown' }
			}
		],
		bot_behavior: [
			{
				type: 'auth_success',
				userAgent: 'curl/7.68.0',
				factors: [
					{ source: 'behavior', factor: 'bot_detected', score: 40 },
					{ source: 'behavior', factor: 'no_mouse_movement', score: 20 }
				],
				metadata: { requestPattern: 'linear' }
			}
		],
		mixed_threats: [
			{
				type: 'auth_failure',
				success: false,
				factors: [{ source: 'auth', factor: 'invalid_password', score: 10 }]
			},
			{
				type: 'auth_failure',
				success: false,
				factors: [{ source: 'auth', factor: 'invalid_password', score: 10 }]
			},
			{
				type: 'auth_failure',
				success: false,
				factors: [{ source: 'auth', factor: 'invalid_password', score: 10 }]
			},
			{
				type: 'auth_success',
				ip: '185.220.101.182',
				factors: [
					{ source: 'geo', factor: 'tor_detected', score: 50 },
					{ source: 'device', factor: 'new_device', score: 20 }
				],
				metadata: { country: 'Unknown' }
			},
			{
				type: 'blocked',
				factors: [{ source: 'rate_limit', factor: 'rate_limit_exceeded', score: 60 }]
			}
		]
	};

	return json({ presets });
};
