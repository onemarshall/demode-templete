/**
 * Email Types
 */

// ============================================
// Import template data types once
// ============================================

import type {
	VerificationEmailData,
	ResetPasswordEmailData,
	OTPEmailData,
	MagicLinkEmailData,
	ChangeEmailVerificationData,
	DeleteAccountEmailData,
	WelcomeEmailData,
	NotificationEmailData,
	AdminInviteEmailData,
	DeviceSignInAlertEmailData,
	PasswordChangedEmailData,
	TwoFactorEnabledEmailData,
	TwoFactorDisabledEmailData,
	RecoveryCodesEmailData,
	AccountLockedEmailData,
	SessionLimitEmailData
} from './emails/types';

// Re-export for convenience
export type {
	VerificationEmailData,
	ResetPasswordEmailData,
	OTPEmailData,
	MagicLinkEmailData,
	ChangeEmailVerificationData,
	DeleteAccountEmailData,
	WelcomeEmailData,
	NotificationEmailData,
	AdminInviteEmailData,
	DeviceSignInAlertEmailData,
	PasswordChangedEmailData,
	TwoFactorEnabledEmailData,
	TwoFactorDisabledEmailData,
	RecoveryCodesEmailData,
	AccountLockedEmailData,
	SessionLimitEmailData
};

// ============================================
// Template Types
// ============================================

export interface EmailTemplate {
	subject: string;
	html: string;
	text?: string;
}

export type EmailTemplateKind =
	| 'verification'
	| 'password-reset'
	| 'otp'
	| 'magic-link'
	| 'change-email'
	| 'delete-account'
	| 'welcome'
	| 'notification'
	| 'admin-invite'
	| 'device-signin-alert'
	| 'password-changed'
	| 'twofactor-enabled'
	| 'twofactor-disabled'
	| 'recovery-codes'
	| 'account-locked'
	| 'session-limit';

export interface TemplateDataMap {
	verification: VerificationEmailData;
	'password-reset': ResetPasswordEmailData;
	otp: OTPEmailData;
	'magic-link': MagicLinkEmailData;
	'change-email': ChangeEmailVerificationData;
	'delete-account': DeleteAccountEmailData;
	welcome: WelcomeEmailData;
	notification: NotificationEmailData;
	'admin-invite': AdminInviteEmailData;
	'device-signin-alert': DeviceSignInAlertEmailData;
	'password-changed': PasswordChangedEmailData;
	'twofactor-enabled': TwoFactorEnabledEmailData;
	'twofactor-disabled': TwoFactorDisabledEmailData;
	'recovery-codes': RecoveryCodesEmailData;
	'account-locked': AccountLockedEmailData;
	'session-limit': SessionLimitEmailData;
}

// ============================================
// Email Options
// ============================================

export interface EmailOptions {
	to: string;
	from?: string;
	subject: string;
	html: string;
	text?: string;
	replyTo?: string;
}

// ============================================
// Provider Types
// ============================================

export type EmailProviderType = 'resend' | 'sendgrid' | 'usesend' | 'smtp' | 'mock';

export interface EmailProvider {
	/** Send verification email using token (provider builds URL) */
	sendVerificationEmail(email: string, token: string, appName: string): Promise<void>;

	/** Send verification email using pre-built URL */
	sendVerificationEmailWithUrl?(email: string, url: string, appName: string): Promise<void>;

	/** Send password reset email using token (provider builds URL) */
	sendPasswordResetEmail(email: string, token: string, appName: string): Promise<void>;

	/** Send password reset email using pre-built URL */
	sendPasswordResetEmailWithUrl?(email: string, url: string, appName: string): Promise<void>;

	/** Send OTP code */
	sendOTPEmail(email: string, otp: string, appName: string): Promise<void>;

	/** Send magic link email */
	sendMagicLinkEmail(email: string, url: string, appName: string): Promise<void>;

	/** Send any template by kind */
	sendTemplate<K extends EmailTemplateKind>(
		kind: K,
		data: TemplateDataMap[K],
		appName?: string
	): Promise<void>;

	/** Send raw email */
	sendEmail(options: EmailOptions): Promise<void>;

	/** Check provider connectivity */
	healthCheck(): Promise<boolean>;
}

// ============================================
// Configuration Types
// ============================================

export interface SmtpConfig {
	host: string;
	port: number;
	secure: boolean;
	user: string;
	pass: string;
}

export interface EmailConfig {
	provider: EmailProviderType;
	apiKey?: string;
	apiUrl?: string;
	fromEmail: string;
	fromName?: string;
	smtp?: SmtpConfig;
}

// ============================================
// Utility Types
// ============================================

/** Extract the data type for a specific template kind */
export type TemplateData<K extends EmailTemplateKind> = TemplateDataMap[K];

/** Email send result */
export interface EmailResult {
	success: boolean;
	messageId?: string;
	error?: string;
}
