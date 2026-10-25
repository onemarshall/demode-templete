// src/lib/modules/auth/server/options/database.ts
import { getDB } from '#lib/platform/database/db.js';

/**
 * Database Options Configuration
 *
 * Uses raw pg Pool directly - no Kysely wrapper needed.
 * Better Auth accepts pg Pool natively.
 */
export async function getDatabaseOptions() {
	const pool = await getDB();

	return {
		database: pool
	};
}
