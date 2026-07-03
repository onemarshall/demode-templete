/**
 * Logger Configuration
 *
 * Provides structured logging with:
 * - Deduplication to prevent log spam
 * - Scoped loggers for different modules
 * - Security-specific logging
 * - Memory-safe log tracking
 */

type LogMethod = (...args: unknown[]) => void;

export interface ConsolaInstance {
	info: LogMethod;
	warn: LogMethod;
	error: LogMethod;
	debug: LogMethod;
	trace: LogMethod;
	success: LogMethod;
	withTag(tag: string): ConsolaInstance;
}

type ConsoleLoggerOptions = {
	level?: number;
	defaults?: {
		tag?: string;
	};
	formatOptions?: unknown;
};

// ============================================
// Configuration
// ============================================

/**
 * Log levels:
 * 0 = Silent (no logs)
 * 1 = Error only
 * 2 = Warn + Error
 * 3 = Info + Warn + Error (default)
 * 4 = Debug + Info + Warn + Error
 * 5 = Trace + Debug + Info + Warn + Error (verbose)
 */
const LOG_LEVELS = {
	SILENT: 0,
	ERROR: 1,
	WARN: 2,
	INFO: 3,
	DEBUG: 4,
	TRACE: 5
} as const;

const METHOD_LEVELS = {
	error: LOG_LEVELS.ERROR,
	warn: LOG_LEVELS.WARN,
	info: LOG_LEVELS.INFO,
	success: LOG_LEVELS.INFO,
	debug: LOG_LEVELS.DEBUG,
	trace: LOG_LEVELS.TRACE
} as const;

function createConsola({ level = LOG_LEVELS.INFO, defaults }: ConsoleLoggerOptions): ConsolaInstance {
	const tag = defaults?.tag ?? 'App';

	const write = (method: keyof typeof METHOD_LEVELS, args: unknown[]) => {
		if (level < METHOD_LEVELS[method]) return;

		const prefix = tag ? [`[${tag}]`] : [];
		const output = [...prefix, ...args];

		switch (method) {
			case 'error':
				console.error(...output);
				break;
			case 'warn':
				console.warn(...output);
				break;
			case 'debug':
			case 'trace':
				console.debug(...output);
				break;
			default:
				console.info(...output);
		}
	};

	return {
		info: (...args) => write('info', args),
		warn: (...args) => write('warn', args),
		error: (...args) => write('error', args),
		debug: (...args) => write('debug', args),
		trace: (...args) => write('trace', args),
		success: (...args) => write('success', args),
		withTag: (nextTag) =>
			createConsola({
				level,
				defaults: {
					tag: tag ? `${tag}:${nextTag}` : nextTag
				}
			})
	};
}

function clampLogLevel(value: number): number {
	if (!Number.isFinite(value)) return LOG_LEVELS.INFO;
	return Math.min(LOG_LEVELS.TRACE, Math.max(LOG_LEVELS.SILENT, value));
}

// Environment detection
const processEnv = typeof process !== 'undefined' ? process.env : undefined;
const nodeEnv = processEnv?.NODE_ENV ?? 'development';
const isDevelopment = nodeEnv === 'development';

// Logger configuration from environment
const loggerDisabled = processEnv?.APP_LOGGER_DISABLED === 'true';
const envLogLevel = processEnv?.APP_LOG_LEVEL ? Number(processEnv.APP_LOG_LEVEL) : NaN;
const baseLogLevel = Number.isFinite(envLogLevel)
	? clampLogLevel(envLogLevel)
	: isDevelopment
		? LOG_LEVELS.DEBUG
		: LOG_LEVELS.INFO;

// Deduplication settings
const DEDUPE_WINDOW_MS = 250;
const DEDUPE_CLEANUP_INTERVAL_MS = 60_000; // Clean up every minute
const MAX_RECENT_LOGS = 1000; // Prevent unbounded growth

// ============================================
// Deduplication System
// ============================================

const recentLogs = new Map<string, number>();
let cleanupInterval: ReturnType<typeof setInterval> | null = null;

/**
 * Start the cleanup interval for recent logs
 * Prevents memory leaks from accumulated log keys
 */
function startCleanupInterval(): void {
	if (cleanupInterval) return;

	// Only run cleanup on server (has setInterval)
	if (typeof setInterval === 'undefined') return;

	cleanupInterval = setInterval(() => {
		const now = Date.now();
		const cutoff = now - DEDUPE_WINDOW_MS;

		// Remove old entries
		for (const [key, timestamp] of recentLogs.entries()) {
			if (timestamp < cutoff) {
				recentLogs.delete(key);
			}
		}

		// If still too large, clear oldest half
		if (recentLogs.size > MAX_RECENT_LOGS) {
			const entries = Array.from(recentLogs.entries()).sort((a, b) => a[1] - b[1]);

			const toRemove = Math.floor(entries.length / 2);
			for (let i = 0; i < toRemove; i++) {
				const entry = entries[i];
				if (!entry) continue;
				recentLogs.delete(entry[0]);
			}
		}
	}, DEDUPE_CLEANUP_INTERVAL_MS);

	// Don't prevent process exit
	cleanupInterval?.unref?.();
}

