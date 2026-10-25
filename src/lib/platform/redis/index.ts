/**
 * Shared Redis Client Utility
 *
 * Provides a managed Redis connection pool for all security plugins.
 * Features:
 * - Connection pooling with named clients
 * - Automatic reconnection with exponential backoff
 * - Health checks and keepalive
 * - Graceful shutdown support
 * - Connection timeout handling
 *
 * Usage:
 * ```ts
 * import { getSharedRedisClient } from './index.js';
 *
 * const redis = await getSharedRedisClient('MyPlugin');
 * await redis.ensureConnected();
 * await redis.set('key', 'value');
 * ```
 */

import { createClient, type RedisClientType } from 'redis';
import { createScopedLogger, enhancedLogger } from '../logger.js';

// ReturnType<typeof createClient> instantiates the generic signature with its
// type-parameter *constraints*, which does not match the concrete client
// produced by `createClient(options)` (default generics). Use the bare
// RedisClientType (same defaults as the createClient call) instead.
type RedisClientInstance = RedisClientType;

// ============================================
// Types
// ============================================

/**
 * Extended Redis client with managed connection helpers
 */
export type ManagedRedisClient = RedisClientInstance & {
	/** Ensure the client is connected, reconnecting if necessary */
	ensureConnected(): Promise<void>;
	/** Get the client name */
	clientName: string;
	/** Ping with timeout */
	pingWithTimeout(timeoutMs?: number): Promise<boolean>;
};

/**
 * Redis client configuration options
 */
export interface RedisClientOptions {
	/** Redis connection URL */
	url?: string;
	/** Redis host (used if url not provided) */
	host?: string;
	/** Redis port (used if url not provided) */
	port?: number;
	/** Redis password */
	password?: string;
	/** Redis database number */
	database?: number;
	/** Connection timeout (ms) */
	connectTimeoutMs?: number;
	/** Command timeout (ms) */
	commandTimeoutMs?: number;
	/** Maximum reconnection attempts */
	maxReconnectAttempts?: number;
	/** Base delay for reconnection (ms) */
	reconnectBaseDelay?: number;
	/** Maximum delay for reconnection (ms) */
	reconnectMaxDelay?: number;
	/** Enable keepalive pings */
	enableKeepalive?: boolean;
	/** Keepalive interval (ms) */
	keepaliveIntervalMs?: number;
}

interface ClientEntry {
	client: RedisClientInstance;
	name: string;
	keepaliveInterval?: ReturnType<typeof setInterval>;
	options: Required<RedisClientOptions>;
}

// ============================================
// Logger Setup
// ============================================

// Simple logger - will be replaced with shared logger if available
const logger = createScopedLogger(['Redis']);

// Enhanced logger for better visual formatting
const redisEnhancedLogger = {
	debug: (message: string, ...args: unknown[]) => {
		enhancedLogger.debug(`[Redis] ${message}`, ...args);
	},
	warn: (message: string, ...args: unknown[]) => {
		enhancedLogger.warn(`[Redis] ${message}`, ...args);
	},
	info: (message: string, ...args: unknown[]) => {
		enhancedLogger.info(`[Redis] ${message}`, ...args);
	},
	error: (message: string, ...args: unknown[]) => {
		enhancedLogger.error(`[Redis] ${message}`, ...args);
	}
};

// ============================================
// Configuration
// ============================================

const DEFAULT_OPTIONS: Required<RedisClientOptions> = {
	url: '',
	host: 'localhost',
	port: 6379,
	password: '',
	database: 0,
	connectTimeoutMs: 5000,
	commandTimeoutMs: 5000,
	maxReconnectAttempts: 10,
	reconnectBaseDelay: 100,
	reconnectMaxDelay: 3000,
	enableKeepalive: true,
	keepaliveIntervalMs: 30000
};

// ============================================
// Client Storage
// ============================================

const clients = new Map<string, ClientEntry>();

// ============================================
// URL Building
// ============================================

/**
 * Build Redis URL from environment or options
 */
function buildRedisUrl(options: RedisClientOptions): string {
	// If URL provided, use it
	if (options.url) {
		return options.url;
	}

	// Check environment variables
	const envUrl = process.env.REDIS_URL;
	if (envUrl) {
		return envUrl;
	}

	// Build from components
	const host = options.host || process.env.REDIS_HOST || DEFAULT_OPTIONS.host;
	const port = options.port || parseInt(process.env.REDIS_PORT || '', 10) || DEFAULT_OPTIONS.port;
	const password = options.password || process.env.REDIS_PASSWORD || '';
	const database =
		options.database ?? (parseInt(process.env.REDIS_DB || '', 10) || DEFAULT_OPTIONS.database);

	let url = 'redis://';
	if (password) {
		url += `:${encodeURIComponent(password)}@`;
	}
	url += `${host}:${port}`;
	if (database > 0) {
		url += `/${database}`;
	}

	return url;
}

/**
 * Validate Redis URL format
 */
function validateRedisUrl(url: string): boolean {
	try {
		const parsed = new URL(url);
		return parsed.protocol === 'redis:' || parsed.protocol === 'rediss:';
	} catch {
		return false;
	}
}

