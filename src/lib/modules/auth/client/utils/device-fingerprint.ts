// Minimal fallback implementation for device fingerprint collection
// Replace with real logic as needed.

export type DeviceFingerprintPayload = {
	deviceId: string;
	userAgent?: string;
	ipAddress?: string;
	screen?: {
		width: number;
		height: number;
		colorDepth?: number;
	};
};

export function getDeviceFingerprint(): DeviceFingerprintPayload {
	return {
		deviceId: crypto.randomUUID(),
		userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
		ipAddress: '',
		screen:
			typeof window !== 'undefined'
				? {
						width: window.screen.width,
						height: window.screen.height,
						colorDepth: window.screen.colorDepth
					}
				: undefined
	};
}
