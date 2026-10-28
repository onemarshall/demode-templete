import { describe, expect, it } from 'vitest';
import { AXIS_KEYS } from '../types.js';
import { PAIRS, getPair, isValueForAxis, resolveChoice } from '../pairs.js';
import { completeChoicesSchema, safeParseCompleteChoices } from '../choices.js';
import { buildContractContent } from '../generate.js';
import { evaluationFor } from '../content/index.js';
import type { AxisKey, ChoiceValue } from '../types.js';

const ALL_A = Object.fromEntries(AXIS_KEYS.map((axis) => [axis, getPair(axis).a.value])) as Record<
	AxisKey,
	ChoiceValue
>;

describe('pair definitions', () => {
	it('defines six pairs in card order', () => {
		expect(PAIRS).toHaveLength(6);
		expect(PAIRS.map((pair) => pair.index)).toEqual([1, 2, 3, 4, 5, 6]);
	});

	it('gives every option a value, word, gloss and reveal', () => {
		for (const pair of PAIRS) {
			for (const option of [pair.a, pair.b]) {
				expect(option.value).toBeTruthy();
				expect(option.word).toBeTruthy();
				expect(option.gloss.split(' ').length).toBeGreaterThanOrEqual(3);
				expect(option.reveal.endsWith('.')).toBe(true);
			}
		}
	});

	it('never exposes the framework word Dense on a client-facing pair', () => {
		const surfaces = PAIRS.flatMap((pair) => [
			pair.a.word,
			pair.a.gloss,
			pair.a.reveal,
			pair.b.word,
			pair.b.gloss,
			pair.b.reveal
		]);
		for (const surface of surfaces) expect(surface).not.toMatch(/dense/i);
		expect(getPair('spacious_full').b.word).toBe('Full');
	});
});

describe('evaluation copy', () => {
	it('has canonical copy for all twelve words', () => {
		for (const axis of AXIS_KEYS) {
			const pair = getPair(axis);
			for (const option of [pair.a, pair.b]) {
				const copy = evaluationFor(axis, option.value);
				expect(copy.word).toBe(option.word);
				expect(copy.coreMeaning.length).toBeGreaterThan(20);
				expect(copy.evaluationQuestion.endsWith('?')).toBe(true);
				expect(copy.meeting.length).toBeGreaterThan(0);
				expect(copy.notEnough.length).toBeGreaterThan(0);
				expect(copy.tooFar.length).toBeGreaterThan(0);
				expect(copy.unsure.length).toBeGreaterThan(0);
			}
		}
	});

	it('keeps the framework word Dense out of client-facing evaluation copy', () => {
		for (const axis of AXIS_KEYS) {
			const pair = getPair(axis);
			for (const option of [pair.a, pair.b]) {
				const copy = evaluationFor(axis, option.value);
				const text = [
					copy.coreMeaning,
					copy.evaluationQuestion,
					...copy.meeting,
					...copy.notEnough,
					...copy.tooFar,
					...copy.unsure
				].join(' ');
				expect(text).not.toMatch(/\bdense\b/i);
			}
		}
	});
});

describe('choice validation', () => {
	it('accepts a complete valid set', () => {
		expect(safeParseCompleteChoices(ALL_A)).toEqual(ALL_A);
	});

	it('rejects a word recorded against the wrong axis', () => {
		const invalid = { ...ALL_A, warm_cool: 'clean' };
		expect(completeChoicesSchema.safeParse(invalid).success).toBe(false);
	});

	it('rejects an incomplete set', () => {
		const { warm_cool: _omitted, ...partial } = ALL_A;
		expect(completeChoicesSchema.safeParse(partial).success).toBe(false);
	});

	it('rejects an invented word', () => {
		expect(isValueForAxis('warm_cool', 'cosy')).toBe(false);
	});
});

describe('generation', () => {
	it('builds a brief with one commitment per pair, in order', () => {
		const content = buildContractContent(ALL_A, {});
		expect(content.brief.commitments).toHaveLength(6);
		expect(content.brief.commitments.map((commitment) => commitment.axis)).toEqual([...AXIS_KEYS]);
	});

	it('states each commitment as a leading-quality sentence', () => {
		const content = buildContractContent(ALL_A, {});
		const first = content.brief.commitments[0];
		expect(first.statement).toBe(`${first.word} should lead over ${first.otherWord} when they conflict.`);
	});

	it('carries the canonical evaluation question into the companion', () => {
		const content = buildContractContent(ALL_A, {});
		for (const prompt of content.companion.commitments) {
			expect(prompt.question).toBe(evaluationFor(prompt.axis, ALL_A[prompt.axis]).evaluationQuestion);
		}
	});

	it('falls back to universal application views without project context', () => {
		const content = buildContractContent(ALL_A, {});
		expect(content.companion.applicationViews.length).toBeGreaterThan(0);
		expect(content.companion.applicationViews[0]).toBe('The main screen or page');
	});

	it('adapts application views to project type', () => {
		const content = buildContractContent(ALL_A, { projectType: 'Packaging' });
		expect(content.companion.applicationViews).toContain('Packaging in context');
	});

	it('records the content version used to render', () => {
		expect(buildContractContent(ALL_A, {}).contentVersion).toBe(1);
	});

	it('reflects the choice actually made, not the first option', () => {
		const reversed = Object.fromEntries(
			AXIS_KEYS.map((axis) => [axis, getPair(axis).b.value])
		) as Record<AxisKey, ChoiceValue>;
		const content = buildContractContent(reversed, {});
		for (const commitment of content.brief.commitments) {
			expect(commitment.word).toBe(resolveChoice(commitment.axis, reversed[commitment.axis]).chosen.word);
		}
	});
});
