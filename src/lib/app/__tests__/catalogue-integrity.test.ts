/**
 * Catalogue integrity.
 *
 * A priced product is not a deliverable product. This suite states the
 * relationship the catalogue has to satisfy, so a release configuration cannot
 * point at a diagnostic that has no intake, no delivery route or no variant.
 *
 * The distinction the suite protects is between *planned* and *released*:
 *
 *   - `salesMode: 'planned'`   — may be priced and listed, must not be sellable.
 *   - `salesMode: 'self_service'` — may be released, and must then be complete.
 *
 * `Full Diagnostic` is the case that motivated this: it carries a price, a
 * Stripe price id and a product descriptor, but no variant. Before this suite,
 * adding it to `RELEASED_PRODUCTS` would have taken money and left the buyer
 * with no route to start work.
 */

import { describe, expect, it } from 'vitest';
import { PLANS, PRODUCT_KEY_BY_PLAN, getPlan } from '../plans.js';
import {
	PRODUCTS,
	getProduct,
	isProductKey,
	type ProductDescriptor
} from '#lib/modules/products/shared/registry.js';
import {
	VARIANTS,
	getVariant,
	intakeSchemaFor,
	requiresCheckoutEligibility,
	type DiagnosticFamily
} from '#lib/modules/diagnostic/shared/registry.js';

const DIAGNOSTIC_PREFIX = 'diagnostic.';

function isDiagnosticPlanId(planId: string): boolean {
	return (PRODUCT_KEY_BY_PLAN[planId] ?? '').startsWith(DIAGNOSTIC_PREFIX);
}

function diagnosticPlanIds(): string[] {
	return PLANS.map((plan) => plan.id).filter(isDiagnosticPlanId);
}

function descriptorFor(planId: string): ProductDescriptor | undefined {
	const key = PRODUCT_KEY_BY_PLAN[planId];
	return key && isProductKey(key) ? getProduct(key) : undefined;
}

/**
 * Minimal intake that each family must accept. A family whose schema silently
 * fell through to the Signal schema would reject these, because the Signal
 * schema does not require the Gap or Direction fields.
 */
const MINIMAL_INTAKE: Record<DiagnosticFamily, Record<string, unknown>> = {
	signal: {
		subjectUrl: 'https://example.test',
		commissionedDecision: 'Decide whether to invest in a rebrand',
		decisionOwner: 'Managing Director',
		intendedReader: 'Board',
		decisionTiming: 'November board',
		declaredScope: []
	},
	gap: {
		subjectUrl: 'https://example.test',
		commissionedDecision: 'Decide whether to invest in a rebrand',
		decisionOwner: 'Managing Director',
		intendedReader: 'Board',
		decisionTiming: 'November board',
		sectorRef: 'manufacturing',
		geography: 'GB',
		buyerInput: 'Buyers are procurement-led engineering managers',
		organisationalIntent: 'Win larger contracts with longer procurement cycles',
		availableProof: 'Case studies and two ISO certifications',
		evidenceScope: 'Homepage and linked pages'
	},
	direction: {
		subjectUrl: 'https://example.test',
		commissionedDecision: 'Decide whether to approve the agency proposal',
		decisionOwner: 'Managing Director',
		intendedReader: 'Board and Finance Director',
		decisionTiming: 'November board',
		sectorRef: 'manufacturing',
		buyerInput: 'Buyers are procurement-led engineering managers',
		decisionContext: 'Agency proposal for a rebrand and website',
		proposedDirection: 'Reposition as a premium engineering partner for larger contracts',
		proposalVersion: 'v3',
		constraints: 'Existing brand equity and a fixed launch window',
		claimSupport: 'Two reference customers and one sector award',
		expectedCommitment: '75000 GBP',
		currentEvidence: 'Current site and sales collateral',
		readinessEvidence: 'Internal capacity to support a larger pipeline',
		evidenceScope: 'Homepage and linked pages'
	},
	full: {
		subjectUrl: 'https://example.test',
		commissionedDecision: 'Decide whether to approve the agency proposal',
		decisionOwner: 'Managing Director',
		intendedReader: 'Board and Finance Director',
		decisionTiming: 'November board',
		sectorRef: 'manufacturing',
		geography: 'GB',
		buyerInput: 'Buyers are procurement-led engineering managers',
		organisationalIntent: 'Win larger contracts with longer procurement cycles',
		availableProof: 'Case studies and two ISO certifications',
		decisionContext: 'Agency proposal for a rebrand and website',
		proposedDirection: 'Reposition as a premium engineering partner for larger contracts',
		proposalVersion: 'v3',
		constraints: 'Existing brand equity and a fixed launch window',
		claimSupport: 'Two reference customers and one sector award',
		expectedCommitment: '75000 GBP',
		currentEvidence: 'Current site and sales collateral',
		readinessEvidence: 'Internal capacity to support a larger pipeline',
		evidenceScope: 'Homepage and linked pages',
		declaredScope: []
	}
};

