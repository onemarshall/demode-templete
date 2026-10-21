declare module '$env/static/private' {
	export const APP_LOGGER_DISABLED;
	export const ENABLE_SECURITY_ANALYSIS;
	export const BETTER_AUTH_SECRET;
	export const BETTER_DATABASE_URL;
	export const BIGDATACLOUD_API_KEY;
	export const AUTH_PASSKEYS_PLUGIN;
	export const AUTH_2FA_PLUGIN;
	export const AUTH_MAGIC_LINK_PLUGIN;
	export const AUTH_ADMIN_PLUGIN;
	export const AUTH_EMAIL_OTP_PLUGIN;
	export const AUTH_LAST_LOGIN_METHOD_PLUGIN;
	export const AUTH_RATE_LIMIT_PLUGIN;
	export const AUTH_FRAUD_DETECTION_PLUGIN;
	export const AUTH_GEO_INTELLIGENCE_PLUGIN;
	export const AUTH_ABUSE_PROTECTION_PLUGIN;
	export const AUTH_SECURITY_ANALYTICS_PLUGIN;
	export const AUTH_2FA_ISSUER;
	export const AUTH_2FA_SKIP_VERIFICATION_ON_ENABLE;
	export const AUTH_2FA_TOTP_PERIOD;
	export const AUTH_2FA_TOTP_DIGITS;
	export const AUTH_2FA_OTP_PERIOD_MINUTES;
	export const AUTH_SIWE_ENABLED;
	export const SIWE_DOMAIN;
	export const SIWE_EMAIL_DOMAIN;
	export const SIWE_ANONYMOUS;
	export const SIWE_RPC_URL;
	export const SIWE_ENABLE_ENS_LOOKUP;
	export const AUTH_MAGIC_LINK_EXPIRES_IN;
	export const AUTH_MAGIC_LINK_DISABLE_SIGNUP;
	export const AUTH_EMAIL_OTP_OVERRIDE_VERIFICATION;
	export const AUTH_EMAIL_OTP_SEND_ON_SIGNUP;
	export const AUTH_EMAIL_OTP_DISABLE_SIGNUP;
	export const AUTH_EMAIL_OTP_LENGTH;
	export const AUTH_EMAIL_OTP_EXPIRES_IN;
	export const AUTH_EMAIL_OTP_ALLOWED_ATTEMPTS;
	export const AUTH_EMAIL_OTP_STORE_STRATEGY;
	export const AUTH_ADMIN_DEFAULT_ROLE;
	export const AUTH_ADMIN_ROLES;
	export const AUTH_ADMIN_USER_IDS;
	export const AUTH_ADMIN_IMPERSONATION_SESSION_DURATION;
	export const AUTH_ADMIN_DEFAULT_BAN_REASON;
	export const AUTH_ADMIN_DEFAULT_BAN_EXPIRES_IN;
	export const AUTH_LAST_LOGIN_METHOD_ENABLED;
	export const AUTH_LAST_LOGIN_METHOD_STORE_DB;
	export const AUTH_ONE_TIME_TOKEN_ENABLED;
	export const AUTH_SOCIAL_LOGIN_ENABLED;
	export const GITHUB_CLIENT_ID;
	export const GITHUB_CLIENT_SECRET;
	export const GOOGLE_CLIENT_ID;
	export const GOOGLE_CLIENT_SECRET;
	export const DISCORD_CLIENT_ID;
	export const DISCORD_CLIENT_SECRET;
	export const LINKEDIN_CLIENT_ID;
	export const LINKEDIN_CLIENT_SECRET;
	export const TWITTER_CLIENT_ID;
	export const TWITTER_CLIENT_SECRET;
	export const EMAIL_PROVIDER;
	export const STORAGE_PROVIDER;
	export const CMS_PROVIDER;
	export const REDIS_URL;
	export const REDIS_HOST;
	export const REDIS_PORT;
	export const REDIS_PASSWORD;
	export const REDIS_DB;
	export const REDIS_TLS;
	export const CAPTCHA;
	export const CAP_SECRET;
	export const EMAIL_PROVIDER_URL;
	export const EMAIL_FROM;
	export const EMAIL_FROM_NAME;
	export const EMAIL_REPLY_TO;
	export const EMAIL_TO;
	export const EMAIL_DEBUG;
	export const EMAIL_USESEND_API_KEY;
	export const EMAIL_SENDGRID_API_KEY;
	export const EMAIL_RESEND_API_KEY;
	export const RESEND_DOMAIN;
	export const SMTP_HOST;
	export const SMTP_PORT;
	export const SMTP_SECURE;
	export const SMTP_USER;
	export const SMTP_PASS;
	export const CMS_API_URL;
	export const DIRECTUS_ADMIN_TOKEN;
	export const DIRECTUS_DEFAULT_ROLE_ID;
	export const STRAPI_API_TOKEN;
	export const STRAPI_API_VERSION;
	export const PAYLOAD_API_TOKEN;
	export const PAYLOAD_USERS_COLLECTION;
	export const PAYLOAD_MEDIA_COLLECTION;
	export const PAYLOAD_AVATAR_FIELD;
	export const SANITY_API_TOKEN;
	export const SANITY_PROJECT_ID;
	export const SANITY_DATASET;
	export const SANITY_API_VERSION;
	export const STORAGE_UPLOAD_DIR;
	export const STORAGE_BASE_URL;
	export const LOCAL_STORAGE_PATH;
	export const S3_ACCESS_KEY_ID;
	export const S3_SECRET_ACCESS_KEY;
	export const S3_BUCKET;
	export const S3_REGION;
	export const S3_ENDPOINT;
	export const CLOUDINARY_API_KEY;
	export const CLOUDINARY_API_SECRET;
	export const CLOUDINARY_CLOUD_NAME;
	export const CLOUDINARY_FOLDER;
}

