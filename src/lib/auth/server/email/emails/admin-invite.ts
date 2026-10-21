import { generateEmailHTML, generateEmailText } from './base';
import type { AdminInviteEmailData, EmailContent, EmailTemplateOptions } from './types';

export function createAdminInviteEmailContent(data: AdminInviteEmailData): EmailContent {
	const { appName = 'App', name, inviterName, roleName, inviteUrl } = data;

	const mainContent = `
		<p style="margin: 0 0 16px 0;">${inviterName || 'An admin'} has invited you to join ${
			appName
		}${roleName ? ` as <strong>${roleName}</strong>` : ''}.</p>
		<p style="margin: 0;">Click the button below to accept your invitation and set up your account.</p>
	`;

	const opts: EmailTemplateOptions = {
		appName,
		heading: 'You are invited',
		name,
		mainContent,
		buttonText: 'Accept Invitation',
		buttonUrl: inviteUrl,
		footerNote: 'If you did not expect this invitation, you can ignore this email.'
	};

	return {
		subject: `You're invited to ${appName}`,
		html: generateEmailHTML(opts),
		text: generateEmailText(opts)
	};
}
