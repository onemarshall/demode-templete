<script lang="ts">
	import * as Sidebar from '$lib/components/ui/sidebar/index.js';
	import Logo from '../branding/logo.svelte';
	import { cn } from '$lib/utils';
	import { getNavGroups, type ShellUser } from '../navigation/config';
	import NavGroup from './nav-group.svelte';

	let { user = null, tenancyEnabled = true }: { user?: ShellUser | null; tenancyEnabled?: boolean } =
		$props();

	const appName = 'Montsel';
	/** The product home when tenancy is on; the account overview otherwise. */
	const homeHref = $derived(tenancyEnabled ? '/app' : '/auth/dashboard');
	const groups = $derived(getNavGroups(user, { tenancyEnabled }));
</script>

<Sidebar.Root
	class={cn(
		'*:data-[slot=sidebar-inner]:bg-background',
		'**:data-[slot=sidebar-menu-button]:[&>span]:text-foreground/75'
	)}
	variant="sidebar"
	collapsible="icon"
>
	<Sidebar.Header class="h-14 justify-center border-b px-2">
		<Sidebar.Menu>
			<Sidebar.MenuButton>
				{#snippet child({ props })}
					<a {...props} href={homeHref}>
						<Logo class="size-6" />
						<span class="text-foreground! font-mono font-medium tracking-tighter">{appName}</span>
					</a>
				{/snippet}
			</Sidebar.MenuButton>
		</Sidebar.Menu>
	</Sidebar.Header>
	<Sidebar.Content>
		{#each groups as group, index (group.label ?? `group-${index}`)}
			{#if index > 0}
				<Sidebar.Separator class="mx-2 my-2" />
			{/if}
			<NavGroup {...group} />
		{/each}
	</Sidebar.Content>
	<Sidebar.Footer class="gap-0 p-0">
		<div
			class="border-t px-4 pt-4 pb-2 transition-opacity group-data-[collapsible=icon]:pointer-events-none group-data-[collapsible=icon]:opacity-0"
		>
			<p class="text-muted-foreground text-[9px] text-nowrap">
				© {new Date().getFullYear()} {appName}
			</p>
		</div>
	</Sidebar.Footer>
</Sidebar.Root>
