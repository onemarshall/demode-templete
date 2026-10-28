<script lang="ts">
	import { page } from '$app/state';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Separator } from '$lib/components/ui/separator';
	import { SearchIcon, SparklesIcon } from '@lucide/svelte';
	import type { SwitcherOrganisation } from '#lib/modules/tenancy/shared/types.js';
	import { assistantPath, getNavLinks, isItemActive, type ShellUser } from '../navigation/config';
	import AppBreadcrumb from './app-breadcrumb.svelte';
	import CustomSidebarTrigger from './custom-sidebar-trigger.svelte';
	import NavUser from './nav-user.svelte';
	import ShellBrandSwitcher from './shell-brand-switcher.svelte';
	import ThemeToggle from './theme-toggle.svelte';

	let {
		user = null,
		tenancyEnabled = true,
		organisations = [],
		activeBrandId = null
	}: {
		user?: ShellUser | null;
		tenancyEnabled?: boolean;
		organisations?: SwitcherOrganisation[];
		activeBrandId?: string | null;
	} = $props();

	const pathname = $derived(page.url.pathname);
	const links = $derived(getNavLinks(user, { tenancyEnabled }));
	const activeItem = $derived(links.find((link) => isItemActive(pathname, link)) ?? links[0]);
	const showSwitcher = $derived(tenancyEnabled && organisations.length > 0 && Boolean(activeBrandId));
	const searchQuery = $derived(page.url.searchParams.get('q') ?? '');
</script>

<header
	class="bg-background/95 supports-backdrop-filter:bg-background/50 sticky top-0 z-50 flex h-14 shrink-0 items-center justify-between gap-3 border-b px-4 backdrop-blur-sm md:px-6"
>
	<div class="flex min-w-0 items-center gap-3">
		<CustomSidebarTrigger />
		<Separator class="h-4 data-[orientation=vertical]:self-center" orientation="vertical" />
		{#if showSwitcher && activeBrandId}
			<ShellBrandSwitcher {organisations} {activeBrandId} />
		{:else if activeItem}
			<AppBreadcrumb page={activeItem} />
		{/if}
	</div>
	<div class="flex items-center gap-2">
		{#if tenancyEnabled}
			<form method="GET" action="/app/documents" role="search" class="hidden md:block">
				<label class="sr-only" for="shell-search">Search documents</label>
				<div class="relative">
					<SearchIcon
						class="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2"
					/>
					<Input
						id="shell-search"
						name="q"
						type="search"
						placeholder="Search…"
						value={pathname.startsWith('/app/documents') ? searchQuery : ''}
						class="h-8 w-48 pl-8 text-sm"
					/>
				</div>
			</form>
			<Button variant="outline" size="sm" href={assistantPath}>
				<SparklesIcon class="size-4" />
				<span class="hidden sm:inline">AI Assistant</span>
			</Button>
		{/if}
		<ThemeToggle />
		<Separator class="h-4 data-[orientation=vertical]:self-center" orientation="vertical" />
		<NavUser {user} />
	</div>
</header>
