import { error } from "@sveltejs/kit";
import { z } from "zod";
import { getContentProvider } from "$lib/server/content/get-provider";
import { getDirectusAssetURL } from "$lib/services/directus/asset-utils";
import type { PageServerLoad } from "./$types";

const PostPageSchema = z.coerce.number().int().min(1).max(9999);
const MAX_POST_PAGE_PARAMS = 5;

const parsePostPages = (url: URL): Record<string, number> => {
  const postPages: Record<string, number> = {};
  let count = 0;

  for (const [key, value] of url.searchParams.entries()) {
    if (!key.startsWith("postPage_")) continue;
    if (count >= MAX_POST_PAGE_PARAMS) break;

    const parsed = PostPageSchema.safeParse(value);
    if (!parsed.success) continue;

    postPages[key] = parsed.data;
    count++;
  }

  return postPages;
};

export const load = (async ({ url }) => {
  const provider = getContentProvider();
  // The provider already validates the page against PageModelSchema.
  const page = await provider.getPageByPath(url.pathname, {
    postPages: parsePostPages(url),
  });

  if (!page) {
    throw error(404, "Page not found");
  }

  // `seo` is fetched inline with the page (PAGE_FIELDS) — no extra query needed.
  const seo = page.seo;
  const ogImage = seo?.og_image ? getDirectusAssetURL(seo.og_image) : undefined;

  return {
    page,
    seo: {
      title: seo?.title || page.title,
      description: seo?.meta_description || "",
      ogImage,
      ogTemplateImage: ogImage ? undefined : "/assets/img/og.jpg",
      noIndex: seo?.no_index ?? false,
      noFollow: seo?.no_follow ?? false,
    },
  };
}) satisfies PageServerLoad;
