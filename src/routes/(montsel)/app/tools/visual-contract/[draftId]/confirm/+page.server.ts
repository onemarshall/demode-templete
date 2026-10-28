import { error, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { brandActor } from '#lib/modules/visual-contract/server/access.js';
import { loadDraft } from '#lib/modules/visual-contract/server/repository.js';
import { submitConfirmation } from '#lib/modules/visual-contract/server/flow.js';
import { safeParseCompleteChoices } from '#lib/modules/visual-contract/shared/choices.js';
import { AXIS_KEYS } from '#lib/modules/visual-contract/shared/types.js';
import { PAIRS } from '#lib/modules/visual-contract/shared/pairs.js';

const BASE = '/app/tools/visual-contract';

export const load: PageServerLoad = async (event) => {
	const actor = await brandActor(event);
	const draft = await loadDraft(actor, event.params.draftId);
	if (!draft) error(404, 'This Visual Contract is not available.');

	const choices = safeParseCompleteChoices(draft.choices);
	if (!choices) {
		const missing = AXIS_KEYS.find((axis) => !draft.choices[axis]);
		const index = PAIRS.find((pair) => pair.axis === missing)?.index ?? 1;
		redirect(303, `${BASE}/${draft.id}/choose/${index}`);
	}

	return { draftId: draft.id, choices };
};

export const actions: Actions = {
	default: async (event) => {
		const actor = await brandActor(event);
		return submitConfirmation(actor, event.params.draftId, BASE);
	}
};
