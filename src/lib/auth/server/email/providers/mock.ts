/**
 * Mock Email Provider
 * Logs emails to console instead of sending (for development)
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

interface EmailLog {
	timestamp: Date
	to: string
	subject: string
	type: string
}

export class MockEmailProvider implements EmailProvider {
	private config: EmailConfig
	private logger = createProviderLogger('Email', 'mock')
	private emailLog: EmailLog[] = []

	constructor(config: EmailConfig) {
		this.config = config
		this.logger.info('Mock email provider initialized (emails logged, not sent)', {
			fromEmail: config.fromEmail,
		})
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
		const { subject } = createVerificationEmailContent({ email, url, appName })

		this.log(email, subject, 'verification')
		this.logger.info(`📧 VERIFICATION EMAIL\n   To: ${email}\n   URL: ${url}`)
	}

	async sendVerificationEmailWithUrl(email: string, url: string, appName: string): Promise<void> {
		const { subject } = createVerificationEmailContent({ email, url, appName })

		this.log(email, subject, 'verification')
		this.logger.info(`📧 VERIFICATION EMAIL\n   To: ${email}\n   URL: ${url}`)
	}

	async sendOTPEmail(email: string, otp: string, appName: string): Promise<void> {
		const { subject } = createOTPEmailContent({ email, otp, appName })

		this.log(email, subject, 'otp')
		this.logger.info(`📧 OTP EMAIL\n   To: ${email}\n   Code: ${otp}`)
	}

	async sendPasswordResetEmail(email: string, token: string, appName: string): Promise<void> {
		const env = await getServerEnv()
		const url = this.resolveActionUrl(`${env.PUBLIC_SITE_URL}/auth/reset-password?token=`, token)
		const { subject } = createResetPasswordEmailContent({ email, url, appName })

		this.log(email, subject, 'password-reset')
		this.logger.info(`📧 PASSWORD RESET EMAIL\n   To: ${email}\n   URL: ${url}`)
	}

	async sendPasswordResetEmailWithUrl(email: string, url: string, appName: string): Promise<void> {
		const { subject } = createResetPasswordEmailContent({ email, url, appName })

		this.log(email, subject, 'password-reset')
		this.logger.info(`📧 PASSWORD RESET EMAIL\n   To: ${email}\n   URL: ${url}`)
	}

	async sendMagicLinkEmail(email: string, url: string, appName: string): Promise<void> {
		const { subject } = createMagicLinkEmailContent({ email, url, appName })

		this.log(email, subject, 'magic-link')
		this.logger.info(`📧 MAGIC LINK EMAIL\n   To: ${email}\n   URL: ${url}`)
	}

	async sendTemplate<K extends EmailTemplateKind>(
		kind: K,
		data: TemplateDataMap[K],
		appName?: string
	): Promise<void> {
		const { subject } = buildTemplateEmail(kind, data, appName)
		const to = (data as { email: string }).email
		this.log(to, subject, kind)
		this.logger.info(`📧 TEMPLATE EMAIL\n   Kind: ${kind}\n   To: ${to}\n   Subject: ${subject}`)
	}

	async sendEmail(options: EmailOptions): Promise<void> {
		this.log(options.to, options.subject, 'custom')
		this.logger.info(`📧 CUSTOM EMAIL\n   To: ${options.to}\n   Subject: ${options.subject}`)
	}

	async healthCheck(): Promise<boolean> {
		return true
	}

	// Testing utilities
	private log(to: string, subject: string, type: string) {
		this.emailLog.push({ timestamp: new Date(), to, subject, type })
	}

	getEmailLog(): EmailLog[] {
		return [...this.emailLog]
	}

	getLastEmail(): EmailLog | undefined {
		return this.emailLog[this.emailLog.length - 1]
	}

	clearLog(): void {
		this.emailLog = []
	}
}
