// src/lib/auth/server/options/database.ts
import { getDB } from '../database/db';

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
