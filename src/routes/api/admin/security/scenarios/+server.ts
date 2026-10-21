import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { logger } from '#lib/auth/shared/logger.js';
import { auth } from '#lib/auth/server/config.js';
import { isAdminUser, type SessionUser } from '#lib/auth/server/auth-helpers.js';
import { isDevelopment } from '#lib/auth/shared/env/index.js';
import { z } from 'zod';
import { _injectEvents, type TestEvent } from './inject/+server';

// Test scenarios for security plugin
const TEST_SCENARIOS = {
	// IP-based scenarios
	vpn_ip: { ip: '8.8.8.8', description: 'VPN/Proxy IP (Google DNS)' },
	tor_ip: { ip: '185.220.101.182', description: 'Tor exit node' },
	datacenter_ip: { ip: '3.93.0.0', description: 'AWS datacenter IP' },
	malicious_ip: { ip: '192.168.1.100', description: 'Known malicious IP' },

	// Location scenarios
	suspicious_location: { country: 'CN', description: 'Suspicious country' },
	new_location: { distance: 5000, description: 'Impossible travel (5000km in 1min)' },

	// Device scenarios
	new_device: { userAgent: 'NewBot/1.0', description: 'Unknown device fingerprint' },
	bot_device: { userAgent: 'curl/7.68.0', description: 'Bot/crawler user agent' },

	// Behavior scenarios
	rapid_requests: { count: 1, interval: 1000, description: 'Single rate-limited request event' },
	failed_logins: { count: 1, description: 'Single failed login event' },
	mouse_bot: { pattern: 'linear', description: 'Linear mouse movement (bot-like)' },

	// Session scenarios
	concurrent_sessions: { count: 1, description: 'Single session anomaly event' },
	long_session: { hours: 24, description: '24+ hour session' },

	// Panel coverage scenarios
	password_reset: { description: 'Password reset request event' },
	trusted_device: { description: 'Low-risk trusted device login' },
	api_key_usage: { description: 'API key authenticated request' }
};

const postParamsSchema = z.object({
	scenario: z.string().min(1),
	action: z.enum(['simulate', 'inject']).default('simulate')
});

const postBodySchema = z
	.object({
		userId: z.string().min(1).max(200).optional()
	})
	.optional();

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

function getInstructions(scenario: string, testScenario: Record<string, unknown>): string {
	switch (scenario) {
		case 'vpn_ip':
		case 'tor_ip':
		case 'datacenter_ip':
		case 'malicious_ip':
			return `Make a request from IP ${testScenario.ip as string} to trigger IP intelligence checks`;

		case 'rapid_requests':
			return `Inject ${testScenario.count as number} rate-limited request event (${testScenario.interval as number}ms window metadata)`;

		case 'failed_logins':
			return `Inject ${testScenario.count as number} failed login event`;

		case 'new_device':
			return `Use user agent "${testScenario.userAgent as string}" to trigger new device detection`;

		case 'password_reset':
			return 'Trigger one password reset request event for the auth metrics panel';

		case 'trusted_device':
			return 'Trigger one low-risk authenticated request to populate trusted device metrics';

		case 'api_key_usage':
			return 'Trigger one API request tagged with an API key ID for API Security panel coverage';

		default:
			return 'Follow the scenario description to trigger the security event';
	}
}

export const GET: RequestHandler = async ({ url, request }) => {
	await ensureTestAccess(request);

	const scenario = url.searchParams.get('scenario');
	const action = url.searchParams.get('action') || 'trigger';

	if (!scenario || !TEST_SCENARIOS[scenario as keyof typeof TEST_SCENARIOS]) {
		return json({
			available: Object.keys(TEST_SCENARIOS),
			usage: '?scenario=<scenario_name>&action=<trigger|reset>'
		});
	}

	const testScenario = TEST_SCENARIOS[scenario as keyof typeof TEST_SCENARIOS];

	logger.info('Security test scenario triggered', { scenario, action, testScenario });

	return json({
		scenario,
		description: testScenario.description,
		message: `Test scenario "${testScenario.description}" ready to be triggered`,
		instructions: getInstructions(scenario, testScenario)
	});
};

