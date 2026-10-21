/**
 * Unified Security Client Plugin
 *
 * Single Better Auth client plugin that replaces 5 separate plugins.
 */

// ============================================
// Types
// ============================================

export interface SecurityClientPluginOptions {
	baseUrl?: string;
}

export interface SecurityStatusResponse {
	allowed: boolean;
	riskScore: number;
	riskLevel: 'low' | 'medium' | 'high' | 'critical';
	captchaRequired: boolean;
	rateLimited: boolean;
	blocked: boolean;
	blockReason?: string;
	retryAfter?: number;
}

export interface CaptchaVerifyResponse {
	success: boolean;
	error?: string;
	bypassToken?: string;
	bypassDuration?: number;
}

// ============================================
// Plugin Factory
// ============================================

export function securityClient(options: SecurityClientPluginOptions = {}) {
	const { baseUrl = '' } = options;

	return {
		id: 'security',
		$InferServerPlugin: {} as { id: 'security' },

		getActions: ($fetch: typeof fetch) => ({
			security: {
				async getStatus(): Promise<SecurityStatusResponse> {
					const response = await $fetch(`${baseUrl}/api/auth/security/status`, {
						method: 'GET',
						credentials: 'include'
					});

					if (!response.ok) {
						throw new Error(`Status check failed: ${response.status}`);
					}

					return response.json();
				},

				async verifyCaptcha(token: string): Promise<CaptchaVerifyResponse> {
					const response = await $fetch(`${baseUrl}/api/auth/security/verify-captcha`, {
						method: 'POST',
						credentials: 'include',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify({ token })
					});

					return response.json();
				},

				async recordFailure(hasCaptcha = false): Promise<{ recorded: boolean }> {
					const response = await $fetch(`${baseUrl}/api/auth/security/record-failure`, {
						method: 'POST',
						credentials: 'include',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify({ hasCaptcha })
					});

					return response.json();
				}
			}
		}),

		pathMethods: {
			'/security/status': 'GET',
			'/security/verify-captcha': 'POST',
			'/security/record-failure': 'POST'
		}
	};
}

// ============================================
// Type Inference Helper
// ============================================

export type SecurityClientPlugin = ReturnType<typeof securityClient>;
