<script lang="ts">
	import { onMount } from 'svelte';
	import { MetaTags, JsonLd } from 'svelte-meta-tags';
	import { page } from '$app/state';
	import type { SiteGlobals } from '$lib/content/schema';

	interface Props {
		globals?: SiteGlobals;
	}

	let { globals }: Props = $props();

	let baseOrigin = $state('');

	onMount(() => {
		baseOrigin = window.location.origin;
	});

	// Read SEO data from page.data (set by each route's +page.server.ts)
	let seo = $derived(page.data.seo as {
		title?: string;
		description?: string;
		ogImage?: string;
		noIndex?: boolean;
		noFollow?: boolean;
	} | undefined);

	let title = $derived(seo?.title || page.data.page?.title || page.data.post?.title || '');
	let description = $derived(seo?.description || '');
	let noIndex = $derived(seo?.noIndex ?? false);
	let noFollow = $derived(seo?.noFollow ?? false);
	let ogImageUrl = $derived(
		seo?.ogImage
			? `${baseOrigin}${seo.ogImage}`
			: `${baseOrigin}/assets/img/og.jpg`
	);
	let company = $derived(globals?.company || 'Company Name');
</script>

{#if title}
	{#if noIndex || noFollow}
		<MetaTags
			robots={noIndex && noFollow ? 'noindex,nofollow' : noIndex ? 'noindex' : 'nofollow'}
			additionalMetaTags={[
				{
					name: 'googlebot',
					content: noIndex && noFollow ? 'noindex,nofollow' : noIndex ? 'noindex' : 'nofollow'
				}
			]}
			titleTemplate="%s | {company}"
			{title}
			{description}
		/>
	{:else}
		<MetaTags
			titleTemplate="%s | {company}"
			{title}
			{description}
			additionalRobotsProps={{
				maxSnippet: -1,
				maxImagePreview: 'large',
				maxVideoPreview: -1,
				noarchive: false
			}}
			openGraph={{
				siteName: company,
				url: `${page.url}`,
				title,
				description,
				type: 'website',
				images: [
					{
						url: ogImageUrl,
						width: 1200,
						height: 630,
						alt: title
					}
				]
			}}
			twitter={{
				cardType: 'summary_large_image',
				title,
				description,
				image: ogImageUrl,
				imageAlt: title
			}}
		/>
	{/if}

	<JsonLd
		schema={{
			'@type': 'WebPage',
			'@context': 'https://schema.org',
			name: title,
			description,
			url: `${page.url}`,
			image: ogImageUrl,
			publisher: {
				'@type': 'Organization',
				name: company
			}
		}}
	/>
{/if}
