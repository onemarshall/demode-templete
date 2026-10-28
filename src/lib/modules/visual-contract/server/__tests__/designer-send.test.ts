import { describe, expect, it } from 'vitest';
import { AXIS_KEYS } from '../../shared/types.js';
import { getPair } from '../../shared/pairs.js';
import { buildContractContent } from '../../shared/generate.js';
import { buildDesignerSendEmail } from '../designer-send.js';
import type { AxisKey, ChoiceValue } from '../../shared/types.js';

const choices = Object.fromEntries(
	AXIS_KEYS.map((axis) => [axis, getPair(axis).a.value])
) as Record<AxisKey, ChoiceValue>;

const content = buildContractContent(choices, {});
const email = buildDesignerSendEmail({
	projectName: 'Northwind Rebrand',
	recipientName: 'Sam',
	senderName: 'Rob',
	appName: 'IAM Studio',
	contractUrl: 'https://example.test/contract/abc123',
	content
});

describe('designer send email', () => {
	it('uses the canonical subject template', () => {
		expect(email.subject).toBe('Northwind Rebrand Visual Contract');
	});

	it('renders through the shared transactional base template', () => {
		expect(email.html).toContain('<!DOCTYPE html>');
		expect(email.html).toContain('IAM STUDIO');
		expect(email.html).toContain('Northwind Rebrand Visual Contract');
		expect(email.html).toContain('View Visual Contract');
		expect(email.text).toContain('IAM STUDIO');
	});

	it('greets the recipient by name when known', () => {
		expect(email.text).toContain('Hi Sam,');
		expect(email.html).toContain('Hi Sam,');
	});

	it('falls back to a neutral greeting', () => {
		const anon = buildDesignerSendEmail({
			projectName: 'P',
			senderName: 'Rob',
			appName: 'IAM Studio',
			contractUrl: 'https://example.test/contract/x',
			content
		});
		expect(anon.text).toContain('Hello,');
	});

	it('includes the contract link in both bodies', () => {
		expect(email.text).toContain('https://example.test/contract/abc123');
		expect(email.html).toContain('https://example.test/contract/abc123');
	});

	it('lists all six commitments', () => {
		for (const commitment of content.brief.commitments) {
			const line = `${commitment.word} should lead over ${commitment.otherWord} when they conflict`;
			expect(email.text).toContain(line);
		}
	});

	it('states it is not a legal agreement and not acceptance', () => {
		expect(email.text).toContain("It isn't a legal agreement");
		expect(email.text).toContain("doesn't mean you've accepted it");
	});

	it('never says the designer accepted the contract', () => {
		expect(email.text.toLowerCase()).not.toContain('you have accepted');
		expect(email.text.toLowerCase()).not.toContain('agreed to');
	});

	it('keeps the framework word Dense out of the email', () => {
		expect(`${email.subject} ${email.text} ${email.html}`).not.toMatch(/\bdense\b/i);
	});

	it('escapes html in user-supplied fields', () => {
		const hostile = buildDesignerSendEmail({
			projectName: '<script>alert(1)</script>',
			recipientName: '<b>Sam</b>',
			senderName: 'Rob & Co',
			appName: 'IAM Studio',
			introLine: '<img src=x onerror=alert(1)>',
			contractUrl: 'https://example.test/contract/x',
			content
		});
		expect(hostile.html).not.toContain('<script>');
		expect(hostile.html).not.toContain('<img src=x');
		expect(hostile.html).toContain('&lt;script&gt;');
	});

	it('places an optional intro line after the greeting', () => {
		const withIntro = buildDesignerSendEmail({
			projectName: 'P',
			recipientName: 'Sam',
			senderName: 'Rob',
			appName: 'IAM Studio',
			introLine: 'Looking forward to this one.',
			contractUrl: 'https://example.test/contract/x',
			content
		});
		const text = withIntro.text;
		expect(text.indexOf('Hi Sam,')).toBeGreaterThan(-1);
		expect(text.indexOf('Hi Sam,')).toBeLessThan(text.indexOf('Looking forward to this one.'));
		expect(text.indexOf('Looking forward to this one.')).toBeLessThan(
			text.indexOf("I've completed a Visual Contract")
		);
	});
});
