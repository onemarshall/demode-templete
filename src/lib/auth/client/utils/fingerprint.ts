/**
 * Stable Device Fingerprinting Utility
 * Generates persistent device fingerprints using stable browser characteristics
 */

import { logger } from '$lib/auth/shared/logger';

export interface DeviceFingerprint {
	id: string;
	userAgent: string;
	language: string;
	timezone: string;
	screen: {
		width: number;
		height: number;
		colorDepth: number;
		pixelRatio: number;
	};
	platform: string;
	hardwareConcurrency: number;
	deviceMemory?: number;
	webgl?: string;
	canvas?: string;
	fonts: string[];
	plugins: string[];
	cookiesEnabled: boolean;
	doNotTrack: boolean;
	touchSupport: boolean;
	timestamp: number;
}

/**
 * Generate a stable device fingerprint that persists across sessions
 */
export function generateStableFingerprint(): DeviceFingerprint | null {
	if (typeof window === 'undefined' || typeof navigator === 'undefined') {
		return null;
	}

	try {
		const screen = window.screen;
		const nav = navigator as Navigator & {
			hardwareConcurrency?: number;
			deviceMemory?: number;
		};

		// Collect stable hardware characteristics
		const hardwareData = {
			hardwareConcurrency: nav.hardwareConcurrency || 1,
			deviceMemory: nav.deviceMemory || undefined,
			platform: nav.platform || 'unknown',
			userAgent: nav.userAgent || 'unknown',
			language: nav.language || 'unknown'
		};

		// Collect screen information
		const screenData = {
			width: screen.width || 0,
			height: screen.height || 0,
			colorDepth: screen.colorDepth || 0,
			pixelRatio: window.devicePixelRatio || 1
		};

		// Get WebGL fingerprint (stable across sessions)
		let webglFingerprint = '';
		try {
			const canvas = document.createElement('canvas');
			const gl =
				canvas.getContext('webgl') ||
				(canvas.getContext('experimental-webgl') as WebGLRenderingContext | null);
			if (gl) {
				const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
				if (debugInfo) {
					webglFingerprint =
						gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) +
						'|' +
						gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
				}
			}
		} catch {
			// WebGL not available
		}

		// Get canvas fingerprint (stable)
		let canvasFingerprint = '';
		try {
			const canvas = document.createElement('canvas');
			const ctx = canvas.getContext('2d');
			if (ctx) {
				// Draw a specific pattern that creates a unique signature
				ctx.textBaseline = 'top';
				ctx.font = '14px Arial';
				ctx.fillText('Device fingerprint test', 2, 2);
				canvasFingerprint = canvas.toDataURL().slice(-50); // Take last 50 chars
			}
		} catch {
			// Canvas not available
		}

		// Get available fonts (limited set for performance)
		const testFonts = [
			'Arial',
			'Verdana',
			'Times New Roman',
			'Courier New',
			'Georgia',
			'Palatino',
			'Garamond',
			'Comic Sans MS',
			'Trebuchet MS',
			'Arial Black'
		];

		const availableFonts: string[] = [];
		try {
			testFonts.forEach((font) => {
				const canvas = document.createElement('canvas');
				const ctx = canvas.getContext('2d');
				if (ctx) {
					const baseline = ctx.textBaseline;
					ctx.textBaseline = 'top';
					ctx.font = `20px ${font}`;
					ctx.fillText('mmmmmmmmmmlli', 2, 2);
					const baselineAfter = ctx.textBaseline;
					if (baseline !== baselineAfter) {
						availableFonts.push(font);
					}
				}
			});
		} catch {
			// Font detection failed
		}

		// Get plugins (limited to names only for privacy)
		const plugins: string[] = [];
		try {
			if (nav.plugins) {
				for (let i = 0; i < Math.min(nav.plugins.length, 10); i++) {
					const plugin = nav.plugins[i];
					if (plugin && plugin.name) {
						plugins.push(plugin.name);
					}
				}
			}
		} catch {
			// Plugin access failed
		}

		// Collect additional browser capabilities
		const cookiesEnabled = navigator.cookieEnabled ?? false;
		const doNotTrack =
			navigator.doNotTrack === '1' || (window as { doNotTrack?: string }).doNotTrack === '1';
		const touchSupport = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

		// Create fingerprint data object
		const fingerprint: Omit<DeviceFingerprint, 'id'> = {
			...hardwareData,
			screen: screenData,
			timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'unknown',
			webgl: webglFingerprint || 'none',
			canvas: canvasFingerprint || 'none',
			fonts: availableFonts,
			plugins,
			cookiesEnabled,
			doNotTrack,
			touchSupport,
			timestamp: Date.now()
		};

		// Generate stable ID from hash of stable characteristics
		const stableString = [
			hardwareData.userAgent,
			hardwareData.platform,
			hardwareData.language,
			screenData.width.toString(),
			screenData.height.toString(),
			screenData.colorDepth.toString(),
			hardwareData.hardwareConcurrency.toString(),
			webglFingerprint,
			canvasFingerprint,
			availableFonts.slice(0, 5).join(','), // Only first 5 fonts for stability
			plugins.slice(0, 5).join(',') // Only first 5 plugins for stability
		].join('|');

		// Simple hash function for ID generation
		const id = hashString(stableString);

		return { ...fingerprint, id };
	} catch (error) {
		logger.warn('Fingerprint generation failed:', error);
		return null;
	}
}

/**
 * Simple string hash function
 */
function hashString(str: string): string {
	let hash = 0;
	if (str.length === 0) return hash.toString();

	for (let i = 0; i < str.length; i++) {
		const char = str.charCodeAt(i);
		hash = (hash << 5) - hash + char;
		hash = hash & hash; // Convert to 32-bit integer
	}

	return Math.abs(hash).toString(36);
}

/**
 * Get stored fingerprint from localStorage or generate new one
 */
export function getStoredFingerprint(): DeviceFingerprint | null {
	if (typeof localStorage === 'undefined') {
		return null;
	}

	try {
		const stored = localStorage.getItem('device_fingerprint');
		if (stored) {
			const parsed = JSON.parse(stored) as DeviceFingerprint;
			// Verify fingerprint is still valid (not too old)
			const age = Date.now() - parsed.timestamp;
			if (age < 30 * 24 * 60 * 60 * 1000) {
				// 30 days
				return parsed;
			}
		}

		// Generate new fingerprint
		const fingerprint = generateStableFingerprint();
		if (fingerprint) {
			// Store in localStorage
			localStorage.setItem('device_fingerprint', JSON.stringify(fingerprint));
		}

		return fingerprint;
	} catch (error) {
		logger.warn('Failed to get stored fingerprint:', error);
		return generateStableFingerprint();
	}
}

/**
 * Clear stored fingerprint (for testing or privacy)
 */
export function clearStoredFingerprint(): void {
	if (typeof localStorage !== 'undefined') {
		try {
			localStorage.removeItem('device_fingerprint');
		} catch (error) {
			logger.warn('Failed to clear stored fingerprint:', error);
		}
	}
}
