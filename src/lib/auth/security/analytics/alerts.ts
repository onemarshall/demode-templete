/**
 * Analytics Alert System
 *
 * Generates and manages security alerts based on thresholds.
 */

import { securityLogger } from '#lib/auth/shared/logger.js';
import type { SecurityAnalyticsEvent } from './collector';

// ============================================
// Types
// ============================================

export type AlertSeverity = 'info' | 'warning' | 'error' | 'critical';

export interface SecurityAlert {
	id: string;
	type: string;
	severity: AlertSeverity;
	message: string;
	timestamp: number;
	metadata?: Record<string, unknown>;
	acknowledged: boolean;
	acknowledgedAt?: number;
	acknowledgedBy?: string;
}

export interface AlertThresholds {
	blockedRequestsPerMinute: number;
	captchaFailuresPerMinute: number;
	highRiskRequestsPerMinute: number;
	criticalRiskRequestsPerMinute: number;
	rateLimitedRequestsPerMinute: number;
}

export interface AlertConfig {
	enabled: boolean;
	thresholds: AlertThresholds;
	maxAlerts: number;
	cooldownMs: number;
}

// ============================================
// Default Configuration
// ============================================

const DEFAULT_THRESHOLDS: AlertThresholds = {
	blockedRequestsPerMinute: 10,
	captchaFailuresPerMinute: 20,
	highRiskRequestsPerMinute: 50,
	criticalRiskRequestsPerMinute: 10,
	rateLimitedRequestsPerMinute: 100
};

const DEFAULT_CONFIG: AlertConfig = {
	enabled: true,
	thresholds: DEFAULT_THRESHOLDS,
	maxAlerts: 1000,
	cooldownMs: 60000
};

// ============================================
// Alert Manager
// ============================================

export class AlertManager {
	private readonly config: AlertConfig;
	private alerts: SecurityAlert[] = [];
	private lastAlertTime = new Map<string, number>();
	private eventWindow: SecurityAnalyticsEvent[] = [];
	private readonly windowMs = 60000;

	constructor(config?: Partial<AlertConfig>) {
		this.config = {
			...DEFAULT_CONFIG,
			...config,
			thresholds: { ...DEFAULT_THRESHOLDS, ...config?.thresholds }
		};
	}

	private shouldAlert(alertType: string): boolean {
		if (!this.config.enabled) return false;

		const lastTime = this.lastAlertTime.get(alertType);
		if (lastTime && Date.now() - lastTime < this.config.cooldownMs) {
			return false;
		}

		return true;
	}

	private createAlert(
		type: string,
		severity: AlertSeverity,
		message: string,
		metadata?: Record<string, unknown>
	): SecurityAlert {
		const alert: SecurityAlert = {
			id: crypto.randomUUID(),
			type,
			severity,
			message,
			timestamp: Date.now(),
			metadata,
			acknowledged: false
		};

		this.alerts.push(alert);
		this.lastAlertTime.set(type, Date.now());

		if (this.alerts.length > this.config.maxAlerts) {
			this.alerts = this.alerts.slice(-this.config.maxAlerts);
		}

		securityLogger.warn('[Security Alert]', {
			type,
			severity,
			message,
			metadata
		});

		return alert;
	}

	processEvent(event: SecurityAnalyticsEvent): SecurityAlert | null {
		if (!this.config.enabled) return null;

		const now = Date.now();
		this.eventWindow.push(event);
		this.eventWindow = this.eventWindow.filter((e) => now - e.timestamp < this.windowMs);

		return this.checkThresholds();
	}

