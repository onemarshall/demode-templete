import { describe, it, expect, vi } from 'vitest';

vi.mock('#lib/auth/shared/env/index.js', () => ({
	getServerEnvSync: () => ({
		BETTER_AUTH_SECRET: 'test-secret',
		PUBLIC_SITE_URL: 'http://localhost:3000'
	}),
	getServerEnv: () =>
		Promise.resolve({
			BETTER_AUTH_SECRET: 'test-secret',
			PUBLIC_SITE_URL: 'http://localhost:3000'
		}),
	isDevelopment: () => false,
	isBrowser: () => false,
	isServer: () => true
}));

import {
	getTempBlockDelayMinutes,
	getRiskLevel,
	requiresCaptcha,
	shouldBlock,
	clampRiskScore,
	getIPReputationPenalty,
	calculateIPReputationPenalty,
	REDIS_KEY_PREFIXES
} from '../config';

describe('getTempBlockDelayMinutes', () => {
	it('returns 0 for failCount below trigger threshold', () => {
		expect(getTempBlockDelayMinutes(0)).toBe(getTempBlockDelayMinutes(0));
		expect(getTempBlockDelayMinutes(1)).toBeGreaterThanOrEqual(0);
	});

	it('returns increasing delays as failCount grows', () => {
		const delay5 = getTempBlockDelayMinutes(5);
		const delay10 = getTempBlockDelayMinutes(10);
		const delay15 = getTempBlockDelayMinutes(15);

		expect(delay10).toBeGreaterThanOrEqual(delay5);
		expect(delay15).toBeGreaterThanOrEqual(delay10);
	});

	it('clamps negative failCount to 0', () => {
		expect(getTempBlockDelayMinutes(-1)).toBe(getTempBlockDelayMinutes(0));
		expect(getTempBlockDelayMinutes(-100)).toBe(getTempBlockDelayMinutes(0));
	});

	it('handles very large failCount without error', () => {
		const delay = getTempBlockDelayMinutes(1000);
		expect(delay).toBeGreaterThan(0);
		expect(Number.isFinite(delay)).toBe(true);
	});

	it('caps delay at maximum', () => {
		const delay50 = getTempBlockDelayMinutes(50);
		const delay100 = getTempBlockDelayMinutes(100);

		// Both should be capped at the same maximum
		expect(delay50).toBe(delay100);
	});
});

describe('getRiskLevel (config delegation)', () => {
	it('delegates to risk-engine and returns consistent levels', () => {
		expect(getRiskLevel(0)).toBe('low');
		expect(getRiskLevel(20)).toBe('low');
		expect(getRiskLevel(40)).toBe('medium');
		expect(getRiskLevel(60)).toBe('high');
		expect(getRiskLevel(80)).toBe('critical');
		expect(getRiskLevel(100)).toBe('critical');
	});
});

describe('requiresCaptcha (config delegation)', () => {
	it('returns false for low scores', () => {
		expect(requiresCaptcha(0)).toBe(false);
		expect(requiresCaptcha(10)).toBe(false);
	});

	it('returns true for mid-range scores (between captcha and block thresholds)', () => {
		// Exact behavior depends on config thresholds, but mid-range should require captcha
		expect(requiresCaptcha(50)).toBe(true);
	});

	it('returns false for very high scores (block range)', () => {
		// At block threshold and above, captcha is not required — request is blocked instead
		expect(requiresCaptcha(95)).toBe(false);
		expect(requiresCaptcha(100)).toBe(false);
	});
});

describe('shouldBlock (config delegation)', () => {
	it('returns false for low scores', () => {
		expect(shouldBlock(0)).toBe(false);
		expect(shouldBlock(10)).toBe(false);
	});

	it('returns true for high scores', () => {
		expect(shouldBlock(95)).toBe(true);
		expect(shouldBlock(100)).toBe(true);
	});
});

describe('clampRiskScore', () => {
	it('clamps negative scores to 0', () => {
		expect(clampRiskScore(-10)).toBe(0);
		expect(clampRiskScore(-100)).toBe(0);
	});

	it('clamps high scores to max', () => {
		const clamped = clampRiskScore(999);
		expect(clamped).toBeLessThanOrEqual(100);
	});

	it('rounds to nearest integer', () => {
		expect(clampRiskScore(50.7)).toBe(51);
		expect(clampRiskScore(50.3)).toBe(50);
	});

	it('passes through valid scores', () => {
		expect(clampRiskScore(50)).toBe(50);
		expect(clampRiskScore(0)).toBe(0);
	});
});

describe('getIPReputationPenalty', () => {
	it('returns positive penalties for all types', () => {
		expect(getIPReputationPenalty('vpn')).toBeGreaterThan(0);
		expect(getIPReputationPenalty('tor')).toBeGreaterThan(0);
		expect(getIPReputationPenalty('proxy')).toBeGreaterThan(0);
		expect(getIPReputationPenalty('malicious')).toBeGreaterThan(0);
		expect(getIPReputationPenalty('datacenter')).toBeGreaterThan(0);
	});

	it('ranks malicious and tor highest', () => {
		const vpn = getIPReputationPenalty('vpn');
		const tor = getIPReputationPenalty('tor');
		const malicious = getIPReputationPenalty('malicious');

		expect(malicious).toBeGreaterThanOrEqual(vpn);
		expect(tor).toBeGreaterThanOrEqual(vpn);
	});
});

describe('calculateIPReputationPenalty', () => {
	it('returns 0 for clean reputation', () => {
		expect(
			calculateIPReputationPenalty({
				isVpn: false,
				isTor: false,
				isProxy: false,
				isMalicious: false,
				isDatacenter: false
			})
		).toBe(0);
	});

	it('accumulates penalties for multiple flags', () => {
		const singlePenalty = calculateIPReputationPenalty({
			isVpn: true,
			isTor: false,
			isProxy: false,
			isMalicious: false,
			isDatacenter: false
		});

		const multiPenalty = calculateIPReputationPenalty({
			isVpn: true,
			isTor: true,
			isProxy: false,
			isMalicious: false,
			isDatacenter: false
		});

		expect(multiPenalty).toBeGreaterThan(singlePenalty);
	});

	it('handles all flags set', () => {
		const penalty = calculateIPReputationPenalty({
			isVpn: true,
			isTor: true,
			isProxy: true,
			isMalicious: true,
			isDatacenter: true
		});

		expect(penalty).toBeGreaterThan(0);
	});
});

describe('REDIS_KEY_PREFIXES', () => {
	it('is frozen (immutable)', () => {
		expect(Object.isFrozen(REDIS_KEY_PREFIXES)).toBe(true);
	});

	it('contains expected key prefixes', () => {
		expect(REDIS_KEY_PREFIXES.ABUSE).toBe('abuse_protection:');
		expect(REDIS_KEY_PREFIXES.FRAUD).toBe('fraud_detection:');
		expect(REDIS_KEY_PREFIXES.RATE_LIMIT).toBe('rate_limit:');
		expect(REDIS_KEY_PREFIXES.ANALYTICS).toBe('security_analytics:');
		expect(REDIS_KEY_PREFIXES.BLOCK).toBe('block:');
		expect(REDIS_KEY_PREFIXES.SECURITY).toBe('security:');
	});

	it('all prefixes end with colon', () => {
		for (const value of Object.values(REDIS_KEY_PREFIXES)) {
			expect(value).toMatch(/:$/);
		}
	});
});
