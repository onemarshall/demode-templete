import { beforeEach, describe, expect, it, vi } from 'vitest';

const options = vi.hoisted(() => vi.fn());

vi.mock('../engine.js', () => ({
	getOptions: () => options()
}));

import { checkEligibility } from '../eligibility.js';

beforeEach(() => {
	options.mockReset();
	options.mockResolvedValue({
		sectorIntelligence: [
			{ ref: 'professional-services', name: 'Professional services' }
		]
	});
});

describe('diagnostic eligibility', () => {
	it('accepts Signal with a public website and no sector', async () => {
		const check = await checkEligibility('diagnostic.signal', {
			website: 'https://acme.test'
		});
		expect(check.result).toBe('eligible');
		expect(check.reasons).toEqual([]);
	});

	it('asks for a website instead of blocking the customer', async () => {
		const check = await checkEligibility('diagnostic.signal', {});
		expect(check.result).toBe('needs_input');
		expect(check.reasons.join(' ')).toContain('website');
	});

	it('refuses Gap for a sector with no approved research', async () => {
		const check = await checkEligibility('diagnostic.gap', {
			website: 'https://acme.test',
			sectorRef: 'unapproved-sector',
			hasBusinessContext: true
		});
		expect(check.result).toBe('ineligible');
		expect(check.reasons.join(' ')).toContain('approved sector intelligence');
	});

	it('keeps the requested sector on a refusal, so demand is not lost', async () => {
		const check = await checkEligibility('diagnostic.gap', {
			website: 'https://acme.test',
			sectorRef: 'unapproved-sector',
			hasBusinessContext: true
		});
		// `sector` is the approved sector that would be used, and there isn't one.
		expect(check.sector).toBeNull();
		// The request itself is the demand signal and must survive the refusal.
		expect(check.requestedSectorRef).toBe('unapproved-sector');
	});

	it('records no requested sector when the customer named none', async () => {
		const check = await checkEligibility('diagnostic.signal', { website: 'https://acme.test' });
		expect(check.requestedSectorRef).toBeNull();
	});

	it('accepts Gap for an approved sector with business context', async () => {
		const check = await checkEligibility('diagnostic.gap', {
			website: 'https://acme.test',
			sectorRef: 'professional-services',
			hasBusinessContext: true
		});
		expect(check.result).toBe('eligible');
		expect(check.sector?.name).toBe('Professional services');
	});

	it('asks for a proposal before Direction can start', async () => {
		const check = await checkEligibility('diagnostic.direction', {
			website: 'https://acme.test',
			sectorRef: 'professional-services',
			hasBusinessContext: true
		});
		expect(check.result).toBe('needs_input');
		expect(check.reasons.join(' ')).toContain('proposed direction');
	});

	it('refuses an unknown product', async () => {
		const check = await checkEligibility('diagnostic.full', {
			website: 'https://acme.test'
		});
		expect(check.result).toBe('ineligible');
	});
});
