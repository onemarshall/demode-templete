import { describe, expect, it } from 'vitest';
import { pollUntilSettled, type PollableSync } from '../polling.js';
import { statusFromIntake } from '../status.js';
import type { EngagementStatus } from '../engagement.js';

/** A fake clock, so a 25-minute deadline costs nothing to test. */
function clock() {
	let t = 0;
	return {
		now: () => t,
		sleep: async (ms: number) => {
			t += ms;
		},
		advanceTo: (value: number) => {
			t = value;
		}
	};
}

function syncWith(intakeStatus: string): PollableSync {
	return { status: statusFromIntake(intakeStatus), intake: { status: intakeStatus } };
}

function engagementSync(engagement: EngagementStatus): PollableSync {
	return { status: { engagement }, intake: null };
}

/** Yields each status once, then repeats the last one forever. */
function sequence(statuses: string[], fallback = statuses[statuses.length - 1]!) {
	let index = 0;
	return async (): Promise<PollableSync> => {
		const status = statuses[Math.min(index, statuses.length - 1)] ?? fallback;
		index += 1;
		return syncWith(status);
	};
}

describe('poll loop termination', () => {
	it('does not stop on intermediate states', async () => {
		const c = clock();
		const outcome = await pollUntilSettled(
			sequence(['generating', 'automation_ready', 'approved', 'published']),
			syncWith('queued'),
			{ deadlineMs: 60_000, intervalMs: 5_000, now: c.now, sleep: c.sleep }
		);

		expect(outcome.polls).toBe(4);
		expect(outcome.timedOut).toBe(false);
		expect(outcome.last.intake?.status).toBe('published');
	});

	it('survives a publishing delay at automation_ready', async () => {
		const c = clock();
		const outcome = await pollUntilSettled(
			sequence(['automation_ready', 'automation_ready', 'automation_ready', 'published']),
			syncWith('queued'),
			{ deadlineMs: 120_000, intervalMs: 5_000, now: c.now, sleep: c.sleep }
		);

		expect(outcome.polls).toBe(4);
		expect(outcome.timedOut).toBe(false);
		expect(outcome.last.intake?.status).toBe('published');
	});

	it('settles on review_required without importing', async () => {
		const c = clock();
		const outcome = await pollUntilSettled(sequence(['running', 'review_required']), syncWith('queued'), {
			deadlineMs: 120_000,
			intervalMs: 5_000,
			now: c.now,
			sleep: c.sleep
		});

		expect(outcome.polls).toBe(2);
		expect(outcome.timedOut).toBe(false);
		expect(outcome.last.intake?.status).toBe('review_required');
	});

	it('settles when a quality hold is recorded', async () => {
		const c = clock();
		const outcome = await pollUntilSettled(
			sequence(['generating', 'held']),
			syncWith('queued'),
			{ deadlineMs: 60_000, intervalMs: 5_000, now: c.now, sleep: c.sleep }
		);

		expect(outcome.polls).toBe(2);
		expect(outcome.last.status.engagement).toBe('quality_hold');
	});

	it('settles on successful delivery at the first poll', async () => {
		const c = clock();
		let polls = 0;
		const outcome = await pollUntilSettled(
			async () => {
				polls += 1;
				return engagementSync('delivered');
			},
			syncWith('published'),
			{ deadlineMs: 60_000, intervalMs: 5_000, now: c.now, sleep: c.sleep }
		);

		expect(polls).toBe(1);
		expect(outcome.timedOut).toBe(false);
		expect(outcome.last.status.engagement).toBe('delivered');
	});

	it('times out on a run that never settles', async () => {
		const c = clock();
		const outcome = await pollUntilSettled(sequence(['generating']), syncWith('queued'), {
			deadlineMs: 10_000,
			intervalMs: 5_000,
			now: c.now,
			sleep: c.sleep
		});

		expect(outcome.timedOut).toBe(true);
		expect(outcome.polls).toBe(2);
		expect(outcome.last.intake?.status).toBe('generating');
	});

	it('keeps polling an unchanged intermediate state instead of stopping', async () => {
		const c = clock();
		const outcome = await pollUntilSettled(sequence(['automation_ready']), syncWith('queued'), {
			deadlineMs: 30_000,
			intervalMs: 5_000,
			now: c.now,
			sleep: c.sleep
		});

		expect(outcome.polls).toBe(6);
		expect(outcome.timedOut).toBe(true);
	});

	it('does not settle on an unknown engine status', async () => {
		const c = clock();
		const outcome = await pollUntilSettled(
			sequence(['a_state_from_a_newer_engine']),
			syncWith('queued'),
			{ deadlineMs: 10_000, intervalMs: 5_000, now: c.now, sleep: c.sleep }
		);

		expect(outcome.timedOut).toBe(true);
		expect(outcome.polls).toBe(2);
	});

	it('settles when the engagement is retryable but the engine is still published', async () => {
		// A failed import leaves the engagement retrying while the engine stays
		// published. Published is terminal for the loop; retrying is not terminal
		// for the page, which is where the retry comes from.
		const c = clock();
		const outcome = await pollUntilSettled(
			async (): Promise<PollableSync> => ({
				status: { engagement: 'retrying' },
				intake: { status: 'published' }
			}),
			syncWith('queued'),
			{ deadlineMs: 60_000, intervalMs: 5_000, now: c.now, sleep: c.sleep }
		);

		expect(outcome.polls).toBe(1);
		expect(outcome.timedOut).toBe(false);
		expect(outcome.last.status.engagement).toBe('retrying');
	});

	it('never polls when the deadline has already passed', async () => {
		const c = clock();
		let polls = 0;
		const outcome = await pollUntilSettled(
			async () => {
				polls += 1;
				return syncWith('generating');
			},
			syncWith('queued'),
			{ deadlineMs: 0, intervalMs: 5_000, now: c.now, sleep: c.sleep }
		);

		expect(polls).toBe(0);
		expect(outcome.timedOut).toBe(true);
	});
});