/**
 * Stop the cleanup interval
 */
export function stopLoggerCleanup(): void {
	if (cleanupInterval) {
		clearInterval(cleanupInterval);
		cleanupInterval = null;
	}
}

/**
 * Safely serialize arguments for deduplication key
 */
function serializeArgs(args: unknown[]): string {
	return args
		.map((arg) => {
			if (arg === null) return 'null';
			if (arg === undefined) return 'undefined';
			if (typeof arg === 'string') return arg;
			if (typeof arg === 'number' || typeof arg === 'boolean') {
				return String(arg);
			}

			try {
				// Handle circular references
				const seen = new WeakSet();
				return JSON.stringify(arg, (_, value) => {
					if (typeof value === 'object' && value !== null) {
						if (seen.has(value)) {
							return '[Circular]';
						}
						seen.add(value);
					}
					return value;
				});
			} catch {
				return Object.prototype.toString.call(arg);
			}
		})
		.join('|');
}

/**
 * Check if a log should be suppressed due to recent duplicate
 */
function shouldSuppress(scope: string, args: unknown[]): boolean {
	const key = `${scope}:${serializeArgs(args)}`;
	const now = Date.now();
	const lastLoggedAt = recentLogs.get(key);

	if (lastLoggedAt && now - lastLoggedAt < DEDUPE_WINDOW_MS) {
		return true;
	}

	recentLogs.set(key, now);
	return false;
}

/**
 * Create a proxy that deduplicates info and success logs
 */
function createDedupedLogger(logger: ConsolaInstance, dedupe = true): ConsolaInstance {
	if (!dedupe) return logger;

	return new Proxy(logger, {
		get(target, prop, receiver) {
			const original = Reflect.get(target, prop, receiver);

			if (typeof prop === 'string' && typeof original === 'function') {
				// Only dedupe info and success - errors/warnings should always show
				if (prop === 'info' || prop === 'success') {
					return (...args: unknown[]) => {
						if (shouldSuppress(prop, args)) return;
						return original.apply(target, args);
					};
				}

				// Wrap other methods to maintain context
				return (...args: unknown[]) => original.apply(target, args);
			}

			return original;
		}
	}) as ConsolaInstance;
}

// Start cleanup on module load
startCleanupInterval();

// ============================================
// Base Logger
// ============================================

type NamedLoggerOptions = {
	tag: string;
	level?: number;
	compact?: boolean;
	dedupe?: boolean;
};

function createNamedLogger({ tag, level, compact = true, dedupe = false }: NamedLoggerOptions) {
	const instance = createConsola({
		level: loggerDisabled ? LOG_LEVELS.SILENT : clampLogLevel(level ?? baseLogLevel),
		formatOptions: {
			colors: true,
			date: true,
			compact,
			icon: false // Disable icons to prevent ⚙ from appearing
		},
		defaults: {
			tag
		}
	});

	return dedupe ? createDedupedLogger(instance) : instance;
}

const baseLogger = createNamedLogger({ tag: 'App' });

/**
 * Main application logger with deduplication
 */
export const logger = createDedupedLogger(baseLogger);

// ============================================
// Scoped Loggers
// ============================================

const scopedLoggerCache = new Map<string, ConsolaInstance>();

/**
 * Convert a string to a proper tag part (capitalized)
 */
function toTagPart(part: string): string {
	const trimmed = part.trim();
	if (!trimmed) return '';

	// Keep all-caps as-is (acronyms like API, CMS)
	if (trimmed.toUpperCase() === trimmed && trimmed.length <= 5) {
		return trimmed;
	}

	// Capitalize first letter
	return `${trimmed.charAt(0).toUpperCase()}${trimmed.slice(1)}`;
}

/**
 * Get or create a scoped logger with caching
 */
function getScopedLogger(tag: string, dedupe = true): ConsolaInstance {
	const cacheKey = `${tag}:${dedupe}`;

	const cached = scopedLoggerCache.get(cacheKey);
	if (cached) {
		return cached;
	}

	const scopedLogger = createDedupedLogger(baseLogger.withTag(tag), dedupe);
	scopedLoggerCache.set(cacheKey, scopedLogger);

	return scopedLogger;
}

