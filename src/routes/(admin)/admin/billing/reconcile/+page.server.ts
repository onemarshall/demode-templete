import { error, fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { auth } from '#lib/modules/auth/server/config.js';
import { isAdminUser } from '#lib/modules/auth/server/auth-helpers.js';
import { reconcileExternalInvoice } from '#lib/modules/billing/server/reconciliation.js';

async function requireAdmin(request: Request) {
	const session = await auth.api.getSession({ headers: request.headers });
	if (!session?.user || !isAdminUser(session.user)) error(403, 'Admin access required');
	return session.user;
}

export const load: PageServerLoad = async ({ request }) => {
	await requireAdmin(request);
	return {};
};

export const actions: Actions = {
	default: async ({ request }) => {
		const user = await requireAdmin(request);
		const form = await request.formData();
		const purchaseId = String(form.get('purchaseId') ?? '').trim();
		const reference = String(form.get('reference') ?? '').trim();
		const notes = String(form.get('notes') ?? '').trim();
		if (!purchaseId || !reference)
			return fail(400, {
				message: 'A purchase id and a verified payment reference are required.'
			});
		try {
			const result = await reconcileExternalInvoice({
				purchaseId,
				reference,
				reconciledBy: user.id,
				notes
			});
			return {
				ok: true,
				message:
					result.status === 'already_activated'
						? 'This purchase is already activated. Nothing changed.'
						: `Activated. Entitlement ${result.entitlementId} granted.`
			};
		} catch (cause) {
			return fail(400, {
				message: cause instanceof Error ? cause.message : 'Reconciliation failed.'
			});
		}
	}
};
