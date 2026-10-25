import { generateEmailHTML, generateEmailText } from './base';
import type { EmailContent, EmailTemplateOptions, SessionLimitEmailData } from './types';

export function createSessionLimitEmailContent(data: SessionLimitEmailData): EmailContent {
	const { appName = 'App', name, device, location, time, manageSessionsUrl } = data;

	const details = [
		device ? `<li><strong>Device:</strong> ${device}</li>` : '',
		location ? `<li><strong>Location:</strong> ${location}</li>` : '',
		time ? `<li><strong>Time:</strong> ${time}</li>` : ''
	]
		.filter(Boolean)
		.join('');

	const mainContent = `
		<p style="margin: 0 0 16px 0;">You reached the session limit on your ${appName} account.</p>
		${details ? `<ul style="margin: 0 0 16px 0; padding-left: 20px;">${details}</ul>` : ''}
		<p style="margin: 0;">Review active sessions and sign out devices you no longer use.</p>
	`;

	const opts: EmailTemplateOptions = {
		appName,
		heading: 'Session limit reached',
		name,
		mainContent,
		buttonText: manageSessionsUrl ? 'Manage sessions' : undefined,
		buttonUrl: manageSessionsUrl,
		footerNote: 'If this was expected, you can ignore this email.'
	};

	return {
		subject: `Session limit reached on your ${appName} account`,
		html: generateEmailHTML(opts),
		text: generateEmailText(opts)
	};
}
