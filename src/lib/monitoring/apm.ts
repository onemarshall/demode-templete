import { logger } from '$lib/auth/shared/logger';

export interface SystemHealthPayload {
	overallStatus: 'operational' | 'degraded' | 'critical';
	timestamp: string;
	latencyMs: number;
	checks: Array<{
		name: string;
		status: 'operational' | 'degraded' | 'critical';
		latencyMs: number;
		error?: string;
	}>;
	system: {
		memory: { rssMb: number; heapUsedMb: number };
		cpu: { load1m: number; load5m: number; load15m: number };
		uptimeSec: number;
	};
}

/**
 * Hook to emit system health payload to your monitoring/APM provider.
 * Replace the placeholder with your APM SDK (e.g., Datadog, Sentry metrics, New Relic).
 */
export async function emitSystemHealth(payload: SystemHealthPayload): Promise<void> {
	try {
		// Example: send to an external collector
		// await apmClient.send('system_health', payload);
		logger.debug('[APM] System health emitted', {
			overallStatus: payload.overallStatus,
			latencyMs: payload.latencyMs
		});
	} catch (error) {
		logger.warn('[APM] Failed to emit system health', {
			error: error instanceof Error ? error.message : String(error)
		});
	}
}
