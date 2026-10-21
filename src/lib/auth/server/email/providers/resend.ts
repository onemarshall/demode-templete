/**
 * Resend Email Provider
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
import { createProviderLogger } from '#lib/auth/shared/logger.js'
import { getServerEnv } from '#lib/auth/shared/env/index.js'

export class ResendEmailProvider implements EmailProvider {
	private config: EmailConfig
	private logger = createProviderLogger('Email', 'resend')
	private apiUrl = 'https://api.resend.com'

	constructor(config: EmailConfig) {
		if (!config.apiKey) throw new Error('Resend requires EMAIL_RESEND_API_KEY')
		this.config = config
		this.logger.info('Resend provider initialized', { from: config.fromEmail })
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
		// Resend accepts "Name <email@example.com>" for friendly sender names
		const fromAddress =
			this.config.fromName && this.config.fromEmail
				? `${this.config.fromName} <${this.config.fromEmail}>`
				: this.config.fromEmail

		const res = await fetch(`${this.apiUrl}/emails`, {
			method: 'POST',
			headers: this.headers(),
			body: JSON.stringify({
				to: options.to,
				from: options.from ?? fromAddress,
				subject: options.subject,
				html: options.html,
				text: options.text,
				reply_to: options.replyTo,
			}),
		})

		if (!res.ok) {
			const err = await res.text()
			this.logger.error('Resend API error', { status: res.status, error: err })
			throw new Error(`Resend error: ${res.status}`)
		}

		this.logger.info('Email sent', { to: options.to, subject: options.subject })
	}

	async healthCheck(): Promise<boolean> {
		try {
			const res = await fetch(`${this.apiUrl}/api-keys`, { headers: this.headers() })
			return res.ok
		} catch {
			return false
		}
	}
}
