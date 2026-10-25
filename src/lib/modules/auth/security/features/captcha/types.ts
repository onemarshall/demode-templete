/**
 * CAPTCHA Feature Types
 */

export type CaptchaProvider = 'capjs' | 'hcaptcha' | 'recaptcha' | 'turnstile';

export interface CaptchaFeatureConfig {
	enabled?: boolean;
	provider?: CaptchaProvider;
	/** Base URL of a self-hosted Cap standalone server (capjs provider). */
	endpoint?: string;
	siteKey?: string;
	secretKey?: string;
	bypassTtlSeconds?: number;
	threshold?: number;
}

export interface CaptchaVerifyResult {
	success: boolean;
	score?: number;
	challenge_ts?: string;
	hostname?: string;
	error_codes?: string[];
}

export interface CaptchaBypassToken {
	token: string;
	createdAt: number;
	expiresAt: number;
	ip: string;
	userId?: string;
}
