/**
 * Node composition for the diagnostic worker.
 *
 * The Trigger.dev tasks call this. It configures the shared Postgres pool and
 * runs the same automation the app uses, so there is one bridge to the engine
 * rather than a worker-only copy.
 */

import { getServerEnv } from '#lib/platform/config/server.server.js';
import { configureDatabase } from '#lib/platform/database/db.js';
import {
	advanceEngagement,
	reconcileSelfServiceEngagements,
	type AdvanceResult,
	type ReconcileSummary
} from '#lib/modules/diagnostic/server/automation.js';

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

/**
 * Drive one commissioned engagement as far as the application legitimately can.
 *
 * This replaces the poll-only worker. Polling alone could not release an
 * approved report, could not recover an engagement whose dispatch was lost,
 * and did not tell the buyer the report was ready.
 */
export async function runDiagnosticAutomation(engagementId: string): Promise<AdvanceResult> {
	await initialize();
	return advanceEngagement(engagementId);
}

/**
 * Sweep the self-service queue. Safe to run on a schedule: every step is
 * idempotent and terminal engagements are excluded by the query.
 */
export async function reconcileDiagnosticEngagements(limit = 25): Promise<ReconcileSummary> {
	await initialize();
	return reconcileSelfServiceEngagements({
		limit,
		deadlineMs: 120_000,
		intervalMs: 5_000
	});
}
