/**
 * Resilience boundary for Directus API calls.
 * Provides circuit breaker, timeouts, and error classification.
 */

import type { SyncLogger, BoundaryConfig, DirectusFailureKind, DirectusRunOptions } from './types';

const noopLogger: SyncLogger = {
	info() {},
	warn() {},
	error() {},
	debug() {}
};

function propagateAbort(source: AbortSignal, controller: AbortController): () => void {
	const abort = () => controller.abort(source.reason);
	if (source.aborted) {
		abort();
		return () => {};
	}
	source.addEventListener('abort', abort, { once: true });
	return () => source.removeEventListener('abort', abort);
}

export async function fetchWithTimeout(
	input: RequestInfo | URL,
	init: RequestInit = {},
	timeoutMs = 8000
): Promise<Response> {
	if (!timeoutMs || timeoutMs <= 0) {
		return await fetch(input, init);
	}

	const controller = new AbortController();
	const removeAbortPropagation = init.signal
		? propagateAbort(init.signal, controller)
		: () => {};
	const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
	try {
		return await fetch(input, {
			...init,
			signal: controller.signal
		});
	} finally {
		removeAbortPropagation();
		clearTimeout(timeoutId);
	}
}

export class DirectusBoundary {
	private readonly config: BoundaryConfig;
	private readonly logger: SyncLogger;
	private failureCount = 0;
	private circuitOpenUntilMs = 0;
	private lastLogAtMs = 0;

	constructor(config?: Partial<BoundaryConfig>, logger?: SyncLogger) {
		this.config = {
			requestTimeoutMs: 8000,
			openCircuitAfterFailures: 3,
			cooldownMsTransient: 30_000,
			cooldownMsAuth: 15 * 60_000,
			cooldownMsForbidden: 15 * 60_000,
			logIntervalMs: 30_000,
			...config
		};
		this.logger = logger ?? noopLogger;
	}

	isCircuitOpen(nowMs = Date.now()): boolean {
		return nowMs < this.circuitOpenUntilMs;
	}

	private shouldLog(nowMs = Date.now()): boolean {
		return nowMs - this.lastLogAtMs >= this.config.logIntervalMs;
	}

	private logOncePerInterval(level: 'warn' | 'error', message: string, data?: unknown): void {
		const now = Date.now();
		if (!this.shouldLog(now)) return;
		this.lastLogAtMs = now;
		this.logger[level](message, data);
	}

	private classifyError(error: unknown): { kind: DirectusFailureKind; status?: number } {
		const status =
			error && typeof error === 'object' && 'status' in error && typeof error.status === 'number'
				? (error.status as number)
				: undefined;

		if (status === 401) return { kind: 'auth', status };
		if (status === 403) return { kind: 'forbidden', status };
		if (status && status >= 500) return { kind: 'server', status };

		if (error instanceof DOMException && error.name === 'AbortError') {
			return { kind: 'timeout' };
		}

		const message = error instanceof Error ? error.message : String(error);
		if (/timeout/i.test(message)) return { kind: 'timeout' };
		if (/ECONNREFUSED|ENOTFOUND|EAI_AGAIN|fetch failed/i.test(message)) return { kind: 'network' };

		return { kind: 'unknown', status };
	}

	private recordSuccess(): void {
		this.failureCount = 0;
		this.circuitOpenUntilMs = 0;
	}

	private recordFailure(kind: DirectusFailureKind, status?: number): void {
		this.failureCount += 1;

		if (this.failureCount < this.config.openCircuitAfterFailures) return;

		const now = Date.now();
		let cooldownMs = this.config.cooldownMsTransient;
		if (kind === 'auth') cooldownMs = this.config.cooldownMsAuth;
		if (kind === 'forbidden') cooldownMs = this.config.cooldownMsForbidden;

		this.circuitOpenUntilMs = now + cooldownMs;
		this.logOncePerInterval('warn', '[Directus] Circuit opened', {
			failureCount: this.failureCount,
			kind,
			status,
			cooldownMs
		});
	}

	private async withTimeout<T>(
		promise: Promise<T>,
		timeoutMs: number,
		operation: string
	): Promise<T> {
		if (!timeoutMs || timeoutMs <= 0) return promise;

		let timeoutId: ReturnType<typeof setTimeout> | undefined;
		const timeoutPromise = new Promise<T>((_resolve, reject) => {
			timeoutId = setTimeout(() => {
				reject(new DOMException(`[Directus] Timeout in ${operation}`, 'AbortError'));
			}, timeoutMs);
		});

		try {
			return await Promise.race([promise, timeoutPromise]);
		} finally {
			if (timeoutId) clearTimeout(timeoutId);
		}
	}

	async run<T>(options: DirectusRunOptions<T>): Promise<T> {
		const { operation, op, timeoutMs } = options;
		const propagateErrors = 'propagateErrors' in options && options.propagateErrors === true;

		if (this.isCircuitOpen()) {
			this.logOncePerInterval('warn', `[Directus] Skipping ${operation} (circuit open)`);
			if (propagateErrors) {
				throw new Error(`[Directus] Circuit open: ${operation}`);
			}
			return options.fallback;
		}

		try {
			const result = await this.withTimeout(
				op(),
				typeof timeoutMs === 'number' ? timeoutMs : this.config.requestTimeoutMs,
				operation
			);
			this.recordSuccess();
			return result;
		} catch (error) {
			const { kind, status } = this.classifyError(error);
			this.recordFailure(kind, status);

			this.logOncePerInterval('warn', `[Directus] ${operation} failed`, {
				kind,
				status,
				message: error instanceof Error ? error.message : String(error)
			});

			if (propagateErrors) throw error;
			return options.fallback;
		}
	}
}
