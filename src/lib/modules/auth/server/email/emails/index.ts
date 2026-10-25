/*
 * Email Templates
 *
 * Content generators for transactional emails.
 * These create { subject, html, text } - they do NOT send.
 * Sending is handled by the email providers.
 *
 * Features:
 * - Dark mode support
 * - Outlook/MSO compatibility
 * - Mobile responsive
 * - Accessible markup
 */

// Re-export all template types
export type {
	EmailTemplateOptions,
	EmailContent,
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
} from './types';

// Re-export base template generators
export { generateEmailHTML, generateEmailText } from './base';

// Re-export individual email templates
export { createVerificationEmailContent } from './verification';
export { createResetPasswordEmailContent } from './password-reset';
export { createOTPEmailContent } from './otp';
export { createMagicLinkEmailContent } from './magic-link';
export { createChangeEmailVerificationContent } from './change-email';
export { createDeleteAccountEmailContent } from './delete-account';
export { createWelcomeEmailContent } from './welcome';
export { createNotificationEmailContent } from './notification';
export { createAdminInviteEmailContent } from './admin-invite';
export { createDeviceSignInAlertEmailContent } from './device-signin-alert';
export { createPasswordChangedEmailContent } from './password-changed';
export { createTwoFactorEnabledEmailContent } from './twofactor-enabled';
export { createTwoFactorDisabledEmailContent } from './twofactor-disabled';
export { createRecoveryCodesEmailContent } from './recovery-codes';
export { createAccountLockedEmailContent } from './account-locked';
export { createSessionLimitEmailContent } from './session-limit';
