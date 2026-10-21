/**
 * Verification Email Template
 */

import { generateEmailHTML, generateEmailText } from './base';
import type { EmailTemplateOptions, VerificationEmailData, EmailContent } from './types';

export function createVerificationEmailContent(data: VerificationEmailData): EmailContent {
	const { url, name, appName = 'App' } = data;
	const opts: EmailTemplateOptions = {
		appName,
		heading: 'Verify Your Email Address',
		name,
		mainContent:
			'<p>Thank you for signing up! Please verify your email address by clicking the button below:</p>',
		buttonText: 'Verify Email Address',
		buttonUrl: url,
		footerNote: "If you didn't create an account, you can safely ignore this email."
	};
	return {
		subject: `Verify your email address - ${appName}`,
		html: generateEmailHTML(opts),
		text: generateEmailText(opts)
	};
}
