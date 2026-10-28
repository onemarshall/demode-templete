<script lang="ts">
	import * as Sidebar from '$lib/components/ui/sidebar/index.js';
	import { cn } from '$lib/utils';
	import type { Snippet } from 'svelte';
	import type { SwitcherOrganisation } from '#lib/modules/tenancy/shared/types.js';
	import type { ShellUser } from '../navigation/config';
	import AppHeader from './app-header.svelte';
	import AppSidebar from './app-sidebar.svelte';

	let {
		user = null,
		tenancyEnabled = true,
		organisations = [],
		activeBrandId = null,
		children
	}: {
		user?: ShellUser | null;
		tenancyEnabled?: boolean;
		organisations?: SwitcherOrganisation[];
		activeBrandId?: string | null;
		children: Snippet;
	} = $props();
</script>

<Sidebar.Provider>
	<AppSidebar {user} {tenancyEnabled} />
	<Sidebar.Inset>
		<AppHeader {user} {tenancyEnabled} {organisations} {activeBrandId} />
		<div
			class={cn(
				'bg-background mx-auto flex w-full max-w-(--app-wrapper-max-width) flex-1 flex-col gap-8 p-4 md:p-8'
			)}
		>
			{@render children?.()}
		</div>
	</Sidebar.Inset>
</Sidebar.Provider>
