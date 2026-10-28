import { fail, isRedirect } from '@sveltejs/kit';
import type { Actions } from './$types';
import { startGuestDraft } from '#lib/modules/visual-contract/server/flow.js';

export const actions: Actions = {
	default: async (event) => {
		try {
			return await startGuestDraft(event, '/visual-contract');
		} catch (cause) {
			// startGuestDraft redirects on success; anything else is a real failure.
			if (isRedirect(cause)) throw cause;
			console.error('[visual-contract] could not start a draft', cause);
			return fail(500, { message: 'We could not start a Visual Contract. Please try again.' });
		}
	}
};
