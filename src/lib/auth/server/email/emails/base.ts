/**
 * Base Email Template Generator
 *
 * Modern, minimalist transactional email template
 * Features:
 * - MSO/Outlook compatibility with VML buttons
 * - Mobile responsive
 * - Dark mode support
 * - Clean typography with system fonts
 * - Accessible markup
 */

import type { EmailTemplateOptions } from './types';

const FONT_STACK =
	"-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";
const MONO_FONT = "'SF Mono', SFMono-Regular, Consolas, 'Liberation Mono', Menlo, monospace";

export function generateEmailHTML(options: EmailTemplateOptions): string {
	const {
		appName,
		heading,
		name,
		mainContent,
		buttonText,
		buttonUrl,
		footerNote,
		expirationNote,
		code,
		codeLabel = 'Or enter this code manually',
		previewText,
		securityContext,
		supportUrl = '#',
		privacyUrl = '#',
		termsUrl = '#'
	} = options;

	const year = new Date().getFullYear();
	const greeting = name
		? `<p style="margin: 0 0 20px 0; font-family: ${FONT_STACK}; font-size: 15px; font-weight: 400; line-height: 24px; color: #555555;">Hello ${name},</p>`
		: '';
	const preview = previewText || `${heading} — ${appName}`;

	// Build optional sections
	const buttonSection =
		buttonText && buttonUrl
			? `
				<!-- CTA Button -->
				<tr>
					<td class="mobile-padding" style="padding: 32px 48px;">
						<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
							<tr>
								<td>
									<!--[if mso]>
									<v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${buttonUrl}" style="height:48px;v-text-anchor:middle;width:100%;" arcsize="8%" fillcolor="#000000">
									<w:anchorlock/>
									<center style="color:#ffffff;font-family:sans-serif;font-size:14px;font-weight:500;">${buttonText}</center>
									</v:roundrect>
									<![endif]-->
									<!--[if !mso]><!-->
									<a href="${buttonUrl}" style="display: block; padding: 14px 24px; font-family: ${FONT_STACK}; font-size: 14px; font-weight: 500; color: #ffffff; background-color: #000000; text-decoration: none; text-align: center; border-radius: 4px;">
										${buttonText}
									</a>
									<!--<![endif]-->
								</td>
							</tr>
						</table>
					</td>
				</tr>`
			: '';

	const codeSection = code
		? `
				<!-- Divider -->
				<tr>
					<td style="padding: 0 48px;">
						<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
							<tr>
								<td style="border-top: 1px solid #eeeeee;"></td>
							</tr>
						</table>
					</td>
				</tr>

				<!-- Verification Code -->
				<tr>
					<td class="mobile-padding" style="padding: 32px 48px 8px 48px;">
						<p style="margin: 0; font-family: ${FONT_STACK}; font-size: 13px; font-weight: 400; color: #888888; text-align: center;">
							${codeLabel}
						</p>
					</td>
				</tr>

				<tr>
					<td class="mobile-padding" style="padding: 12px 48px 32px 48px; text-align: center;">
						<span class="code-text" style="font-family: ${MONO_FONT}; font-size: 32px; font-weight: 500; letter-spacing: 8px; color: #000000;">
							${code}
						</span>
					</td>
				</tr>`
		: '';

	const expirationSection = expirationNote
		? `
				<!-- Expiry Notice -->
				<tr>
					<td style="padding: 0 48px 32px 48px;">
						<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f9f9f9; border-radius: 4px;">
							<tr>
								<td style="padding: 16px 20px;">
									<p style="margin: 0; font-family: ${FONT_STACK}; font-size: 13px; font-weight: 400; line-height: 20px; color: #666666;">
										⏱ <strong style="color: #000000;">${expirationNote}</strong>
									</p>
								</td>
							</tr>
						</table>
					</td>
				</tr>`
		: '';

	const securitySection = securityContext
		? `
				<!-- Security Context -->
				<tr>
					<td class="mobile-padding" style="padding: 0 48px 24px 48px;">
						<p style="margin: 0; font-family: ${FONT_STACK}; font-size: 13px; font-weight: 400; line-height: 20px; color: #999999;">
							${securityContext}
						</p>
					</td>
				</tr>`
		: '';

	const footerNoteSection = footerNote
		? `
				<!-- Footer Note -->
				<tr>
					<td class="mobile-padding" style="padding: 0 48px 48px 48px;">
						<p style="margin: 0; font-family: ${FONT_STACK}; font-size: 13px; font-weight: 400; line-height: 20px; color: #999999;">
							${footerNote}
						</p>
					</td>
				</tr>`
		: '';

	return `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
	<meta charset="utf-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<meta http-equiv="X-UA-Compatible" content="IE=edge">
	<meta name="x-apple-disable-message-reformatting">
	<meta name="format-detection" content="telephone=no, date=no, address=no, email=no">
	<meta name="color-scheme" content="light dark">
	<meta name="supported-color-schemes" content="light dark">
	<title>${heading}</title>

	<!--[if mso]>
	<noscript>
		<xml>
			<o:OfficeDocumentSettings>
				<o:PixelsPerInch>96</o:PixelsPerInch>
			</o:OfficeDocumentSettings>
		</xml>
	</noscript>
	<style>
		table { border-collapse: collapse; }
		td { font-family: sans-serif; }
	</style>
	<![endif]-->

	<style>
		/* Reset */
		body, table, td, p, a, li { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
		table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
		img { -ms-interpolation-mode: bicubic; border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; }
		body { margin: 0 !important; padding: 0 !important; width: 100% !important; }

		/* Dark mode */
		@media (prefers-color-scheme: dark) {
			.email-bg { background-color: #1a1a1a !important; }
			.card-bg { background-color: #2d2d2d !important; }
			.text-primary { color: #ffffff !important; }
			.text-secondary { color: #b3b3b3 !important; }
			.text-muted { color: #808080 !important; }
			.divider { border-color: #404040 !important; }
			.notice-bg { background-color: #333333 !important; }
			.code-text { color: #ffffff !important; }
		}

		/* Responsive */
		@media screen and (max-width: 600px) {
			.container { width: 100% !important; }
			.mobile-padding { padding-left: 24px !important; padding-right: 24px !important; }
			.code-text { font-size: 28px !important; letter-spacing: 6px !important; }
		}
	</style>
</head>

<body style="margin: 0; padding: 0; background-color: #f7f7f7;" class="email-bg">

	<!-- Preview Text -->
	<div style="display: none; max-height: 0; overflow: hidden;">
		${preview}
		&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;
	</div>

	<!-- Wrapper -->
	<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f7f7f7;" class="email-bg">
		<tr>
			<td align="center" style="padding: 40px 20px;">

				<!-- Container -->
				<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="480" class="container" style="max-width: 480px; width: 100%;">

					<!-- Logo -->
					<tr>
						<td style="padding: 0 0 32px 0; text-align: center;">
							<span style="font-family: ${FONT_STACK}; font-size: 13px; font-weight: 500; letter-spacing: 3px; text-transform: uppercase; color: #000000;" class="text-primary">
								${appName.toUpperCase()}
							</span>
						</td>
					</tr>

					<!-- Card -->
					<tr>
						<td>
							<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #ffffff; border-radius: 4px;" class="card-bg">

								<!-- Header -->
								<tr>
									<td class="mobile-padding" style="padding: 48px 48px 0 48px;">
										<h1 style="margin: 0; font-family: ${FONT_STACK}; font-size: 22px; font-weight: 500; line-height: 28px; color: #000000;" class="text-primary">
											${heading}
										</h1>
									</td>
								</tr>

								<!-- Body -->
								<tr>
									<td class="mobile-padding" style="padding: 20px 48px 0 48px;">
										${greeting}
										<div style="font-family: ${FONT_STACK}; font-size: 15px; font-weight: 400; line-height: 24px; color: #555555;" class="text-secondary">
											${mainContent}
										</div>
									</td>
								</tr>
								${buttonSection}
								${codeSection}
								${expirationSection}
								${securitySection}
								${footerNoteSection}

							</table>
						</td>
					</tr>

					<!-- Footer -->
					<tr>
						<td style="padding: 32px 0; text-align: center;">
							<p style="margin: 0 0 8px 0; font-family: ${FONT_STACK}; font-size: 12px; font-weight: 400; color: #999999;" class="text-muted">
								© ${year} ${appName}. All rights reserved.
							</p>
							<p style="margin: 0; font-family: ${FONT_STACK}; font-size: 12px; font-weight: 400; color: #999999;" class="text-muted">
								<a href="${supportUrl}" style="color: #666666; text-decoration: underline;">Help</a>
								<span style="color: #cccccc;">&nbsp;&nbsp;·&nbsp;&nbsp;</span>
								<a href="${privacyUrl}" style="color: #666666; text-decoration: underline;">Privacy</a>
								<span style="color: #cccccc;">&nbsp;&nbsp;·&nbsp;&nbsp;</span>
								<a href="${termsUrl}" style="color: #666666; text-decoration: underline;">Terms</a>
							</p>
						</td>
					</tr>

				</table>

			</td>
		</tr>
	</table>

</body>
</html>`;
}

