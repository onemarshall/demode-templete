import { error, fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { auth } from '#lib/modules/auth/server/config.js';
import { isAdminUser } from '#lib/modules/auth/server/auth-helpers.js';
import {
	createConsultantGrant,
	findUserIdByEmail,
	listAllConsultantGrants,
	revokeConsultantGrant,
	type ConsultantRole
} from '#lib/modules/diagnostic/server/consultant.js';

async function requireAdmin(request: Request) {
	const session = await auth.api.getSession({ headers: request.headers });
	if (!session?.user || !isAdminUser(session.user)) error(403, 'Admin access required');
	return session.user;
}

export const load: PageServerLoad = async ({ request }) => {
	await requireAdmin(request);
	return { grants: await listAllConsultantGrants() };
};

export const actions: Actions = {
	grant: async ({ request }) => {
		const user = await requireAdmin(request);
		const form = await request.formData();
		const email = String(form.get('email') ?? '').trim();
		const engagementId = String(form.get('engagementId') ?? '').trim();
		const role = String(form.get('role') ?? 'reviewer') as ConsultantRole;
		const expiresAt = String(form.get('expiresAt') ?? '').trim() || null;
		if (!email || !engagementId)
			return fail(400, { message: 'A user email and an engagement id are required.' });
		const userId = await findUserIdByEmail(email);
		if (!userId) return fail(400, { message: 'No user has that email address.' });
		try {
			await createConsultantGrant({
				userId,
				engagementId,
				role,
				grantedBy: user.id,
				expiresAt
			});
			return { ok: true, message: 'Consultant grant recorded.' };
		} catch (cause) {
			return fail(400, {
				message: cause instanceof Error ? cause.message : 'The grant could not be recorded.'
			});
		}
	},

	revoke: async ({ request }) => {
		const user = await requireAdmin(request);
		const form = await request.formData();
		const grantId = String(form.get('grantId') ?? '').trim();
		if (!grantId) return fail(400, { message: 'Grant id is required.' });
		try {
			await revokeConsultantGrant(grantId, user.id);
			return { ok: true, message: 'Grant revoked.' };
		} catch (cause) {
			return fail(400, {
				message: cause instanceof Error ? cause.message : 'The grant could not be revoked.'
			});
		}
	}
};
