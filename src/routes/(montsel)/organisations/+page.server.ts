import { redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { requireTenancySession, formText, actionFailure } from '#lib/server/workspace/request.js';
import { listSwitcherContext, getWorkspacePreference } from '#lib/server/workspace/resolution.js';
import { organizationApi } from '#lib/server/workspace/organization-api.js';
import { ensurePersonalOrganisation } from '#lib/server/workspace/onboarding.js';
import { createWorkspace } from '#lib/server/workspace/workspaces.js';
export const load: PageServerLoad = async (event) => {
	const { user } = await requireTenancySession(event);
	return { organisations: await listSwitcherContext(user.id), preference: await getWorkspacePreference(user.id) };
};
export const actions: Actions = {
	personal: async (event) => {
		const { user } = await requireTenancySession(event);
		try { await ensurePersonalOrganisation({ userId: user.id, name: user.name, email: user.email }); }
		catch (cause) { return actionFailure(cause); }
		redirect(303, '/organisations');
	},
	create: async (event) => {
		const { user } = await requireTenancySession(event);
		let slug: string;
		try {
			const form = await event.request.formData();
			slug = formText(form, 'slug', 48);
			if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) return { message: 'Use lowercase letters, numbers and hyphens for the address.' };
			const org = await organizationApi().createOrganization({ headers: event.request.headers, body: { name: formText(form, 'name', 120), slug } });
			if (!org) throw new Error('Organisation creation failed');
			// If workspace setup fails the retained organisation is recoverable in settings.
			await createWorkspace({ userId: user.id, organisationId: org.id, name: 'Main', slug: 'main' });
		} catch (cause) { return actionFailure(cause); }
		redirect(303, `/o/${encodeURIComponent(slug)}/w/main`);
	}
};
