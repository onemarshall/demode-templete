/**
 * Visual Contract — browser-safe contracts (Solo V1).
 *
 * These values describe the product's content and shape. They never confer
 * access; access is decided server-side from a `DraftActor` (see server/).
 */

/** The six pairs, in the order the client sees them. Card N of 6 follows this order. */
export const AXIS_KEYS = [
	'warm_cool',
	'spacious_full',
	'calm_energetic',
	'restrained_expressive',
	'clean_raw',
	'focused_layered'
] as const;

export type AxisKey = (typeof AXIS_KEYS)[number];

export const CHOICE_VALUES = [
	'warm',
	'cool',
	'spacious',
	'full',
	'calm',
	'energetic',
	'restrained',
	'expressive',
	'clean',
	'raw',
	'focused',
	'layered'
] as const;

export type ChoiceValue = (typeof CHOICE_VALUES)[number];

/** One side of a selection card: the word, its always-visible gloss, and the optional reveal. */
export interface PairOption {
	readonly value: ChoiceValue;
	readonly word: string;
	/** 4-7 words, plain language. Always visible. */
	readonly gloss: string;
	/** One sentence describing felt experience. Shown on reveal, never hover-only. */
	readonly reveal: string;
}

export interface PairDefinition {
	readonly axis: AxisKey;
	/** 1-based position in the flow. */
	readonly index: number;
	readonly a: PairOption;
	readonly b: PairOption;
}

/**
 * The deep evaluation language for one chosen word.
 *
 * Generated from the canonical pair specifications — see content/v1.ts.
 */
export interface EvaluationCopy {
	readonly word: string;
	/** One sentence stating what the choice means. Used in the Brief. */
	readonly coreMeaning: string;
	readonly evaluationQuestion: string;
	readonly meeting: readonly string[];
	readonly notEnough: readonly string[];
	readonly tooFar: readonly string[];
	readonly unsure: readonly string[];
}

/** Optional project context. Every field is skippable. */
export interface ProjectContext {
	projectName?: string;
	clientName?: string;
	projectType?: string;
	industry?: string;
	description?: string;
}

export const PROJECT_CONTEXT_LIMITS = {
	projectName: 120,
	clientName: 120,
	projectType: 80,
	industry: 80,
	description: 600
} as const;

export type ContractChoices = Partial<Record<AxisKey, ChoiceValue>>;
export type CompleteChoices = Record<AxisKey, ChoiceValue>;

export const DRAFT_STATUSES = ['draft', 'confirmed', 'generated'] as const;
export type DraftStatus = (typeof DRAFT_STATUSES)[number];

/** Where the client is in the flow. Mirrors the state machine in the implementation spec §10. */
export const FLOW_STEPS = ['context', 'choose', 'confirm', 'review', 'generated'] as const;
export type FlowStep = (typeof FLOW_STEPS)[number];
