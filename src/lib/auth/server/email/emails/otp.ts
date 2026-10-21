/**
 * OTP Email Template
 */

import { generateEmailHTML, generateEmailText } from './base';
import type { EmailTemplateOptions, OTPEmailData, EmailContent } from './types';

export function createOTPEmailContent(data: OTPEmailData): EmailContent {
	const { otp, name, appName = 'App' } = data;

	const opts: EmailTemplateOptions = {
		appName,
		heading: 'Your Verification Code',
		name,
		mainContent:
			'<p style="margin: 0;">Enter this code in the verification form to complete your sign-in.</p>',
		code: otp,
		codeLabel: 'Your verification code',
		footerNote:
			"If you didn't request this code, please ignore this email and consider changing your password.",
		expirationNote: 'This code expires in 5 minutes',
		previewText: `Your verification code is ${otp}`
	};

	return {
		subject: `Your verification code - ${appName}`,
		html: generateEmailHTML(opts),
		text: generateEmailText(opts)
	};
}
