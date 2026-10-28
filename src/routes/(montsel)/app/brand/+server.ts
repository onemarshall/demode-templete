import { error, redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { activateBrand } from '#lib/modules/products/server/brand-context.js';
import { isBrandAccessError } from '#lib/modules/tenancy/server/errors.js';

/** Only same-app paths are accepted as a return target (no open redirect). */
function returnPath(value: FormDataEntryValue | null): string {
	if (typeof value !== 'string') return '/app';
	if (!value.startsWith('/app') || value.startsWith('//')) return '/app';
	return value;
}

export const POST: RequestHandler = async (event) => {
	const form = await event.request.formData();
	const brandId = form.get('brandId');
	if (typeof brandId !== 'string' || !brandId) error(400, 'Choose a brand.');
	const next = returnPath(form.get('next'));

	try {
		await activateBrand(event, brandId);
	} catch (cause) {
		// A brand the user cannot access is a miss, never a disclosure.
		if (isBrandAccessError(cause)) error(404, 'Brand unavailable');
		throw cause;
	}

	redirect(303, next);
};
