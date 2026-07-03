import { getContentProvider, getProviderType } from "$lib/content";
import type { LayoutServerLoad } from "./$types";
import { PUBLIC_ENABLE_VISUAL_EDITING } from "$app/env/public";

export const load: LayoutServerLoad = async (event) => {
  const providerType = getProviderType();
  const provider = getContentProvider();
  const global = await provider.getSiteData();

  const visualEditingEnabled =
    providerType === "directus" &&
    event.url.searchParams.get("visual-editing") === "true" &&
    PUBLIC_ENABLE_VISUAL_EDITING === "true";

  return {
    contentProvider: providerType,
    global,
    visualEditingEnabled,
  };
};
