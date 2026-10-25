/**
 * Change Email Verification Template
 */

import { generateEmailHTML, generateEmailText } from './base';
import type { EmailTemplateOptions, ChangeEmailVerificationData, EmailContent } from './types';

export function createChangeEmailVerificationContent(
	data: ChangeEmailVerificationData
): EmailContent {
	const { url, name, appName = 'App', newEmail } = data;
	const newEmailText = newEmail ? ` to <strong>${newEmail}</strong>` : '';

	const opts: EmailTemplateOptions = {
		appName,
		heading: 'Verify Email Change Request',
		name,
		mainContent: `<p>We received a request to change your email address${newEmailText}. To confirm this change, please click the button below:</p>`,
		buttonText: 'Verify Email Change',
		buttonUrl: url,
		footerNote:
			'<strong>Important:</strong> If you did not request this email change, please ignore this email and consider changing your password for security.',
		expirationNote: 'This verification link will expire in 1 hour for security reasons.'
	};
	return {
		subject: `Verify Email Change Request - ${appName}`,
		html: generateEmailHTML(opts),
		text: generateEmailText(opts)
	};
}
