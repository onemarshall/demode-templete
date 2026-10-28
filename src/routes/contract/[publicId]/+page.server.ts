import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { loadPublicContract } from '#lib/modules/visual-contract/server/repository.js';

export const load: PageServerLoad = async ({ params, url, setHeaders }) => {
	const version = await loadPublicContract(params.publicId);
	// A missing id is a plain miss. It never reveals whether a draft exists.
	if (!version) error(404, 'This Visual Contract is not available.');

	if (version.expiresAt && new Date(version.expiresAt) <= new Date()) {
		error(410, 'This Visual Contract link has expired.');
	}

	// The link is shareable; keep the reference out of any onward request.
	setHeaders({ 'referrer-policy': 'no-referrer' });

	return {
		publicId: version.publicId,
		publicUrl: `${url.origin}/contract/${version.publicId}`,
		content: version.rendered,
		context: version.projectContext,
		confirmedAt: version.confirmedAt,
		expiresAt: version.expiresAt
	};
};
