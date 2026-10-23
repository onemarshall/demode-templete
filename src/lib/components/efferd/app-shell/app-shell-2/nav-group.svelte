<script lang="ts">
	import { page } from "$app/state";
	import { isItemActive, type SidebarNavGroup } from "./app-shared.ts";
	import * as Collapsible from "$lib/components/ui/collapsible/index.js";
	import * as Sidebar from "$lib/components/ui/sidebar/index.js";
	import { ChevronRightIcon } from "@lucide/svelte";

	let { label, items }: SidebarNavGroup = $props();

	const sidebar = Sidebar.useSidebar();
	const pathname = $derived(page.url.pathname);
	const closeMobileSidebar = () => sidebar.setOpenMobile(false);
</script>

<Sidebar.Group>
	{#if label}
		<Sidebar.GroupLabel>{label}</Sidebar.GroupLabel>
	{/if}
	<Sidebar.Menu>
		{#each items as item (item.title)}
			{@const Icon = item.icon}
			<Collapsible.Root
				open={isItemActive(pathname, item) || item.subItems?.some((i) => isItemActive(pathname, i))}
				class="group/collapsible"
			>
				{#snippet child({ props })}
					<Sidebar.MenuItem {...props}>
						{#if item.subItems?.length}
							<Collapsible.Trigger>
								{#snippet child({ props })}
									<Sidebar.MenuButton {...props} tooltipContent={item.title}>
										{#if item.icon}
											<item.icon />
										{/if}
										<span>{item.title}</span>
										<ChevronRightIcon
											class="ms-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90"
										/>
									</Sidebar.MenuButton>
								{/snippet}
							</Collapsible.Trigger>
							<Collapsible.Content>
								<Sidebar.MenuSub>
									{#each item.subItems as subItem (subItem.title)}
										<Sidebar.MenuSubItem>
											<Sidebar.MenuSubButton isActive={isItemActive(pathname, subItem)}>
												{#snippet child({ props })}
									<a href={subItem.path} {...props} onclick={closeMobileSidebar}>
														<span>{subItem.title}</span>
													</a>
												{/snippet}
											</Sidebar.MenuSubButton>
										</Sidebar.MenuSubItem>
									{/each}
								</Sidebar.MenuSub>
							</Collapsible.Content>
						{:else}
							<Sidebar.MenuButton isActive={isItemActive(pathname, item)}>
								{#snippet child({ props })}
								<a {...props} href={item.path} onclick={closeMobileSidebar}>
										<Icon />
										<span>{item.title}</span>
									</a>
								{/snippet}
							</Sidebar.MenuButton>
						{/if}
					</Sidebar.MenuItem>
				{/snippet}
			</Collapsible.Root>
		{/each}
	</Sidebar.Menu>
</Sidebar.Group>
