import { resolve } from "$app/paths";
import type { AppTypes } from "$app/types";

type Path = ReturnType<AppTypes["Path"]>;

export const normalizePath = (path: string): string => {
  const trimmed = path.trim();
  if (!trimmed || trimmed === "/") return "/";
  const withLeadingSlash = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  return withLeadingSlash.endsWith("/") ? withLeadingSlash.slice(0, -1) : withLeadingSlash;
};

/** Resolve a dynamic pathname (with optional search/hash) while accounting for `config.paths.base`. */
export const resolvePathname = (pathname: string): string =>
  resolve(pathname.replace(/^\//, "") as Path);
