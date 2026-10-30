/**
 * Node composition for the diagnostic worker.
 *
 * The Trigger.dev task calls this. It configures the shared Postgres pool and
 * runs the same orchestration the app uses, so there is one bridge to the
 * engine rather than a worker-only copy.
 */

import { getServerEnv } from '#lib/platform/config/server.server.js';
import { configureDatabase } from '#lib/platform/database/db.js';
import {
	startDiagnosticRun,
	syncDiagnosticRun,
	type SyncRunResult
} from '#lib/modules/diagnostic/server/orchestration.js';

let initialized: Promise<void> | undefined;

async function initialize(): Promise<void> {
	if (initialized) return initialized;
	initialized = (async () => {
		let databaseUrl = process.env.BETTER_DATABASE_URL?.trim();
		if (!databaseUrl) {
			const env = await getServerEnv();
			databaseUrl = env.BETTER_DATABASE_URL;
		}
		if (!databaseUrl)
			throw new Error('Diagnostic worker requires a PostgreSQL connection.');
		configureDatabase(databaseUrl);
	})();
	return initialized;
}

const TERMINAL_ENGAGEMENT = new Set([
	'delivered',
	'failed',
	'quality_hold',
	'ready',
	'withdrawn'
]);
const TERMINAL_INTAKE = new Set([
	'needs_analysis_review',
	'needs_decision_record',
	'held',
	'published',
	'review_required'
]);

export async function runDiagnosticIntake(
	engagementId: string
): Promise<SyncRunResult & { timedOut?: boolean }> {
	await initialize();
	const started = await startDiagnosticRun(engagementId);
	let last: SyncRunResult = {
		engagementId,
		status: started.status,
		intake: null
	};
	const deadline = Date.now() + 25 * 60_000;
	while (Date.now() < deadline) {
		const synced = await syncDiagnosticRun(engagementId);
		last = synced;
		if (
			TERMINAL_ENGAGEMENT.has(synced.status.engagement) ||
			TERMINAL_INTAKE.has(synced.intake?.status ?? '')
		)
			return synced;
		await new Promise((resolve) => setTimeout(resolve, 5_000));
	}
	return { ...last, timedOut: true };
}
