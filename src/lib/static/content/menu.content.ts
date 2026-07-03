import { Newspaper, Info, FileText } from '@lucide/svelte';
import type { Component } from 'svelte';

// Use the actual Lucide component type
type IconComponent = Component<Record<string, unknown>, Record<string, never>, string>;

type MenuLinkType = 'page' | 'post' | 'url' | 'group';

interface MenuItem {
	id: string;
	name: string;
	title: string;
	subtitle?: string;
	href: string;
	icon?: IconComponent;
	showInNavbar?: boolean;
	showInMorph?: boolean;
	morph?: string;
	hideDropdown?: boolean;
	isVisible: boolean;
	showInSitemap: boolean;
	showChildren?: boolean;
	children?: ChildMenuItem[];
}

interface ChildMenuItem {
	id: string;
	name: string;
	title: string;
	href: string;
	subtitle?: string;
	icon?: IconComponent;
	isVisible: boolean;
	showInSitemap: boolean;
	children?: ChildMenuItem[];
}

interface DirectusNavigationItem {
	id: string;
	title: string;
	type: MenuLinkType;
	url?: string;
	subheader?: string;
	is_visible: boolean;
	show_in_navbar?: boolean;
	show_in_morph?: boolean;
	morph?: string;
	hide_dropdown?: boolean;
	show_children?: boolean;
	show_in_sitemap: boolean;
	sort: number;
	navigation: string;
	parent?: string;
	children?: DirectusNavigationItem[];
}

const menus: MenuItem[] = [
	{
		id: 'home',
		name: 'Home',
		title: 'Home',
		subtitle: 'Home',
		href: '/',
		isVisible: true,
		showInSitemap: true,
		icon: Newspaper
	},
	{
		id: 'about-the-centre',
		name: 'About the Centre',
		showInNavbar: true,
		title: 'About the Centre',
		href: '/about-the-centre/welcome',
		isVisible: true,
		showInSitemap: true,
		morph: '1',
		showInMorph: true,
		showChildren: true,
		children: [
			{
				id: 'welcome',
				name: 'Welcome',
				title: 'Welcome',
				subtitle: 'Welcome to our website',
				href: '/about-the-centre/welcome',
				isVisible: true,
				showInSitemap: true,
				icon: FileText
			},
			{
				id: 'latest-news',
				name: 'Latest News',
				title: 'Latest News',
				subtitle: 'Our Latest News',
				href: '/about-the-centre/latest-news',
				isVisible: true,
				showInSitemap: true,
				icon: Newspaper
			},
			{
				id: 'aims-and-vision',
				name: 'Aims and Vision',
				title: 'Aims and Vision',
				subtitle: 'Our Aims and Vision',
				href: '/about-the-centre/aims-vision',
				isVisible: true,
				showInSitemap: true,
				icon: Info
			},
			{
				id: 'animal-ethics',
				name: 'Animal Ethics',
				title: 'Animal Ethics',
				subtitle: 'About Animal Ethics',
				href: '/about-the-centre/animal-ethics',
				isVisible: true,
				showInSitemap: true,
				icon: Newspaper
			},
			{
				id: 'animals-and-oxford',
				name: 'Animals and Oxford',
				title: 'Animals and Oxford',
				subtitle: 'About Animals and Oxford',
				href: '/about-the-centre/animals-and-oxford',
				isVisible: true,
				showInSitemap: true,
				icon: FileText
			},
			{
				id: 'jose-ferrater-mora',
				name: 'José Ferrater Mora',
				subtitle: 'About José Ferrater Mora',
				title: 'José Ferrater Mora',
				href: '/about-the-centre/jose-ferrater-mora',
				isVisible: true,
				showInSitemap: true,
				icon: Info
			}
		]
	},
	{
		id: 'who-we-are',
		name: 'Who we are',
		title: 'Who we are',
		href: '/who-we-are/director',
		isVisible: true,
		showInNavbar: true,
		showInSitemap: true,
		morph: '1',
		showInMorph: true,
		showChildren: true,
		children: [
			{
				id: 'director',
				name: 'Director',
				title: 'Director',
				subtitle: 'About the Director',
				href: '/who-we-are/director',
				isVisible: true,
				showInSitemap: true,
				icon: Info
			},
			{
				id: 'deputy-director',
				name: 'Deputy Director',
				title: 'Deputy Director',
				subtitle: 'About the Deputy Director',
				href: '/who-we-are/deputy-director',
				isVisible: true,
				showInSitemap: true,
				icon: FileText
			},
			{
				id: 'honorary-fellows',
				name: 'Honorary Fellows',
				title: 'Honorary Fellows',
				subtitle: 'About Honorary Fellows',
				href: '/who-we-are/honorary-fellows',
				isVisible: true,
				showInSitemap: true,
				icon: Newspaper
			},
			{
				id: 'fellows',
				name: 'Fellows',
				title: 'Fellows',
				subtitle: 'About Fellows',
				href: '/who-we-are/fellows',
				isVisible: true,
				showInSitemap: true,
				icon: Info
			},
			{
				id: 'animal-ethics-society',
				name: 'The Society',
				title: 'The Society',
				subtitle: 'About the Society',
				href: '/who-we-are/animal-ethics-society',
				isVisible: true,
				showInSitemap: true,
				icon: Info
			},
			{
				id: 'gallery',
				name: 'Gallery',
				title: 'Gallery',
				subtitle: 'Our Gallery',
				href: '/who-we-are/gallery',
				isVisible: true,
				showInSitemap: true,
				icon: Newspaper
			}
		]
	},
	{
		id: 'summer-school',
		name: 'Summer School',
		title: 'Summer School',
		href: '/summer-school/call-for-papers',
		isVisible: true,
		showInSitemap: true,
		showChildren: true,
		children: [
			{
				id: 'call-for-papers',
				name: 'Call for Papers',
				title: 'Call for Papers',
				href: '/summer-school/call-for-papers',
				isVisible: true,
				showInSitemap: true
			}
		]
	},
	{
		id: 'what-we-do',
		name: 'What we do',
		title: 'What we do',
		href: '/what-we-do/research',
		isVisible: true,
		showInSitemap: true,
		children: [
			{
				id: 'research',
				name: 'Research',
				title: 'Research',
				href: '/what-we-do/research',
				isVisible: true,
				showInSitemap: true
			}
			// Add other "What we do" subpages here
		]
	},
	{
		id: 'what-we-offer',
		name: 'What we offer',
		title: 'What we offer',
		href: '/what-we-offer/affiliation',
		isVisible: true,
		showInSitemap: true,
		morph: '3',
		showInMorph: true,
		showChildren: true,
		children: [
			{
				id: 'fellowship',
				name: 'Fellowship',
				title: 'Fellowship',
				href: '/what-we-offer/fellowship',
				isVisible: true,
				showInSitemap: true,
				icon: Info
			},
			{
				id: 'associate-institutes',
				name: 'Associate Institutes',
				title: 'Associate Institutes',
				href: '/what-we-offer/associate-institutes',
				isVisible: true,
				showInSitemap: true
			},
			{
				id: 'consultancies',
				name: 'Consultancies',
				title: 'Consultancies',
				href: '/what-we-offer/consultancies',
				isVisible: true,
				showInSitemap: true
			}
		]
	},
	{
		id: 'support-our-work',
		name: 'Support our work',
		title: 'Support our work',
		href: '/how-you-can-help/overview',
		isVisible: true,
		showInSitemap: true,
		children: [
			{
				id: 'overview',
				name: 'Overview',
				title: 'Overview',
				href: '/how-you-can-help/overview',
				isVisible: true,
				showInSitemap: true
			}
			// Add other "Support our work" subpages here
		]
	},
	{
		id: 'Copyright',
		name: 'Copyright',
		title: 'View our copyright information',
		href: '/about/terms-of-service',
		showInSitemap: true,
		isVisible: false,
		hideDropdown: true,
		showChildren: true,
		children: [
			{
				id: 'Terms of Service',
				name: 'Terms of Service',
				title: 'View our terms of service',
				href: '/terms-of-service',
				isVisible: true,
				showInSitemap: true
			},
			{
				id: 'Cookies',
				name: 'Cookies',
				title: 'View our cookie policy',
				href: '/cookies',
				isVisible: true,
				showInSitemap: true
			},
			{
				id: 'Privacy',
				name: 'Privacy',
				title: 'View our privacy policy',
				href: '/privacy',
				isVisible: true,
				showInSitemap: true
			}
		]
	},
	{
		id: 'contact-us',
		name: 'Contact us',
		showInNavbar: true,
		title: 'Contact us',
		href: '/contact-us',
		isVisible: true,
		showInSitemap: true
	}
];

