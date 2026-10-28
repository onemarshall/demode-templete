import { error } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { brandActor } from '#lib/modules/visual-contract/server/access.js';
import { loadDraft } from '#lib/modules/visual-contract/server/repository.js';
import { pairByIndex, submitChoice } from '#lib/modules/visual-contract/server/flow.js';
import { PAIRS } from '#lib/modules/visual-contract/shared/pairs.js';

const BASE = '/app/tools/visual-contract';

export const load: PageServerLoad = async (event) => {
	const index = Number(event.params.pair);
	const pair = pairByIndex(index);
	if (!pair) error(404, 'That card does not exist.');

	const actor = await brandActor(event);
	const draft = await loadDraft(actor, event.params.draftId);
	if (!draft) error(404, 'This Visual Contract is not available.');

	const returnTo = event.url.searchParams.get('return') === 'confirm';
	return {
		draftId: draft.id,
		pair,
		index,
		total: PAIRS.length,
		selected: draft.choices[pair.axis] ?? null,
		returnTo: returnTo ? 'confirm' : null,
		backHref: returnTo
			? `${BASE}/${draft.id}/confirm`
			: index > 1
				? `${BASE}/${draft.id}/choose/${index - 1}`
				: `${BASE}/${draft.id}/context`
	};
};

export const actions: Actions = {
	default: async (event) => {
		const actor = await brandActor(event);
		return submitChoice(event, actor, event.params.draftId, BASE, Number(event.params.pair));
	}
};
