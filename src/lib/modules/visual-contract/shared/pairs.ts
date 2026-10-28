/**
 * Visual Contract — the six pairs and their selection-card copy.
 *
 * Copy is versioned product content, not a component literal. Source:
 *   docs/methodology/specs/selection-card-spec.md  ("Approved Short Copy")
 *
 * Naming invariant: the framework axis is Spacious/Dense. Every client-facing
 * surface says `Full`. Do not change `Full` back to `Dense` here.
 *
 * Changing any string is a content change: bump the version in content/index.ts
 * so stored contract versions keep pointing at the copy they were rendered with.
 */

import type { AxisKey, ChoiceValue, PairDefinition, PairOption } from './types.js';

const option = (value: ChoiceValue, word: string, gloss: string, reveal: string): PairOption => ({
	value,
	word,
	gloss,
	reveal
});

export const PAIRS: readonly PairDefinition[] = [
	{
		axis: 'warm_cool',
		index: 1,
		a: option('warm', 'Warm', 'More human and welcoming', 'Feels closer, more relational, and more inviting.'),
		b: option('cool', 'Cool', 'More formal and composed', 'Feels more measured, precise, and less personally close.')
	},
	{
		axis: 'spacious_full',
		index: 2,
		a: option('spacious', 'Spacious', 'More room to breathe', 'Feels open, calm, and uncongested.'),
		b: option('full', 'Full', 'More to take in', 'Feels rich with content, detail, or several things to explore.')
	},
	{
		axis: 'calm_energetic',
		index: 3,
		a: option('calm', 'Calm', 'More still and steady', 'Feels quiet, grounded, and not in a rush.'),
		b: option('energetic', 'Energetic', 'More active and vivid', 'Feels more lively, dynamic, and full of movement.')
	},
	{
		axis: 'restrained_expressive',
		index: 4,
		a: option(
			'restrained',
			'Restrained',
			'Quieter and more controlled',
			'Uses character selectively and does not need to make a loud statement.'
		),
		b: option(
			'expressive',
			'Expressive',
			'More visible character',
			'Shows a stronger personality and is willing to make a statement.'
		)
	},
	{
		axis: 'clean_raw',
		index: 5,
		a: option('clean', 'Clean', 'More polished and resolved', 'Feels refined, finished, and carefully brought together.'),
		b: option('raw', 'Raw', 'More textured and immediate', 'Lets texture, material, or signs of making remain visible.')
	},
	{
		axis: 'focused_layered',
		index: 6,
		a: option('focused', 'Focused', 'One clear thing leads', 'Feels singular, directed, and organized around one main point.'),
		b: option('layered', 'Layered', 'Several ideas work together', 'Offers more than one thing to notice, connect, or explore.')
	}
];

const BY_AXIS = new Map(PAIRS.map((pair) => [pair.axis, pair]));

export function getPair(axis: AxisKey): PairDefinition {
	const pair = BY_AXIS.get(axis);
	if (!pair) throw new Error(`Unknown Visual Contract axis: ${axis}`);
	return pair;
}

/** The option the client chose, and the counterpart they did not. */
export function resolveChoice(axis: AxisKey, value: ChoiceValue): { chosen: PairOption; other: PairOption } {
	const pair = getPair(axis);
	const chosen = pair.a.value === value ? pair.a : pair.b;
	const other = pair.a.value === value ? pair.b : pair.a;
	return { chosen, other };
}

/** The axis a value belongs to, or null when the value is not a real commitment. */
export function axisOfValue(value: string): AxisKey | null {
	for (const pair of PAIRS) {
		if (pair.a.value === value || pair.b.value === value) return pair.axis;
	}
	return null;
}

export function isValueForAxis(axis: AxisKey, value: string): value is ChoiceValue {
	const pair = getPair(axis);
	return pair.a.value === value || pair.b.value === value;
}
