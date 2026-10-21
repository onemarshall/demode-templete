/**
 * Email Template Types
 */

export interface EmailTemplateOptions {
	/** Application/brand name displayed in header */
	appName: string;
	/** Main heading text */
	heading: string;
	/** Recipient's name for personalised greeting */
	name?: string;
	/** Main HTML content (paragraphs, lists, etc.) */
	mainContent: string;
	/** Primary CTA button text */
	buttonText?: string;
	/** Primary CTA button URL */
	buttonUrl?: string;
	/** Footer note text (supports HTML) */
	footerNote?: string;
	/** Expiration warning text */
	expirationNote?: string;
	/** Verification/OTP code to display prominently */
	code?: string;
	/** Label shown above the code (default: "Or enter this code manually") */
	codeLabel?: string;
	/** Preview text shown in email client inbox */
	previewText?: string;
	/** Security context info (e.g., "Request from macOS using Chrome") */
	securityContext?: string;
	/** Support/help URL */
	supportUrl?: string;
	/** Privacy policy URL */
	privacyUrl?: string;
	/** Terms of service URL */
	termsUrl?: string;
}

export interface EmailContent {
	subject: string;
	html: string;
	text: string;
}

export interface VerificationEmailData {
	email: string;
	url: string;
	name?: string;
	appName?: string;
}

export interface ResetPasswordEmailData {
	email: string;
	url: string;
	name?: string;
	appName?: string;
}

export interface OTPEmailData {
	email: string;
	otp: string;
	name?: string;
	appName?: string;
}

export interface MagicLinkEmailData {
	email: string;
	url: string;
	name?: string;
	appName?: string;
}

export interface ChangeEmailVerificationData {
	email: string;
	url: string;
	name?: string;
	appName?: string;
	newEmail?: string;
}

export interface DeleteAccountEmailData {
	email: string;
	url: string;
	name?: string;
	appName?: string;
}

export interface WelcomeEmailData {
	email: string;
	name: string;
	appName?: string;
	siteUrl?: string;
}

export interface NotificationEmailData {
	email: string;
	name?: string;
	title: string;
	message: string;
	actionUrl?: string;
	actionText?: string;
	appName?: string;
}

export interface AdminInviteEmailData {
	email: string;
	appName?: string;
	inviteUrl: string;
	inviterName?: string;
	roleName?: string;
	name?: string;
}

export interface DeviceSignInAlertEmailData {
	email: string;
	appName?: string;
	name?: string;
	device?: string;
	location?: string;
	ip?: string;
	time?: string;
	actionUrl?: string;
}

export interface PasswordChangedEmailData {
	email: string;
	appName?: string;
	name?: string;
	time?: string;
	securityContext?: string;
	actionUrl?: string;
}

export interface TwoFactorEnabledEmailData {
	email: string;
	appName?: string;
	name?: string;
	time?: string;
	recoveryCodesUrl?: string;
}

export interface TwoFactorDisabledEmailData {
	email: string;
	appName?: string;
	name?: string;
	time?: string;
	actionUrl?: string;
}

export interface RecoveryCodesEmailData {
	email: string;
	appName?: string;
	name?: string;
	codes: string[];
	securityContext?: string;
}

export interface AccountLockedEmailData {
	email: string;
	appName?: string;
	name?: string;
	unlockUrl?: string;
	securityContext?: string;
}

export interface SessionLimitEmailData {
	email: string;
	appName?: string;
	name?: string;
	device?: string;
	location?: string;
	time?: string;
	manageSessionsUrl?: string;
}