/**
 * Create a scoped logger from multiple tag parts
 *
 * @example
 * const log = createScopedLogger(['Auth', 'Session']);
 * log.info('Session created'); // [Auth:Session] Session created
 */
export function createScopedLogger(
	parts: (string | undefined)[],
	options: { dedupe?: boolean } = {}
): ConsolaInstance {
	const { dedupe = true } = options;

	const tag = parts
		.filter((part): part is string => Boolean(part && part.trim()))
		.map(toTagPart)
		.join(':');

	return tag ? getScopedLogger(tag, dedupe) : logger;
}

/**
 * Create a logger for a specific provider
 *
 * @example
 * const log = createProviderLogger('CMS', 'Directus');
 * log.info('Connected'); // [Provider:CMS:Directus] Connected
 */
export function createProviderLogger(
	scope: string,
	provider?: string,
	options: { dedupe?: boolean } = {}
): ConsolaInstance {
	return createScopedLogger(['Provider', scope, provider], options);
}

// ============================================
// Specialized Loggers
// ============================================

/**
 * Security-specific logger
 * - Never suppressed (all security events are important)
 * - Non-compact format for detailed output
 * - Always enabled unless explicitly disabled
 */
export const securityLogger = createConsola({
	level: loggerDisabled ? LOG_LEVELS.SILENT : LOG_LEVELS.INFO,
	formatOptions: {
		colors: true,
		date: true,
		compact: false, // Detailed format for security logs
		icon: false // Disable icons to prevent ⚙ from appearing
	},
	defaults: {
		tag: 'Security'
	}
});

/**
 * API-specific logger
 * - Debug level in development for detailed request logging
 * - Warn level in production to reduce noise
 */
export const apiLogger = createNamedLogger({
	tag: 'API',
	level: isDevelopment ? LOG_LEVELS.DEBUG : LOG_LEVELS.WARN,
	compact: false,
	dedupe: false
});

/**
 * Performance logger for timing and metrics
 */
export const perfLogger = createNamedLogger({
	tag: 'Perf',
	level: isDevelopment ? LOG_LEVELS.DEBUG : LOG_LEVELS.WARN
});

// ============================================
// Utilities
// ============================================

/**
 * Extract error message from unknown error type
 */
export function getErrorMessage(error: unknown): string {
	if (error instanceof Error) return error.message;
	if (typeof error === 'string') return error;
	if (error && typeof error === 'object' && 'message' in error) {
		return String((error as { message: unknown }).message);
	}
	return 'Unknown error occurred';
}

/**
 * Extract full error details for logging
 */
export function getErrorDetails(error: unknown): {
	message: string;
	name?: string;
	stack?: string;
	code?: string;
} {
	if (error instanceof Error) {
		return {
			message: error.message,
			name: error.name,
			stack: isDevelopment ? error.stack : undefined,
			code: 'code' in error ? String(error.code) : undefined
		};
	}

	return {
		message: getErrorMessage(error)
	};
}

/**
 * Create a timed logger that logs duration
 *
 * @example
 * const end = timedLog('Database query');
 * await db.query(...);
 * end(); // Logs: "Database query completed in 123ms"
 */
export function timedLog(label: string, loggerInstance: ConsolaInstance = perfLogger): () => void {
	const start = performance.now();

	return () => {
		const duration = performance.now() - start;
		loggerInstance.info(`${label} completed in ${duration.toFixed(2)}ms`);
	};
}

/**
 * Log with automatic error handling
 */
export function safeLog(
	level: 'info' | 'warn' | 'error' | 'debug',
	message: string,
	data?: unknown,
	loggerInstance: ConsolaInstance = logger
): void {
	try {
		if (data !== undefined) {
			loggerInstance[level](message, data);
		} else {
			loggerInstance[level](message);
		}
	} catch {
		// Last resort - use console
		console[level === 'debug' ? 'log' : level](message, data);
	}
}

// ============================================
// Debug Utilities
// ============================================

/**
 * Get current logger configuration (for debugging)
 */
export function getLoggerConfig(): {
	level: number;
	disabled: boolean;
	environment: string;
	recentLogsSize: number;
} {
	return {
		level: loggerDisabled ? LOG_LEVELS.SILENT : baseLogLevel,
		disabled: loggerDisabled,
		environment: nodeEnv,
		recentLogsSize: recentLogs.size
	};
}

/**
 * Reset Dashboard Datad loggers (useful for testing)
 */
export function clearLoggerCache(): void {
	scopedLoggerCache.clear();
	recentLogs.clear();
}

// ============================================
// Enhanced Console Formatting
// ============================================

/**
 * ANSI color codes for terminal formatting
 */
