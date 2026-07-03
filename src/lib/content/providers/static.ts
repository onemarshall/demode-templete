import { staticGlobals } from "$lib/static/content/globals.data";
import { copyrightNavigationLinks } from "$lib/static/content/navigation/copyright.nav";
import { footerNavigationLinks } from "$lib/static/content/navigation/footer.nav";
import { mainNavigationLinks } from "$lib/static/content/navigation/main.nav";
import { menus } from "$lib/static/content/menu.content";
import { buildBaseSiteGlobals, normalizePath } from "./shared";
import {
  NavigationTreeSchema,
  PageBuilderModelSchema,
  PageModelSchema,
  PostDetailSchema,
  SiteDataSchema,
  type NavigationItem,
  type SiteData,
} from "../schema";
import type { ContentProvider, PostFilters } from "../provider";

interface StaticNavigationLink {
  id: string;
  pagePath: string;
  label?: string;
  parentId?: string;
  sort?: number;
  isVisible?: boolean;
  showInNavbar?: boolean;
  showInSitemap?: boolean;
  showChildren?: boolean;
  hideDropdown?: boolean;
  morph?: string;
  showInMorph?: boolean;
  showIconMobile?: boolean;
  showIconDesktop?: boolean;
}

const isGroupLink = (link: StaticNavigationLink): boolean => !normalizePath(link.pagePath);

const normalizeNavigationUrls = (items: unknown): unknown => {
  if (!Array.isArray(items)) return [];

  return items.map((item) => {
    if (!item || typeof item !== "object") return item;

    const current = item as Record<string, unknown>;
    const serializableCurrent = { ...current };
    delete serializableCurrent.icon;
    const children = current.children;
    const subchildren = current.subchildren;

    // Infer type if not present
    let type = current.type;
    if (!type) {
      type = Array.isArray(children) && children.length > 0 ? "group" : "page";
    }

    return {
      ...serializableCurrent,
      type,
      url: typeof current.href === "string" ? current.href : undefined,
      children: Array.isArray(children) ? normalizeNavigationUrls(children) : undefined,
      subchildren: Array.isArray(subchildren) ? normalizeNavigationUrls(subchildren) : undefined,
    };
  });
};

type StaticPageModule = Record<string, unknown>;

const staticPageModules = import.meta.glob("../../static/pages/**/*.page.ts", {
  eager: true,
}) as Record<string, StaticPageModule>;

const discoveredStaticPages = Object.values(staticPageModules)
  .flatMap((moduleExports) => Object.values(moduleExports))
  .flatMap((candidate) => {
    const parsed = PageBuilderModelSchema.safeParse(candidate);
    return parsed.success ? [parsed.data] : [];
  });

const staticPagesByPath = new Map(
  discoveredStaticPages.map((page) => [normalizePath(page.path), page] as const),
);

const ROOT_PARENT_KEY = "__root__";

const sortLinks = (a: StaticNavigationLink, b: StaticNavigationLink): number => {
  const sortDelta = (a.sort ?? 0) - (b.sort ?? 0);
  if (sortDelta !== 0) return sortDelta;
  return (a.label ?? a.pagePath).localeCompare(b.label ?? b.pagePath);
};

const buildNavigationTreeFromLinks = (links: StaticNavigationLink[]): NavigationItem[] => {
  const linkById = new Map(links.map((link) => [link.id, link] as const));

  const validLinks = links.filter((link) => {
    const pagePath = normalizePath(link.pagePath);
    if (!isGroupLink(link) && !staticPagesByPath.has(pagePath)) {
      console.warn(
        `[static] Navigation link "${link.id}" references unknown page path "${link.pagePath}"`,
      );
      return false;
    }

    if (link.parentId && !linkById.has(link.parentId)) {
      console.warn(
        `[static] Navigation link "${link.id}" references unknown parent "${link.parentId}"`,
      );
      return false;
    }

    return true;
  });

  const linksByParent = new Map<string, StaticNavigationLink[]>();

  for (const link of validLinks) {
    const parentKey = link.parentId ?? ROOT_PARENT_KEY;
    const existing = linksByParent.get(parentKey) ?? [];
    existing.push(link);
    linksByParent.set(parentKey, existing);
  }

  const buildChildren = (parentKey: string): NavigationItem[] => {
    const childLinks = (linksByParent.get(parentKey) ?? []).sort(sortLinks);

    return childLinks.map((link) => {
      const href = normalizePath(link.pagePath);
      const page = staticPagesByPath.get(href);
      const title = link.label ?? page?.title ?? href;
      const children = buildChildren(link.id);
      const isGroup = isGroupLink(link);

      return {
        id: link.id,
        title,
        type: isGroup ? ("group" as const) : ("page" as const),
        url: isGroup ? undefined : href,
        is_visible: link.isVisible ?? true,
        show_in_navbar: link.showInNavbar ?? true,
        show_in_sitemap: link.showInSitemap ?? true,
        show_children: children.length > 0 ? true : link.showChildren,
        hide_dropdown: link.hideDropdown,
        morph: link.morph,
        show_in_morph: link.showInMorph,
        show_icon_mobile: link.showIconMobile,
        show_icon_desktop: link.showIconDesktop,
        children: children.length > 0 ? children : undefined,
      };
    });
  };

  return buildChildren(ROOT_PARENT_KEY);
};

const buildSiteData = (): SiteData => {
  const fallbackNavigation = NavigationTreeSchema.parse(normalizeNavigationUrls(menus));
  const linkedHeaderNavigation = NavigationTreeSchema.parse(
    buildNavigationTreeFromLinks(mainNavigationLinks as StaticNavigationLink[]),
  );
  const linkedFooterNavigation = NavigationTreeSchema.parse(
    buildNavigationTreeFromLinks(footerNavigationLinks as StaticNavigationLink[]),
  );
  const linkedCopyrightNavigation = NavigationTreeSchema.parse(
    buildNavigationTreeFromLinks(copyrightNavigationLinks as StaticNavigationLink[]),
  );
  const useLinkNavigation = true;

  const headerNavigation =
    useLinkNavigation && linkedHeaderNavigation.length > 0
      ? linkedHeaderNavigation
      : fallbackNavigation;
  const footerNavigation =
    useLinkNavigation && linkedFooterNavigation.length > 0
      ? linkedFooterNavigation
      : headerNavigation.filter((item) => item.show_in_sitemap);

  return SiteDataSchema.parse({
    globals: {
      ...buildBaseSiteGlobals(),
      ...staticGlobals,
      business_type: staticGlobals.business_type ?? ("commercial" as const),
    },
    headerNavigation,
    footerNavigation,
    copyrightNavigation: linkedCopyrightNavigation,
    newsletterForm: null,
  });
};

export const createStaticContentProvider = (): ContentProvider => ({
  type: "static",
  getSiteData: async () => buildSiteData(),
  getPageByPath: async (path: string) => {
    const page = staticPagesByPath.get(normalizePath(path));
    if (!page) return null;
    return PageModelSchema.parse(page);
  },
  getPostBySlug: async (slug: string) =>
    PostDetailSchema.parse({
      id: slug,
      slug,
      title: slug,
      description: "",
      content: "",
    }),
  getRelatedPosts: async () => [],
  getPaginatedPosts: async (_page: number, _limit: number, _filters?: PostFilters) => [],
  getTotalPostCount: async (_filters?: PostFilters) => 0,
  getAvailableCategories: async () => [],
  getAvailablePostTypes: async () => [],
});

export const staticContentProvider = createStaticContentProvider();
