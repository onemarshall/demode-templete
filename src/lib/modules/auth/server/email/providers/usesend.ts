/**
 * UseSend Email Provider
 */

import type {
	EmailProvider,
	EmailOptions,
	EmailConfig,
	EmailTemplateKind,
	TemplateDataMap
} from '../types';
import {
	createVerificationEmailContent,
	createOTPEmailContent,
	createResetPasswordEmailContent,
	createMagicLinkEmailContent
} from '../emails';
import { buildTemplateEmail } from './template-dispatch';
import { createProviderLogger } from '#lib/platform/logger.js';
import { getServerEnv } from '#lib/platform/config/server.server.js';
import { UseSend } from 'usesend-js';

export class UsesendEmailProvider implements EmailProvider {
	private config: EmailConfig;
	private logger = createProviderLogger('Email', 'usesend');
	private client: UseSend;

	constructor(config: EmailConfig) {
		if (!config.apiKey) throw new Error('UseSend requires EMAIL_USESEND_API_KEY');
		this.config = config;
		this.client = new UseSend(config.apiKey, config.apiUrl || 'https://api.usesend.com/v1');
		this.logger.info('UseSend provider initialized', { from: config.fromEmail });
	}

	async sendVerificationEmail(email: string, token: string, appName: string): Promise<void> {
		const env = await getServerEnv();
		const url = `${env.PUBLIC_SITE_URL}/auth/verify-email?token=${token}`;
		const { subject, html, text } = createVerificationEmailContent({ email, url, appName });
		await this.sendEmail({ to: email, subject, html, text });
	}

	async sendVerificationEmailWithUrl(email: string, url: string, appName: string): Promise<void> {
		const { subject, html, text } = createVerificationEmailContent({ email, url, appName });
		await this.sendEmail({ to: email, subject, html, text });
	}

	async sendOTPEmail(email: string, otp: string, appName: string): Promise<void> {
		const { subject, html, text } = createOTPEmailContent({ email, otp, appName });
		await this.sendEmail({ to: email, subject, html, text });
	}

	async sendPasswordResetEmail(email: string, token: string, appName: string): Promise<void> {
		const env = await getServerEnv();
		const isAbsoluteToken = token.startsWith('http://') || token.startsWith('https://');
		const url = isAbsoluteToken
			? token
			: `${env.PUBLIC_SITE_URL}/auth/reset-password?token=${encodeURIComponent(token)}`;
		const { subject, html, text } = createResetPasswordEmailContent({ email, url, appName });
		await this.sendEmail({ to: email, subject, html, text });
	}

	async sendPasswordResetEmailWithUrl(email: string, url: string, appName: string): Promise<void> {
		const { subject, html, text } = createResetPasswordEmailContent({ email, url, appName });
		await this.sendEmail({ to: email, subject, html, text });
	}

	async sendMagicLinkEmail(email: string, url: string, appName: string): Promise<void> {
		const { subject, html, text } = createMagicLinkEmailContent({ email, url, appName });
		await this.sendEmail({ to: email, subject, html, text });
	}

	async sendTemplate<K extends EmailTemplateKind>(
		kind: K,
		data: TemplateDataMap[K],
		appName: string
	): Promise<void> {
		const { subject, html, text } = buildTemplateEmail(kind, data, appName || this.config.fromName);
		const to = (data as { email: string }).email;
		await this.sendEmail({ to, subject, html, text });
	}

	async sendEmail(options: EmailOptions): Promise<void> {
		// Prefer caller-provided "Name <email>" when valid; otherwise compose from config
		const composedFrom =
			this.config.fromEmail && this.config.fromName
				? `${this.config.fromName} <${this.config.fromEmail}>`
				: (this.config.fromEmail ?? this.config.fromName ?? '');

		const hasDisplayName = options.from?.includes('<') && options.from?.includes('>');
		const from = hasDisplayName ? options.from : (options.from ?? composedFrom);

		if (!from) {
			throw new Error('UseSend requires a from address');
		}

		const result = await this.client.emails.send({
			to: options.to,
			from,
			subject: options.subject,
			html: options.html,
			text: options.text,
			replyTo: options.replyTo
		});

		if (result.error) {
			this.logger.error('UseSend API error', { error: result.error });
			throw new Error(`UseSend error: ${JSON.stringify(result.error)}`);
		}

		this.logger.info('Email sent', { to: options.to, subject: options.subject });
	}

	async healthCheck(): Promise<boolean> {
		try {
			// UseSend may not have a health endpoint
			return true;
		} catch {
			return false;
		}
	}
}
