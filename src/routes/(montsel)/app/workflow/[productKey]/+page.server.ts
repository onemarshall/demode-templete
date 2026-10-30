import { error, fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { resolveActiveBrand } from '#lib/modules/products/server/brand-context.js';
import { resolveBrandProducts } from '#lib/modules/products/server/resolve.js';
import { getProduct, isProductKey } from '#lib/modules/products/shared/registry.js';
import { findCurrentEngagement, startEngagement } from '#lib/modules/diagnostic/server/engagement.js';
import {
	getVariant,
	intakeSchemaFor
} from '#lib/modules/diagnostic/shared/registry.js';
import {
	EligibilityError,
	requireEngagementEligibility
} from '#lib/modules/diagnostic/server/eligibility.js';
import { PaymentRequiredError } from '#lib/modules/diagnostic/server/payments.js';
import { dispatchDiagnosticIntake } from '#lib/modules/diagnostic/server/dispatch.js';
import { getOptions } from '#lib/modules/diagnostic/server/engine.js';

/**
 * A product's primary action. Visual Contract has its own workflow and is
 * redirected; Signal, Gap and Direction open their family intake here. A
 * product without an intake states that plainly rather than imitating one.
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
	if (!variant?.sellable)
		return { product, entry, variant: null, engagement: null, sectors: [], sectorError: null };

	const engagement = await findCurrentEngagement(ctx, variant.key);

	let sectors: Array<{ ref: string; name: string }> = [];
	let sectorError: string | null = null;
	if (variant.family === 'gap' || variant.family === 'direction') {
		try {
			sectors = (await getOptions()).sectorIntelligence;
		} catch {
			sectorError =
				'Approved sector research is unavailable right now. Gap and Direction cannot start until it can be confirmed.';
		}
	}

	return { product, entry, variant, engagement, sectors, sectorError };
};

export const actions: Actions = {
	start: async (event) => {
		if (!isProductKey(event.params.productKey)) error(404, 'Product unavailable');
		const variant = getVariant(event.params.productKey);
		if (!variant?.sellable) error(404, 'Product unavailable');

		const { ctx } = await resolveActiveBrand(event);
		const { products } = await resolveBrandProducts(ctx);
		const entry = products.find((candidate) => candidate.product.key === event.params.productKey);
		if (!entry || (entry.access !== 'owned' && entry.access !== 'free')) {
			error(404, 'Product unavailable');
		}

		const form = await event.request.formData();
		const raw: Record<string, unknown> = {
			...Object.fromEntries(form.entries()),
			declaredScope: String(form.get('declaredScope') ?? '')
				.split(/[\n,]/)
				.map((item) => item.trim())
				.filter(Boolean)
		};

		const parsed = intakeSchemaFor(variant.family).safeParse(raw);
		if (!parsed.success) {
			const fieldErrors: Record<string, string> = {};
			for (const issue of parsed.error.issues) {
				const field = String(issue.path[0] ?? 'form');
				fieldErrors[field] ??= issue.message;
			}
			return fail(400, { values: raw, fieldErrors });
		}

		const intake = parsed.data as Record<string, unknown>;
		try {
			await requireEngagementEligibility(ctx, variant.key, {
				website: String(intake.subjectUrl ?? ''),
				sectorRef:
					typeof intake.sectorRef === 'string' ? intake.sectorRef : null,
				hasBusinessContext: true,
				hasProposal:
					typeof intake.proposedDirection === 'string' &&
					intake.proposedDirection.trim().length > 0
			});
		} catch (cause) {
			if (cause instanceof EligibilityError)
				return fail(400, {
					values: raw,
					fieldErrors: { form: cause.message }
				});
			throw cause;
		}

		let result;
		try {
			result = await startEngagement(ctx, {
				productKey: variant.key,
				intake: parsed.data
			});
		} catch (cause) {
			if (cause instanceof PaymentRequiredError)
				return fail(402, {
					values: raw,
					fieldErrors: { form: cause.message }
				});
			throw cause;
		}

		// The engagement and its intake are durable before dispatch. A failed
		// dispatch leaves a paid engagement that support can retry.
		await dispatchDiagnosticIntake(result.engagement.id);

		redirect(303, `/app/diagnostic/${result.engagement.id}`);
	}
};
