/**
 * Email OTP Plugin
 */

import { emailOTP } from 'better-auth/plugins';
import type { BetterAuthPlugin } from 'better-auth';
import { logger } from '#lib/platform/logger.js';
import { sendOTPEmail } from '../../server/email/index.js';

interface EmailOTPEnv {
	AUTH_EMAIL_OTP_PLUGIN?: boolean;
	PUBLIC_APP_NAME?: string;
	AUTH_EMAIL_OTP_OVERRIDE_VERIFICATION?: boolean;
	AUTH_EMAIL_OTP_SEND_ON_SIGNUP?: boolean;
	AUTH_EMAIL_OTP_DISABLE_SIGNUP?: boolean;
	AUTH_EMAIL_OTP_LENGTH?: number;
	AUTH_EMAIL_OTP_EXPIRES_IN?: number;
	AUTH_EMAIL_OTP_ALLOWED_ATTEMPTS?: number;
	AUTH_EMAIL_OTP_STORE_STRATEGY?: 'plain' | 'hashed' | 'encrypted';
}

/**
 * Build email OTP plugin if enabled
 */
export function EmailOTPPlugin(env: EmailOTPEnv): BetterAuthPlugin | null {
	if (!env.AUTH_EMAIL_OTP_PLUGIN) {
		return null;
	}

	const appName = env.PUBLIC_APP_NAME || 'App';
	const otpLength = env.AUTH_EMAIL_OTP_LENGTH ?? 6;
	const expiresIn = env.AUTH_EMAIL_OTP_EXPIRES_IN ?? 300;
	const allowedAttempts = env.AUTH_EMAIL_OTP_ALLOWED_ATTEMPTS ?? 3;
	const overrideDefaultEmailVerification = env.AUTH_EMAIL_OTP_OVERRIDE_VERIFICATION ?? false;
	const sendVerificationOnSignUp = env.AUTH_EMAIL_OTP_SEND_ON_SIGNUP ?? false;
	const disableSignUp = env.AUTH_EMAIL_OTP_DISABLE_SIGNUP ?? false;
	const storeOTP = env.AUTH_EMAIL_OTP_STORE_STRATEGY ?? 'plain';

	logger.debug('Email OTP plugin enabled : Server');

	try {
		return emailOTP({
			overrideDefaultEmailVerification,
			sendVerificationOnSignUp,
			disableSignUp,
			otpLength,
			expiresIn,
			allowedAttempts,
			storeOTP,
			async sendVerificationOTP({ email, otp, type }, ctx) {
				logger.info(`Sending email OTP to ${email}`, {
					type,
					appName,
					request: ctx?.request
				});

				try {
					await sendOTPEmail(email, otp);
					logger.info(`Email OTP sent successfully to ${email}`, { type });
				} catch (error) {
					logger.error('Failed to send email OTP', {
						email,
						type,
						error: error instanceof Error ? error.message : String(error)
					});
					throw new Error('Failed to send verification code');
				}
			}
		});
	} catch (error) {
		logger.error('Failed to  Email OTP plugin', {
			error: error instanceof Error ? error.message : 'Unknown'
		});
		return null;
	}
}
