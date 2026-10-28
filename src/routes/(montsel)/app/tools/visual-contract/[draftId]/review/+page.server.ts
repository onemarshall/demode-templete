import { error, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { brandActor } from '#lib/modules/visual-contract/server/access.js';
import { loadDraft } from '#lib/modules/visual-contract/server/repository.js';
import { submitGeneration } from '#lib/modules/visual-contract/server/flow.js';
import { safeParseCompleteChoices } from '#lib/modules/visual-contract/shared/choices.js';
import { buildReviewPrompts } from '#lib/modules/visual-contract/shared/generate.js';

const BASE = '/app/tools/visual-contract';

export const load: PageServerLoad = async (event) => {
	const actor = await brandActor(event);
	const draft = await loadDraft(actor, event.params.draftId);
	if (!draft) error(404, 'This Visual Contract is not available.');

	const choices = safeParseCompleteChoices(draft.choices);
	if (!choices) redirect(303, `${BASE}/${draft.id}/confirm`);

	return { draftId: draft.id, prompts: buildReviewPrompts(choices) };
};

export const actions: Actions = {
	default: async (event) => {
		const actor = await brandActor(event);
		return submitGeneration(actor, event.params.draftId, BASE);
	}
};
