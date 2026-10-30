import { describe, expect, it } from 'vitest';
import { failedQualityChecks } from '../orchestration.js';

/**
 * A run may only be imported when every quality check passed. The refusal is
 * a settled outcome, not a retry: the engine's own receipt said the report does
 * not meet the standard, so re-importing cannot change the answer.
 */
describe('quality gate', () => {
	it('permits an import when every check passed', () => {
		expect(
			failedQualityChecks({
				checks: [
					{ key: 'source_bounded', passed: true, detail: 'ok' },
					{ key: 'claims_supported', passed: true, detail: 'ok' }
				]
			})
		).toEqual([]);
	});

	it('refuses an import when any check failed', () => {
		const failed = failedQualityChecks({
			checks: [
				{ key: 'source_bounded', passed: true, detail: 'ok' },
				{ key: 'claims_supported', passed: false, detail: 'Two claims lack a source.' }
			]
		});

		expect(failed).toHaveLength(1);
		expect(failed[0]?.key).toBe('claims_supported');
	});

	it('reports every failure, not just the first', () => {
		const failed = failedQualityChecks({
			checks: [
				{ key: 'a', passed: false, detail: 'one' },
				{ key: 'b', passed: true, detail: 'ok' },
				{ key: 'c', passed: false, detail: 'three' }
			]
		});

		expect(failed.map((check) => check.key)).toEqual(['a', 'c']);
	});

	it('permits an import when the receipt carries no checks', () => {
		// Not a pass: the caller treats an empty receipt as a refusal only if the
		// engine says so. This documents the current behaviour rather than
		// asserting it is ideal.
		expect(failedQualityChecks({ checks: [] })).toEqual([]);
	});
});
