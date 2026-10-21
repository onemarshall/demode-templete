// src/lib/auth/server/database/db.ts
import { Pool, type PoolClient } from 'pg';
import { getServerEnv } from '#lib/auth/shared/env/index.js';
import { logger } from '#lib/auth/shared/logger.js';

let pool: Pool | null = null;
let poolPromise: Promise<Pool> | null = null;

/**
 * Initialize the database connection pool.
 * Handles race conditions by reusing in-flight initialization.
 */
async function initializePool(): Promise<Pool> {
	if (pool) {
		return pool;
	}

	// Prevent race condition - reuse in-flight initialization
	if (poolPromise) {
		return poolPromise;
	}

	poolPromise = (async () => {
		const env = await getServerEnv();
		const databaseUrl =
			typeof env.BETTER_DATABASE_URL === 'string' ? env.BETTER_DATABASE_URL : undefined;

		if (!databaseUrl) {
			throw new Error('BETTER_DATABASE_URL is not set in the environment variables');
		}

		const newPool = new Pool({
			connectionString: databaseUrl,
			max: 20,
			idleTimeoutMillis: 30000,
			connectionTimeoutMillis: 2000
		});

		newPool.on('error', (err) => {
			logger.error('[DB] Unexpected error on idle client:', { error: err.message });
			// Reset pool so next request creates a new one
			pool = null;
			poolPromise = null;
		});

		pool = newPool;
		logger.debug('[DB] Connection pool initialized');
		return newPool;
	})();

	return poolPromise;
}

/**
 * Get the database connection pool.
 */
export async function getDB(): Promise<Pool> {
	return initializePool();
}

/**
 * Get a client from the connection pool.
 * Remember to call client.release() when done.
 */
export async function getDBClient(): Promise<PoolClient> {
	const db = await getDB();
	return db.connect();
}

/**
 * Execute a callback within a database transaction.
 * Automatically handles BEGIN, COMMIT, and ROLLBACK.
 */
export async function withTransaction<T>(callback: (client: PoolClient) => Promise<T>): Promise<T> {
	const client = await getDBClient();

	try {
		await client.query('BEGIN');
		const result = await callback(client);
		await client.query('COMMIT');
		return result;
	} catch (error) {
		await client.query('ROLLBACK');
		throw error;
	} finally {
		client.release();
	}
}

/**
 * Gracefully close the database connection pool.
 * Call this during application shutdown.
 */
export async function closeDB(): Promise<void> {
	if (pool) {
		await pool.end();
		pool = null;
		poolPromise = null;
		logger.debug('[DB] Connection pool closed');
	}
}