	private checkThresholds(): SecurityAlert | null {
		const { thresholds } = this.config;
		const events = this.eventWindow;

		const blockedCount = events.filter((e) => e.blocked).length;
		if (blockedCount >= thresholds.blockedRequestsPerMinute) {
			if (this.shouldAlert('high_block_rate')) {
				return this.createAlert(
					'high_block_rate',
					'warning',
					`High block rate: ${blockedCount} blocked requests in the last minute`,
					{ blockedCount }
				);
			}
		}

		const captchaFailures = events.filter((e) => e.type === 'captcha_failed').length;
		if (captchaFailures >= thresholds.captchaFailuresPerMinute) {
			if (this.shouldAlert('high_captcha_failures')) {
				return this.createAlert(
					'high_captcha_failures',
					'warning',
					`High CAPTCHA failure rate: ${captchaFailures} failures in the last minute`,
					{ captchaFailures }
				);
			}
		}

		const highRiskCount = events.filter(
			(e) => e.riskLevel === 'high' || e.riskLevel === 'critical'
		).length;
		if (highRiskCount >= thresholds.highRiskRequestsPerMinute) {
			if (this.shouldAlert('high_risk_traffic')) {
				return this.createAlert(
					'high_risk_traffic',
					'error',
					`High risk traffic: ${highRiskCount} high/critical risk requests in the last minute`,
					{ highRiskCount }
				);
			}
		}

		const criticalCount = events.filter((e) => e.riskLevel === 'critical').length;
		if (criticalCount >= thresholds.criticalRiskRequestsPerMinute) {
			if (this.shouldAlert('critical_risk_spike')) {
				return this.createAlert(
					'critical_risk_spike',
					'critical',
					`Critical risk spike: ${criticalCount} critical risk requests in the last minute`,
					{ criticalCount }
				);
			}
		}

		const rateLimitedCount = events.filter((e) => e.rateLimited).length;
		if (rateLimitedCount >= thresholds.rateLimitedRequestsPerMinute) {
			if (this.shouldAlert('high_rate_limit')) {
				return this.createAlert(
					'high_rate_limit',
					'warning',
					`High rate limiting: ${rateLimitedCount} rate-limited requests in the last minute`,
					{ rateLimitedCount }
				);
			}
		}

		return null;
	}

	addManualAlert(
		type: string,
		severity: AlertSeverity,
		message: string,
		metadata?: Record<string, unknown>
	): SecurityAlert {
		return this.createAlert(type, severity, message, metadata);
	}

	getAlerts(options?: {
		severity?: AlertSeverity;
		acknowledged?: boolean;
		limit?: number;
	}): SecurityAlert[] {
		let result = [...this.alerts];

		if (options?.severity) {
			result = result.filter((a) => a.severity === options.severity);
		}

		if (options?.acknowledged !== undefined) {
			result = result.filter((a) => a.acknowledged === options.acknowledged);
		}

		result.sort((a, b) => b.timestamp - a.timestamp);

		if (options?.limit) {
			result = result.slice(0, options.limit);
		}

		return result;
	}

	acknowledgeAlert(alertId: string, userId?: string): boolean {
		const alert = this.alerts.find((a) => a.id === alertId);
		if (!alert) return false;

		alert.acknowledged = true;
		alert.acknowledgedAt = Date.now();
		alert.acknowledgedBy = userId;

		return true;
	}

	acknowledgeAllAlerts(userId?: string): number {
		let count = 0;
		for (const alert of this.alerts) {
			if (!alert.acknowledged) {
				alert.acknowledged = true;
				alert.acknowledgedAt = Date.now();
				alert.acknowledgedBy = userId;
				count++;
			}
		}
		return count;
	}

	clearAlerts(): void {
		this.alerts = [];
		this.eventWindow = [];
		this.lastAlertTime.clear();
	}

	getStats(): {
		total: number;
		unacknowledged: number;
		bySeverity: Record<AlertSeverity, number>;
	} {
		const bySeverity: Record<AlertSeverity, number> = {
			info: 0,
			warning: 0,
			error: 0,
			critical: 0
		};

		for (const alert of this.alerts) {
			bySeverity[alert.severity]++;
		}

		return {
			total: this.alerts.length,
			unacknowledged: this.alerts.filter((a) => !a.acknowledged).length,
			bySeverity
		};
	}
}

// ============================================
// Default Instance
// ============================================

let defaultAlertManager: AlertManager | null = null;

export function getDefaultAlertManager(): AlertManager {
	if (!defaultAlertManager) {
		defaultAlertManager = new AlertManager();
	}
	return defaultAlertManager;
}

export function resetDefaultAlertManager(): void {
	if (defaultAlertManager) {
		defaultAlertManager.clearAlerts();
		defaultAlertManager = null;
	}
}

// ============================================
// Convenience Functions
// ============================================

export function processSecurityEvent(event: SecurityAnalyticsEvent): SecurityAlert | null {
	return getDefaultAlertManager().processEvent(event);
}

export function addAlert(
	type: string,
	severity: AlertSeverity,
	message: string,
	metadata?: Record<string, unknown>
): SecurityAlert {
	return getDefaultAlertManager().addManualAlert(type, severity, message, metadata);
}

export function getAlerts(options?: {
	severity?: AlertSeverity;
	acknowledged?: boolean;
	limit?: number;
}): SecurityAlert[] {
	return getDefaultAlertManager().getAlerts(options);
}

export function acknowledgeAlert(alertId: string, userId?: string): boolean {
	return getDefaultAlertManager().acknowledgeAlert(alertId, userId);
}