/**
 * Ethereum Provider Interface (EIP-1193)
 * Extends Window to include ethereum property for Web3 wallet interaction
 */
interface EthereumProvider {
	request(args: { method: string; params?: unknown[] }): Promise<unknown>;
	on?(event: string, listener: (...args: unknown[]) => void): void;
	removeListener?(event: string, listener: (...args: unknown[]) => void): void;
	isMetaMask?: boolean;
	isCoinbaseWallet?: boolean;
	isWalletConnect?: boolean;
}

/**
 * Cap.js global interface
 * Represents the Cap.js captcha library global object
 */
interface CapJS {
	// Cap.js typically provides these methods
	// The exact API may vary, so we're using a flexible interface
	[key: string]: unknown;
}

declare global {
	interface Window {
		ethereum?: EthereumProvider;
		getSecurityData?: () => {
			device?: Record<string, unknown>;
			behavior?: Record<string, unknown>;
		};
		__behaviorCollector?: unknown;
		__deviceFingerprint?: Record<string, unknown>;
		authClient?: {
			signIn: {
				email: (data: { email: string; password: string }) => Promise<unknown>;
			};
		};
		cap?: CapJS;
		// CAPTCHA providers
		hcaptcha?: {
			render: (container: string | HTMLElement, params: Record<string, unknown>) => string;
			execute: (widgetId: string) => Promise<{ response: string }>;
			reset: (widgetId?: string) => void;
			getResponse: (widgetId?: string) => string;
		};
		grecaptcha?: {
			render: (container: string | HTMLElement, params: Record<string, unknown>) => number;
			execute: (siteKey: string, options?: { action: string }) => Promise<string>;
			reset: (widgetId?: number) => void;
			getResponse: (widgetId?: number) => string;
			ready: (callback: () => void) => void;
		};
		turnstile?: {
			render: (container: string | HTMLElement, params: Record<string, unknown>) => string;
			execute: (container: string | HTMLElement, params?: Record<string, unknown>) => void;
			reset: (widgetId?: string) => void;
			getResponse: (widgetId?: string) => string;
			remove: (widgetId: string) => void;
		};
		// Security plugins
		fraudDetection?: {
			getSecurityHeaders: () => {
				'x-device-fingerprint': string;
				'x-behavior-data': string;
				'x-session-id': string;
			};
			initialize: () => Promise<void>;
			stopTracking: () => void;
		};
		abuseProtection?: {
			initialize: () => Promise<void>;
		};
		geoIntelligence?: {
			initialize: () => Promise<void>;
		};
		rateLimit?: {
			stopCountdown: () => void;
		};
		securityAnalytics?: {
			stopAutoRefresh: () => void;
		};
	}
}

export {};
