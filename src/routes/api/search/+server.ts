import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { createDirectusClient } from "$lib/features/directus/fetchers/shared";
import { readItems } from "@directus/sdk";

const MAX_QUERY_LENGTH = 100;
const MAX_RESULTS = 50;

export const GET: RequestHandler = async ({ request, fetch }) => {
  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search")?.trim().slice(0, MAX_QUERY_LENGTH);

  if (!search || search.length < 3) {
    return json({ error: "Query must be at least 3 characters." }, { status: 400 });
  }

  const directus = createDirectusClient(fetch);

  try {
    const [pages, posts] = await Promise.all([
      directus.request(
        readItems("pages", {
          filter: {
            _or: [{ title: { _contains: search } }, { permalink: { _contains: search } }],
          },
          fields: ["id", "title", "permalink"],
          limit: MAX_RESULTS,
        }),
      ),
      directus.request(
        readItems("posts", {
          filter: {
            _and: [
              { status: { _eq: "published" } },
              {
                _or: [
                  { title: { _contains: search } },
                  { description: { _contains: search } },
                  { slug: { _contains: search } },
                  { content: { _contains: search } },
                ],
              },
            ],
          },
          fields: ["id", "title", "description", "slug"],
          limit: MAX_RESULTS,
        }),
      ),
    ]);

    const results = [
      ...pages.map((page) => ({
        id: page.id,
        title: page.title,
        type: "Page",
        link: `/${(page.permalink as string).replace(/^\/+/, "")}`,
      })),
      ...posts.map((post) => ({
        id: post.id,
        title: post.title,
        description: post.description,
        type: "Post",
        link: `/news/${post.slug}`,
      })),
    ].slice(0, MAX_RESULTS);

    return json(results);
  } catch (error) {
    console.error("Error fetching search results:", error);
    return json({ error: "Failed to fetch search results." }, { status: 500 });
  }
};
