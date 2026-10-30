/**
 * The diagnostic poll loop.
 *
 * Extracted from the Trigger worker so the termination rule can be tested
 * without a database, an engine or a wall clock. Terminality is decided by
 * `status.ts` and nowhere else.
 *
 * A run is settled when the engine has stopped moving *or* the engagement has
 * reached a state no automated work can leave. Intermediate engine states —
 * including `automation_ready` and `approved` — are not settled, because the
 * report has not been published and therefore cannot have been imported.
 */

import type { EngagementStatus } from './engagement.js';
import { isTerminalEngagement, isTerminalIntake } from './status.js';

export interface PollableSync {
	status: { engagement: EngagementStatus };
	intake: { status: string } | null;
}

export interface PollOptions<T extends PollableSync = PollableSync> {
	/** Total time the loop may run. Defaults to 25 minutes. */
	deadlineMs?: number;
	/** Delay between polls. Defaults to 5 seconds. */
	intervalMs?: number;
	/** Injected clock. Tests must advance it alongside `sleep`. */
	now?: () => number;
	/** Injected sleep, so tests need not wait in real time. */
	sleep?: (ms: number) => Promise<void>;
	/**
	 * Stop early when the caller must act rather than wait. Used by the
	 * automation supervisor: an `approved` run needs a publication request, and
	 * waiting for the deadline before issuing it would delay delivery by the
	 * whole poll window.
	 */
	stopWhen?: (sync: T) => boolean;
}

export interface PollOutcome<T extends PollableSync> {
	last: T;
	/** How many times `sync` was called. */
	polls: number;
	/** True when the deadline elapsed before the run settled. */
	timedOut: boolean;
}

export const DEFAULT_DEADLINE_MS = 25 * 60_000;
export const DEFAULT_INTERVAL_MS = 5_000;

/**
 * Whether the run has finished moving. An unknown engine status is not
 * terminal: unknown means wait, never stop.
 */
export function isSettled(sync: PollableSync): boolean {
	return (
		isTerminalIntake(sync.intake?.status ?? '') ||
		isTerminalEngagement(sync.status.engagement)
	);
}

export async function pollUntilSettled<T extends PollableSync>(
	sync: () => Promise<T>,
	initial: T,
	options: PollOptions<T> = {}
): Promise<PollOutcome<T>> {
	const deadlineMs = options.deadlineMs ?? DEFAULT_DEADLINE_MS;
	const intervalMs = options.intervalMs ?? DEFAULT_INTERVAL_MS;
	const now = options.now ?? (() => Date.now());
	const sleep =
		options.sleep ?? ((ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms)));

	const deadline = now() + deadlineMs;
	let last = initial;
	let polls = 0;

	while (now() < deadline) {
		last = await sync();
		polls += 1;
		if (isSettled(last) || options.stopWhen?.(last)) return { last, polls, timedOut: false };
		await sleep(intervalMs);
	}

	return { last, polls, timedOut: true };
}
