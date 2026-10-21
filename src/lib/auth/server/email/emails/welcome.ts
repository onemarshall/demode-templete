/**
 * Welcome Email Template
 */

import { generateEmailHTML, generateEmailText } from './base';
import type { EmailTemplateOptions, WelcomeEmailData, EmailContent } from './types';

export function createWelcomeEmailContent(data: WelcomeEmailData): EmailContent {
	const { name, appName = 'App', siteUrl = '/' } = data;

	const welcomeContent = `
		<p>Welcome to ${appName}! We're excited to have you on board.</p>
		<p>Here are some things you can do to get started:</p>
		<ul style="margin: 16px 0; padding-left: 24px;">
			<li style="margin-bottom: 8px;">Complete your profile</li>
			<li style="margin-bottom: 8px;">Explore the features</li>
			<li style="margin-bottom: 8px;">Connect with other users</li>
		</ul>
	`;

	const opts: EmailTemplateOptions = {
		appName,
		heading: `Welcome to ${appName}!`,
		name,
		mainContent: welcomeContent,
		buttonText: 'Get Started',
		buttonUrl: siteUrl,
		footerNote: 'If you have any questions, feel free to reach out to our support team.'
	};
	return {
		subject: `Welcome to ${appName}!`,
		html: generateEmailHTML(opts),
		text: generateEmailText(opts)
	};
}
