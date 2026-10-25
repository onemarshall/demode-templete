import { describe, it, expect, vi } from 'vitest';
import { DirectusBoundary } from 'better-auth-directus';

describe('DirectusBoundary', () => {
	it('opens circuit after repeated failures and skips operations (fail-open)', async () => {
		const boundary = new DirectusBoundary({
			requestTimeoutMs: 50,
			openCircuitAfterFailures: 2,
			cooldownMsTransient: 10_000,
			logIntervalMs: 0
		});

		const op = vi.fn(async () => {
			const err = new Error('Unauthorized');
			(err as unknown as { status: number }).status = 401;
			throw err;
		});

		const r1 = await boundary.run({ operation: 'test', op, fallback: null });
		expect(r1).toBeNull();
		const r2 = await boundary.run({ operation: 'test', op, fallback: null });
		expect(r2).toBeNull();

		const callsBefore = op.mock.calls.length;
		const r3 = await boundary.run({ operation: 'test', op, fallback: null });
		expect(r3).toBeNull();
		expect(op.mock.calls.length).toBe(callsBefore);
	});

	it('treats timeout as failure and returns fallback', async () => {
		const boundary = new DirectusBoundary({
			requestTimeoutMs: 10,
			openCircuitAfterFailures: 1,
			cooldownMsTransient: 10_000,
			logIntervalMs: 0
		});

		const op = vi.fn(async () => {
			await new Promise((r) => setTimeout(r, 50));
			return 'ok';
		});

		const r1 = await boundary.run({ operation: 'slow', op, fallback: 'fallback' });
		expect(r1).toBe('fallback');

		const callsBefore = op.mock.calls.length;
		const r2 = await boundary.run({ operation: 'slow', op, fallback: 'fallback' });
		expect(r2).toBe('fallback');
		expect(op.mock.calls.length).toBe(callsBefore);
	});
});
