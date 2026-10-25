/**
 * Generic Notification Email Template
 */

import { generateEmailHTML, generateEmailText } from './base';
import type { EmailTemplateOptions, NotificationEmailData, EmailContent } from './types';

export function createNotificationEmailContent(data: NotificationEmailData): EmailContent {
	const { name, title, message, actionUrl, actionText, appName = 'App' } = data;
	const opts: EmailTemplateOptions = {
		appName,
		heading: title,
		name,
		mainContent: `<p>${message}</p>`,
		buttonText: actionText,
		buttonUrl: actionUrl,
		footerNote: `Thanks for using ${appName}!`
	};
	return {
		subject: title,
		html: generateEmailHTML(opts),
		text: generateEmailText(opts)
	};
}
