/**
 * Diagnostic variant registry.
 *
 * Route belongs to the variant, not the family: a Montsel variant is sold
 * self-service, while a Langfell capability is delivered inside a consultancy
 * engagement. Adding a variant is one entry here plus a `product` row; it never
 * touches an existing variant.
 *
 * This is the intake authority, not the presentation authority. Display
 * metadata and navigation stay in `products/shared/registry.ts`.
 *
 * Naming rule: Signal uses *reading* language. It is never "the entry-level
 * diagnostic" or "a lighter Gap" — it answers a different question.
 */

import { z } from 'zod';

export const DELIVERY_ROUTES = ['montsel_self_service', 'langfell_consultancy'] as const;
export type DeliveryRoute = (typeof DELIVERY_ROUTES)[number];

export const REPORT_DEPTHS = ['automated', 'reviewed', 'strategic', 'handoff'] as const;
export type ReportDepth = (typeof REPORT_DEPTHS)[number];

export const FAMILIES = ['signal', 'gap', 'direction', 'full'] as const;
export type DiagnosticFamily = (typeof FAMILIES)[number];

const subjectUrl = z
	.string()
	.trim()
	.min(8)
	.max(2048)
	.refine((value) => /^https?:\/\//i.test(value), 'Enter a full http:// or https:// address.');

/**
 * Every family needs the decision frame. The engine refuses a run without a
 * commissioned decision, an owner, a reader and a timing.
 */
const decisionFrame = {
	subjectUrl,
	commissionedDecision: z
		.string()
		.trim()
		.min(10, 'State the decision this reading informs.')
		.max(600),
	decisionOwner: z.string().trim().min(2).max(120),
	intendedReader: z.string().trim().min(2).max(120),
	decisionTiming: z.string().trim().min(2).max(120)
};

export const signalIntakeSchema = z.object({
	...decisionFrame,
	declaredScope: z
		.array(z.string().trim().min(1).max(80))
		.max(12)
		.default([])
});

/**
 * Gap needs industry, buyer and intent evidence. It is not a thin-material
 * Signal, so the intake asks for the evidence the method actually uses.
 */
export const gapIntakeSchema = z.object({
	...decisionFrame,
	sectorRef: z.string().trim().min(1).max(200),
	geography: z.string().trim().min(2).max(80),
	buyerInput: z.string().trim().min(10).max(4000),
	organisationalIntent: z.string().trim().min(10).max(4000),
	availableProof: z.string().trim().min(10).max(4000),
	evidenceScope: z.string().trim().min(3).max(600)
});

/**
 * Direction tests one supplied proposal. The proposal and its version are
 * required; a missing proposal is not permission to generate one.
 */
export const directionIntakeSchema = z.object({
	...decisionFrame,
	sectorRef: z.string().trim().min(1).max(200),
	buyerInput: z.string().trim().min(10).max(4000),
	decisionContext: z.string().trim().min(10).max(2000),
	proposedDirection: z.string().trim().min(20).max(8000),
	proposalVersion: z.string().trim().min(1).max(80),
	constraints: z.string().trim().min(10).max(4000),
	claimSupport: z.string().trim().min(10).max(4000),
	expectedCommitment: z.string().trim().min(5).max(2000),
	currentEvidence: z.string().trim().min(10).max(4000),
	readinessEvidence: z.string().trim().min(10).max(4000),
	evidenceScope: z.string().trim().min(3).max(600)
});

export type SignalIntake = z.infer<typeof signalIntakeSchema>;
export type GapIntake = z.infer<typeof gapIntakeSchema>;
export type DirectionIntake = z.infer<typeof directionIntakeSchema>;
export type DiagnosticIntake = SignalIntake | GapIntake | DirectionIntake;

export interface DiagnosticVariant {
	/** Product key. Matches `product.key`. */
	key: string;
	family: DiagnosticFamily;
	deliveryRoute: DeliveryRoute;
	depth: ReportDepth;
	/** Sold to a customer today. A variant that is not sellable has no intake. */
	sellable: boolean;
	/**
	 * Whether checkout must prove deliverability before taking payment.
	 *
	 * `not_required` is only correct where the sole input is collected inside
	 * the paid intake. Signal's decision frame — including its `subjectUrl` — is
	 * gathered after payment, so a pre-purchase check would have nothing to
	 * examine and would refuse every Signal purchase.
	 */
	checkoutEligibility: 'required' | 'not_required';
	/** Naming rule enforced in copy, not in code: what this variant is called. */
	name: string;
}

/**
 * Montsel's self-service families. Langfell capabilities use the same family
 * and method but are created inside a consultancy engagement; they are not
 * separate public products.
 */
export const VARIANTS: readonly DiagnosticVariant[] = [
	{
		key: 'diagnostic.signal',
		family: 'signal',
		deliveryRoute: 'montsel_self_service',
		depth: 'automated',
		sellable: true,
		checkoutEligibility: 'not_required',
		name: 'Signal reading'
	},
	{
		key: 'diagnostic.gap',
		family: 'gap',
		deliveryRoute: 'montsel_self_service',
		depth: 'automated',
		sellable: true,
		checkoutEligibility: 'required',
		name: 'Gap diagnostic'
	},
	{
		key: 'diagnostic.direction',
		family: 'direction',
		deliveryRoute: 'montsel_self_service',
		depth: 'automated',
		sellable: true,
		checkoutEligibility: 'required',
		name: 'Direction review'
	}
];

export function getVariant(key: string): DiagnosticVariant | undefined {
	return VARIANTS.find((variant) => variant.key === key);
}

/**
 * Whether a purchase of this product must pass the deliverability check first.
 *
 * Fail closed: any `diagnostic.` key without a variant that explicitly opts out
 * is gated. That is what stops a priced-but-unbuildable product — Full
 * Diagnostic today — from taking money while it has no route to start work.
 */
export function requiresCheckoutEligibility(productKey: string | null | undefined): boolean {
	if (!productKey || !productKey.startsWith('diagnostic.')) return false;
	return getVariant(productKey)?.checkoutEligibility !== 'not_required';
}

/** The intake parser for a variant, or null when the variant has no intake yet. */
export function parseIntake(key: string, payload: unknown): DiagnosticIntake | null {
	const variant = getVariant(key);
	if (!variant?.sellable) return null;
	switch (variant.family) {
		case 'signal':
			return signalIntakeSchema.parse(payload);
		case 'gap':
			return gapIntakeSchema.parse(payload);
		case 'direction':
			return directionIntakeSchema.parse(payload);
		default:
			return null;
	}
}

/** The schema for a family, used by the route action before it calls the engine. */
export function intakeSchemaFor(family: DiagnosticFamily) {
	if (family === 'gap') return gapIntakeSchema;
	if (family === 'direction') return directionIntakeSchema;
	return signalIntakeSchema;
}
