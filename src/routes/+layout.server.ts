import { getContentProvider, getProviderType } from "$lib/content/index";
import type { LayoutServerLoad } from "./$types";
import { PUBLIC_ENABLE_VISUAL_EDITING } from "$app/env/public";

export const load: LayoutServerLoad = async (event) => {
  const providerType = getProviderType();
  const provider = getContentProvider();
  const { globals, headerNavigation, footerNavigation, copyrightNavigation } =
    await provider.getSiteData();

  const visualEditingEnabled =
    providerType === "directus" &&
    event.url.searchParams.get("visual-editing") === "true" &&
    PUBLIC_ENABLE_VISUAL_EDITING === "true";

  return {
    contentProvider: providerType,
    globals,
    headerNavigation,
    footerNavigation,
    copyrightNavigation,
    visualEditingEnabled,
  };
};
