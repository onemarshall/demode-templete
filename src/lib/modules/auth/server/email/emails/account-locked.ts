import { generateEmailHTML, generateEmailText } from './base';
import type { AccountLockedEmailData, EmailContent, EmailTemplateOptions } from './types';

export function createAccountLockedEmailContent(data: AccountLockedEmailData): EmailContent {
	const { appName = 'App', name, unlockUrl, securityContext } = data;

	const mainContent = `
		<p style="margin: 0 0 16px 0;">Your account has been temporarily locked due to unusual activity or too many failed attempts.</p>
		<p style="margin: 0 0 12px 0;">To regain access, follow the steps below.</p>
		${securityContext ? `<p style="margin: 0 0 12px 0;">${securityContext}</p>` : ''}
	`;

	const opts: EmailTemplateOptions = {
		appName,
		heading: 'Your account has been locked',
		name,
		mainContent,
		buttonText: unlockUrl ? 'Unlock your account' : undefined,
		buttonUrl: unlockUrl,
		footerNote: 'If you did not initiate this, please secure your account immediately.'
	};

	return {
		subject: `Account locked - ${appName}`,
		html: generateEmailHTML(opts),
		text: generateEmailText(opts)
	};
}