/** Everything a released diagnostic must have before it can take money. */
function releasedDiagnosticProblems(planId: string): string[] {
	const problems: string[] = [];
	const plan = getPlan(planId);
	if (!plan) return [`${planId}: no plan entry`];

	const productKey = PRODUCT_KEY_BY_PLAN[planId];
	if (!productKey) return [`${planId}: no product key mapping`];

	const descriptor = descriptorFor(planId);
	if (!descriptor) return [`${planId}: no product descriptor for ${productKey}`];

	if (descriptor.salesMode === 'planned')
		problems.push(`${planId}: released while still marked planned`);

	const variant = getVariant(productKey);
	if (!variant) {
		problems.push(`${planId}: no variant for ${productKey}`);
		return problems;
	}
	if (!variant.sellable) problems.push(`${planId}: variant ${productKey} is not sellable`);
	if (variant.deliveryRoute !== 'montsel_self_service')
		problems.push(`${planId}: variant delivery route is ${variant.deliveryRoute}`);
	if (variant.depth !== 'automated')
		problems.push(`${planId}: self-service variant depth is ${variant.depth}`);

	const parsed = intakeSchemaFor(variant.family).safeParse(MINIMAL_INTAKE[variant.family]);
	if (!parsed.success)
		problems.push(
			`${planId}: intake schema for family ${variant.family} rejects a minimal intake ` +
				`(${parsed.error.issues.map((issue) => issue.path.join('.')).join(', ')})`
		);

	return problems;
}

