<script lang="ts">
	import type {
		NavigationItem,
		NavigationTree,
		SiteGlobals,
	} from "$lib/content/schema";
	import { resolvePathname } from "$lib/utils/path";
	import { CookiePreferencesButton } from "$lib/services/cookie-consent";

	interface Props {
		globals?: SiteGlobals;
		navigation?: NavigationTree;
		styles?: string;
		tagstyles?: string;
	}

	let { globals, navigation = [], styles, tagstyles }: Props = $props();

	const year = new Date().getFullYear();

	const copyrightNav = $derived(
		navigation.filter((item) => item.is_visible !== false),
	);

	const url = (item: NavigationItem): string =>
		item.url ?? item.page?.permalink ?? item.post?.permalink ?? "/";
</script>

<div
	class="flex flex-col md:flex-row md:items-start md:justify-between gap-4 {tagstyles ??
		''}"
>
	<div class="space-y-1 text-xs text-foreground/50 {styles ?? ''}">
		<p>
			<span class="font-medium text-foreground/70"
				>{globals?.footer_design_by_content}</span
			>
			<a
				class="text-accent transition-colors hover:opacity-80"
				target="_blank"
				rel="external noopener noreferrer"
				data-sveltekit-preload-data="off"
				href={globals?.url}>{globals?.footer_design_by_name}</a
			>
		</p>
		<p>
			{#if globals?.title}&copy;&nbsp;{year}&nbsp;{globals.title}.&nbsp;{/if}
			{globals?.address}. All rights reserved.
		</p>
	</div>

	{#if copyrightNav.length}
		<nav aria-label="Copyright navigation">
			<ul
				class="flex gap-6 text-xs text-foreground/50 shrink-0 items-center"
			>
				{#each copyrightNav as item (item.id)}
					<li>
						<a
							class="hover:text-foreground transition-colors"
							href={resolvePathname(url(item) as "/")}
							>{item.title}</a
						>
					</li>
				{/each}
				<li>
					<CookiePreferencesButton
						className="hover:text-foreground transition-colors"
					/>
				</li>
			</ul>
		</nav>
	{/if}
</div>
