import { command } from '$app/server';
import { z } from 'zod';
import { checkEligibility } from '#lib/modules/diagnostic/server/eligibility.js';
import { PRODUCT_KEY_BY_PLAN } from '#lib/app/plans.js';

const eligibilitySchema = z.object({
	productId: z.string().min(1),
	website: z.string().url().max(2048),
	sectorRef: z.string().max(200).optional(),
	hasProposal: z.boolean().optional()
});

/**
 * The guided pre-checkout step. It is read-only: it resolves the approved
 * sector catalogue and returns the same eligibility result the checkout
 * command will enforce.
 */
export const checkDiagnosticEligibility = command(
	eligibilitySchema,
	async (data) => {
		const productKey = PRODUCT_KEY_BY_PLAN[data.productId];
		if (!productKey)
			return { result: 'ineligible' as const, reasons: ['Unknown product.'] };
		return checkEligibility(productKey, {
			website: data.website,
			sectorRef: data.sectorRef,
			hasBusinessContext: true,
			hasProposal: data.hasProposal
		});
	}
);
