import { describe, expect, it } from 'vitest';
import {
	isTerminalEngagement,
	isTerminalIntake,
	statusFromIntake
} from '../status.js';

/**
 * The mapping is the contract between the engine's vocabulary and ours. Two
 * states used to map to `ready`, which the poll loop and the page both treated
 * as terminal, so a run stopped before publication and was never imported.
 */
describe('status mapping', () => {
	it('keeps intermediate engine states in delivery', () => {
		for (const status of [
			'queued',
			'running',
			'ready',
			'context_ready',
			'generating',
			'automation_ready',
			'approved'
		])
			expect(statusFromIntake(status).engagement, status).toBe('in_delivery');
	});

	it('maps published to ready, which is only pre-import', () => {
		expect(statusFromIntake('published').engagement).toBe('ready');
	});

	it('maps a consultant wait to ready', () => {
		expect(statusFromIntake('review_required').engagement).toBe('ready');
	});

	it('maps terminal engine outcomes to their engagement states', () => {
		expect(statusFromIntake('held').engagement).toBe('quality_hold');
		expect(statusFromIntake('validation_failed').engagement).toBe('quality_hold');
		expect(statusFromIntake('changes_requested').engagement).toBe('failed');
		expect(statusFromIntake('failed').engagement).toBe('failed');
		expect(statusFromIntake('cancelled').engagement).toBe('withdrawn');
	});

	it('treats an unknown status as still running', () => {
		expect(statusFromIntake('a_state_from_a_newer_engine').engagement).toBe('in_delivery');
	});
});

describe('terminal intake states', () => {
	it('accepts the states no automated work can leave', () => {
		for (const status of [
			'published',
			'review_required',
			'needs_analysis_review',
			'needs_decision_record',
			'held',
			'validation_failed',
			'changes_requested',
			'failed',
			'cancelled'
		])
			expect(isTerminalIntake(status), status).toBe(true);
	});

	it('refuses to settle on states the engine is still working through', () => {
		for (const status of [
			'queued',
			'running',
			'ready',
			'context_ready',
			'generating',
			'automation_ready',
			'approved'
		])
			expect(isTerminalIntake(status), status).toBe(false);
	});

	it('refuses to settle on an unknown status', () => {
		expect(isTerminalIntake('a_state_from_a_newer_engine')).toBe(false);
		expect(isTerminalIntake('')).toBe(false);
	});
});

describe('terminal engagement states', () => {
	it('settles on outcomes that need no further automated work', () => {
		for (const status of ['delivered', 'failed', 'withdrawn', 'quality_hold', 'declined'] as const)
			expect(isTerminalEngagement(status), status).toBe(true);
	});

	it('does not settle on ready, so a pending import can be retried', () => {
		expect(isTerminalEngagement('ready')).toBe(false);
		expect(isTerminalEngagement('retrying')).toBe(false);
		expect(isTerminalEngagement('in_delivery')).toBe(false);
	});
});
