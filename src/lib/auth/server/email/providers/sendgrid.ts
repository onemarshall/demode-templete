/**
 * SendGrid Email Provider
 */

import type {
	EmailProvider,
	EmailOptions,
	EmailConfig,
	EmailTemplateKind,
	TemplateDataMap,
} from '../types'
import {
	createVerificationEmailContent,
	createOTPEmailContent,
	createResetPasswordEmailContent,
	createMagicLinkEmailContent,
} from '../emails'
import { buildTemplateEmail } from './template-dispatch'
import { createProviderLogger } from '$lib/auth/shared/logger'
import { getServerEnv } from '$lib/auth/shared/env'

export class SendgridEmailProvider implements EmailProvider {
	private config: EmailConfig
	private logger = createProviderLogger('Email', 'sendgrid')
	private apiUrl = 'https://api.sendgrid.com/v3/mail/send'

	constructor(config: EmailConfig) {
		if (!config.apiKey) throw new Error('SendGrid requires EMAIL_SENDGRID_API_KEY')
		this.config = config
		this.logger.info('SendGrid provider initialized', { from: config.fromEmail })
	}

	private headers() {
		return {
			Authorization: `Bearer ${this.config.apiKey}`,
			'Content-Type': 'application/json',
		}
	}

	private resolveActionUrl(basePath: string, value: string): string {
		if (value.startsWith('http://') || value.startsWith('https://')) {
			return value
		}

		return `${basePath}${encodeURIComponent(value)}`
	}

	async sendVerificationEmail(email: string, token: string, appName: string): Promise<void> {
		const env = await getServerEnv()
		const url = this.resolveActionUrl(`${env.PUBLIC_SITE_URL}/auth/verify-email?token=`, token)
		const { subject, html, text } = createVerificationEmailContent({ email, url, appName })
		await this.sendEmail({ to: email, from: this.config.fromEmail, subject, html, text })
	}

	async sendVerificationEmailWithUrl(email: string, url: string, appName: string): Promise<void> {
		const { subject, html, text } = createVerificationEmailContent({ email, url, appName })
		await this.sendEmail({ to: email, from: this.config.fromEmail, subject, html, text })
	}

	async sendOTPEmail(email: string, otp: string, appName: string): Promise<void> {
		const { subject, html, text } = createOTPEmailContent({ email, otp, appName })
		await this.sendEmail({ to: email, from: this.config.fromEmail, subject, html, text })
	}

	async sendPasswordResetEmail(email: string, token: string, appName: string): Promise<void> {
		const env = await getServerEnv()
		const url = this.resolveActionUrl(`${env.PUBLIC_SITE_URL}/auth/reset-password?token=`, token)
		const { subject, html, text } = createResetPasswordEmailContent({ email, url, appName })
		await this.sendEmail({ to: email, from: this.config.fromEmail, subject, html, text })
	}

	async sendPasswordResetEmailWithUrl(email: string, url: string, appName: string): Promise<void> {
		const { subject, html, text } = createResetPasswordEmailContent({ email, url, appName })
		await this.sendEmail({ to: email, from: this.config.fromEmail, subject, html, text })
	}

	async sendMagicLinkEmail(email: string, url: string, appName: string): Promise<void> {
		const { subject, html, text } = createMagicLinkEmailContent({ email, url, appName })
		await this.sendEmail({ to: email, from: this.config.fromEmail, subject, html, text })
	}

	async sendTemplate<K extends EmailTemplateKind>(
		kind: K,
		data: TemplateDataMap[K],
		appName?: string
	): Promise<void> {
		const { subject, html, text } = buildTemplateEmail(kind, data, appName ?? this.config.fromName)
		const to = (data as { email: string }).email
		await this.sendEmail({ to, from: this.config.fromEmail, subject, html, text })
	}

	async sendEmail(options: EmailOptions): Promise<void> {
		const fromAddress =
			this.config.fromEmail && this.config.fromName
				? `${this.config.fromName} <${this.config.fromEmail}>`
				: this.config.fromEmail

		const payload = {
			personalizations: [{ to: [{ email: options.to }], subject: options.subject }],
			from: { email: options.from ?? fromAddress, name: this.config.fromName },
			content: [
				...(options.text ? [{ type: 'text/plain', value: options.text }] : []),
				{ type: 'text/html', value: options.html },
			],
			reply_to: options.replyTo ? { email: options.replyTo } : undefined,
		}

		const res = await fetch(this.apiUrl, {
			method: 'POST',
			headers: this.headers(),
			body: JSON.stringify(payload),
		})

		if (!res.ok) {
			const err = await res.text()
			this.logger.error('SendGrid API error', { status: res.status, error: err })
			throw new Error(`SendGrid error: ${res.status}`)
		}

		this.logger.info('Email sent', { to: options.to, subject: options.subject })
	}

	async healthCheck(): Promise<boolean> {
		try {
			const res = await fetch('https://api.sendgrid.com/v3/user/account', {
				headers: this.headers(),
			})
			return res.ok
		} catch {
			return false
		}
	}
}
