import {
  ChartNoAxesColumnIcon,
  CircleHelpIcon,
  CreditCardIcon,
  FileTextIcon,
  LayersIcon,
  LayoutDashboardIcon,
  LayoutGridIcon,
  LockKeyholeIcon,
  MonitorSmartphoneIcon,
  SettingsIcon,
  ShieldCheckIcon,
  TagIcon,
  UserRoundIcon,
  UsersIcon,
} from "@lucide/svelte";
import type { Component } from "svelte";
import { isAdminUser } from "#lib/modules/auth/shared/roles.js";
import type { SwitcherOrganisation } from "#lib/modules/tenancy/shared/types.js";

export type ShellUser = {
  id: string;
  email: string;
  name?: string | null;
  image?: string | null;
  role?: string | string[] | null;
};

export type SidebarNavItem = {
  title: string;
  path?: string;
  icon?: Component;
  requiresTenancy?: boolean;
  /** Match the path exactly. Used for section roots such as /app. */
  exact?: boolean;
  subItems?: SidebarNavItem[];
};

export type SidebarNavGroup = {
  label?: string;
  items: SidebarNavItem[];
};

/**
 * One navigation for the whole authenticated app (UI specification §2).
 *
 * The product area and the account area share a single sidebar, so moving
 * between them never changes the shell and every destination has a route back.
 * Product destinations require tenancy and are hidden when it is disabled.
 */
export const navGroups: SidebarNavGroup[] = [
  {
    items: [
      {
        title: "Dashboard",
        path: "/app",
        icon: LayoutDashboardIcon,
        exact: true,
        requiresTenancy: true,
      },
      {
        title: "Diagnostic",
        path: "/app/diagnostic",
        icon: ChartNoAxesColumnIcon,
        requiresTenancy: true,
      },
      { title: "Strategy", path: "/app/strategy", icon: LayersIcon, requiresTenancy: true },
      { title: "Tools", path: "/app/tools", icon: LayoutGridIcon, requiresTenancy: true },
      { title: "Documents", path: "/app/documents", icon: FileTextIcon, requiresTenancy: true },
    ],
  },
  {
    label: "Account",
    items: [
      {
        title: "Account settings",
        icon: SettingsIcon,
        subItems: [
          { title: "Profile", path: "/auth/profile", icon: UserRoundIcon },
          { title: "Sign-in & security", path: "/auth/security", icon: LockKeyholeIcon },
          { title: "Sessions & devices", path: "/auth/sessions", icon: MonitorSmartphoneIcon },
          { title: "Security activity", path: "/auth/activity", icon: ShieldCheckIcon },
          { title: "Account & privacy", path: "/auth/account", icon: SettingsIcon },
          { title: "Subscription & billing", path: "/auth/billing", icon: CreditCardIcon },
        ],
      },
      { title: "Organisations", path: "/organisations", icon: TagIcon, requiresTenancy: true },
      { title: "Help", path: "/app/help", icon: CircleHelpIcon, requiresTenancy: true },
    ],
  },
];

export const adminNavGroup: SidebarNavGroup = {
  label: "Administration",
  items: [
    {
      title: "Users & access",
      path: "/admin/users",
      icon: UsersIcon,
    },
    {
      title: "Security activity",
      path: "/admin/security",
      icon: ShieldCheckIcon,
    },
  ],
};

/** Global AI entry, kept in the header rather than the sidebar (§5.7). */
export const assistantPath = "/app/assistant";

export const helpTopics = [
  {
    title: "Choose a product",
    body: "Start with a diagnostic, work through the strategy, or explore the tools.",
  },
  { title: "Complete your work", body: "Follow a clear process with guidance at each step." },
  { title: "Access your outputs", body: "Find all your documents in one place." },
] as const;

export function getNavGroups(
  user: ShellUser | null | undefined,
  { tenancyEnabled = true }: { tenancyEnabled?: boolean } = {},
): SidebarNavGroup[] {
  const groups = user && isAdminUser(user) ? [...navGroups, adminNavGroup] : navGroups;
  if (tenancyEnabled) return groups;
  return groups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => !item.requiresTenancy),
    }))
    .filter((group) => group.items.length > 0);
}

export function getNavLinks(
  user: ShellUser | null | undefined,
  options: { tenancyEnabled?: boolean } = {},
): SidebarNavItem[] {
  return getNavGroups(user, options).flatMap((group) =>
    group.items.flatMap((item) => (item.subItems?.length ? [item, ...item.subItems] : [item])),
  );
}

export function isItemActive(pathname: string, item: SidebarNavItem): boolean {
  if (!item.path) return false;
  if (item.exact) return pathname === item.path;
  return pathname === item.path || pathname.startsWith(`${item.path}/`);
}

/**
 * The brand to display in the header switcher.
 *
 * Display only: a cookie value that is no longer in the user's assigned brands
 * is ignored, and nothing here grants access. Switching re-validates server-side.
 */
export function displayBrandId(
  organisations: readonly SwitcherOrganisation[],
  preferred: string | null | undefined,
): string | null {
  const assigned = organisations.flatMap((organisation) =>
    organisation.brands.map((brand) => brand.brandId),
  );
  if (preferred && assigned.includes(preferred)) return preferred;
  return assigned[0] ?? null;
}
