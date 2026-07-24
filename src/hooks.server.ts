import { sequence } from "@sveltejs/kit/hooks";
import { nanoid } from "nanoid";
import type { Handle } from "@sveltejs/kit";
import {
  fetchRedirects,
  type SvelteRedirect,
} from "$lib/services/directus/fetchers/redirect-fetcher";
import { normalizePath } from "$lib/utils/path";
import { CMS_PROVIDER } from "$app/env/private";
import { PUBLIC_CMS_PROVIDER, PUBLIC_SITE_URL } from "$app/env/public";

/* -------------------------------------------------------------------------- */
/*  Environment validation                                                     */
/* -------------------------------------------------------------------------- */

if (
  PUBLIC_SITE_URL &&
  PUBLIC_SITE_URL.includes("localhost") &&
  typeof globalThis.process !== "undefined" &&
  globalThis.process.env?.NODE_ENV === "production"
) {
  console.warn(
    "[WARN] PUBLIC_SITE_URL contains 'localhost' in production. CSP, sitemaps, and RSS will use incorrect URLs.",
  );
}

/* -------------------------------------------------------------------------- */
/*  Redirect cache — fetched once then refreshed periodically                 */
/* -------------------------------------------------------------------------- */

const REDIRECT_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

let redirectCache: SvelteRedirect[] | null = null;
let redirectCacheTimestamp = 0;

const getRedirects = async (): Promise<SvelteRedirect[]> => {
  // Only fetch redirects in Directus mode
  const provider = (
    CMS_PROVIDER ??
    PUBLIC_CMS_PROVIDER ??
    "static"
  ).toLowerCase();
  if (provider !== "directus") return [];

  const now = Date.now();
  if (!redirectCache || now - redirectCacheTimestamp > REDIRECT_CACHE_TTL_MS) {
    redirectCache = await fetchRedirects();
    redirectCacheTimestamp = now;
  }
  return redirectCache;
};

/* -------------------------------------------------------------------------- */
/*  Handlers                                                                  */
/* -------------------------------------------------------------------------- */

const directusRedirectHandle: Handle = async ({ event, resolve }) => {
  const pathname = normalizePath(event.url.pathname);
  const redirects = await getRedirects();
  const match = redirects.find((redirect) => redirect.source === pathname);

  if (match) {
    const status = match.permanent ? 301 : 302;
    const location = new URL(match.destination, event.url).toString();
    return Response.redirect(location, status);
  }

  return resolve(event);
};

const contentTypeFilterHandle: Handle = ({ event, resolve }) =>
  resolve(event, {
    filterSerializedResponseHeaders: (key) => key.toLowerCase() === "content-type",
  });

const nonceHandle: Handle = ({ event, resolve }) => {
  event.locals.nonce = nanoid();
  return resolve(event);
};

const fontPreloadHandle: Handle = ({ event, resolve }) =>
  resolve(event, {
    preload: ({ type }) => type === "font" || type === "js" || type === "css",
  });

/* -------------------------------------------------------------------------- */
/*  Entry point                                                               */
/* -------------------------------------------------------------------------- */

export const handle = sequence(
  directusRedirectHandle,
  contentTypeFilterHandle,
  fontPreloadHandle,
  nonceHandle,
);
