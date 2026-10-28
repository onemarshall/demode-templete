/**
 * Product registry (UI specification §9).
 *
 * Display metadata, routes and lifecycle are code-owned. This registry is the
 * presentation authority only: it never confers access. Entitlement is resolved
 * server-side from `product_entitlement` rows and the tenancy context.
 *
 * Adding a product means adding a descriptor here and implementing its route.
 * Navigation and the Tools Library read the registry, so neither needs editing.
 */

export const PRODUCT_KEYS = [
	'diagnostic.signal',
	'diagnostic.gap',
	'diagnostic.direction',
	'diagnostic.full',
	'strategy',
	'tool.visual_contract',
	'tool.think_act_decide'
] as const;

export type ProductKey = (typeof PRODUCT_KEYS)[number];

export type ProductFamily = 'diagnostic' | 'strategy' | 'tool';
export type PricingMode = 'free' | 'paid';
export type ProductLifecycle = 'planned' | 'available' | 'retired';
export type OutputFormat = 'web_page' | 'report' | 'document';

export interface ProductDescriptor {
	/** Stable key; matches `product.key` in the database. */
	key: ProductKey;
	family: ProductFamily;
	name: string;
	/** One sentence used on cards and list rows. */
	summary: string;
	/** Longer description used on the product's own landing page. */
	description: string;
	/** Authenticated landing page. */
	route: string;
	/** Where Start and Continue send the user until a work item carries its own resume path. */
	workflowPath: string;
	/**
	 * Form action for a product whose workflow begins by creating something, so
	 * Start must be a POST rather than a link. The page preloads links on hover,
	 * and a GET that created a draft would create one on every hover.
	 */
	startAction?: string;
	/** Public product information for products the user does not own. */
	learnMorePath: string;
	pricingMode: PricingMode;
	lifecycle: ProductLifecycle;
	supportsProjects: boolean;
	supportsResume: boolean;
	outputTypes: readonly OutputFormat[];
	/** Verb phrase used for the primary action, e.g. "Start Signal". */
	actionVerb: string;
}

export const PRODUCTS: readonly ProductDescriptor[] = [
	{
		key: 'diagnostic.signal',
		family: 'diagnostic',
		name: 'Signal',
		summary: 'What does your current market communication actually say?',
		description:
			'A structured reading of your website and public material, scored against five dimensions.',
		route: '/app/diagnostic',
		workflowPath: '/app/workflow/diagnostic.signal',
		learnMorePath: '/auth/pricing',
		pricingMode: 'paid',
		lifecycle: 'available',
		supportsProjects: false,
		supportsResume: true,
		outputTypes: ['report'],
		actionVerb: 'Start Signal'
	},
	{
		key: 'diagnostic.gap',
		family: 'diagnostic',
		name: 'Gap',
		summary: 'Where are the mismatches, proof weaknesses or positioning opportunities?',
		description:
			'Evidence-based analysis that compares what you claim with what your material demonstrates.',
		route: '/app/diagnostic',
		workflowPath: '/app/workflow/diagnostic.gap',
		learnMorePath: '/auth/pricing',
		pricingMode: 'paid',
		lifecycle: 'available',
		supportsProjects: false,
		supportsResume: true,
		outputTypes: ['report'],
		actionVerb: 'Start Gap'
	},
	{
		key: 'diagnostic.direction',
		family: 'diagnostic',
		name: 'Direction',
		summary: 'Does your proposed direction measure up?',
		description:
			'Five decision checks on your proposed direction before you commit to it.',
		route: '/app/diagnostic',
		workflowPath: '/app/workflow/diagnostic.direction',
		learnMorePath: '/auth/pricing',
		pricingMode: 'paid',
		lifecycle: 'available',
		supportsProjects: false,
		supportsResume: true,
		outputTypes: ['report'],
		actionVerb: 'Start Direction'
	},
	{
		key: 'diagnostic.full',
		family: 'diagnostic',
		name: 'Full Diagnostic',
		summary: 'All three diagnostics in one purchase.',
		description:
			'Signal, Gap and Direction in a single owned journey, with one integrated report.',
		route: '/app/diagnostic',
		workflowPath: '/app/workflow/diagnostic.full',
		learnMorePath: '/auth/pricing',
		pricingMode: 'paid',
		lifecycle: 'available',
		supportsProjects: false,
		supportsResume: true,
		outputTypes: ['report'],
		actionVerb: 'Start Full Diagnostic'
	},
	{
		key: 'strategy',
		family: 'strategy',
		name: 'Strategy',
		summary: 'Develop your strategic foundation through twelve connected modules.',
		description:
			'Work through a structured process with guidance, evidence and connected outputs.',
		route: '/app/strategy',
		workflowPath: '/app/workflow/strategy',
		learnMorePath: '/auth/pricing',
		pricingMode: 'paid',
		lifecycle: 'available',
		supportsProjects: false,
		supportsResume: true,
		outputTypes: ['document'],
		actionVerb: 'Start Strategy'
	},
	{
		key: 'tool.visual_contract',
		family: 'tool',
		name: 'Visual Contract',
		summary: 'A guided tool for non-designers to define a clear visual direction.',
		description:
			'Create a shareable Visual Contract with a brief for your designer and an evaluation companion. No design knowledge needed.',
		route: '/app/tools/visual-contract',
		workflowPath: '/app/tools/visual-contract',
		startAction: '/app/tools/visual-contract?/start',
		learnMorePath: '/auth/pricing',
		pricingMode: 'free',
		lifecycle: 'available',
		supportsProjects: true,
		supportsResume: true,
		outputTypes: ['web_page'],
		actionVerb: 'Start Visual Contract'
	},
	{
		key: 'tool.think_act_decide',
		family: 'tool',
		name: 'Think, Act, Decide',
		summary: 'A practical thinking tool to explore options and make clearer decisions.',
		description:
			'Explore options, test them against your intent and turn your thinking into action.',
		route: '/app/tools/think-act-decide',
		workflowPath: '/app/workflow/tool.think_act_decide',
		learnMorePath: '/auth/pricing',
		pricingMode: 'paid',
		lifecycle: 'planned',
		supportsProjects: true,
		supportsResume: true,
		outputTypes: ['document'],
		actionVerb: 'Start Think, Act, Decide'
	}
];

const BY_KEY = new Map<string, ProductDescriptor>(PRODUCTS.map((product) => [product.key, product]));

export function isProductKey(value: string): value is ProductKey {
	return BY_KEY.has(value);
}

export function getProduct(key: string): ProductDescriptor | undefined {
	return BY_KEY.get(key);
}

/** Throws for an unknown key. Callers validate untrusted input with `isProductKey` first. */
export function requireProduct(key: string): ProductDescriptor {
	const product = BY_KEY.get(key);
	if (!product) throw new Error(`Unknown product: ${key}`);
	return product;
}

export function productsByFamily(family: ProductFamily): ProductDescriptor[] {
	return PRODUCTS.filter((product) => product.family === family);
}

/** Products a user can actually start or continue. Planned and retired products are excluded. */
export function availableProducts(): ProductDescriptor[] {
	return PRODUCTS.filter((product) => product.lifecycle === 'available');
}
