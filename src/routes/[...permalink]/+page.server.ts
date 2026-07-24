import { error } from "@sveltejs/kit";
import { z } from "zod";
import { getContentProvider } from "$lib/content";
import { PageBuilderModelSchema } from "$lib/content/schema";
import { getSeoData } from "$lib/services/directus/fetchers/seo-fetcher";
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

export const load = (async ({ url, fetch }) => {
  const provider = getContentProvider();
  const page = await provider.getPageByPath(url.pathname, {
    postPages: parsePostPages(url),
  });

  if (!page) {
    throw error(404, "Page not found");
  }

  const parsedPage = PageBuilderModelSchema.safeParse(page);
  if (!parsedPage.success) {
    throw error(500, "Page content is not compatible with PageBuilderModel");
  }

  const seo = await getSeoData(fetch, "page", url.pathname);

  return {
    page: parsedPage.data,
    seo: {
      title: seo.title || parsedPage.data.title,
      description: seo.description || "",
      ogImage: seo.ogImage,
      ogTemplateImage: seo.ogImage ? undefined : "/assets/img/og.jpg",
      noIndex: seo.noIndex ?? false,
      noFollow: seo.noFollow ?? false,
    },
  };
}) satisfies PageServerLoad;
