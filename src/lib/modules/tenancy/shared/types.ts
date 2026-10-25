/** Browser-safe routing and display contracts. These values never confer access. */

export interface RouteResolution {
	organisation: { id: string; name: string; slug: string };
	brand: { id: string; name: string; slug: string };
}

export interface SwitcherBrand {
	brandId: string;
	brandName: string;
	brandSlug: string;
	role: string;
}

export interface SwitcherOrganisation {
	organisationId: string;
	organisationName: string;
	organisationSlug: string;
	brands: SwitcherBrand[];
}

export interface BrandPreference {
	lastOrganisationId: string | null;
	lastBrandId: string | null;
}
