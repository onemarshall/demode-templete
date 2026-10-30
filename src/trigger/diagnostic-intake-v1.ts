import { metadata, schemaTask } from '@trigger.dev/sdk';
import { z } from 'zod';
import { runDiagnosticIntake } from '../lib/app/diagnostic-worker.server';

export const diagnosticIntakeV1PayloadSchema = z
	.object({ version: z.literal(1), engagementId: z.string().min(1) })
	.strict();

/**
 * Thin task entry. The durable engagement id is the only caller-supplied
 * authority; the worker resolves the brand and the intake from it.
 */
export const diagnosticIntakeV1 = schemaTask({
	id: 'diagnostic-intake-v1',
	schema: diagnosticIntakeV1PayloadSchema,
	maxDuration: 1800,
	retry: {
		maxAttempts: 3,
		minTimeoutInMs: 5_000,
		maxTimeoutInMs: 120_000,
		factor: 2,
		randomize: true
	},
	run: async ({ engagementId }) => {
		metadata.set('schemaVersion', 1);
		const result = await runDiagnosticIntake(engagementId);
		metadata.set('status', result.status.engagement);
		return {
			engagementId,
			status: result.status.engagement,
			intakeStatus: result.intake?.status ?? null,
			timedOut: result.timedOut ?? false
		};
	}
});