export const POST: RequestHandler = async ({ request, url, getClientAddress }) => {
	try {
		await ensureTestAccess(request);

		const parsedParams = postParamsSchema.safeParse({
			scenario: url.searchParams.get('scenario') ?? '',
			action: url.searchParams.get('action') ?? 'simulate'
		});

		if (!parsedParams.success) {
			throw error(400, 'Invalid scenario or action');
		}

		const { scenario, action } = parsedParams.data;

		if (!scenario || !TEST_SCENARIOS[scenario as keyof typeof TEST_SCENARIOS]) {
			throw error(400, 'Invalid scenario');
		}

		const testScenario = TEST_SCENARIOS[scenario as keyof typeof TEST_SCENARIOS];
		const clientIP = getClientAddress();

		// Handle different actions
		if (action === 'simulate') {
			// Simulate the security event based on scenario
			const simulatedData = await simulateSecurityEvent(scenario, testScenario, clientIP, request);

			logger.info('Security test event simulated', { scenario, simulatedData });

			return json({
				success: true,
				scenario,
				simulatedData,
				message: `Test scenario "${testScenario.description as string}" simulated successfully`
			});
		}

		const rawBody = await request.json().catch(() => ({}));
		const parsedBody = postBodySchema.safeParse(rawBody);
		if (!parsedBody.success) {
			throw error(400, 'Invalid request body');
		}

		const { userId = 'test-user' } = parsedBody.data ?? {};

		// Create test events based on scenario
		const events = createTestEvents(scenario, testScenario);
		const injectionResult = await _injectEvents(events, userId, clientIP, request);

		logger.info('Test scenario triggered', {
			scenario,
			eventCount: events.length,
			injected: injectionResult.injected
		});

		return json({
			success: true,
			scenario,
			injected: injectionResult.injected,
			message: `Test scenario "${testScenario.description as string}" triggered successfully`,
			events: events.map((e) => ({
				type: e.type,
				ip: e.ip,
				factors: e.factors?.map((f) => `${f.source}:${f.factor}`) || []
			}))
		});
	} catch (err) {
		if (err && typeof err === 'object' && 'status' in err) {
			throw err;
		}

		logger.error('Failed to handle test scenario', { err });
		throw error(500, 'Failed to handle test scenario');
	}
};

