/**
 * Eligibility.
 *
 * A short, family-specific check before checkout and again at engagement start.
 * It answers one question: can this diagnostic be delivered with the available
 * inputs and approved sector coverage? It does not collect the full intake.
 */

import { getDB } from '#lib/platform/database/db.js';
import {
	assertOperationContext,
	type OperationContext
} from '#lib/modules/tenancy/server/context.js';
import { getOptions } from './engine.js';

export type EligibilityResult = 'eligible' | 'ineligible' | 'needs_input';

export interface EligibilityInput {
	website?: string | null;
	sectorRef?: string | null;
	hasBusinessContext?: boolean;
	hasProposal?: boolean;
}

export interface EligibilityCheck {
	result: EligibilityResult;
	reasons: string[];
	sector: { ref: string; name: string } | null;
	/**
	 * The sector the customer asked for, whether or not it is covered.
	 *
	 * `sector` is the approved sector that will be used, so it is null when the
	 * request is refused. Losing the request with it made a refusal
	 * indistinguishable from a customer who named no sector at all — and that is
	 * the one signal that says which sector to research next.
	 */
	requestedSectorRef: string | null;
	inputsPresent: Record<string, boolean>;
}

export class EligibilityError extends Error {
	constructor(
		message: string,
		public readonly check: EligibilityCheck
	) {
		super(message);
		this.name = 'EligibilityError';
	}
}

function websitePresent(value: string | null | undefined): boolean {
	if (!value) return false;
	try {
		const url = new URL(value);
		return url.protocol === 'http:' || url.protocol === 'https:';
	} catch {
		return false;
	}
}

export async function checkEligibility(
	productKey: string,
	input: EligibilityInput
): Promise<EligibilityCheck> {
	const missing: string[] = [];
	const blocked: string[] = [];
	const hasWebsite = websitePresent(input.website);
	const inputsPresent = {
		website: hasWebsite,
		businessContext: Boolean(input.hasBusinessContext),
		proposal: Boolean(input.hasProposal),
		sector: Boolean(input.sectorRef)
	};

	if (!hasWebsite) missing.push('A public website address is required.');

	let sector: { ref: string; name: string } | null = null;
	if (productKey === 'diagnostic.gap' || productKey === 'diagnostic.direction') {
		if (!input.sectorRef) missing.push('Choose the sector this diagnostic should use.');
		if (!input.hasBusinessContext)
			missing.push('Buyer and business context are required.');
		if (productKey === 'diagnostic.direction' && !input.hasProposal)
			missing.push('A proposed direction is required for Direction.');

		if (input.sectorRef) {
			try {
				const options = await getOptions();
				sector =
					options.sectorIntelligence.find((entry) => entry.ref === input.sectorRef) ??
					null;
				if (!sector)
					blocked.push(
						'That sector does not have approved sector intelligence yet, so Gap or Direction cannot be sold into it.'
					);
			} catch {
				blocked.push(
					'The approved sector catalogue is unavailable, so eligibility cannot be confirmed.'
				);
			}
		}
	} else if (productKey !== 'diagnostic.signal') {
		blocked.push('This product is not available as a self-service diagnostic.');
	}

	const result: EligibilityResult = blocked.length
		? 'ineligible'
		: missing.length
			? 'needs_input'
			: 'eligible';

	return {
		result,
		reasons: [...blocked, ...missing],
		sector,
		requestedSectorRef: input.sectorRef?.trim() ? input.sectorRef.trim() : null,
		inputsPresent
	};
}

export interface EligibilityRecordInput {
	userId: string | null;
	organisationId?: string | null;
	brandId?: string | null;
	productKey: string;
	check: EligibilityCheck;
	sectorIntelligenceVersionId?: number | null;
}

/** Persist the check so a later change is visible rather than silent. */
export async function recordEligibility(
	input: EligibilityRecordInput
): Promise<string> {
	const db = await getDB();
	const id = `elig_${crypto.randomUUID()}`;
	await db.query(
		`INSERT INTO "diagnostic_eligibility"
		   ("id", "user_id", "organisation_id", "brand_id", "product_key",
		    "checked_by", "sector_intelligence_ref", "sector_intelligence_version_id",
		    "requested_sector_ref", "inputs_present", "result", "reasons")
		 VALUES ($1, $2, $3, $4, $5, $2, $6, $7, $8, $9, $10, $11)`,
		[
			id,
			input.userId,
			input.organisationId ?? null,
			input.brandId ?? null,
			input.productKey,
			input.check.sector?.ref ?? null,
			input.sectorIntelligenceVersionId ?? null,
			input.check.requestedSectorRef,
			JSON.stringify(input.check.inputsPresent),
			input.check.result,
			JSON.stringify(input.check.reasons)
		]
	);
	return id;
}

/**
 * Engagement-start check. Records the result and refuses to start when the
 * product cannot be delivered with the inputs or sector coverage now available.
 */
export async function requireEngagementEligibility(
	ctx: OperationContext,
	productKey: string,
	input: EligibilityInput
): Promise<EligibilityCheck> {
	assertOperationContext(ctx);
	const check = await checkEligibility(productKey, input);
	await recordEligibility({
		userId: ctx.userId,
		organisationId: ctx.organisationId,
		brandId: ctx.brandId,
		productKey,
		check
	});
	if (check.result !== 'eligible')
		throw new EligibilityError(
			check.reasons.join(' ') || 'This diagnostic is not eligible to start.',
			check
		);
	return check;
}
