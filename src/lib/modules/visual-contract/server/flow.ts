/**
 * Visual Contract — flow transitions.
 *
 * Both route trees call these. Each function receives the `base` path of its own
 * tree, so the redirect targets differ while the rules stay identical.
 *
 * The state machine is: new → optional_context → choosing_1…6 → confirm →
 * review_use → generated. Back navigation never discards a recorded choice
 * because every transition writes before it redirects.
 */

import { fail, redirect, type RequestEvent } from '@sveltejs/kit';
import { choiceSchema, parseProjectContext } from '../shared/choices.js';
import { PAIRS } from '../shared/pairs.js';
import { AXIS_KEYS, type ContractChoices } from '../shared/types.js';
import { safeParseCompleteChoices } from '../shared/choices.js';
import {
	createBrandDraft,
	createGuestDraft,
	generateContract,
	loadDraft,
	saveChoice,
	saveProjectContext,
	setStep
} from './repository.js';
import { brandActor } from './access.js';
import { setGuestCookie, type DraftActor } from './actor.js';

export const pairByIndex = (index: number) => PAIRS.find((pair) => pair.index === index) ?? null;

export const paths = (base: string, draftId: string) => ({
	context: `${base}/${draftId}/context`,
	choose: (index: number) => `${base}/${draftId}/choose/${index}`,
	confirm: `${base}/${draftId}/confirm`,
	review: `${base}/${draftId}/review`,
	generated: `${base}/${draftId}/generated`
});

/** Where the client should be sent when reopening a draft. */
export function resumePath(
	base: string,
	draftId: string,
	choices: ContractChoices,
	generated: boolean
): string {
	if (generated) return paths(base, draftId).generated;
	const next = AXIS_KEYS.find((axis) => !choices[axis]);
	return next
		? paths(base, draftId).choose(PAIRS.find((pair) => pair.axis === next)!.index)
		: paths(base, draftId).confirm;
}

export async function startBrandDraft(event: RequestEvent, base: string): Promise<never> {
	const actor = await brandActor(event);
	const draft = await createBrandDraft(actor);
	redirect(303, paths(base, draft.id).context);
}

export async function startGuestDraft(event: RequestEvent, base: string): Promise<never> {
	const { draft, token } = await createGuestDraft();
	setGuestCookie(event.cookies, token, new Date(draft.guestExpiresAt ?? Date.now() + 86_400_000));
	redirect(303, paths(base, draft.id).context);
}

export async function submitContext(
	event: RequestEvent,
	actor: DraftActor,
	draftId: string,
	base: string
): Promise<never> {
	const form = await event.request.formData();
	await saveProjectContext(actor, draftId, parseProjectContext(form));
	redirect(303, paths(base, draftId).choose(1));
}

export async function submitChoice(
	event: RequestEvent,
	actor: DraftActor,
	draftId: string,
	base: string,
	index: number
) {
	const pair = pairByIndex(index);
	if (!pair) return fail(404, { message: 'That card does not exist.' });

	const form = await event.request.formData();
	const parsed = choiceSchema.safeParse({ axis: pair.axis, value: form.get('value') });
	if (!parsed.success) return fail(400, { message: 'Choose one of the two options to continue.' });

	const saved = await saveChoice(actor, draftId, parsed.data.axis, parsed.data.value);
	if (!saved) return fail(404, { message: 'This draft is not available.' });

	// Editing one pair from the confirmation screen returns there, with the other
	// five choices untouched, instead of pushing the client through later cards.
	if (form.get('return') === 'confirm') redirect(303, paths(base, draftId).confirm);

	const next = index < PAIRS.length ? paths(base, draftId).choose(index + 1) : paths(base, draftId).confirm;
	redirect(303, next);
}

export async function submitConfirmation(actor: DraftActor, draftId: string, base: string): Promise<never> {
	const draft = await loadDraft(actor, draftId);
	if (!draft) redirect(303, base);
	if (!safeParseCompleteChoices(draft.choices)) redirect(303, paths(base, draftId).confirm);

	await setStep(actor, draftId, 'review', 'confirmed');
	redirect(303, paths(base, draftId).review);
}

export async function submitGeneration(actor: DraftActor, draftId: string, base: string) {
	const result = await generateContract(actor, draftId);
	if (!result) return fail(404, { message: 'This draft is not available.' });
	redirect(303, paths(base, draftId).generated);
}
