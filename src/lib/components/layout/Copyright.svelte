<script lang="ts">
	import type { NavigationItem, NavigationTree, SiteGlobals } from '$lib/content/schema'
	import { resolve } from '$app/paths'
	import { CookiePreferencesButton } from '$lib/features/cookie-consent'

	interface Props {
		globals?: SiteGlobals
		navigation?: NavigationTree
		styles?: string
		tagstyles?: string
	}

	let { globals, navigation = [], styles, tagstyles }: Props = $props()

	const year = new Date().getFullYear()

	const copyrightNav = $derived(navigation.filter((item) => item.is_visible !== false))

	const url = (item: NavigationItem): string =>
		item.url ?? item.page?.permalink ?? item.post?.permalink ?? '/'
</script>

<div class="flex flex-col md:flex-row md:items-start md:justify-between gap-4 {tagstyles ?? ''}">
	<div class="space-y-1 text-xs text-white/50 {styles ?? ''}">
		<p>
			<span class="font-medium text-white/70">{globals?.footer_design_by_content}</span>
			<a
				class="text-blue-300 hover:text-blue-200 transition-colors"
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
			<ul class="flex gap-6 text-xs text-white/50 shrink-0 items-center">
				{#each copyrightNav as item (item.id)}
					<li>
						<a class="hover:text-white transition-colors" href={resolve(url(item) as '/')}
							>{item.title}</a
						>
					</li>
				{/each}
				<li>
					<CookiePreferencesButton className="hover:text-white transition-colors" />
				</li>
			</ul>
		</nav>
	{/if}
</div>