// ============================================
// Client Creation
// ============================================

/**
 * Create managed Redis client with helpers
 */
function createManagedClient(
	baseClient: RedisClientInstance,
	name: string,
	options: Required<RedisClientOptions>
): ManagedRedisClient {
	const managed = baseClient as ManagedRedisClient;

	// Add client name
	managed.clientName = name;

	// Add ensureConnected method
	managed.ensureConnected = async function (): Promise<void> {
		if (this.isOpen && this.isReady) {
			return;
		}

		if (!this.isOpen) {
			logger.debug(`[Redis:${name}] Reconnecting...`);
			try {
				await Promise.race([
					this.connect(),
					new Promise<never>((_, reject) =>
						setTimeout(() => reject(new Error('Connection timeout')), options.connectTimeoutMs)
					)
				]);
			} catch (error) {
				logger.error(`[Redis:${name}] Reconnection failed`, {
					error: error instanceof Error ? error.message : String(error)
				});
				throw error;
			}
		}

		// Wait for ready state
		if (!this.isReady) {
			await new Promise<void>((resolve, reject) => {
				const timeout = setTimeout(() => {
					reject(new Error('Timeout waiting for ready state'));
				}, options.connectTimeoutMs);

				const onReady = () => {
					clearTimeout(timeout);
					resolve();
				};

				const onError = (err: Error) => {
					clearTimeout(timeout);
					reject(err);
				};

				this.once('ready', onReady);
				this.once('error', onError);
			});
		}
	};

	// Add ping with timeout
	managed.pingWithTimeout = async function (timeoutMs = 2000): Promise<boolean> {
		try {
			await Promise.race([
				this.ping(),
				new Promise<never>((_, reject) =>
					setTimeout(() => reject(new Error('Ping timeout')), timeoutMs)
				)
			]);
			return true;
		} catch {
			return false;
		}
	};

	return managed;
}

/**
 * Start keepalive pings for a client
 */
function startKeepalive(entry: ClientEntry): void {
	if (!entry.options.enableKeepalive) return;
	if (entry.keepaliveInterval) return;

	entry.keepaliveInterval = setInterval(async () => {
		try {
			if (entry.client.isOpen) {
				await entry.client.ping();
				redisEnhancedLogger.debug(`${entry.name} Keepalive ping OK`);
			}
		} catch (error) {
			redisEnhancedLogger.warn(`${entry.name} Keepalive ping failed`, {
				error: error instanceof Error ? error.message : String(error)
			});
		}
	}, entry.options.keepaliveIntervalMs);

	// Don't prevent process exit
	if (entry.keepaliveInterval.unref) {
		entry.keepaliveInterval.unref();
	}
}

/**
 * Stop keepalive pings for a client
 */
function stopKeepalive(entry: ClientEntry): void {
	if (entry.keepaliveInterval) {
		clearInterval(entry.keepaliveInterval);
		entry.keepaliveInterval = undefined;
	}
}

// ============================================
// Public API
// ============================================

/**
 * Get or create a shared Redis client
 *
 * Each plugin gets its own named client for identification.
 * Clients are cached and reused if already connected.
 *
 * @param name - Unique name for this client (e.g., 'AbuseProtectionPlugin')
 * @param options - Optional configuration overrides
 * @returns Connected managed Redis client
 *
 * @example
 * ```ts
 * const redis = await getSharedRedisClient('MyPlugin');
 * await redis.ensureConnected();
 * await redis.set('key', 'value', { EX: 3600 });
 * const value = await redis.get('key');
 * ```
 */
