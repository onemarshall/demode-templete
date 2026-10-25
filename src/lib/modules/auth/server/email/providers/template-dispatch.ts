import {
	createAccountLockedEmailContent,
	createAdminInviteEmailContent,
	createChangeEmailVerificationContent,
	createDeleteAccountEmailContent,
	createDeviceSignInAlertEmailContent,
	createMagicLinkEmailContent,
	createNotificationEmailContent,
	createOTPEmailContent,
	createPasswordChangedEmailContent,
	createRecoveryCodesEmailContent,
	createResetPasswordEmailContent,
	createSessionLimitEmailContent,
	createTwoFactorDisabledEmailContent,
	createTwoFactorEnabledEmailContent,
	createVerificationEmailContent,
	createWelcomeEmailContent,
	type EmailContent
} from '../emails';
import type { EmailTemplateKind, TemplateDataMap } from '../types';

export function buildTemplateEmail<K extends EmailTemplateKind>(
	kind: K,
	data: TemplateDataMap[K],
	appNameOverride?: string
): EmailContent {
	const appName = (data as { appName?: string }).appName ?? appNameOverride ?? 'App';

	switch (kind) {
		case 'verification':
			return createVerificationEmailContent({
				...(data as TemplateDataMap['verification']),
				appName
			});
		case 'password-reset':
			return createResetPasswordEmailContent({
				...(data as TemplateDataMap['password-reset']),
				appName
			});
		case 'otp':
			return createOTPEmailContent({ ...(data as TemplateDataMap['otp']), appName });
		case 'magic-link':
			return createMagicLinkEmailContent({ ...(data as TemplateDataMap['magic-link']), appName });
		case 'change-email':
			return createChangeEmailVerificationContent({
				...(data as TemplateDataMap['change-email']),
				appName
			});
		case 'delete-account':
			return createDeleteAccountEmailContent({
				...(data as TemplateDataMap['delete-account']),
				appName
			});
		case 'welcome':
			return createWelcomeEmailContent({ ...(data as TemplateDataMap['welcome']), appName });
		case 'notification':
			return createNotificationEmailContent({
				...(data as TemplateDataMap['notification']),
				appName
			});
		case 'admin-invite':
			return createAdminInviteEmailContent({
				...(data as TemplateDataMap['admin-invite']),
				appName
			});
		case 'device-signin-alert':
			return createDeviceSignInAlertEmailContent({
				...(data as TemplateDataMap['device-signin-alert']),
				appName
			});
		case 'password-changed':
			return createPasswordChangedEmailContent({
				...(data as TemplateDataMap['password-changed']),
				appName
			});
		case 'twofactor-enabled':
			return createTwoFactorEnabledEmailContent({
				...(data as TemplateDataMap['twofactor-enabled']),
				appName
			});
		case 'twofactor-disabled':
			return createTwoFactorDisabledEmailContent({
				...(data as TemplateDataMap['twofactor-disabled']),
				appName
			});
		case 'recovery-codes':
			return createRecoveryCodesEmailContent({
				...(data as TemplateDataMap['recovery-codes']),
				appName
			});
		case 'account-locked':
			return createAccountLockedEmailContent({
				...(data as TemplateDataMap['account-locked']),
				appName
			});
		case 'session-limit':
			return createSessionLimitEmailContent({
				...(data as TemplateDataMap['session-limit']),
				appName
			});
		default: {
			const exhaustive: never = kind;
			throw new Error(`Unsupported email template kind: ${exhaustive}`);
		}
	}
}
