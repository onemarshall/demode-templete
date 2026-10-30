import type { PageServerLoad } from './$types';
import { getServerEnv } from '#lib/platform/config/server.server.js';
import { getVatConfig } from '#lib/app/vat.server.js';
import { parseReleasedProducts } from '#lib/app/plans.js';
import { getOptions } from '#lib/modules/diagnostic/server/engine.js';

/**
 * VAT is a business decision, not a display preference, so the page reads it
 * from config rather than hard-coding "excluding VAT".
 *
 * `payByBankAvailable` is a separate, owner-controlled flag. Stripe decides
 * eligibility per account; we only advertise the method once someone has
 * confirmed it is actually offered at checkout. Advertising a method that
 * checkout will not show is worse than saying nothing.
 */
export const load: PageServerLoad = async () => {
	const env = await getServerEnv();
	const vat = getVatConfig(env);
	let sectors: Array<{ ref: string; name: string }> = [];
	let eligibilityAvailable = false;
	try {
		sectors = (await getOptions()).sectorIntelligence;
		eligibilityAvailable = true;
	} catch {
		eligibilityAvailable = false;
	}
	return {
		vatEnabled: vat.enabled,
		vatDisplay: vat.display,
		vatRate: vat.ratePercent,
		payByBankAvailable: env.PAY_BY_BANK_ENABLED === 'true',
		// Release is per environment. An empty list means nothing is sellable.
		releasedProducts: [...parseReleasedProducts(env.RELEASED_PRODUCTS)],
		sectors,
		eligibilityAvailable
	};
};
