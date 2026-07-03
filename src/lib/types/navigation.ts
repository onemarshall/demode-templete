export interface NavItemType {
	id: string;
	title: string;
	type: 'page' | 'post' | 'url' | 'group';
	url?: string;
	sort?: number;
	is_visible?: boolean;
	show_in_navbar?: boolean;
	show_in_morph?: boolean;
	show_in_sitemap?: boolean;
	morph?: string;
	show_children?: boolean;
	hide_dropdown?: boolean;
	icon?: string;
	label?: string;
	show_label?: boolean;
	page?: {
		id: string;
		title: string;
		permalink?: string;
		status: string;
	};
	post?: {
		id: string;
		title: string;
		permalink?: string;
		status: string;
	};
	children?: NavItemType[];
}

export interface NavigationType {
	id: string;
	title: string;
	is_active: boolean;
	items: NavItemType[];
}

export interface GlobalsType {
	id: string;
	title: string;
	description?: string | null;
	tagline?: string | null;
	url?: string | null;
	domain?: string | null;
	company?: string | null;
	business_type?: 'nonprofit' | 'commercial' | 'personal' | 'educational';
	address?: string | null;
	vat_number?: string | null;
	accent_color?: string | null;
	favicon?: string | null;
	logo?: string | null;
	logo_dark_mode?: string | null;
	social_links?: Array<{
		service:
			| 'facebook'
			| 'instagram'
			| 'linkedin'
			| 'x'
			| 'vimeo'
			| 'youtube'
			| 'github'
			| 'discord'
			| 'docker';
		url: string;
		label?: string | null;
	}> | null;
	analytics_id?: string | null;
	google_search_console?: string | null;
	cdn_url?: string | null;
	footer_design_by_name?: string | null;
	footer_design_by_content?: string | null;
}