function createTestEvents(scenario: string, testScenario: Record<string, unknown>): TestEvent[] {
	switch (scenario) {
		case 'vpn_ip':
			return [
				{
					type: 'auth_success',
					ip: testScenario.ip as string,
					path: '/auth/sign-in',
					method: 'POST',
					sessionId: 'vpn-session-1',
					riskScore: 58,
					riskLevel: 'high',
					factors: [
						{
							source: 'geo',
							factor: 'vpn_detected',
							score: 30
						},
						{ source: 'device', factor: 'new_device', score: 20 }
					],
					metadata: { panel: ['IP Intelligence', 'Threat Feed'] }
				}
			];

		case 'password_reset':
			return [
				{
					type: 'password_reset',
					ip: '203.0.113.200',
					path: '/auth/forgot-password',
					method: 'POST',
					sessionId: 'password-reset-1',
					riskScore: 18,
					riskLevel: 'low',
					factors: [{ source: 'auth', factor: 'password_reset_requested', score: 8 }],
					metadata: { panel: ['Authentication Metrics'] }
				}
			];

		case 'trusted_device':
			return [
				{
					type: 'auth_success',
					ip: '203.0.113.88',
					userId: 'trusted-user-1',
					path: '/dashboard',
					method: 'GET',
					sessionId: 'trusted-session-1',
					riskScore: 12,
					riskLevel: 'low',
					factors: [{ source: 'device', factor: 'known_device', score: 5 }],
					metadata: { panel: ['Trusted Devices', 'Overview'] }
				}
			];

		case 'api_key_usage':
			return [
				{
					type: 'auth_success',
					ip: '198.51.100.45',
					path: '/api/internal/reporting',
					method: 'POST',
					sessionId: 'api-key-session-1',
					riskScore: 36,
					riskLevel: 'medium',
					factors: [{ source: 'api', factor: 'api_key_authenticated', score: 15 }],
					metadata: {
						apiKeyId: 'test_api_key_alpha',
						panel: ['API Security']
					}
				}
			];

		case 'tor_ip':
			return [
				{
					type: 'auth_success',
					ip: testScenario.ip as string,
					path: '/auth/sign-in',
					method: 'POST',
					sessionId: 'tor-session-1',
					riskScore: 82,
					riskLevel: 'critical',
					factors: [
						{ source: 'geo', factor: 'tor_detected', score: 50 },
						{ source: 'device', factor: 'new_device', score: 20 }
					],
					metadata: { panel: ['IP Intelligence', 'Threat Feed', 'Top Risk Factors'] }
				}
			];

		case 'datacenter_ip':
			return [
				{
					type: 'auth_success',
					ip: testScenario.ip as string,
					path: '/api/auth/session',
					method: 'GET',
					sessionId: 'dc-session-1',
					riskScore: 32,
					riskLevel: 'medium',
					factors: [
						{ source: 'geo', factor: 'datacenter_detected', score: 15 },
						{ source: 'device', factor: 'new_device', score: 15 }
					],
					metadata: { panel: ['API Security', 'IP Intelligence'] }
				}
			];

		case 'malicious_ip':
			return [
				{
					type: 'blocked',
					ip: testScenario.ip as string,
					path: '/auth/sign-in',
					method: 'POST',
					sessionId: 'malicious-session-1',
					riskScore: 95,
					riskLevel: 'critical',
					blocked: true,
					factors: [
						{ source: 'geo', factor: 'malicious_ip', score: 50 },
						{ source: 'abuse', factor: 'known_bad_actor', score: 40 }
					],
					metadata: { panel: ['Threat Feed', 'Top Risk Factors', 'IP Intelligence'] }
				}
			];

		case 'new_device':
			return [
				{
					type: 'auth_success',
					path: '/auth/sign-in',
					method: 'POST',
					sessionId: 'new-device-session',
					riskScore: 48,
					riskLevel: 'medium',
					factors: [
						{ source: 'device', factor: 'new_device', score: 30 },
						{ source: 'behavior', factor: 'first_seen_device', score: 18 }
					],
					metadata: { panel: ['Trusted Devices', 'User Risk Profiles'] }
				}
			];

		case 'bot_device':
			return [
				{
					type: 'auth_success',
					userAgent: testScenario.userAgent as string,
					path: '/api/auth/session',
					method: 'GET',
					riskScore: 74,
					riskLevel: 'high',
					rateLimited: true,
					factors: [
						{ source: 'device', factor: 'bot_detected', score: 40 },
						{ source: 'behavior', factor: 'non_human_pattern', score: 25 }
					],
					metadata: { panel: ['Rate Limit Stats', 'API Security'] }
				}
			];

		case 'rapid_requests':
			return [
				{
					type: 'rate_limited',
					ip: '203.0.113.44',
					path: '/api/auth/session',
					method: 'GET',
					sessionId: 'rapid-1',
					riskScore: 76,
					riskLevel: 'high',
					rateLimited: true,
					factors: [{ source: 'rate_limit', factor: 'high_frequency', score: 35 }],
					metadata: { panel: ['Rate Limit Stats', 'API Security'] }
				}
			];

		case 'failed_logins':
			return [
				{
					type: 'auth_failure',
					ip: '198.51.100.99',
					path: '/auth/sign-in',
					method: 'POST',
					sessionId: 'failed-login-1',
					success: false,
					riskScore: 62,
					riskLevel: 'high',
					factors: [{ source: 'auth', factor: 'invalid_password', score: 20 }],
					metadata: { panel: ['Authentication Metrics', 'Threat Feed'] }
				}
			];

		case 'mouse_bot':
			return [
				{
					type: 'auth_success',
					path: '/api/auth/session',
					method: 'POST',
					sessionId: 'mouse-bot-1',
					riskScore: 58,
					riskLevel: 'high',
					factors: [
						{ source: 'behavior', factor: 'bot_like_behavior', score: 30 },
						{ source: 'behavior', factor: 'unnatural_movement', score: 20 }
					],
					metadata: { panel: ['Time Analysis', 'Top Risk Factors'] }
				}
			];

		case 'suspicious_location':
			return [
				{
					type: 'auth_success',
					ip: '102.89.22.5',
					path: '/auth/sign-in',
					method: 'POST',
					sessionId: 'geo-session-1',
					riskScore: 57,
					riskLevel: 'high',
					factors: [
						{ source: 'geo', factor: 'high_risk_country', score: 35 },
						{ source: 'geo', factor: 'new_location', score: 20 }
					],
					metadata: {
						country: testScenario.country,
						panel: ['Geographic Breakdown', 'IP Intelligence']
					}
				}
			];

		case 'new_location':
			return [
				{
					type: 'auth_success',
					ip: '203.0.113.51',
					path: '/auth/sign-in',
					method: 'POST',
					sessionId: 'travel-session-1',
					riskScore: 88,
					riskLevel: 'critical',
					factors: [
						{ source: 'geo', factor: 'impossible_travel', score: 45 },
						{ source: 'session', factor: 'session_hijack_suspected', score: 35 }
					],
					metadata: { distance: testScenario.distance, panel: ['Threat Feed', 'Time Analysis'] }
				}
			];

		case 'concurrent_sessions':
			return [
				{
					type: 'auth_success',
					ip: '198.51.100.77',
					userId: 'test-user-concurrent',
					path: '/dashboard',
					method: 'GET',
					sessionId: 'concurrent-session-1',
					riskScore: 40,
					riskLevel: 'medium',
					factors: [{ source: 'session', factor: 'multiple_sessions', score: 20 }],
					metadata: {
						concurrentSessionCount: 3,
						panel: ['Session Analytics']
					}
				}
			];

		case 'long_session':
			return [
				{
					type: 'auth_success',
					userId: 'test-user-long-session',
					ip: '203.0.113.20',
					path: '/dashboard',
					method: 'GET',
					sessionId: 'long-session-1',
					riskScore: 33,
					riskLevel: 'medium',
					factors: [{ source: 'session', factor: 'extended_session', score: 18 }],
					metadata: {
						sessionDurationMs: Number(testScenario.hours) * 60 * 60 * 1000,
						invalidationReason: 'Session timeout',
						panel: ['Session Analytics']
					}
				}
			];

		default:
			return [
				{
					type: 'auth_success',
					path: '/api/admin/security/scenarios',
					method: 'POST',
					riskScore: 20,
					riskLevel: 'low',
					factors: [{ source: 'test', factor: scenario, score: 20 }],
					metadata: { panel: ['Overview'] }
				}
			];
	}
}

