import { schedules } from '@trigger.dev/sdk';
import { reconcileDiagnosticEngagements } from '../lib/app/diagnostic-worker.server';

/**
 * Self-service delivery sweep.
 *
 * The same shape as `strategy-recovery-v1`: a scheduled task that re-drives
 * work whose dispatch was lost, whose import failed, or whose run outlived the
 * intake task's poll window. Without it, a paid engagement can sit untouched
 * until someone opens the page.
 *
 * The sweep is idempotent and excludes terminal engagements, so running it more
 * often than necessary is harmless.
 */
export const diagnosticReconcileV1 = schedules.task({
	id: 'diagnostic-reconcile-v1',
	cron: {
		pattern: '*/5 * * * *',
		window: '5m',
		environments: ['STAGING', 'PRODUCTION']
	},
	run: async () => reconcileDiagnosticEngagements(25)
});
