/**
 * Client Utilities
 *
 * Consolidated utilities from all security plugins for client-side use.
 */

// ============================================
// Browser Detection
// ============================================

export function isBrowser(): boolean {
	return typeof window !== 'undefined';
}

export function isSecureContext(): boolean {
	return isBrowser() && window.isSecureContext;
}

// ============================================
// Risk Display
// ============================================

export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

export function formatRiskScore(score: number): string {
	return `${Math.round(score)}%`;
}

export function getRiskLevelColor(level: RiskLevel | string): string {
	switch (level) {
		case 'critical':
			return '#dc2626';
		case 'high':
			return '#ea580c';
		case 'medium':
			return '#ca8a04';
		case 'low':
			return '#16a34a';
		default:
			return '#6b7280';
	}
}

export function getRiskLevelLabel(level: RiskLevel): string {
	switch (level) {
		case 'critical':
			return 'Critical Risk';
		case 'high':
			return 'High Risk';
		case 'medium':
			return 'Medium Risk';
		case 'low':
			return 'Low Risk';
	}
}

// ============================================
// Time Formatting
// ============================================

export function formatTimestamp(timestamp: number): string {
	return new Date(timestamp).toLocaleString();
}

export function formatRelativeTime(timestamp: number): string {
	const seconds = Math.floor((Date.now() - timestamp) / 1000);

	if (seconds < 60) return 'just now';
	if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
	if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
	return `${Math.floor(seconds / 86400)}d ago`;
}

