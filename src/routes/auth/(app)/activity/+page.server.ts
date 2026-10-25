import { redirect } from '@sveltejs/kit';
import { auth } from '#lib/modules/auth/server/config.js';
import { encodeHistoryCursor, listOwnHistory } from '#lib/modules/auth/server/history.js';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ request, url }) => {
	const session = await auth.api.getSession({ headers: request.headers });
	if (!session?.user) throw redirect(302, '/auth/sign-in');
	const before = url.searchParams.get('before') ?? undefined;
	try {
		const history = await listOwnHistory(session.user.id, before);
		return { history, available: true, next: history.length === 50 ? encodeHistoryCursor(history[history.length - 1]!) : null };
	} catch {
		// Keep storage failure distinct from a real account with no recorded activity.
		return { history: [], available: false };
	}
};
