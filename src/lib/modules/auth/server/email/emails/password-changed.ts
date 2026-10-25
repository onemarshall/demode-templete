import { generateEmailHTML, generateEmailText } from './base';
import type { EmailContent, EmailTemplateOptions, PasswordChangedEmailData } from './types';

export function createPasswordChangedEmailContent(data: PasswordChangedEmailData): EmailContent {
	const { appName = 'App', name, time, securityContext, actionUrl } = data;

	const mainContent = `
		<p style="margin: 0 0 16px 0;">Your password was recently changed.</p>
		${time ? `<p style="margin: 0 0 12px 0;">Time: ${time}</p>` : ''}
		${securityContext ? `<p style="margin: 0 0 12px 0;">${securityContext}</p>` : ''}
		<p style="margin: 0;">If you did not make this change, secure your account immediately.</p>
	`;

	const opts: EmailTemplateOptions = {
		appName,
		heading: 'Your password was changed',
		name,
		mainContent,
		buttonText: actionUrl ? 'Secure your account' : undefined,
		buttonUrl: actionUrl,
		footerNote: 'If you recognize this change, no further action is needed.'
	};

	return {
		subject: `Password changed - ${appName}`,
		html: generateEmailHTML(opts),
		text: generateEmailText(opts)
	};
}
