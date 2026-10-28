/**
 * Visual Contract — boundary validation.
 *
 * Every choice that reaches the server passes through here. A value is valid
 * only when it is one of the two words belonging to that specific axis, so a
 * crafted form post cannot record `warm` against `clean_raw`.
 */

import { z } from 'zod';
import { AXIS_KEYS, PROJECT_CONTEXT_LIMITS, type AxisKey, type ChoiceValue, type ProjectContext } from './types.js';
import { isValueForAxis } from './pairs.js';

const axisKeySchema = z.enum(AXIS_KEYS);

/** One choice, checked against the axis it claims to belong to. */
export const choiceSchema = z
	.object({ axis: axisKeySchema, value: z.string() })
	.transform((input, ctx) => {
		if (!isValueForAxis(input.axis, input.value)) {
			ctx.addIssue({
				code: 'custom',
				message: `"${input.value}" is not a valid choice for ${input.axis}.`
			});
			return z.NEVER;
		}
		return { axis: input.axis, value: input.value as ChoiceValue };
	});

/** The full six-choice set. Confirmation and generation require this to parse. */
export const completeChoicesSchema = z
	.object(
		Object.fromEntries(AXIS_KEYS.map((axis) => [axis, z.string()])) as Record<AxisKey, z.ZodString>
	)
	.transform((input, ctx) => {
		const result = {} as Record<AxisKey, ChoiceValue>;
		for (const axis of AXIS_KEYS) {
			const value = input[axis];
			if (!isValueForAxis(axis, value)) {
				ctx.addIssue({ code: 'custom', message: `"${value}" is not a valid choice for ${axis}.` });
				return z.NEVER;
			}
			result[axis] = value as ChoiceValue;
		}
		return result;
	});

const optionalText = (max: number) =>
	z
		.string()
		.trim()
		.max(max)
		.optional()
		.transform((value) => (value ? value : undefined));

export const projectContextSchema = z
	.object({
		projectName: optionalText(PROJECT_CONTEXT_LIMITS.projectName),
		clientName: optionalText(PROJECT_CONTEXT_LIMITS.clientName),
		projectType: optionalText(PROJECT_CONTEXT_LIMITS.projectType),
		industry: optionalText(PROJECT_CONTEXT_LIMITS.industry),
		description: optionalText(PROJECT_CONTEXT_LIMITS.description)
	})
	.transform((value): ProjectContext => value);

/** Read project context from a submitted form, ignoring empty fields. */
export function parseProjectContext(form: FormData): ProjectContext {
	return projectContextSchema.parse({
		projectName: form.get('projectName') ?? undefined,
		clientName: form.get('clientName') ?? undefined,
		projectType: form.get('projectType') ?? undefined,
		industry: form.get('industry') ?? undefined,
		description: form.get('description') ?? undefined
	});
}

/** Parse stored JSON without trusting it. Returns null when the record is malformed. */
export function safeParseProjectContext(value: unknown): ProjectContext {
	const parsed = projectContextSchema.safeParse(value ?? {});
	return parsed.success ? parsed.data : {};
}

export function safeParseCompleteChoices(value: unknown): Record<AxisKey, ChoiceValue> | null {
	const parsed = completeChoicesSchema.safeParse(value);
	return parsed.success ? parsed.data : null;
}
