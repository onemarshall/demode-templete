/**
 * SSR-Safe Security Store
 *
 * Svelte 5 runes-compatible store for security state.
 * Safe to use in both SSR and browser contexts.
 */

// ============================================
// Types
// ============================================

export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

export interface SecurityState {
	isReady: boolean;
	isLoading: boolean;
	error: string | null;
	riskScore: number;
	riskLevel: RiskLevel;
	captchaRequired: boolean;
	captchaPassed: boolean;
	rateLimited: boolean;
	blocked: boolean;
	blockReason?: string;
	retryAfter?: number;
	lastChecked: number | null;
}

export interface SecurityStore {
	readonly current: SecurityState;
	checkStatus(): Promise<void>;
	verifyCaptcha(token: string): Promise<boolean>;
	reset(): void;
}

// ============================================
// Initial State
// ============================================

const initialState: SecurityState = {
	isReady: false,
	isLoading: false,
	error: null,
	riskScore: 0,
	riskLevel: 'low',
	captchaRequired: false,
	captchaPassed: false,
	rateLimited: false,
	blocked: false,
	lastChecked: null
};

// ============================================
// Browser Check
// ============================================

function isBrowser(): boolean {
	return typeof window !== 'undefined';
}

// ============================================
// Store Factory
// ============================================

export interface CreateSecurityStoreOptions {
	baseUrl?: string;
	autoCheck?: boolean;
	checkIntervalMs?: number;
}

export function createSecurityStore(options: CreateSecurityStoreOptions = {}): SecurityStore {
	const { baseUrl = '', autoCheck = false, checkIntervalMs = 60000 } = options;

	let state = $state<SecurityState>({ ...initialState });
	let checkInterval: ReturnType<typeof setInterval> | null = null;

	async function checkStatus(): Promise<void> {
		if (!isBrowser()) return;

		state.isLoading = true;
		state.error = null;

		try {
			const response = await fetch(`${baseUrl}/api/auth/security/status`, {
				method: 'GET',
				credentials: 'include'
			});

			if (!response.ok) {
				throw new Error(`Status check failed: ${response.status}`);
			}

			const data = await response.json();

			state = {
				...state,
				isReady: true,
				isLoading: false,
				riskScore: data.riskScore ?? 0,
				riskLevel: data.riskLevel ?? 'low',
				captchaRequired: data.captchaRequired ?? false,
				rateLimited: data.rateLimited ?? false,
				blocked: data.blocked ?? false,
				blockReason: data.blockReason,
				retryAfter: data.retryAfter,
				lastChecked: Date.now()
			};
		} catch (error) {
			state.isLoading = false;
			state.error = error instanceof Error ? error.message : 'Unknown error';
		}
	}

	async function verifyCaptcha(token: string): Promise<boolean> {
		if (!isBrowser()) return false;

		state.isLoading = true;
		state.error = null;

		try {
			const response = await fetch(`${baseUrl}/api/auth/security/verify-captcha`, {
				method: 'POST',
				credentials: 'include',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ token })
			});

			const data = await response.json();

			if (data.success) {
				state.captchaPassed = true;
				state.captchaRequired = false;
				state.isLoading = false;

				if (data.bypassToken) {
					try {
						sessionStorage.setItem('security_bypass_token', data.bypassToken);
					} catch {
						// Ignore storage errors
					}
				}

				return true;
			}

			state.isLoading = false;
			state.error = data.error ?? 'Verification failed';
			return false;
		} catch (error) {
			state.isLoading = false;
			state.error = error instanceof Error ? error.message : 'Verification error';
			return false;
		}
	}

	function reset(): void {
		state = { ...initialState };
	}

	function startAutoCheck(): void {
		if (!isBrowser() || !autoCheck || checkInterval) return;

		checkStatus();

		checkInterval = setInterval(() => {
			checkStatus();
		}, checkIntervalMs);
	}

	if (isBrowser() && autoCheck) {
		startAutoCheck();
	}

	return {
		get current() {
			return state;
		},
		checkStatus,
		verifyCaptcha,
		reset
	};
}

// ============================================
// Default Store Instance
// ============================================

let defaultStore: SecurityStore | null = null;

export function getSecurityStore(options?: CreateSecurityStoreOptions): SecurityStore {
	if (!defaultStore) {
		defaultStore = createSecurityStore(options);
	}
	return defaultStore;
}

export function resetSecurityStore(): void {
	if (defaultStore) {
		defaultStore.reset();
		defaultStore = null;
	}
}
