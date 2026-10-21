import {
	LayoutGridIcon,
	UserRoundIcon,
	MonitorSmartphoneIcon,
	LockKeyholeIcon,
	CreditCardIcon,
	SparklesIcon,
	UsersIcon,
	ShieldCheckIcon
} from "@lucide/svelte";
import type { Component } from "svelte";

export type ShellUser = {
	id: string;
	email: string;
	name?: string | null;
	image?: string | null;
	role?: string | null;
};

export type SidebarNavItem = {
	title: string;
	path?: string;
	icon?: Component;
	subItems?: SidebarNavItem[];
};

export type SidebarNavGroup = {
	label?: string;
	items: SidebarNavItem[];
};

export const navGroups: SidebarNavGroup[] = [
	{
		label: "Overview",
		items: [
			{
				title: "Dashboard",
				path: "/auth/dashboard",
				icon: LayoutGridIcon
			}
		]
	},
	{
		label: "Account",
		items: [
			{
				title: "Profile",
				path: "/auth/profile",
				icon: UserRoundIcon
			},
			{
				title: "Security",
				path: "/auth/security",
				icon: LockKeyholeIcon
			},
			{
				title: "Sessions & devices",
				path: "/auth/sessions",
				icon: MonitorSmartphoneIcon
			}
		]
	},
	{
		label: "Billing",
		items: [
			{
				title: "Subscription",
				path: "/auth/billing",
				icon: CreditCardIcon
			},
			{
				title: "Pricing",
				path: "/auth/pricing",
				icon: SparklesIcon
			}
		]
	}
];

export const adminNavGroup: SidebarNavGroup = {
	label: "Administration",
	items: [
		{
			title: "Users",
			path: "/admin/users",
			icon: UsersIcon
		},
		{
			title: "Security",
			path: "/admin/security",
			icon: ShieldCheckIcon
		}
	]
};

export function getNavGroups(user: ShellUser | null | undefined): SidebarNavGroup[] {
	return user?.role === "admin" ? [...navGroups, adminNavGroup] : navGroups;
}

export function getNavLinks(user: ShellUser | null | undefined): SidebarNavItem[] {
	return getNavGroups(user).flatMap((group) =>
		group.items.flatMap((item) => (item.subItems?.length ? [item, ...item.subItems] : [item]))
	);
}

export function isItemActive(pathname: string, item: SidebarNavItem): boolean {
	if (!item.path) return false;
	return pathname === item.path || pathname.startsWith(`${item.path}/`);
}
