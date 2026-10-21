/**
 * Email System
 *
 * Single module for all email functionality:
 * - Provider factory (Resend, SendGrid, UseSend, Mock)
 * - Better Auth email configuration hooks
 * - Template content creators
 */

import type {
	EmailProvider,
	EmailConfig,
	EmailProviderType,
	EmailTemplateKind,
	TemplateDataMap
} from './types';
import { createProviderLogger } from '#lib/auth/shared/logger.js';
import { publicEnv, type FullEnv } from '#lib/auth/shared/env/index.js';

// ============================================
// Constants & Helpers
// ============================================

const logger = createProviderLogger('Email');

const VALID_PROVIDERS = ['resend', 'sendgrid', 'usesend', 'mock', 'smtp'] as const;

const getAppName = (): string => {
	const name = publicEnv.PUBLIC_APP_NAME;
	return typeof name === 'string' && name.length > 0 ? name : 'App';
};

const toOptionalString = (value: unknown): string | undefined =>
	typeof value === 'string' && value.length > 0 ? value : undefined;

const isValidProvider = (value: string): value is EmailProviderType =>
	VALID_PROVIDERS.includes(value as EmailProviderType);

// ============================================
// Provider Instance (Singleton)
// ============================================

let emailInstance: EmailProvider | null = null;

// ============================================
// Provider Factory
// ============================================

async function createEmailProvider(config: EmailConfig): Promise<EmailProvider> {
	switch (config.provider) {
		case 'resend': {
			const { ResendEmailProvider } = await import('./providers/resend');
			return new ResendEmailProvider(config);
		}
		case 'sendgrid': {
			const { SendgridEmailProvider } = await import('./providers/sendgrid');
			return new SendgridEmailProvider(config);
		}
		case 'usesend': {
			const { UsesendEmailProvider } = await import('./providers/usesend');
			return new UsesendEmailProvider(config);
		}
		case 'mock': {
			const { MockEmailProvider } = await import('./providers/mock');
			return new MockEmailProvider(config);
		}
		case 'smtp':
			throw new Error('SMTP provider not implemented. Use resend, sendgrid, or usesend.');
		default: {
			const exhaustive: never = config.provider;
			throw new Error(`Unknown email provider: ${exhaustive}`);
		}
	}
}

function buildEmailConfig(env: FullEnv): EmailConfig {
	const rawProvider = toOptionalString(env.EMAIL_PROVIDER) ?? 'mock';
	const provider: EmailProviderType = isValidProvider(rawProvider) ? rawProvider : 'mock';

	if (!isValidProvider(rawProvider)) {
		logger.warn(`Invalid EMAIL_PROVIDER "${rawProvider}", falling back to mock`);
	}

	const apiKeyMap: Record<EmailProviderType, string | undefined> = {
		resend: toOptionalString(env.EMAIL_RESEND_API_KEY),
		sendgrid: toOptionalString(env.EMAIL_SENDGRID_API_KEY),
		usesend:
			toOptionalString(env.EMAIL_USESEND_API_KEY) ?? toOptionalString(env.EMAIL_USESEND_API_KEY),
		mock: 'mock-key',
		smtp: undefined
	};

	const apiKey = apiKeyMap[provider];
	const fromEmail = toOptionalString(env.EMAIL_FROM);

	// Validate and fallback to mock if missing config
	if (provider !== 'mock' && (!apiKey || !fromEmail)) {
		logger.warn(`Email provider "${provider}" missing config, using mock`, {
			hasApiKey: Boolean(apiKey),
			hasFromEmail: Boolean(fromEmail)
		});

		return {
			provider: 'mock',
			apiKey: 'mock-key',
			fromEmail: fromEmail ?? 'noreply@localhost',
			fromName: toOptionalString(env.EMAIL_FROM_NAME)
		};
	}

	return {
		provider,
		apiKey,
		fromEmail: fromEmail ?? 'noreply@localhost',
		fromName: toOptionalString(env.EMAIL_FROM_NAME),
		apiUrl: toOptionalString(env.EMAIL_PROVIDER_URL)
	};
}

// ============================================
// Initialization
// ============================================

/**
 * Initialize email provider from environment.
 * Call once at app startup before Better Auth.
 */
export async function initializeEmail(env: FullEnv): Promise<EmailProvider> {
	const config = buildEmailConfig(env);
	emailInstance = await createEmailProvider(config);
	logger.success('Email initialized', { provider: config.provider, from: config.fromEmail });
	return emailInstance;
}

/**
 * Reset email provider (useful for testing)
 */
export function resetEmailProvider(): void {
	emailInstance = null;
}

/**
 * Get initialized email provider (null if not initialized)
 */
export function getEmailProvider(): EmailProvider | null {
	return emailInstance;
}

/**
 * Check if email is ready
 */
export function isEmailInitialized(): boolean {
	return emailInstance !== null;
}

/**
 * Get provider or throw helpful error
 */
function requireProvider(): EmailProvider {
	if (!emailInstance) {
		throw new Error(
			'Email not initialized. Call initializeEmail(env) before configuring Better Auth.'
		);
	}
	return emailInstance;
}

// ============================================
// Email Sending
// ============================================

/**
 * Generic template sender
 */
export async function sendTemplateEmail<K extends EmailTemplateKind>(
	kind: K,
	data: TemplateDataMap[K],
	appName?: string
): Promise<void> {
	const provider = requireProvider();
	const resolvedAppName = appName ?? getAppName();

	if (!provider.sendTemplate) {
		throw new Error(
			'Email provider does not support sendTemplate; update provider implementation.'
		);
	}

	await provider.sendTemplate(kind, data, resolvedAppName);
}

/**
 * Send OTP email (for 2FA plugin)
 */
