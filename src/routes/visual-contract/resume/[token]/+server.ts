import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { hashGuestToken, setGuestCookie } from '#lib/modules/visual-contract/server/actor.js';
import { findGuestDraft } from '#lib/modules/visual-contract/server/repository.js';
import { resumePath } from '#lib/modules/visual-contract/server/flow.js';

/**
 * Reopen a draft from a saved link.
 *
 * The token is a capability, so it is exchanged for the httpOnly cookie and
 * removed from the address bar by the redirect. This is an endpoint rather than
 * a page load because the response must carry `no-referrer`: a framework
 * redirect thrown from `load` does not keep headers set with `setHeaders`.
 */
export const GET: RequestHandler = async ({ params, cookies }) => {
	const tokenHash = await hashGuestToken(params.token);
	const draft = await findGuestDraft(tokenHash);
	if (!draft) error(404, 'This save link has expired or is not valid.');

	setGuestCookie(cookies, params.token, new Date(draft.guestExpiresAt ?? Date.now() + 86_400_000));

	return new Response(null, {
		status: 303,
		headers: {
			location: resumePath('/visual-contract', draft.id, draft.choices, draft.status === 'generated'),
			'referrer-policy': 'no-referrer',
			'cache-control': 'no-store'
		}
	});
};
