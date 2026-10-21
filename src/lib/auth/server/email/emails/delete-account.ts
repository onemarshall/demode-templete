/**
 * Delete Account Verification Template
 */

import { generateEmailHTML, generateEmailText } from './base';
import type { EmailTemplateOptions, DeleteAccountEmailData, EmailContent } from './types';

export function createDeleteAccountEmailContent(data: DeleteAccountEmailData): EmailContent {
	const { url, name, appName = 'App' } = data;
	const opts: EmailTemplateOptions = {
		appName,
		heading: 'Confirm Account Deletion',
		name,
		mainContent:
			'<p>We received a request to delete your account. To confirm this action and <strong>permanently delete</strong> your account, please click the button below:</p>',
		buttonText: 'Confirm Account Deletion',
		buttonUrl: url,
		footerNote:
			'If you did not request to delete your account, you can safely ignore this email. Your account will not be deleted.'
	};
	return {
		subject: `Confirm Account Deletion - ${appName}`,
		html: generateEmailHTML(opts),
		text: generateEmailText(opts)
	};
}
