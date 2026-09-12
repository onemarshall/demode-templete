import { preloadBlocks } from "$lib/components/blocks/loaders";
import type { PageBuilderBlock } from "$lib/content/schema";
import type { PageLoad } from "./$types";

export const load = (async ({ data }) => {
  // Warm the block chunk cache before render — on the server for SSR and
  // in the browser on client navigations, so blocks never render empty.
  await preloadBlocks(
    ((data.page?.blocks ?? []) as PageBuilderBlock[]).map((block) => block.collection),
  );
  return data;
}) satisfies PageLoad;
