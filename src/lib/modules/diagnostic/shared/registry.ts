/**
 * Diagnostic variant registry (plan Workstream 5).
 *
 * Route belongs to the variant, not the family: `diagnostic.gap` is a
 * self-service product only once its intake exists, while
 * `diagnostic.gap.consultancy` sells the same family through a strategist.
 * Adding a variant is one entry here plus a `product` row; it never touches an
 * existing variant.
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

/** ISO-3166-1 alpha-2 shape, or a URL. The engine fetches the subject itself. */
const subjectUrl = z
	.string()
	.trim()
	.min(8)
	.max(2048)
	.refine((value) => /^https?:\/\//i.test(value), 'Enter a full http:// or https:// address.');

/**
 * Signal reads existing public material. These four fields are not decoration:
 * the engine's context request requires a commissioned decision, an owner, a
 * reader and a timing, and refuses a run without them.
 */
export const signalIntakeSchema = z.object({
	subjectUrl,
	commissionedDecision: z
		.string()
		.trim()
		.min(10, 'State the decision this reading informs.')
		.max(600),
	decisionOwner: z.string().trim().min(2).max(120),
	intendedReader: z.string().trim().min(2).max(120),
	decisionTiming: z.string().trim().min(2).max(120),
	declaredScope: z
		.array(z.string().trim().min(1).max(80))
		.max(12)
		.default([])
});

export type SignalIntake = z.infer<typeof signalIntakeSchema>;

export interface DiagnosticVariant {
	/** Product key. Matches `product.key`. */
	key: string;
	family: DiagnosticFamily;
	deliveryRoute: DeliveryRoute;
	depth: ReportDepth;
	/** Sold to a customer today. A variant that is not sellable has no intake. */
	sellable: boolean;
	/** Naming rule enforced in copy, not in code: what this variant is called. */
	name: string;
}

/**
 * The initial release: Signal self-service, with the consultancy variants
 * arriving as their own keys in the consultancy phase. Automated Gap and
 * Direction are absent on purpose — they need the intake UI for their declared
 * family inputs, not a flag.
 */
export const VARIANTS: readonly DiagnosticVariant[] = [
	{
		key: 'diagnostic.signal',
		family: 'signal',
		deliveryRoute: 'montsel_self_service',
		depth: 'automated',
		sellable: true,
		name: 'Signal reading'
	}
];

export function getVariant(key: string): DiagnosticVariant | undefined {
	return VARIANTS.find((variant) => variant.key === key);
}

/** The intake parser for a variant, or null when the variant has no intake yet. */
export function parseIntake(key: string, payload: unknown): SignalIntake | null {
	const variant = getVariant(key);
	if (!variant?.sellable) return null;
	if (variant.family !== 'signal') return null;
	return signalIntakeSchema.parse(payload);
}
