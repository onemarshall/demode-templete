import { generateEmailHTML, generateEmailText } from './base';
import type { EmailContent, EmailTemplateOptions, RecoveryCodesEmailData } from './types';

export function createRecoveryCodesEmailContent(data: RecoveryCodesEmailData): EmailContent {
	const { appName = 'App', name, codes, securityContext } = data;

	const codeList =
		codes && codes.length
			? `<ul style="margin: 8px 0 16px 0; padding-left: 20px; font-family: 'SF Mono', SFMono-Regular, Consolas, 'Liberation Mono', Menlo, monospace; font-size: 14px; line-height: 20px;">
				${codes.map((code) => `<li style="margin: 4px 0;">${code}</li>`).join('')}
			</ul>`
			: '';

	const mainContent = `
		<p style="margin: 0 0 12px 0;">Here are your recovery codes. Store them in a safe place.</p>
		${codeList}
		<p style="margin: 0;">Each code can be used once if you lose access to your authenticator.</p>
		${securityContext ? `<p style="margin: 12px 0 0 0; color: #777777;">${securityContext}</p>` : ''}
	`;

	const opts: EmailTemplateOptions = {
		appName,
		heading: 'Your recovery codes',
		name,
		mainContent,
		footerNote: 'Keep these codes secure. Do not share them with anyone.'
	};

	return {
		subject: `Recovery codes for your ${appName} account`,
		html: generateEmailHTML(opts),
		text: generateEmailText(opts)
	};
}
