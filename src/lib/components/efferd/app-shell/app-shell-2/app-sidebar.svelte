<script lang="ts">
	import * as Sidebar from "$lib/components/ui/sidebar/index.js";
	import Logo from "$lib/svgs/logo.svelte";
	import { cn } from "$lib/utils";
	import { publicEnv } from "#lib/auth/shared/env/index.js";
	import { getNavGroups, type ShellUser } from "./app-shared";
	import LatestChange from "./latest-change.svelte";
	import NavGroup from "./nav-group.svelte";

	let { user = null }: { user?: ShellUser | null } = $props();

	const sidebar = Sidebar.useSidebar();
	const appName = publicEnv.PUBLIC_APP_NAME;
	const groups = $derived(getNavGroups(user));
</script>

<Sidebar.Root
	class={cn(
		"*:data-[slot=sidebar-inner]:bg-background",
		"**:data-[slot=sidebar-menu-button]:[&>span]:text-foreground/75",
		sidebar.open &&
			"*:data-[slot=sidebar-inner]:dark:bg-[radial-gradient(60%_18%_at_10%_0%,--theme(--color-foreground/.08),transparent)] transition-all duration-300"
	)}
	variant="sidebar"
	collapsible="icon"
>
	<Sidebar.Header class="h-14 justify-center border-b px-2">
		<Sidebar.Menu>
			<Sidebar.MenuButton>
				{#snippet child({ props })}
					<a {...props} href="/auth/dashboard">
						<Logo class="size-6" />
						<span class="font-mono font-medium tracking-tighter text-foreground!"
							>{appName}</span
						>
					</a>
				{/snippet}
			</Sidebar.MenuButton>
		</Sidebar.Menu>
	</Sidebar.Header>
	<Sidebar.Content>
		{#each groups as group (group.label ?? group.items[0]?.title)}
			<NavGroup {...group} />
		{/each}
	</Sidebar.Content>
	<Sidebar.Footer class="gap-0 p-0">
		<LatestChange />
		<div
			class="border-t px-4 pt-4 pb-2 transition-opacity group-data-[collapsible=icon]:pointer-events-none group-data-[collapsible=icon]:opacity-0"
		>
			<p class="text-[9px] text-nowrap text-muted-foreground">
				© {new Date().getFullYear()} {appName}
			</p>
		</div>
	</Sidebar.Footer>
	<!-- <Sidebar.Rail /> -->
</Sidebar.Root>
