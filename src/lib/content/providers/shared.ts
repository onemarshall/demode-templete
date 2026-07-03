import { appConfig } from '$lib/static/config';
import { SiteDataSchema, type SiteData } from '$lib/content/schema';

export { normalizePath } from '$lib/shared/utils/path';

const buildAddress = (): string =>
	[
		appConfig.address.road,
		appConfig.address.city,
		appConfig.address.postcode,
		appConfig.address.country
	]
		.filter(Boolean)
		.join(', ');

export const buildBaseSiteGlobals = () => ({
	id: 'static',
	title: appConfig.title,
	description: appConfig.description,
	url: appConfig.url,
	domain: appConfig.domain,
	company: appConfig.company,
	address: buildAddress(),
	analytics_id: appConfig.analyticsId,
	cdn_url: appConfig.cdnUrl,
	footer_design_by_name: appConfig.designbyName,
	footer_design_by_content: appConfig.designBy
});

export const buildFallbackSiteData = (): SiteData =>
	SiteDataSchema.parse({
		globals: buildBaseSiteGlobals(),
		headerNavigation: [],
		footerNavigation: [],
		copyrightNavigation: [],
		newsletterForm: null
	});