export async function sendOTPEmail(email: string, otp: string): Promise<void> {
	const provider = requireProvider();
	await provider.sendOTPEmail(email, otp, getAppName());
}

/**
 * Send magic link email (for magic link plugin)
 */
export async function sendMagicLinkEmail(email: string, url: string): Promise<void> {
	const provider = requireProvider();
	const appName = getAppName();

	if (provider.sendMagicLinkEmail) {
		await provider.sendMagicLinkEmail(email, url, appName);
		return;
	}

	// Fallback for providers without dedicated magic link method
	await provider.sendEmail({
		to: email,
		from: toOptionalString(process.env?.EMAIL_FROM) ?? 'noreply@localhost',
		subject: `Sign in to ${appName}`,
		html: `<p>Click <a href="${url}">here</a> to sign in to ${appName}.</p>`,
		text: `Sign in to ${appName}: ${url}`
	});
}

// ============================================
// Better Auth Configuration Hooks
// ============================================

/**
 * Better Auth emailVerification config
 */
export function getEmailVerificationConfig() {
	const appName = getAppName();

	return {
		sendOnSignUp: true,
		autoSignInAfterVerification: true,
		expiresIn: 60 * 60 * 24, // 24 hours
		sendVerificationEmail: async ({
			user,
			url
		}: {
			user: { email: string };
			url: string;
			token: string;
		}) => {
			const provider = requireProvider();

			try {
				if (provider.sendVerificationEmailWithUrl) {
					await provider.sendVerificationEmailWithUrl(user.email, url, appName);
				} else {
					await provider.sendVerificationEmail(user.email, url, appName);
				}
				logger.info('Verification email sent', { email: user.email });
			} catch (error) {
				logger.error('Failed to send verification email', { email: user.email, error });
				// Re-throw so Better Auth knows it failed
				throw error;
			}
		}
	};
}

/**
 * Better Auth emailAndPassword config
 */
export function getEmailAndPasswordConfig() {
	const appName = getAppName();

	return {
		enabled: true,
		autoSignIn: true,
		requireEmailVerification: true,
		minPasswordLength: 12,
		maxPasswordLength: 128,
		resetPasswordTokenExpiresIn: 60 * 60, // 1 hour
		revokeSessionsOnPasswordReset: true, // Revoke other sessions after password reset
		sendResetPassword: async ({
			user,
			url
		}: {
			user: { email: string; name?: string };
			url: string;
			token: string;
		}) => {
			const provider = requireProvider();

			try {
				if (provider.sendPasswordResetEmailWithUrl) {
					await provider.sendPasswordResetEmailWithUrl(user.email, url, appName);
				} else {
					await provider.sendPasswordResetEmail(user.email, url, appName);
				}
				logger.info('Password reset email sent', { email: user.email });
			} catch (error) {
				logger.error('Failed to send password reset email', { email: user.email, error });
				throw error;
			}
		},
		onPasswordReset: async ({ user }: { user: { email: string; name?: string } }) => {
			logger.info('Password reset completed', { email: user.email });
			// You could send a confirmation email here if needed
		},
		onExistingUserSignUp: async ({ user }: { user: { email: string; name?: string } }) => {
			try {
				await sendTemplateEmail('notification', {
					email: user.email,
					name: user.name,
					title: 'Sign-up attempt with your email',
					message:
						'Someone tried to create an account using your email address. If this was you, try signing in instead. If not, you can safely ignore this email.',
					appName
				});
				logger.info('Existing user sign-up notification sent', { email: user.email });
			} catch (error) {
				logger.error('Failed to send existing user sign-up notification', {
					email: user.email,
					error
				});
			}
		},
		customSyntheticUser: ({
			coreFields,
			id
		}: {
			coreFields: Record<string, unknown>;
			additionalFields: Record<string, unknown>;
			id: string;
		}) => ({
			...coreFields,
			// Add admin plugin fields if enabled
			role: 'user',
			banned: false,
			banReason: null,
			banExpires: null,
			// Add your additional fields
			provider: 'email',
			lastLoginMethod: null,
			// ID must be last to match database output order
			id
		})
	};
}

// ============================================
// Re-exports
// ============================================

export type {
	EmailProvider,
	EmailConfig,
	EmailOptions,
	EmailTemplate,
	EmailProviderType,
	EmailTemplateKind,
	TemplateDataMap
} from './types';

export {
	generateEmailHTML,
	generateEmailText,
	createVerificationEmailContent,
	createResetPasswordEmailContent,
	createOTPEmailContent,
	createMagicLinkEmailContent,
	createChangeEmailVerificationContent,
	createDeleteAccountEmailContent,
	createWelcomeEmailContent,
	createNotificationEmailContent,
	createAdminInviteEmailContent,
	createDeviceSignInAlertEmailContent,
	createPasswordChangedEmailContent,
	createTwoFactorEnabledEmailContent,
	createTwoFactorDisabledEmailContent,
	createRecoveryCodesEmailContent,
	createAccountLockedEmailContent,
	createSessionLimitEmailContent,
	type EmailTemplateOptions,
	type EmailContent,
	type VerificationEmailData,
	type ResetPasswordEmailData,
	type OTPEmailData,
	type MagicLinkEmailData,
	type ChangeEmailVerificationData,
	type DeleteAccountEmailData,
	type WelcomeEmailData,
	type NotificationEmailData,
	type AdminInviteEmailData,
	type DeviceSignInAlertEmailData,
	type PasswordChangedEmailData,
	type TwoFactorEnabledEmailData,
	type TwoFactorDisabledEmailData,
	type RecoveryCodesEmailData,
	type AccountLockedEmailData,
	type SessionLimitEmailData
} from './emails';