async function simulateSecurityEvent(
	scenario: string,
	testScenario: Record<string, unknown>,
	clientIP: string,
	request: Request
) {
	const baseData = {
		timestamp: new Date().toISOString(),
		ip: scenario.includes('_ip') ? (testScenario.ip as string) : clientIP,
		userAgent: (testScenario.userAgent as string) || request.headers.get('user-agent'),
		scenario
	};

	switch (scenario) {
		case 'vpn_ip':
		case 'tor_ip':
		case 'datacenter_ip':
		case 'malicious_ip':
			return {
				...baseData,
				type: 'ip_intelligence',
				riskFactors: ['suspicious_ip', (testScenario.description as string).toLowerCase()],
				simulatedHeaders: {
					'X-Forwarded-For': testScenario.ip as string,
					'X-Real-IP': testScenario.ip as string
				}
			};

		case 'rapid_requests':
			return {
				...baseData,
				type: 'rate_limit',
				requestCount: testScenario.count as number,
				timeWindow: testScenario.interval as number,
				riskFactors: ['high_frequency_requests', 'potential_bot']
			};

		case 'failed_logins':
			return {
				...baseData,
				type: 'brute_force',
				failedAttempts: testScenario.count as number,
				riskFactors: ['multiple_failed_attempts', 'potential_attack']
			};

		case 'new_device':
		case 'bot_device':
			return {
				...baseData,
				type: 'device_analysis',
				deviceFingerprint: generateDeviceFingerprint(testScenario.userAgent as string),
				riskFactors: ['unknown_device', 'suspicious_user_agent']
			};

		case 'suspicious_location':
			return {
				...baseData,
				type: 'geo_analysis',
				location: {
					country: testScenario.country as string,
					city: 'Unknown'
				},
				riskFactors: ['suspicious_location', 'high_risk_country']
			};

		case 'new_location':
			return {
				...baseData,
				type: 'impossible_travel',
				distance: testScenario.distance as number,
				timeDelta: 60, // seconds
				riskFactors: ['impossible_travel', 'session_hijack_suspected']
			};

		case 'mouse_bot':
			return {
				...baseData,
				type: 'behavior_analysis',
				mousePattern: testScenario.pattern as string,
				riskFactors: ['bot_like_behavior', 'unnatural_movement']
			};

		case 'concurrent_sessions':
			return {
				...baseData,
				type: 'session_anomaly',
				concurrentSessions: testScenario.count as number,
				riskFactors: ['multiple_sessions', 'potential_account_sharing']
			};

		case 'long_session':
			return {
				...baseData,
				type: 'session_anomaly',
				sessionDuration: (testScenario.hours as number) * 3600, // seconds
				riskFactors: ['extended_session', 'session_fixation_risk']
			};

		default:
			return {
				...baseData,
				type: 'generic',
				riskFactors: ['test_scenario']
			};
	}
}

function generateDeviceFingerprint(userAgent: string): string {
	// Simple hash for demo - in real implementation this would be more complex
	return btoa(userAgent + Date.now()).substring(0, 32);
}
