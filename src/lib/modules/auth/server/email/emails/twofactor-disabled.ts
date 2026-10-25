import { generateEmailHTML, generateEmailText } from './base';
import type { EmailContent, EmailTemplateOptions, TwoFactorDisabledEmailData } from './types';

export function createTwoFactorDisabledEmailContent(
	data: TwoFactorDisabledEmailData
): EmailContent {
	const { appName = 'App', name, time, actionUrl } = data;

	const mainContent = `
		<p style="margin: 0 0 16px 0;">Two-factor authentication was disabled on your account.</p>
		${time ? `<p style="margin: 0 0 12px 0;">Time: ${time}</p>` : ''}
		<p style="margin: 0;">If this wasn’t you, turn 2FA back on and secure your account immediately.</p>
	`;

	const opts: EmailTemplateOptions = {
		appName,
		heading: 'Two-factor authentication disabled',
		name,
		mainContent,
		buttonText: actionUrl ? 'Secure your account' : undefined,
		buttonUrl: actionUrl,
		footerNote: 'If you disabled 2FA, no further action is needed.'
	};

	return {
		subject: `2FA disabled on your ${appName} account`,
		html: generateEmailHTML(opts),
		text: generateEmailText(opts)
	};
}
