export interface Plan {
	id: string;
	name: string;
	price: number;
	priceMinorUnits: number;
	currency: string;
	period: 'month' | 'year' | null;
	description: string;
	trial?: string;
	features: string[];
	cta: string;
	popular: boolean;
}

/**
 * Montsel and Langfell product catalogue.
 *
 * Prices are one-time, GBP, and approved in the Langfell commercial authority
 * (01-Library/02-Business/03-Offers/01-Pricing-and-Outcomes). Langfell
 * consultancy offers are deliberately absent: they are proposal-scoped and must
 * never appear as a checkout product.
 *
 * VAT treatment is not established. Do not enable checkout until it is.
 */
export const PLANS: Plan[] = [
	{
		id: 'signal',
		name: 'Signal',
		price: 395,
		priceMinorUnits: 39500,
		currency: 'gbp',
		period: null,
		description: 'A source-bounded reading of what your public communication communicates',
		features: [
			'Five-dimension reading of your public material',
			'Source evidence and quotations',
			'Clear, missing and contradictory material',
			'Review limits and exclusions'
		],
		cta: 'Buy Signal',
		popular: false
	},
	{
		id: 'gap',
		name: 'Gap',
		price: 995,
		priceMinorUnits: 99500,
		currency: 'gbp',
		period: null,
		description: 'Evidence-backed weaknesses, contradictions and opportunities',
		features: [
			'Mismatch and proof assessment',
			'Evidence for and against each finding',
			'Two or three opportunities worth investigating',
			'Next warranted step'
		],
		cta: 'Buy Gap',
		popular: false
	},
	{
		id: 'direction',
		name: 'Direction',
		price: 1495,
		priceMinorUnits: 149500,
		currency: 'gbp',
		period: null,
		description: 'Test a direction you already have before you commit to it',
		features: [
			'Five decision checks on your supplied proposal',
			'Proceed, Refine, Pause or Reset verdict',
			'Reasons, confidence and uncertainty',
			'What can proceed and what should wait'
		],
		cta: 'Buy Direction',
		popular: false
	},
	{
		id: 'full-diagnostic',
		name: 'Full Diagnostic',
		price: 2495,
		priceMinorUnits: 249500,
		currency: 'gbp',
		period: null,
		description: 'One integrated assessment across Signal, Gap and Direction',
		features: [
			'Everything in Signal, Gap and Direction',
			'One connected report, not three separate documents',
			'Executive synthesis reconciling the findings',
			'Joined next-step and handoff section'
		],
		cta: 'Buy Full Diagnostic',
		popular: true
	},
	{
		id: 'strategy',
		name: 'Strategy',
		price: 4995,
		priceMinorUnits: 499500,
		currency: 'gbp',
		period: null,
		description: 'Develop a Business Foundation and connected strategic direction',
		features: [
			'Business Foundation you review and approve',
			'One connected strategy: brand, marketing or sales',
			'Decision record with assumptions and open questions',
			'Prioritised 90-day action list',
			'90 days of access'
		],
		cta: 'Buy Strategy',
		popular: false
	},
	{
		id: '101-better-ways-to-think',
		name: '101 Better Ways to Think',
		price: 14.95,
		priceMinorUnits: 1495,
		currency: 'gbp',
		period: null,
		description: 'Short-form ideas that improve how you think',
		features: ['101 practical thinking moves', 'Written for immediate use'],
		cta: 'Buy the book',
		popular: false
	},
	{
		id: 'everything-works-nothing-fits',
		name: 'Everything Works. Nothing Fits.',
		price: 24.95,
		priceMinorUnits: 2495,
		currency: 'gbp',
		period: null,
		description: 'The business worldview and connected strategy behind Langfell',
		features: ['The full argument', 'Connected strategic implications'],
		cta: 'Buy the book',
		popular: false
	},
	{
		id: 'think-decide-act',
		name: 'Think, Decide & Act',
		price: 69,
		priceMinorUnits: 6900,
		currency: 'gbp',
		period: null,
		description: 'One integrated product to examine, decide and follow through',
		features: [
			'Three connected stages in one product',
			'Designed for work away from the screen',
			'Optional AI support for framing a question',
			'Your own decisions and action plan'
		],
		cta: 'Buy Think, Decide & Act',
		popular: false
	},
	{
		id: 'visual-contract',
		name: 'Visual Contract',
		price: 0,
		priceMinorUnits: 0,
		currency: 'gbp',
		period: null,
		description: 'Express your visual priorities and brief a designer',
		features: [
			'Six visual choices',
			'A shareable page',
			'Language for briefing and reviewing design'
		],
		cta: 'Get started free',
		popular: false
	}
];

export const PLAN_BY_ID: Record<string, Plan> = Object.fromEntries(
	PLANS.map((p) => [p.id, p])
);

/**
 * Plan id to `product.key`, for the rows that have one.
 *
 * `product` anchors the software families and the tools. Books have no row, so
 * they are deliberately absent: a book sale is recorded without a product key
 * rather than being given an invented one.
 */
export const PRODUCT_KEY_BY_PLAN: Record<string, string> = {
	signal: 'diagnostic.signal',
	gap: 'diagnostic.gap',
	direction: 'diagnostic.direction',
	'full-diagnostic': 'diagnostic.full',
	strategy: 'strategy',
	'think-decide-act': 'tool.think_act_decide'
};

export function getPlan(id: string | undefined | null): Plan | undefined {
	if (!id) return undefined;
	return PLAN_BY_ID[id];
}
