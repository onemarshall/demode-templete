import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { guestActor } from '#lib/modules/visual-contract/server/access.js';
import { readGuestCookie } from '#lib/modules/visual-contract/server/actor.js';
import { setReturnTo } from '#lib/modules/auth/shared/return-to.js';
import { loadDraft, loadGeneratedVersion } from '#lib/modules/visual-contract/server/repository.js';

export const load: PageServerLoad = async (event) => {
	const actor = await guestActor(event);
	const draft = await loadDraft(actor, event.params.draftId);
	if (!draft) error(404, 'This draft is not available in this browser.');

	const version = await loadGeneratedVersion(actor, draft.id);
	if (!version) error(404, 'This contract has not been generated yet.');

	const token = readGuestCookie(event.cookies);
	const claimable = Boolean(version.expiresAt);

	// Remember where to come back to. Signing up requires email verification,
	// which lands on sign-in with no query string, so a cookie carries the intent.
	if (claimable) setReturnTo(event.cookies, `/visual-contract/${draft.id}/claim`);

	return {
		publicId: version.publicId,
		publicUrl: `${event.url.origin}/contract/${version.publicId}`,
		saveUrl: token ? `${event.url.origin}/visual-contract/resume/${token}` : null,
		content: version.rendered,
		context: version.projectContext,
		confirmedAt: version.confirmedAt,
		// An expiring contract can still be claimed. A permanent one cannot.
		claim: claimable
			? {
					href: `/visual-contract/${draft.id}/claim`,
					expiresAt: version.expiresAt,
					signedIn: Boolean(event.locals.auth?.user)
				}
			: null
	};
};
