/**
 * Security Module
 *
 * This module contains all security functionality,
 * both server and client side, using main security types.
 */

import type { SecurityAlert, DashboardMetrics } from '../types';

// Server-side security operations
export * from './security.remote.ts';

// Rate limiting functionality
export * from './rate-limiting';

// Re-export main security types
export type { SecurityAlert, DashboardMetrics as SecurityMetrics } from '../types';

// UI-specific state interface
export interface SecurityDashboardState {
	metrics: DashboardMetrics | null;
	alerts: SecurityAlert[];
	isLoading: boolean;
	error?: string;
	timeRange: '24h' | '7d' | '30d' | '90d';
}