export function generateEmailText(options: EmailTemplateOptions): string {
	const {
		appName,
		heading,
		name,
		mainContent,
		buttonText,
		buttonUrl,
		footerNote,
		expirationNote,
		code,
		codeLabel = 'Or enter this code manually'
	} = options;

	const year = new Date().getFullYear();

	// Strip HTML from content
	const stripHtml = (html: string): string =>
		html
			.replace(/<br\s*\/?>/gi, '\n')
			.replace(/<\/p>/gi, '\n\n')
			.replace(/<\/li>/gi, '\n')
			.replace(/<li[^>]*>/gi, '• ')
			.replace(/<[^>]*>/g, '')
			.replace(/&nbsp;/g, ' ')
			.replace(/&amp;/g, '&')
			.replace(/&lt;/g, '<')
			.replace(/&gt;/g, '>')
			.replace(/&quot;/g, '"')
			.replace(/&#39;/g, "'")
			.replace(/\n{3,}/g, '\n\n')
			.trim();

	const plainContent = stripHtml(mainContent);
	const plainFooterNote = footerNote ? stripHtml(footerNote) : '';

	let text = '';
	text += `${appName.toUpperCase()}\n`;
	text += `${'─'.repeat(40)}\n\n`;
	text += `${heading}\n\n`;

	if (name) {
		text += `Hello ${name},\n\n`;
	}

	text += `${plainContent}\n`;

	if (buttonText && buttonUrl) {
		text += `\n${buttonText}: ${buttonUrl}\n`;
	}

	if (code) {
		text += `\n${codeLabel}: ${code}\n`;
	}

	if (expirationNote) {
		text += `\n⏱ ${expirationNote}\n`;
	}

	if (plainFooterNote) {
		text += `\n${plainFooterNote}\n`;
	}

	text += `\n─────────────────────────────────────────\n`;
	text += `© ${year} ${appName}. All rights reserved.\n`;

	return text;
}
