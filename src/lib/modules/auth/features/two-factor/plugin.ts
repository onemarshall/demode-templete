/**
 * Two-Factor Authentication Plugin
 */

import { twoFactor } from 'better-auth/plugins/two-factor';
import type { BetterAuthPlugin } from 'better-auth';
import type { User } from 'better-auth';
import { logger } from '#lib/platform/logger.js';
import { sendOTPEmail } from '../../server/email/index.js';

interface TwoFactorEnv {
	AUTH_2FA_PLUGIN?: boolean;
	PUBLIC_APP_NAME?: string;
	AUTH_2FA_ISSUER?: string;
	AUTH_2FA_SKIP_VERIFICATION_ON_ENABLE?: boolean;
	AUTH_2FA_TOTP_PERIOD?: number;
	AUTH_2FA_TOTP_DIGITS?: number;
	AUTH_2FA_OTP_PERIOD_MINUTES?: number;
}

/**
 * Build two-factor plugin if enabled
 */
export function TwoFactorPlugin(env: TwoFactorEnv): BetterAuthPlugin | null {
	if (!env.AUTH_2FA_PLUGIN) {
		return null;
	}

	const issuer = env.AUTH_2FA_ISSUER || env.PUBLIC_APP_NAME || 'App';
	const skipVerificationOnEnable = env.AUTH_2FA_SKIP_VERIFICATION_ON_ENABLE ?? false;
	const totpPeriod = env.AUTH_2FA_TOTP_PERIOD ?? 30;
	const totpDigits = (env.AUTH_2FA_TOTP_DIGITS === 8 ? 8 : 6) as 6 | 8;
	const otpPeriodMinutes = env.AUTH_2FA_OTP_PERIOD_MINUTES ?? 3;

	logger.debug('Two-factor plugin enabled : Server');

	try {
		return twoFactor({
			issuer,
			skipVerificationOnEnable,
			totpOptions: {
				period: totpPeriod,
				digits: totpDigits
			},
			otpOptions: {
				period: otpPeriodMinutes,
				async sendOTP({ user, otp }, ctx) {
					const contactUser = user as User & {
						email?: string | null;
						name?: string | null;
					};

					const email = contactUser.email;
					if (!email) {
						logger.error('User email missing for OTP delivery', {
							userId: contactUser.id
						});
						throw new Error('Missing user email for OTP delivery');
					}

					logger.info(`Sending OTP to ${email}`, ctx?.request);

					try {
						await sendOTPEmail(email, otp);
						logger.info(`OTP email sent successfully to ${email}`);
					} catch (error) {
						logger.error('Failed to send OTP email:', error);
						throw new Error('Failed to send verification code');
					}
				}
			}
		});
	} catch (error) {
		logger.error('Failed to  two-factor plugin', {
			error: error instanceof Error ? error.message : 'Unknown'
		});
		return null;
	}
}
