/**
 * Magic Link Email Template
 */

import { generateEmailHTML, generateEmailText } from './base';
import type { EmailTemplateOptions, MagicLinkEmailData, EmailContent } from './types';

export function createMagicLinkEmailContent(data: MagicLinkEmailData): EmailContent {
	const { url, name, appName = 'App' } = data;
	const opts: EmailTemplateOptions = {
		appName,
		heading: 'Sign In with Magic Link',
		name,
		mainContent: `<p>Click the button below to sign in to your ${appName} account:</p>`,
		buttonText: 'Sign In',
		buttonUrl: url,
		footerNote:
			"If you didn't request this link, you can safely ignore this email. Your account will remain secure.",
		expirationNote: 'This link will expire in 5 minutes for security reasons.'
	};
	return {
		subject: `Sign in to ${appName}`,
		html: generateEmailHTML(opts),
		text: generateEmailText(opts)
	};
}
