/**
 * Visual Contract — content access.
 *
 * `EVALUATION_COPY` is generated from the canonical pair specifications.
 * Do not edit the generated file; regenerate it from the pair specs instead.
 */

import { EVALUATION_COPY_V1, VISUAL_CONTRACT_CONTENT_VERSION } from './v1.js';
import type { AxisKey, ChoiceValue, EvaluationCopy } from '../types.js';

export { VISUAL_CONTRACT_CONTENT_VERSION };

const BY_AXIS = EVALUATION_COPY_V1 as unknown as Record<string, Record<string, EvaluationCopy>>;

/**
 * The canonical evaluation language for one recorded commitment.
 *
 * Throws rather than falling back to a default: a missing entry means the
 * content module and the pair definitions have drifted apart, and rendering
 * invented copy is worse than failing loudly.
 */
export function evaluationFor(axis: AxisKey, value: ChoiceValue): EvaluationCopy {
	const copy = BY_AXIS[axis]?.[value];
	if (!copy) throw new Error(`No evaluation copy for ${axis}/${value}`);
	return copy;
}
