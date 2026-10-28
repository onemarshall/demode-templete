import { error } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { guestActor } from '#lib/modules/visual-contract/server/access.js';
import { loadDraft } from '#lib/modules/visual-contract/server/repository.js';
import { submitContext } from '#lib/modules/visual-contract/server/flow.js';

const BASE = '/visual-contract';

export const load: PageServerLoad = async (event) => {
	const actor = await guestActor(event);
	const draft = await loadDraft(actor, event.params.draftId);
	if (!draft) error(404, 'This draft is not available in this browser.');
	return { draft };
};

export const actions: Actions = {
	default: async (event) => {
		const actor = await guestActor(event);
		return submitContext(event, actor, event.params.draftId, BASE);
	}
};