export function formatRetryAfter(seconds: number): string {
	if (seconds < 60) return `${seconds} seconds`;
	if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes`;
	return `${Math.floor(seconds / 3600)} hours`;
}

// ============================================
// Rate Limit Helpers
// ============================================

export function isRateLimitError(response: Response): boolean {
	return response.status === 429;
}

export function getRateLimitRetryAfter(response: Response): number | null {
	const retryAfter = response.headers.get('Retry-After');
	if (!retryAfter) return null;

	const seconds = parseInt(retryAfter, 10);
	return isNaN(seconds) ? null : seconds;
}

export async function waitForRateLimit(response: Response): Promise<void> {
	const seconds = getRateLimitRetryAfter(response);
	if (seconds && seconds > 0 && seconds <= 300) {
		await new Promise((resolve) => setTimeout(resolve, seconds * 1000));
	}
}

// ============================================
// Device Fingerprint
// ============================================

export interface BasicFingerprint {
	id: string;
	userAgent: string;
	language: string;
	timezone: number;
	screen: {
		width: number;
		height: number;
		colorDepth: number;
	};
	platform: string;
	cookiesEnabled: boolean;
	doNotTrack: boolean;
}

export function collectBasicFingerprint(): BasicFingerprint | null {
	if (!isBrowser()) return null;

	const components = [
		navigator.userAgent,
		navigator.language,
		screen.width,
		screen.height,
		screen.colorDepth,
		new Date().getTimezoneOffset()
	];

	let hash = 0;
	const str = components.join('|');
	for (let i = 0; i < str.length; i++) {
		const char = str.charCodeAt(i);
		hash = (hash << 5) - hash + char;
		hash = hash & hash;
	}

	const id = Math.abs(hash).toString(36);

	return {
		id,
		userAgent: navigator.userAgent,
		language: navigator.language,
		timezone: new Date().getTimezoneOffset(),
		screen: {
			width: screen.width,
			height: screen.height,
			colorDepth: screen.colorDepth
		},
		platform: navigator.platform,
		cookiesEnabled: navigator.cookieEnabled,
		doNotTrack: navigator.doNotTrack === '1'
	};
}

// ============================================
// CAPTCHA Helpers
// ============================================

export type CaptchaProvider = 'capjs' | 'hcaptcha' | 'recaptcha' | 'turnstile';

const CAPTCHA_SCRIPTS: Record<CaptchaProvider, string> = {
	capjs: '',
	hcaptcha: 'https://js.hcaptcha.com/1/api.js',
	recaptcha: 'https://www.google.com/recaptcha/api.js',
	turnstile: 'https://challenges.cloudflare.com/turnstile/v0/api.js'
};

export function loadCaptchaScript(provider: CaptchaProvider): Promise<void> {
	if (!isBrowser()) return Promise.resolve();

	const src = CAPTCHA_SCRIPTS[provider];
	if (!src) return Promise.resolve();

	if (document.querySelector(`script[src="${src}"]`)) {
		return Promise.resolve();
	}

	return new Promise((resolve, reject) => {
		const script = document.createElement('script');
		script.src = src;
		script.async = true;
		script.onload = () => resolve();
		script.onerror = () => reject(new Error(`Failed to load ${provider} script`));
		document.head.appendChild(script);
	});
}

export function isCaptchaLoaded(provider: CaptchaProvider): boolean {
	if (!isBrowser()) return false;

	switch (provider) {
		case 'hcaptcha':
			return typeof (window as Window & { hcaptcha?: unknown }).hcaptcha !== 'undefined';
		case 'recaptcha':
			return typeof (window as Window & { grecaptcha?: unknown }).grecaptcha !== 'undefined';
		case 'turnstile':
			return typeof (window as Window & { turnstile?: unknown }).turnstile !== 'undefined';
		case 'capjs':
			return true;
		default:
			return false;
	}
}

// ============================================
// Behavior Tracking
// ============================================

export interface BehaviorMetrics {
	mouseMovements: number;
	keystrokes: number;
	clicks: number;
	scrollEvents: number;
	sessionDuration: number;
	interactionRate: number;
}

export function createBehaviorTracker(): {
	start: () => void;
	stop: () => void;
	getMetrics: () => BehaviorMetrics;
} {
	let mouseMovements = 0;
	let keystrokes = 0;
	let clicks = 0;
	let scrollEvents = 0;
	let startTime = 0;
	let isTracking = false;

	const handlers = {
		mousemove: () => {
			mouseMovements++;
		},
		keydown: () => {
			keystrokes++;
		},
		click: () => {
			clicks++;
		},
		scroll: () => {
			scrollEvents++;
		}
	};

	function start(): void {
		if (!isBrowser() || isTracking) return;

		isTracking = true;
		startTime = Date.now();
		mouseMovements = 0;
		keystrokes = 0;
		clicks = 0;
		scrollEvents = 0;

		document.addEventListener('mousemove', handlers.mousemove, { passive: true });
		document.addEventListener('keydown', handlers.keydown, { passive: true });
		document.addEventListener('click', handlers.click, { passive: true });
		document.addEventListener('scroll', handlers.scroll, { passive: true });
	}

	function stop(): void {
		if (!isBrowser() || !isTracking) return;

		isTracking = false;

		document.removeEventListener('mousemove', handlers.mousemove);
		document.removeEventListener('keydown', handlers.keydown);
		document.removeEventListener('click', handlers.click);
		document.removeEventListener('scroll', handlers.scroll);
	}

	function getMetrics(): BehaviorMetrics {
		const sessionDuration = isTracking ? (Date.now() - startTime) / 1000 : 0;
		const totalInteractions = mouseMovements + keystrokes + clicks + scrollEvents;
		const interactionRate = sessionDuration > 0 ? totalInteractions / sessionDuration : 0;

		return {
			mouseMovements,
			keystrokes,
			clicks,
			scrollEvents,
			sessionDuration,
			interactionRate
		};
	}

	return { start, stop, getMetrics };
}

// ============================================
// Storage Helpers
// ============================================

export function getBypassToken(): string | null {
	if (!isBrowser()) return null;

	try {
		return sessionStorage.getItem('security_bypass_token');
	} catch {
		return null;
	}
}

export function setBypassToken(token: string): void {
	if (!isBrowser()) return;

	try {
		sessionStorage.setItem('security_bypass_token', token);
	} catch {
		// Ignore storage errors
	}
}

export function clearBypassToken(): void {
	if (!isBrowser()) return;

	try {
		sessionStorage.removeItem('security_bypass_token');
	} catch {
		// Ignore storage errors
	}
}
