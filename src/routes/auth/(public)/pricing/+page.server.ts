import type { PageServerLoad } from './$types';
import { getServerEnv } from '#lib/platform/config/server.server.js';
import { getVatConfig } from '#lib/app/vat.server.js';

/**
 * VAT is a business decision, not a display preference, so the page reads it
 * from config rather than hard-coding "excluding VAT".
 */
export const load: PageServerLoad = async () => {
	const env = await getServerEnv();
	const vat = getVatConfig(env);
	return {
		vatEnabled: vat.enabled,
		vatDisplay: vat.display,
		vatRate: vat.ratePercent
	};
};