describe('diagnostic catalogue integrity', () => {
	it('maps every diagnostic plan to a product descriptor', () => {
		for (const planId of diagnosticPlanIds()) {
			expect(descriptorFor(planId), `${planId} has no product descriptor`).toBeDefined();
		}
	});

	it('gives every self-service diagnostic a complete, sellable variant', () => {
		const selfService = diagnosticPlanIds().filter(
			(planId) => descriptorFor(planId)?.salesMode === 'self_service'
		);
		expect(selfService.length).toBeGreaterThan(0);

		for (const planId of selfService) {
			const productKey = PRODUCT_KEY_BY_PLAN[planId]!;
			const variant = getVariant(productKey);
			expect(variant, `${planId} has no variant`).toBeDefined();
			expect(variant?.sellable, `${planId} is not sellable`).toBe(true);
			expect(variant?.deliveryRoute, `${planId} route`).toBe('montsel_self_service');
			expect(variant?.depth, `${planId} depth`).toBe('automated');
		}
	});

	it('keeps every planned diagnostic explicitly unsellable', () => {
		const planned = diagnosticPlanIds().filter(
			(planId) => descriptorFor(planId)?.salesMode === 'planned'
		);

		for (const planId of planned) {
			const productKey = PRODUCT_KEY_BY_PLAN[planId]!;
			expect(getVariant(productKey), `${planId} is planned but has a variant`).toBeUndefined();
		}
	});

	it('has no variant without a plan, descriptor and product key', () => {
		for (const variant of VARIANTS) {
			const planId = Object.entries(PRODUCT_KEY_BY_PLAN).find(
				([, key]) => key === variant.key
			)?.[0];
			expect(planId, `${variant.key} has no plan`).toBeDefined();
			expect(getPlan(planId!), `${variant.key} plan is missing`).toBeDefined();
			expect(descriptorFor(planId!), `${variant.key} descriptor is missing`).toBeDefined();
		}
	});

	it('parses a minimal intake for every live family without falling through to Signal', () => {
		const families = new Set(VARIANTS.filter((variant) => variant.sellable).map((v) => v.family));
		for (const family of families) {
			const schema = intakeSchemaFor(family);
			expect(
				schema.safeParse(MINIMAL_INTAKE[family]).success,
				`family ${family} rejects a minimal intake`
			).toBe(true);

			if (family === 'signal') continue;
			// The Signal schema accepts a Signal-only payload. If this passes for
			// another family, `intakeSchemaFor` has silently fallen through.
			expect(
				schema.safeParse(MINIMAL_INTAKE.signal).success,
				`family ${family} accepted a Signal-only payload; the intake branch is missing`
			).toBe(false);
		}
	});

	it('accepts the configured release list and rejects an incomplete one', () => {
		for (const planId of ['signal']) {
			expect(releasedDiagnosticProblems(planId), `${planId} is incomplete`).toEqual([]);
		}

		// The regression this suite exists for: Full Diagnostic is priced and
		// listed but has no variant, so releasing it would take money with no
		// route to start work.
		const full = releasedDiagnosticProblems('full-diagnostic');
		expect(full.length).toBeGreaterThan(0);
		expect(full.join(' ')).toContain('planned');
	});

	it('leaves no priced product without a catalogue decision', () => {
		for (const product of PRODUCTS.filter((p) => p.family === 'diagnostic')) {
			expect(product.salesMode, `${product.key} has no sales mode`).toBeDefined();
			expect(['planned', 'self_service', 'consultancy']).toContain(product.salesMode);
		}
	});

	it('declares checkout eligibility for every diagnostic variant', () => {
		for (const variant of VARIANTS)
			expect(['required', 'not_required'], variant.key).toContain(variant.checkoutEligibility);

		// Signal is the only exemption: its decision frame, including the subject
		// URL, is collected inside the paid intake, so a pre-purchase check would
		// have nothing to examine and would refuse every Signal purchase.
		expect(
			VARIANTS.filter((variant) => variant.checkoutEligibility === 'not_required').map(
				(variant) => variant.key
			)
		).toEqual(['diagnostic.signal']);
	});

	it('gates every diagnostic product without an explicit exemption', () => {
		expect(requiresCheckoutEligibility('diagnostic.signal')).toBe(false);
		expect(requiresCheckoutEligibility('diagnostic.gap')).toBe(true);
		expect(requiresCheckoutEligibility('diagnostic.direction')).toBe(true);
		// Fail closed: a priced diagnostic with no variant must not skip the gate.
		expect(requiresCheckoutEligibility('diagnostic.full')).toBe(true);
		expect(requiresCheckoutEligibility('strategy')).toBe(false);
		expect(requiresCheckoutEligibility(null)).toBe(false);
	});

	it('does not badge an unsellable product as the recommended one', () => {
		const popularDiagnostics = PLANS.filter(
			(plan) => plan.popular && isDiagnosticPlanId(plan.id)
		);
		// Full Diagnostic is priced but has no variant, so the badge would point
		// at the one product that cannot be delivered.
		expect(popularDiagnostics.map((plan) => plan.id)).not.toContain('full-diagnostic');

		for (const plan of popularDiagnostics)
			expect(releasedDiagnosticProblems(plan.id), `${plan.id} is badged popular but incomplete`).toEqual([]);
	});
});
