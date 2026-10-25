/**
 * Device Feature Types
 */

export interface DeviceFingerprint {
	id: string;
	userAgent: string;
	language: string;
	timezone: string;
	screen?: {
		width: number;
		height: number;
		colorDepth: number;
	};
	platform: string;
	plugins?: string[];
	fonts?: string[];
	cookiesEnabled: boolean;
	doNotTrack: boolean;
	touchSupport: boolean;
	hardwareConcurrency?: number;
	canvas?: string;
	webgl?: string;
}

export interface TrustedDevice {
	id: string;
	userId: string;
	fingerprint: string;
	userAgent: string;
	lastSeen: number;
	createdAt: number;
	successfulAuths: number;
	trusted: boolean;
}

export interface DeviceFeatureConfig {
	enabled?: boolean;
	trustAfterSuccessfulAuths?: number;
	trustDurationDays?: number;
	newDevicePenalty?: number;
}
