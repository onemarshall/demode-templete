/**
 * Security Features Remote Functions
 *
 * This file contains all security related remote functions.
 */

import { command } from '$app/server';
import { error } from '@sveltejs/kit';
import * as z from 'zod';
import { securityLogger } from '#lib/auth/shared/logger.js';
import { requireAuth } from '#lib/auth/server/auth-helpers.js';

// ============================================
// Security Remote Commands
// ============================================

/**
 * Block IP address
 */
export const blockIP = command(
	z.object({
		ip: z.string().min(1),
		reason: z.string().optional(),
		duration: z.number().optional() // in hours
	}),
	async ({ ip, reason, duration }) => {
		await requireAuth();

		try {
			// This would integrate with your security system
			// For now, just log the action
			securityLogger.info('[Security] IP blocked:', { ip, reason, duration });

			return {
				success: true,
				message: 'IP blocked successfully'
			};
		} catch (err) {
			const message = err instanceof Error ? err.message : 'Unknown error';
			securityLogger.error('[Security Server] Failed to block IP:', err);
			error(400, `Failed to block IP: ${message}`);
		}
	}
);

/**
 * Unblock IP address
 */
export const unblockIP = command(
	z.object({
		ip: z.string().min(1)
	}),
	async ({ ip }) => {
		await requireAuth();

		try {
			securityLogger.info('[Security] IP unblocked:', { ip });

			return {
				success: true,
				message: 'IP unblocked successfully'
			};
		} catch (err) {
			const message = err instanceof Error ? err.message : 'Unknown error';
			securityLogger.error('[Security Server] Failed to unblock IP:', err);
			error(400, `Failed to unblock IP: ${message}`);
		}
	}
);

/**
 * Clear security cache
 */
export const clearSecurityCache = command(
	z.object({
		type: z.string().optional() // 'all', 'rate-limit', 'blocked-ips', etc.
	}),
	async ({ type }) => {
		await requireAuth();

		try {
			securityLogger.info('[Security] Cache cleared:', { type });

			return {
				success: true,
				message: 'Security cache cleared successfully'
			};
		} catch (err) {
			const message = err instanceof Error ? err.message : 'Unknown error';
			securityLogger.error('[Security Server] Failed to clear cache:', err);
			error(400, `Failed to clear security cache: ${message}`);
		}
	}
);
