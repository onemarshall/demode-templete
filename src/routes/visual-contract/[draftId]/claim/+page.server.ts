import { error, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { hashGuestToken, readGuestCookie, clearGuestCookie } from '#lib/modules/visual-contract/server/actor.js';
import { clearReturnTo } from '#lib/modules/auth/shared/return-to.js';
import {
	claimDraft,
	loadDraft,
	loadGeneratedVersion
} from '#lib/modules/visual-contract/server/repository.js';
import { listSwitcherContext } from '#lib/modules/tenancy/server/resolution.js';
import { requireBrandAccess } from '#lib/modules/tenancy/server/context.js';
import { isBrandAccessError } from '#lib/modules/tenancy/server/errors.js';

const APP_BASE = '/app/tools/visual-contract';
const CLAIM_PATH = (draftId: string) => `/visual-contract/${draftId}/claim`;

const NO_BROWSER_MESSAGE =
	'Open this page in the browser you created the contract in, or use the save link you kept.';

export const load: PageServerLoad = async (event) => {
	const user = event.locals.auth?.user;
	if (!user) {
		redirect(303, `/auth/sign-in?redirectTo=${encodeURIComponent(CLAIM_PATH(event.params.draftId))}`);
	}

	const token = readGuestCookie(event.cookies);
	if (!token) error(404, NO_BROWSER_MESSAGE);

	const actor = { kind: 'guest' as const, tokenHash: await hashGuestToken(token) };
	const draft = await loadDraft(actor, event.params.draftId);
	if (!draft) error(404, NO_BROWSER_MESSAGE);

	// Already owned: send them to the workspace copy rather than claiming twice.
	if (draft.ownerUserId) redirect(303, `${APP_BASE}/${draft.id}/generated`);

	const version = await loadGeneratedVersion(actor, draft.id);
	const organisations = await listSwitcherContext(user.id);

	return {
		draftId: draft.id,
		publicId: version?.publicId ?? null,
		projectName: draft.projectContext.projectName?.trim() || 'Untitled contract',
		expiresAt: version?.expiresAt ?? null,
		brands: organisations.flatMap((organisation) =>
			organisation.brands.map((brand) => ({
				id: brand.brandId,
				name: brand.brandName,
				organisation: organisation.organisationName
			}))
		)
	};
};

export const actions: Actions = {
	default: async (event) => {
		const user = event.locals.auth?.user;
		if (!user) {
			redirect(303, `/auth/sign-in?redirectTo=${encodeURIComponent(CLAIM_PATH(event.params.draftId))}`);
		}

		const token = readGuestCookie(event.cookies);
		if (!token) error(404, NO_BROWSER_MESSAGE);

		const form = await event.request.formData();
		const requestedBrandId = String(form.get('brandId') ?? '').trim();

		let brand: { organisationId: string; brandId: string } | null = null;
		if (requestedBrandId) {
			try {
				const ctx = await requireBrandAccess(user.id, requestedBrandId, 'brand:read');
				brand = { organisationId: ctx.organisationId, brandId: ctx.brandId };
			} catch (cause) {
				if (isBrandAccessError(cause)) {
					error(403, 'You do not have access to that brand.');
				}
				throw cause;
			}
		}

		const claimed = await claimDraft({
			draftId: event.params.draftId,
			tokenHash: await hashGuestToken(token),
			userId: user.id,
			brand
		});
		if (!claimed) error(404, NO_BROWSER_MESSAGE);

		// The guest capability is spent: the account owns the contract now.
		clearGuestCookie(event.cookies);
		clearReturnTo(event.cookies);

		redirect(303, `${APP_BASE}/${claimed.id}/generated`);
	}
};
