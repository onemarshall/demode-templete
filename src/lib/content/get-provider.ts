import { createDirectusContentProvider } from '$lib/content/providers/directus';
import { staticContentProvider } from '$lib/content/providers/static';
import { createWordPressContentProvider } from '$lib/content/providers/wordpress';
import { CMS_PROVIDER } from '$app/env/private';
import { PUBLIC_CMS_PROVIDER } from '$app/env/public';
import type { ContentProvider, ContentProviderType } from '$lib/content/provider';

const VALID_PROVIDERS: ContentProviderType[] = ['static', 'directus', 'wordpress'];
const providerFactories: Record<ContentProviderType, () => ContentProvider> = {
	static: () => staticContentProvider,
	directus: () => createDirectusContentProvider(),
	wordpress: () => createWordPressContentProvider()
};

const parseProvider = (raw: string | undefined): ContentProviderType => {
	const value = (raw ?? 'static').toLowerCase() as ContentProviderType;
	if (VALID_PROVIDERS.includes(value)) return value;
	throw new Error(
		`Unsupported CMS provider "${raw}". Expected one of: ${VALID_PROVIDERS.join(', ')}.`
	);
};

export const getProviderType = (): ContentProviderType =>
	parseProvider(CMS_PROVIDER ?? PUBLIC_CMS_PROVIDER);

export const getContentProvider = (): ContentProvider => providerFactories[getProviderType()]();
