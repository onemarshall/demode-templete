import { error } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { brandActor } from '#lib/modules/visual-contract/server/access.js';
import { loadDraft } from '#lib/modules/visual-contract/server/repository.js';
import { submitContext } from '#lib/modules/visual-contract/server/flow.js';

const BASE = '/app/tools/visual-contract';

export const load: PageServerLoad = async (event) => {
	const actor = await brandActor(event);
	const draft = await loadDraft(actor, event.params.draftId);
	if (!draft) error(404, 'This Visual Contract is not available.');
	return { draft, base: BASE };
};

export const actions: Actions = {
	default: async (event) => {
		const actor = await brandActor(event);
		return submitContext(event, actor, event.params.draftId, BASE);
	}
};