const ANSI = {
	RESET: '\x1b[0m',
	BOLD: '\x1b[1m',
	DIM: '\x1b[2m',
	RED: '\x1b[31m',
	GREEN: '\x1b[32m',
	YELLOW: '\x1b[33m',
	BLUE: '\x1b[34m',
	MAGENTA: '\x1b[35m',
	CYAN: '\x1b[36m',
	WHITE: '\x1b[37m',
	GRAY: '\x1b[90m'
} as const;

/**
 * Section categories with their colors (no icons)
 */
const SECTION_CONFIG = {
	'Security Dashboard SDK': { color: ANSI.BLUE, priority: 1 },
	'Security Page': { color: ANSI.CYAN, priority: 2 },
	'Abuse Detection': { color: ANSI.YELLOW, priority: 3 },
	'Redis': { color: ANSI.GREEN, priority: 4 },
	'Auth': { color: ANSI.MAGENTA, priority: 5 },
	'API': { color: ANSI.RED, priority: 6 },
	'Default': { color: ANSI.WHITE, priority: 99 }
} as const;

type SectionKey = keyof typeof SECTION_CONFIG;

/**
 * Extract section name from log message
 * Matches patterns like "[Section Name] message"
 */
function extractSection(message: string): { section: SectionKey; cleanMessage: string } {
	const match = message.match(/^\[([^\]]+)\]\s*(.+)$/);
	if (!match) {
		return { section: 'Default', cleanMessage: message };
	}

	const [, sectionName, cleanMessage] = match;
	
	// Check if section name matches any known section
	const sectionKey = Object.keys(SECTION_CONFIG).find(
		key => sectionName?.toLowerCase().includes(key.toLowerCase().replace(' SDK', '').toLowerCase())
	) as SectionKey | undefined;

	return {
		section: sectionKey ?? 'Default',
		cleanMessage: cleanMessage?.trim() ?? message
	};
}

/**
 * Format a log message with enhanced visual formatting
 */
function formatLogMessage(message: string, level: string = 'info'): string {
	const { section, cleanMessage } = extractSection(message);
	const config = SECTION_CONFIG[section];
	
	// Determine level color
	let levelColor: string = ANSI.WHITE;
	switch (level.toLowerCase()) {
		case 'error':
			levelColor = ANSI.RED;
			break;
		case 'warn':
			levelColor = ANSI.YELLOW;
			break;
		case 'info':
			levelColor = config.color;
			break;
		case 'debug':
			levelColor = ANSI.GRAY;
			break;
	}

	// Format without icons: BOLD SECTION + RESET + SPACE + MESSAGE
	// Example: [Security Dashboard SDK] Events fetch took 20ms for 1 events
	return `${ANSI.BOLD}${levelColor}[${section}]${ANSI.RESET} ${cleanMessage}`;
}

/**
 * Enhanced logger with better visual formatting
 */
export const enhancedLogger = {
	...logger,
	
	/**
	 * Log with enhanced formatting
	 */
	info: (message: string, ...args: unknown[]) => {
		const formatted = formatLogMessage(message, 'info');
		logger.info(formatted, ...args);
	},
	
	warn: (message: string, ...args: unknown[]) => {
		const formatted = formatLogMessage(message, 'warn');
		logger.warn(formatted, ...args);
	},
	
	error: (message: string, ...args: unknown[]) => {
		const formatted = formatLogMessage(message, 'error');
		logger.error(formatted, ...args);
	},
	
	debug: (message: string, ...args: unknown[]) => {
		const formatted = formatLogMessage(message, 'debug');
		logger.debug(formatted, ...args);
	},
	
	/**
	 * Log a section separator for better visual grouping
	 */
	section: (sectionName: string) => {
		const separator = `${ANSI.DIM}─────────────────────────────────────────────────────────${ANSI.RESET}`;
		logger.info(separator);
		logger.info(`${ANSI.BOLD}${ANSI.CYAN}>>> ${sectionName} <<<${ANSI.RESET}`);
		logger.info(separator);
	},
	
	/**
	 * Security-specific enhanced logger
	 */
	security: {
		info: (message: string, ...args: unknown[]) => {
			const formatted = formatLogMessage(message, 'info');
			securityLogger.info(formatted, ...args);
		},
		warn: (message: string, ...args: unknown[]) => {
			const formatted = formatLogMessage(message, 'warn');
			securityLogger.warn(formatted, ...args);
		},
		error: (message: string, ...args: unknown[]) => {
			const formatted = formatLogMessage(message, 'error');
			securityLogger.error(formatted, ...args);
		},
		debug: (message: string, ...args: unknown[]) => {
			const formatted = formatLogMessage(message, 'debug');
			securityLogger.debug(formatted, ...args);
		}
	}
};
