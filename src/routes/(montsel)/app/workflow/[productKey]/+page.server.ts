import { error, fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { resolveActiveBrand } from '#lib/modules/products/server/brand-context.js';
import { resolveBrandProducts } from '#lib/modules/products/server/resolve.js';
import { getProduct, isProductKey } from '#lib/modules/products/shared/registry.js';
import { findCurrentEngagement, startEngagement } from '#lib/modules/diagnostic/server/engagement.js';
import { getVariant, signalIntakeSchema } from '#lib/modules/diagnostic/shared/registry.js';

/**
 * A product's primary action. Visual Contract has its own workflow and is
 * redirected; Signal opens its intake here. Every other product still states
 * plainly that its working screens are not built, rather than imitating an
 * assessment.
 */
export const load: PageServerLoad = async (event) => {
	if (!isProductKey(event.params.productKey)) error(404, 'Product unavailable');
	const product = getProduct(event.params.productKey)!;

	if (product.key === 'tool.visual_contract') redirect(303, '/app/tools/visual-contract');

	const { ctx } = await resolveActiveBrand(event);
	const { products } = await resolveBrandProducts(ctx);
	const entry = products.find((candidate) => candidate.product.key === product.key);
	if (!entry || (entry.access !== 'owned' && entry.access !== 'free')) {
		error(404, 'Product unavailable');
	}

	const variant = getVariant(product.key);
	if (!variant?.sellable) return { product, entry, variant: null, engagement: null };

	// Re-entering the intake resumes the engagement this brand already has,
	// rather than presenting an empty form as if nothing was commissioned.
	const engagement = await findCurrentEngagement(ctx, variant.key);
	return { product, entry, variant, engagement };
};

export const actions: Actions = {
	start: async (event) => {
		if (!isProductKey(event.params.productKey)) error(404, 'Product unavailable');
		const { ctx } = await resolveActiveBrand(event);
		const { products } = await resolveBrandProducts(ctx);
		const entry = products.find((candidate) => candidate.product.key === event.params.productKey);
		if (!entry || (entry.access !== 'owned' && entry.access !== 'free')) {
			error(404, 'Product unavailable');
		}

		const form = await event.request.formData();
		const raw = {
			subjectUrl: String(form.get('subjectUrl') ?? ''),
			commissionedDecision: String(form.get('commissionedDecision') ?? ''),
			decisionOwner: String(form.get('decisionOwner') ?? ''),
			intendedReader: String(form.get('intendedReader') ?? ''),
			decisionTiming: String(form.get('decisionTiming') ?? ''),
			declaredScope: String(form.get('declaredScope') ?? '')
				.split(/[\n,]/)
				.map((item) => item.trim())
				.filter(Boolean)
		};

		const parsed = signalIntakeSchema.safeParse(raw);
		if (!parsed.success) {
			const fieldErrors: Record<string, string> = {};
			for (const issue of parsed.error.issues) {
				const field = String(issue.path[0] ?? 'form');
				fieldErrors[field] ??= issue.message;
			}
			return fail(400, { values: raw, fieldErrors });
		}

		const result = await startEngagement(ctx, {
			productKey: event.params.productKey,
			intake: parsed.data
		});

		// Checkout is not connected yet, so the page reports the recorded
		// engagement instead of implying the reading has begun.
		redirect(303, `/app/workflow/${event.params.productKey}?engagement=${result.engagement.id}`);
	}
};
