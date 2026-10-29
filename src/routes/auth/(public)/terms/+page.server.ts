import type { PageServerLoad } from './$types';
import { getServerEnv } from '#lib/platform/config/server.server.js';
import { getVatConfig } from '#lib/app/vat.server.js';

export const load: PageServerLoad = async () => {
	const env = await getServerEnv();
	const vat = getVatConfig(env);
	return {
		contactEmail: (env.EMAIL_TO as string | undefined) ?? 'apps@iamstudios.cc',
		vatEnabled: vat.enabled,
		vatDisplay: vat.display,
		vatRate: vat.ratePercent
	};
};
