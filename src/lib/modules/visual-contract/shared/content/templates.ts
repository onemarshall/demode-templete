/**
 * Visual Contract — connective template copy.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * STATUS: DRAFT — PENDING PRODUCT SIGN-OFF
 *
 * Everything in this file is authored connective prose. It is the only copy in
 * the product that does not come from a canonical source document. The output
 * spec describes what each block must do but does not supply the words.
 *
 * Canonical copy lives in:
 *   - shared/pairs.ts        (selection cards, from selection-card-spec.md)
 *   - shared/content/v1.ts   (evaluation language, from pair-*.md)
 *
 * Every sentence here must trace to a selected commitment or to user-supplied
 * context. It must not introduce a new commitment, a quality judgement, a
 * score, or a claim about outcomes. Replace freely; keep the same shape.
 * ─────────────────────────────────────────────────────────────────────────────
 */

/** Brief §2 — framing for the recorded commitments. */
export const CONTRACT_STATEMENT =
	'This section records the visual commitments made for this project. ' +
	'They are the basis for briefing, presenting and reviewing the design work. ' +
	'If a trade-off arises, the chosen quality leads.';

/** Brief §5 — first-person summary. Kept to three sentences. */
export function plainLanguageSummary(glosses: readonly string[]): string {
	const lead = glosses.slice(0, 3).join(', ');
	const tail = glosses.slice(3).join(', ');
	return (
		`When the design comes back, I want to see ${lead}, with ${tail}. ` +
		'If the two qualities in a pair conflict, I want the one I chose to lead. ' +
		'I will use these six commitments to review the work.'
	);
}

/** Brief §6 — how the contract is used in review. */
export const REVIEW_STANDARD =
	'Review the work against these six commitments rather than against personal taste. ' +
	'Name where the work meets a commitment and where it does not. ' +
	'The aim is to keep the direction steady, not to direct the designer’s solution.';

/** Companion §2 — why the companion exists. */
export const COMPANION_RATIONALE =
	'This guide is for reviewing design work, not for controlling the designer’s creativity. ' +
	'It helps you connect your feedback to the six commitments you already made, ' +
	'so that a reaction can be named rather than guessed at.';

/** Companion §3 — preparation. Derived from the output spec's preparation block. */
export const BEFORE_MEETING: readonly string[] = [
	'Read the six commitments before you open the work.',
	'Look at the work in the context and on the device it will be seen in.',
	'Write your first reaction before working out why you had it.',
	'Keep the six commitments visible while you review.'
];

/** Companion §4 — review sequence. The four stages come from the output spec. */
export const REVIEW_SEQUENCE: readonly { title: string; guidance: string }[] = [
	{
		title: 'Structure',
		guidance: 'Start with the arrangement. What leads, what follows, and is that order clear?'
	},
	{
		title: 'Form',
		guidance: 'Then shape, type and imagery. Do they carry the qualities you chose?'
	},
	{
		title: 'Colour',
		guidance: 'Then colour and material. Do they support the direction or pull against it?'
	},
	{
		title: 'Real-world context',
		guidance: 'Finally, look at the work where it will actually be seen, at the size it will be seen.'
	}
];

/** Companion §6 — review method. Derived from the output spec's review-method block. */
export const REVIEW_METHOD: readonly string[] = [
	'Start with your overall reaction.',
	'Evaluate against the commitments, not against mood or taste.',
	'Name both what is working and what is not working.',
	'Ask questions rather than prescribing fixes.',
	'Keep feedback at the level of the commitment wherever you can.'
];

/** Companion §8 — how to run the meeting. Derived from the output spec. */
export const MEETING_USE: readonly string[] = [
	'Start with what is working.',
	'Then move to what is not landing.',
	'Keep the feedback anchored to the contract.',
	'Confirm what will change and what should stay protected.',
	'Agree the next actions before the meeting ends.'
];

const UNIVERSAL_VIEWS: readonly string[] = [
	'The main screen or page',
	'A mobile view of the same screen',
	'The work at the size it will usually be seen'
];

/**
 * Companion §5 — what to ask to see.
 *
 * The output spec lists example views and asks for project-type awareness with
 * a universal fallback when context is missing. This is a keyword match, not a
 * classification: anything unmatched gets the universal list.
 */
const VIEWS_BY_PROJECT_TYPE: readonly { match: readonly string[]; views: readonly string[] }[] = [
	{
		match: ['brand', 'identity', 'logo', 'rebrand'],
		views: ['The main screen or page', 'The mark in use', 'A mobile view', 'A document or stationery item']
	},
	{
		match: ['packaging', 'product'],
		views: ['Packaging in context', 'The label at shelf distance', 'A detail view']
	},
	{
		match: ['website', 'digital', 'app', 'software', 'platform'],
		views: ['The key screen', 'A mobile view', 'One empty or error state', 'A content-heavy page']
	},
	{
		match: ['print', 'document', 'report', 'editorial', 'book'],
		views: ['A spread as it will be read', 'A detail view', 'A mobile or screen version if one exists']
	},
	{
		match: ['signage', 'environment', 'retail', 'space'],
		views: ['The work at the distance people approach it', 'The work close up', 'The surroundings it will sit in']
	}
];

export function applicationViews(projectType?: string): readonly string[] {
	if (!projectType) return UNIVERSAL_VIEWS;
	const needle = projectType.toLowerCase();
	const matched = VIEWS_BY_PROJECT_TYPE.find((entry) =>
		entry.match.some((keyword) => needle.includes(keyword))
	);
	return matched?.views ?? UNIVERSAL_VIEWS;
}
