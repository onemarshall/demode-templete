import { generateEmailHTML, generateEmailText } from './base';
import type { DeviceSignInAlertEmailData, EmailContent, EmailTemplateOptions } from './types';

export function createDeviceSignInAlertEmailContent(
	data: DeviceSignInAlertEmailData
): EmailContent {
	const { appName = 'App', name, device, location, ip, time, actionUrl } = data;

	const details = [
		device ? `<li><strong>Device:</strong> ${device}</li>` : '',
		location ? `<li><strong>Location:</strong> ${location}</li>` : '',
		ip ? `<li><strong>IP:</strong> ${ip}</li>` : '',
		time ? `<li><strong>Time:</strong> ${time}</li>` : ''
	]
		.filter(Boolean)
		.join('');

	const mainContent = `
		<p style="margin: 0 0 16px 0;">We noticed a sign-in to your ${appName} account.</p>
		${details ? `<ul style="margin: 0 0 16px 0; padding-left: 20px;">${details}</ul>` : ''}
		<p style="margin: 0;">If this was you, no action is needed. If not, secure your account immediately.</p>
	`;

	const opts: EmailTemplateOptions = {
		appName,
		heading: 'New sign-in detected',
		name,
		mainContent,
		buttonText: actionUrl ? 'Secure your account' : undefined,
		buttonUrl: actionUrl,
		footerNote: 'If you recognize this activity, you can ignore this email.'
	};

	return {
		subject: `New sign-in on your ${appName} account`,
		html: generateEmailHTML(opts),
		text: generateEmailText(opts)
	};
}
