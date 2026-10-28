/**
 * Visual Contract — Designer Send email content.
 *
 * Copy is taken from the canonical template:
 *   docs/methodology/specs/designer-send-email-template-spec.md
 *   ("Standard Solo Flow Template")
 *
 * The email is a delivery wrapper, not the source of truth. It points at the
 * contract page and repeats the six commitments for quick reference. It never
 * claims the designer has accepted anything.
 *
 * Rendering goes through the shared transactional base template so the message
 * matches every other email the product sends.
 */

import {
	generateEmailHTML,
	generateEmailText
} from '#lib/modules/auth/server/email/emails/base.js';
import type { EmailTemplateOptions } from '#lib/modules/auth/server/email/emails/types.js';
import type { ContractContent } from '../shared/generate.js';

export interface DesignerSendInput {
	projectName: string;
	recipientName?: string;
	senderName: string;
	appName?: string;
	/** Optional line from the sender, placed after the greeting. */
	introLine?: string;
	contractUrl: string;
	content: ContractContent;
}

export interface DesignerSendEmail {
	subject: string;
	html: string;
	text: string;
}

const escapeHtml = (value: string): string =>
	value
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;');

/** `Warm, Spacious, Calm, Restrained, Clean and Focused` */
function joinWords(words: readonly string[]): string {
	if (words.length === 0) return '';
	if (words.length === 1) return words[0];
	return `${words.slice(0, -1).join(', ')} and ${words[words.length - 1]}`;
}

export function buildDesignerSendEmail(input: DesignerSendInput): DesignerSendEmail {
	const words = input.content.brief.commitments.map((commitment) => commitment.word);
	const glosses = input.content.brief.commitments.map((commitment) => commitment.gloss);
	const greetingName = input.recipientName?.trim();
	const greeting = greetingName ? `Hi ${greetingName},` : 'Hello,';
	const subject = `${input.projectName} Visual Contract`;
	const intro = input.introLine?.trim();

	const direction = `In short, we want the brand to feel ${joinWords(words)}. That means ${glosses.join('; ')}.`;
	const commitments = input.content.brief.commitments.map(
		(commitment) => `${commitment.word} should lead over ${commitment.otherWord} when they conflict`
	);

	const mainContent = [
		`<p>${escapeHtml(greeting)}</p>`,
		intro ? `<p>${escapeHtml(intro)}</p>` : '',
		`<p>I've completed a Visual Contract for <strong>${escapeHtml(input.projectName)}</strong>. It records the visual direction I'd like us to discuss before design begins.</p>`,
		'<p>It records two things:</p>',
		'<ul><li>the visual direction I\'d like the work to follow</li><li>how I\'d like us to review the work when concepts come back</li></ul>',
		`<p>${escapeHtml(direction)}</p>`,
		'<p>The page has a concise <em>Visual Contract Brief</em> and the <em>Evaluation Companion</em>, my design review guide. Please tell me if anything conflicts with the wider project brief before you begin.</p>',
		'<p>For quick reference, the six chosen commitments are:</p>',
		`<ul>${commitments.map((line) => `<li>${escapeHtml(line)}</li>`).join('')}</ul>`,
		'<p>You can view the Visual Contract here:</p>'
	]
		.filter(Boolean)
		.join('\n');

	const options: EmailTemplateOptions = {
		appName: input.appName?.trim() || 'App',
		heading: `${escapeHtml(input.projectName)} Visual Contract`,
		mainContent,
		buttonText: 'View Visual Contract',
		buttonUrl: input.contractUrl,
		footerNote:
			"It's a record of my client-side direction. It isn't a legal agreement, and it doesn't mean you've accepted it.",
		previewText: `${escapeHtml(input.projectName)} Visual Contract — the direction and the six commitments`
	};

	return {
		subject,
		html: generateEmailHTML(options),
		text: generateEmailText(options)
	};
}