const inferLinkType = (item: MenuItem | ChildMenuItem): MenuLinkType => {
	if (Array.isArray(item.children) && item.children.length > 0) return 'group';
	return 'url';
};

const toDirectusCompatibleNavigation = (
	items: Array<MenuItem | ChildMenuItem>,
	navigationId = 'main',
	parentId?: string
): DirectusNavigationItem[] => {
	return items.map((item, index) => {
		const isChildItem = Boolean(parentId);
		const mapped: DirectusNavigationItem = {
			id: item.id,
			title: item.title,
			type: inferLinkType(item),
			url: item.href || undefined,
			is_visible: item.isVisible,
			show_in_sitemap: item.showInSitemap,
			sort: index + 1,
			navigation: navigationId,
			parent: parentId
		};

		if (!isChildItem) {
			const parentItem = item as MenuItem;
			mapped.subheader = parentItem.subtitle;
			mapped.show_in_navbar = parentItem.showInNavbar;
			mapped.show_in_morph = parentItem.showInMorph;
			mapped.morph = parentItem.morph;
			mapped.hide_dropdown = parentItem.hideDropdown;
			mapped.show_children = parentItem.showChildren;
		}

		if (Array.isArray(item.children) && item.children.length > 0) {
			mapped.children = toDirectusCompatibleNavigation(item.children, navigationId, item.id);
		}

		return mapped;
	});
};

const menusDirectusCompatible = toDirectusCompatibleNavigation(menus);

export { menus };
export { menusDirectusCompatible };
export type { DirectusNavigationItem, MenuItem, MenuLinkType };
