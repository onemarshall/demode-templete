import { preloadBlocks } from "$lib/components/blocks/loaders";
import type { PageBuilderBlock } from "$lib/content/schema";
import type { PageLoad } from "./$types";

export const load = (async ({ data }) => {
  await preloadBlocks(
    ((data.pageBlocks ?? []) as PageBuilderBlock[]).map((block) => block.collection),
  );
  return data;
}) satisfies PageLoad;
