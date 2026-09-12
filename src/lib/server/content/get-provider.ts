import { createDirectusContentProvider } from "./directus";
import { staticContentProvider } from "./static";
import { CMS_PROVIDER } from "$app/env/private";
import { PUBLIC_CMS_PROVIDER } from "$app/env/public";
import type { ContentProvider, ContentProviderType } from "$lib/content/provider";

const VALID_PROVIDERS: ContentProviderType[] = ["static", "directus"];
const providerFactories: Record<ContentProviderType, () => ContentProvider> = {
  static: () => staticContentProvider,
  directus: () => createDirectusContentProvider(),
};

const parseProvider = (raw: string | undefined): ContentProviderType => {
  const value = (raw ?? "static").toLowerCase() as ContentProviderType;
  if (VALID_PROVIDERS.includes(value)) return value;
  throw new Error(
    `Unsupported CMS provider "${raw}". Expected one of: ${VALID_PROVIDERS.join(", ")}.`,
  );
};

export const getProviderType = (): ContentProviderType =>
  parseProvider(CMS_PROVIDER ?? PUBLIC_CMS_PROVIDER);

let cachedProvider: ContentProvider | null = null;

export const getContentProvider = (): ContentProvider =>
  (cachedProvider ??= providerFactories[getProviderType()]());
