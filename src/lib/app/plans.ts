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

export const PLANS: Plan[] = [
	{
		id: 'prod_free',
		name: 'Free',
		price: 0,
		priceMinorUnits: 0,
		currency: 'usd',
		period: null,
		description: 'Get started with core features',
		features: [
			'Core authentication (email/password, social)',
			'1 brand',
			'Community support',
			'Basic security analytics',
			'1,000 monthly active users',
			'Standard email delivery'
		],
		cta: 'Get Started',
		popular: false
	},
	{
		id: 'prod_1HtWCLpwwc2sscH5dAv21p',
		name: 'Basic',
		price: 9,
		priceMinorUnits: 900,
		currency: 'usd',
		period: 'month',
		description: 'Essential tools for individuals',
		trial: '7 days free',
		features: [
			'3 brands',
			'Email support (48h response)',
			'Advanced security analytics',
			'10,000 monthly active users',
			'Priority email delivery',
			'Custom branding',
			'Webhook access',
			'API: 1,000 requests/hour'
		],
		cta: 'Start Basic',
		popular: false
	},
	{
		id: 'prod_6P97axiYpOuoh5R0rHwLUV',
		name: 'Pro',
		price: 29,
		priceMinorUnits: 2900,
		currency: 'usd',
		period: 'month',
		description: 'Advanced features for professionals',
		trial: '14 days free',
		features: [
			'Unlimited brands',
			'Priority support (24h)',
			'Real-time analytics',
			'100,000 monthly active users',
			'Dedicated email IP',
			'Advanced SSO (SAML, OIDC)',
			'Custom domains',
			'Organization management',
			'API: 10,000 requests/hour',
			'90-day audit logs',
			'Role-based access control'
		],
		cta: 'Go Pro',
		popular: true
	},
	{
		id: 'prod_5CmJ9oWLa4RjJhjkgBXc3C',
		name: 'Enterprise',
		price: 99,
		priceMinorUnits: 9900,
		currency: 'usd',
		period: 'month',
		description: 'Full platform for teams',
		trial: '30 days free',
		features: [
			'Unlimited everything',
			'Dedicated support (4h)',
			'Custom SLA available',
			'Unlimited MAU',
			'Premium infrastructure (99.99% uptime)',
			'Advanced fraud detection',
			'Geographic redundancy',
			'Custom integrations',
			'Unlimited API requests',
			'Unlimited audit logs',
			'SOC2, GDPR, HIPAA compliance',
			'Dedicated account manager'
		],
		cta: 'Contact Sales',
		popular: false
	}
];

export const PLAN_BY_ID: Record<string, Plan> = Object.fromEntries(
	PLANS.map((p) => [p.id, p])
);

export function getPlan(id: string | undefined | null): Plan | undefined {
	if (!id) return undefined;
	return PLAN_BY_ID[id];
}
