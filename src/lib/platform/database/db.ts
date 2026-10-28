// src/lib/platform/database/db.ts
import { Pool, type PoolClient } from 'pg';
import { logger } from '../logger.js';

/** A caller-supplied transaction connection; feature code never serializes it. */
export interface DatabaseReader {
	query(text: string, values?: unknown[]): Promise<unknown>;
}

let configuredUrl: string | undefined;
/** The application supplies private runtime configuration before opening a pool.
 * Keeping this module free of Svelte imports also supports standalone workers. */
export function configureDatabase(url: string): void {
	const parsed = new URL(url);
	if (!['postgres:', 'postgresql:'].includes(parsed.protocol)) throw new Error('PostgreSQL connection required');
	if ((pool || poolPromise) && configuredUrl !== url) throw new Error('Cannot replace an active database connection');
	configuredUrl = url;
}
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

	if(!configuredUrl)throw new Error('The host must configure its database before requesting a connection');
	poolPromise = (async () => {
		const databaseUrl = configuredUrl;

		if (!databaseUrl) {
			throw new Error('The host must configure its database before requesting a connection');
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