export async function getSharedRedisClient(
	name: string,
	options: RedisClientOptions = {}
): Promise<ManagedRedisClient> {
	// Return existing client if connected
	const existing = clients.get(name);
	if (existing && existing.client.isOpen) {
		return createManagedClient(existing.client, name, existing.options);
	}

	// Remove stale client if exists
	if (existing) {
		logger.warn(`[Redis:${name}] Removing stale client`);
		stopKeepalive(existing);
		try {
			await existing.client.disconnect();
		} catch {
			// Ignore disconnect errors for stale client
		}
		clients.delete(name);
	}

	// Merge options with defaults
	const config: Required<RedisClientOptions> = {
		...DEFAULT_OPTIONS,
		...options
	};

	// Build and validate URL
	const url = buildRedisUrl(config);
	if (!validateRedisUrl(url)) {
		throw new Error(`[Redis:${name}] Invalid Redis URL format`);
	}

	// Create client
	const client = createClient({
		url,
		socket: {
			connectTimeout: config.connectTimeoutMs,
			reconnectStrategy: (retries) => {
				if (retries > config.maxReconnectAttempts) {
					logger.error(
						`[Redis:${name}] Max reconnection attempts (${config.maxReconnectAttempts}) reached`
					);
					return new Error('Max reconnection attempts reached');
				}
				const delay = Math.min(
					config.reconnectBaseDelay * Math.pow(2, retries - 1),
					config.reconnectMaxDelay
				);
				logger.debug(`[Redis:${name}] Reconnecting in ${delay}ms (attempt ${retries})`);
				return delay;
			}
		}
	});

	// Event handlers
	client.on('error', (err) => {
		logger.error(`[Redis:${name}] Error`, { error: err.message });
	});

	client.on('connect', () => {
		logger.debug(`[Redis:${name}] Connected`);
	});

	client.on('ready', () => {
		logger.info(`[Redis:${name}] Ready`);
	});

	client.on('reconnecting', () => {
		logger.warn(`[Redis:${name}] Reconnecting...`);
	});

	client.on('end', () => {
		logger.info(`[Redis:${name}] Connection ended`);
		// Stop keepalive when connection ends
		const entry = clients.get(name);
		if (entry) {
			stopKeepalive(entry);
		}
	});

	// Connect with timeout
	try {
		await Promise.race([
			client.connect(),
			new Promise<never>((_, reject) =>
				setTimeout(
					() => reject(new Error(`Connection timeout after ${config.connectTimeoutMs}ms`)),
					config.connectTimeoutMs
				)
			)
		]);
	} catch (error) {
		logger.error(`[Redis:${name}] Failed to connect`, {
			error: error instanceof Error ? error.message : String(error)
		});
		throw error;
	}

	// Store client entry
	const entry: ClientEntry = {
		client,
		name,
		options: config
	};
	clients.set(name, entry);

	// Start keepalive
	startKeepalive(entry);

	logger.info(`[Redis:${name}] Client initialized successfully`);

	return createManagedClient(client, name, config);
}

/**
 * Alias for getSharedRedisClient (for compatibility)
 */
export const createManagedRedisClient = getSharedRedisClient;

/**
 * Close a specific Redis client
 *
 * @param name - Name of the client to close
 * @param force - If true, disconnect immediately without waiting for pending commands
 * @returns true if client was closed, false if not found
 */
export async function closeRedisClient(name: string, force = false): Promise<boolean> {
	const entry = clients.get(name);
	if (!entry) {
		return false;
	}

	stopKeepalive(entry);

	try {
		if (force) {
			await entry.client.disconnect();
		} else {
			await entry.client.quit();
		}
		logger.info(`[Redis:${name}] Closed`);
	} catch (err) {
		logger.error(`[Redis:${name}] Error closing`, {
			error: err instanceof Error ? err.message : String(err)
		});
	}

	clients.delete(name);
	return true;
}

/**
 * Close all Redis clients
 *
 * Call this on server shutdown to gracefully close all connections.
 *
 * @param force - If true, disconnect immediately without waiting
 *
 * @example
 * ```ts
 * process.on('SIGTERM', async () => {
 *   await closeAllRedisClients();
 * });
 * ```
 */
export async function closeAllRedisClients(force = false): Promise<void> {
	if (clients.size === 0) {
		logger.debug('[Redis] No clients to close');
		return;
	}

	logger.info(`[Redis] Closing ${clients.size} client(s)...`);

	const closePromises = Array.from(clients.keys()).map((name) => closeRedisClient(name, force));

	await Promise.all(closePromises);
	clients.clear();

	logger.info('[Redis] All clients closed');
}

// ============================================
// Status & Health
// ============================================

/**
 * Check if a client exists and is connected
 */
export function isClientConnected(name: string): boolean {
	const entry = clients.get(name);
	return entry?.client.isOpen ?? false;
}

/**
 * Get count of active clients
 */
export function getActiveClientCount(): number {
	return clients.size;
}

/**
 * Get names of all active clients
 */
export function getActiveClientNames(): string[] {
	return Array.from(clients.keys());
}

/**
 * Health check for all Redis clients
 *
 * @returns Object with health status for each client
 */
export async function healthCheck(): Promise<
	Record<string, { connected: boolean; ready: boolean; latencyMs?: number; error?: string }>
> {
	const results: Record<
		string,
		{ connected: boolean; ready: boolean; latencyMs?: number; error?: string }
	> = {};

	for (const [name, entry] of clients) {
		try {
			const start = performance.now();
			await Promise.race([
				entry.client.ping(),
				new Promise<never>((_, reject) =>
					setTimeout(() => reject(new Error('Health check timeout')), 2000)
				)
			]);
			const latencyMs = Math.round(performance.now() - start);

			results[name] = {
				connected: entry.client.isOpen,
				ready: entry.client.isReady,
				latencyMs
			};
		} catch (err) {
			results[name] = {
				connected: entry.client.isOpen,
				ready: false,
				error: err instanceof Error ? err.message : 'Unknown error'
			};
		}
	}

	return results;
}

/**
 * Get detailed status for a specific client
 */
export function getClientStatus(name: string): {
	exists: boolean;
	connected: boolean;
	ready: boolean;
	keepaliveEnabled: boolean;
} | null {
	const entry = clients.get(name);
	if (!entry) {
		return null;
	}

	return {
		exists: true,
		connected: entry.client.isOpen,
		ready: entry.client.isReady,
		keepaliveEnabled: entry.options.enableKeepalive && !!entry.keepaliveInterval
	};
}
