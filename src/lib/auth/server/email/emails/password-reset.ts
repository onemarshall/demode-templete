/**
 * Password Reset Email Template
 */

import { generateEmailHTML, generateEmailText } from './base';
import type { EmailTemplateOptions, ResetPasswordEmailData, EmailContent } from './types';

export function createResetPasswordEmailContent(data: ResetPasswordEmailData): EmailContent {
	const { url, name, appName = 'App' } = data;
	const opts: EmailTemplateOptions = {
		appName,
		heading: 'Reset Your Password',
		name,
		mainContent:
			'<p>We received a request to reset your password. Click the button below to create a new password:</p>',
		buttonText: 'Reset Password',
		buttonUrl: url,
		footerNote:
			"If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged.",
		expirationNote: 'This link will expire in 1 hour for security reasons.'
	};
	return {
		subject: `Reset your password - ${appName}`,
		html: generateEmailHTML(opts),
		text: generateEmailText(opts)
	};
}
