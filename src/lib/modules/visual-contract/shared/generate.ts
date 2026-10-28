/**
 * Visual Contract — deterministic generation.
 *
 * Fixed templates over the recorded choices. No model runs here, and no
 * sentence may introduce a commitment the client did not choose. Every field
 * below traces either to a selected word or to user-supplied context.
 */

import { AXIS_KEYS, type AxisKey, type CompleteChoices, type ProjectContext } from './types.js';
import { resolveChoice } from './pairs.js';
import { evaluationFor, VISUAL_CONTRACT_CONTENT_VERSION } from './content/index.js';
import {
	BEFORE_MEETING,
	COMPANION_RATIONALE,
	CONTRACT_STATEMENT,
	MEETING_USE,
	REVIEW_METHOD,
	REVIEW_SEQUENCE,
	REVIEW_STANDARD,
	applicationViews,
	plainLanguageSummary
} from './content/templates.js';

export interface Commitment {
	axis: AxisKey;
	word: string;
	otherWord: string;
	gloss: string;
	meaning: string;
	/** `Warm should lead over Cool when they conflict.` */
	statement: string;
}

export interface ReviewPrompt extends Commitment {
	question: string;
	meeting: readonly string[];
	notEnough: readonly string[];
	tooFar: readonly string[];
	unsure: readonly string[];
}

export interface ContractContent {
	contentVersion: number;
	brief: {
		statement: string;
		commitments: readonly Commitment[];
		combinedDirection: string;
		plainLanguage: string;
		reviewStandard: string;
	};
	companion: {
		rationale: string;
		beforeMeeting: readonly string[];
		reviewSequence: readonly { title: string; guidance: string }[];
		applicationViews: readonly string[];
		reviewMethod: readonly string[];
		commitments: readonly ReviewPrompt[];
		meetingUse: readonly string[];
	};
}

function combinedDirection(glosses: readonly string[]): string {
	return `Taken together, the work should read as ${glosses.join('; ')}. Where a pair conflicts, the chosen quality leads.`;
}

export function buildCommitments(choices: CompleteChoices): Commitment[] {
	return AXIS_KEYS.map((axis) => {
		const { chosen, other } = resolveChoice(axis, choices[axis]);
		const copy = evaluationFor(axis, chosen.value);
		return {
			axis,
			word: chosen.word,
			otherWord: other.word,
			gloss: chosen.gloss,
			meaning: copy.coreMeaning,
			statement: `${chosen.word} should lead over ${other.word} when they conflict.`
		};
	});
}

export function buildReviewPrompts(choices: CompleteChoices): ReviewPrompt[] {
	return buildCommitments(choices).map((commitment) => {
		const copy = evaluationFor(commitment.axis, choices[commitment.axis]);
		return {
			...commitment,
			question: copy.evaluationQuestion,
			meeting: copy.meeting,
			notEnough: copy.notEnough,
			tooFar: copy.tooFar,
			unsure: copy.unsure
		};
	});
}

export function buildContractContent(choices: CompleteChoices, context: ProjectContext): ContractContent {
	const commitments = buildCommitments(choices);
	const glosses = commitments.map((commitment) => commitment.gloss);
	return {
		contentVersion: VISUAL_CONTRACT_CONTENT_VERSION,
		brief: {
			statement: CONTRACT_STATEMENT,
			commitments,
			combinedDirection: combinedDirection(glosses),
			plainLanguage: plainLanguageSummary(glosses),
			reviewStandard: REVIEW_STANDARD
		},
		companion: {
			rationale: COMPANION_RATIONALE,
			beforeMeeting: BEFORE_MEETING,
			reviewSequence: REVIEW_SEQUENCE,
			applicationViews: applicationViews(context.projectType),
			reviewMethod: REVIEW_METHOD,
			commitments: buildReviewPrompts(choices),
			meetingUse: MEETING_USE
		}
	};
}
