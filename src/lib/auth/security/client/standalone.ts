/**
 * Standalone Security Client
 *
 * Direct fetch-based client for use without Better Auth client plugin.
 */

import type { SecurityStatusResponse, CaptchaVerifyResponse } from './plugin';

// ============================================
// Types
// ============================================

export interface StandaloneClientOptions {
	baseUrl?: string;
	credentials?: RequestCredentials;
}

// ============================================
// Standalone Client
// ============================================

export function createSecurityClient(options: StandaloneClientOptions = {}) {
	const { baseUrl = '', credentials = 'include' } = options;

	async function getStatus(): Promise<SecurityStatusResponse> {
		const response = await fetch(`${baseUrl}/api/auth/security/status`, {
			method: 'GET',
			credentials
		});

		if (!response.ok) {
			throw new Error(`Status check failed: ${response.status}`);
		}

		return response.json();
	}

	async function verifyCaptcha(token: string): Promise<CaptchaVerifyResponse> {
		const response = await fetch(`${baseUrl}/api/auth/security/verify-captcha`, {
			method: 'POST',
			credentials,
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ token })
		});

		return response.json();
	}

	async function recordFailure(hasCaptcha = false): Promise<{ recorded: boolean }> {
		const response = await fetch(`${baseUrl}/api/auth/security/record-failure`, {
			method: 'POST',
			credentials,
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ hasCaptcha })
		});

		return response.json();
	}

	async function getHealth(): Promise<{
		status: string;
		timestamp: number;
		uptime: number;
	}> {
		const response = await fetch(`${baseUrl}/api/auth/security/health`, {
			method: 'GET',
			credentials
		});

		if (!response.ok) {
			throw new Error(`Health check failed: ${response.status}`);
		}

		return response.json();
	}

	return {
		getStatus,
		verifyCaptcha,
		recordFailure,
		getHealth
	};
}

// ============================================
// Default Instance
// ============================================

let defaultClient: ReturnType<typeof createSecurityClient> | null = null;

export function getSecurityClient(options?: StandaloneClientOptions) {
	if (!defaultClient) {
		defaultClient = createSecurityClient(options);
	}
	return defaultClient;
}

export function resetSecurityClient(): void {
	defaultClient = null;
}

// ============================================
// Convenience Exports
// ============================================

export const security = {
	getStatus: () => getSecurityClient().getStatus(),
	verifyCaptcha: (token: string) => getSecurityClient().verifyCaptcha(token),
	recordFailure: (hasCaptcha?: boolean) => getSecurityClient().recordFailure(hasCaptcha),
	getHealth: () => getSecurityClient().getHealth()
};
