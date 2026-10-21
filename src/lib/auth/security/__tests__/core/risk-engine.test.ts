import { describe, it, expect } from 'vitest';
import {
	calculateRiskScore,
	getRiskLevel,
	shouldBlock,
	shouldRequireCaptcha,
	assessRisk,
	createRiskFactor,
	geoRiskFactors,
	deviceRiskFactors,
	positiveRiskFactors,
	getRiskLevelColor,
	getRiskLevelWeight,
	compareRiskLevels,
	DEFAULT_RISK_SCORES
} from '../../core/risk-engine';

describe('Risk Score Calculation', () => {
	it('calculates score from factors', () => {
		const factors = [createRiskFactor('geo', 'vpn', 20), createRiskFactor('device', 'new', 20)];
		expect(calculateRiskScore(factors)).toBe(40);
	});

	it('clamps score to 0-100', () => {
		const highFactors = [createRiskFactor('test', 'extreme', 150)];
		expect(calculateRiskScore(highFactors)).toBe(100);

		const lowFactors = [createRiskFactor('test', 'negative', -50)];
		expect(calculateRiskScore(lowFactors)).toBe(0);
	});

	it('handles empty factors', () => {
		expect(calculateRiskScore([])).toBe(0);
	});

	it('handles mixed positive and negative factors', () => {
		const factors = [
			createRiskFactor('geo', 'vpn', 20),
			createRiskFactor('trust', 'verified', -10)
		];
		expect(calculateRiskScore(factors)).toBe(10);
	});
});

describe('Risk Level', () => {
	it('returns correct levels for score ranges', () => {
		expect(getRiskLevel(0)).toBe('low');
		expect(getRiskLevel(20)).toBe('low');
		expect(getRiskLevel(39)).toBe('low');
		expect(getRiskLevel(40)).toBe('medium');
		expect(getRiskLevel(59)).toBe('medium');
		expect(getRiskLevel(60)).toBe('high');
		expect(getRiskLevel(79)).toBe('high');
		expect(getRiskLevel(80)).toBe('critical');
		expect(getRiskLevel(100)).toBe('critical');
	});
});

describe('Threshold Decisions', () => {
	const thresholds = { captchaThreshold: 40, blockThreshold: 80 };

	describe('shouldBlock', () => {
		it('returns true at or above block threshold', () => {
			expect(shouldBlock(80, thresholds)).toBe(true);
			expect(shouldBlock(100, thresholds)).toBe(true);
		});

		it('returns false below block threshold', () => {
			expect(shouldBlock(79, thresholds)).toBe(false);
			expect(shouldBlock(40, thresholds)).toBe(false);
		});
	});

	describe('shouldRequireCaptcha', () => {
		it('returns true between captcha and block thresholds', () => {
			expect(shouldRequireCaptcha(40, thresholds)).toBe(true);
			expect(shouldRequireCaptcha(60, thresholds)).toBe(true);
			expect(shouldRequireCaptcha(79, thresholds)).toBe(true);
		});

		it('returns false below captcha threshold', () => {
			expect(shouldRequireCaptcha(39, thresholds)).toBe(false);
		});

		it('returns false at or above block threshold', () => {
			expect(shouldRequireCaptcha(80, thresholds)).toBe(false);
		});
	});
});

describe('Risk Assessment', () => {
	it('performs complete assessment', () => {
		const factors = [geoRiskFactors.vpn(), deviceRiskFactors.newDevice('dev123')];

		const assessment = assessRisk(factors, { captchaThreshold: 40, blockThreshold: 80 });

		expect(assessment.score).toBe(40);
		expect(assessment.level).toBe('medium');
		expect(assessment.factors).toHaveLength(2);
		expect(assessment.shouldRequireCaptcha).toBe(true);
		expect(assessment.shouldBlock).toBe(false);
	});

	it('detects blocking condition', () => {
		const factors = [
			geoRiskFactors.malicious(),
			geoRiskFactors.tor(),
			deviceRiskFactors.automation()
		];

		const assessment = assessRisk(factors, { captchaThreshold: 40, blockThreshold: 80 });

		expect(assessment.score).toBeGreaterThanOrEqual(80);
		expect(assessment.level).toBe('critical');
		expect(assessment.shouldBlock).toBe(true);
	});

	it('handles positive factors reducing risk', () => {
		const factors = [
			geoRiskFactors.vpn(), // +20
			positiveRiskFactors.trustedUser('user123') // -30
		];

		const assessment = assessRisk(factors, { captchaThreshold: 40, blockThreshold: 80 });

		expect(assessment.score).toBe(0); // Clamped to 0
		expect(assessment.level).toBe('low');
		expect(assessment.shouldRequireCaptcha).toBe(false);
	});
});

describe('Risk Factor Builders', () => {
	it('creates geo factors with correct scores', () => {
		expect(geoRiskFactors.vpn().score).toBe(DEFAULT_RISK_SCORES.vpn);
		expect(geoRiskFactors.tor().score).toBe(DEFAULT_RISK_SCORES.tor);
		expect(geoRiskFactors.proxy().score).toBe(DEFAULT_RISK_SCORES.proxy);
		expect(geoRiskFactors.datacenter().score).toBe(DEFAULT_RISK_SCORES.datacenter);
		expect(geoRiskFactors.malicious().score).toBe(DEFAULT_RISK_SCORES.maliciousIp);
	});

	it('creates device factors with correct scores', () => {
		expect(deviceRiskFactors.newDevice('id').score).toBe(DEFAULT_RISK_SCORES.newDevice);
		expect(deviceRiskFactors.headless().score).toBe(DEFAULT_RISK_SCORES.headlessBrowser);
		expect(deviceRiskFactors.automation().score).toBe(DEFAULT_RISK_SCORES.automationDetected);
	});

	it('creates positive factors with negative scores', () => {
		expect(positiveRiskFactors.trustedUser('id').score).toBeLessThan(0);
		expect(positiveRiskFactors.verifiedCaptcha().score).toBeLessThan(0);
	});

	it('includes details in factors', () => {
		const factor = geoRiskFactors.highRiskCountry('RU');
		expect(factor.details).toEqual({ countryCode: 'RU' });
	});
});

describe('Risk Level Utilities', () => {
	it('returns correct colors', () => {
		expect(getRiskLevelColor('low')).toMatch(/^#/);
		expect(getRiskLevelColor('critical')).toMatch(/^#/);
	});

	it('returns correct weights', () => {
		expect(getRiskLevelWeight('low')).toBe(1);
		expect(getRiskLevelWeight('medium')).toBe(2);
		expect(getRiskLevelWeight('high')).toBe(3);
		expect(getRiskLevelWeight('critical')).toBe(4);
	});

	it('compares risk levels correctly', () => {
		expect(compareRiskLevels('critical', 'low')).toBeGreaterThan(0);
		expect(compareRiskLevels('low', 'high')).toBeLessThan(0);
		expect(compareRiskLevels('medium', 'medium')).toBe(0);
	});
});
