import { generateEmailHTML, generateEmailText } from './base';
import type { EmailContent, EmailTemplateOptions, TwoFactorEnabledEmailData } from './types';

export function createTwoFactorEnabledEmailContent(data: TwoFactorEnabledEmailData): EmailContent {
	const { appName = 'App', name, time, recoveryCodesUrl } = data;

	const mainContent = `
		<p style="margin: 0 0 16px 0;">Two-factor authentication was enabled on your account.</p>
		${time ? `<p style="margin: 0 0 12px 0;">Time: ${time}</p>` : ''}
		<p style="margin: 0;">Keep your recovery codes safe. If this wasn’t you, secure your account immediately.</p>
	`;

	const opts: EmailTemplateOptions = {
		appName,
		heading: 'Two-factor authentication enabled',
		name,
		mainContent,
		buttonText: recoveryCodesUrl ? 'View recovery codes' : undefined,
		buttonUrl: recoveryCodesUrl,
		footerNote: 'If you enabled 2FA, no further action is needed.'
	};

	return {
		subject: `2FA enabled on your ${appName} account`,
		html: generateEmailHTML(opts),
		text: generateEmailText(opts)
	};
}
