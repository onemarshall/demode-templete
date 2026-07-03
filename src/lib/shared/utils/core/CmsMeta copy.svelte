<script lang="ts">
  import { onMount } from 'svelte';
  import { MetaTags, JsonLd } from 'svelte-meta-tags';
  import { page } from '$app/state';
  import { fetchSeoData } from '$lib/features/forms/remote/seo.remote';
  import type { SiteGlobals } from '$lib/content/schema';

  interface Props {
    contentType: 'page' | 'post';
    slug: string;
    globals?: SiteGlobals;
    fallbackTitle?: string;
    fallbackDescription?: string;
    noindex?: boolean;
  }

  let {
    contentType,
    globals,
    slug,
    fallbackTitle,
    fallbackDescription = 'This page needs a description!',
    noindex = false
  }: Props = $props();

  let cmsSeoData = $state({
    title: undefined as string | undefined,
    description: undefined as string | undefined,
    ogImage: undefined as string | undefined,
    noIndex: undefined as boolean | undefined,
    noFollow: false
  });

  let isLoading = $state(true);
  let baseOrigin = $state('');

  onMount(() => {
    baseOrigin = window.location.origin;
  });

  // Derived values combining CMS data with fallbacks
  let metaTitle = $derived(cmsSeoData.title || fallbackTitle || 'Untitled');
  let metaDescription = $derived(cmsSeoData.description || fallbackDescription || '');
  let computedNoIndex = $derived(cmsSeoData.noIndex ?? noindex);
  let computedNoFollow = $derived(cmsSeoData.noFollow ?? false);
  let ogImageUrl = $derived(cmsSeoData.ogImage ? `${baseOrigin}${cmsSeoData.ogImage}` : `${baseOrigin}/assets/img/og.jpg`);

  $effect(() => {
    if (slug && contentType) {
      isLoading = true;

      const loadSeoData = async () => {
        try {
          const data = await fetchSeoData({
            type: contentType,
            slug,
            fallbackTitle,
            fallbackDescription
          });

          cmsSeoData = {
            title: data.title,
            description: data.description,
            ogImage: data.ogImage,
            noIndex: data.noIndex,
            noFollow: data.noFollow ?? false
          };
        } catch (error) {
          console.warn(`[CmsMeta] Failed to fetch SEO data for ${contentType} "${slug}":`, error);
        } finally {
          isLoading = false;
        }
      };

      loadSeoData();
    }
  });
</script>

{#if !isLoading && metaTitle}
  {#if computedNoIndex || computedNoFollow}
    <MetaTags
      robots={computedNoIndex && computedNoFollow ? 'noindex,nofollow' : computedNoIndex ? 'noindex' : 'nofollow'}
      additionalMetaTags={[
        {
          name: 'googlebot',
          content: computedNoIndex && computedNoFollow ? 'noindex,nofollow' : computedNoIndex ? 'noindex' : 'nofollow'
        }
      ]}
      titleTemplate="%s | {globals?.company}"
      title={metaTitle}
      description={metaDescription}
    />
  {:else}
    <MetaTags
      titleTemplate="%s | {globals?.company}"
      title={metaTitle}
      description={metaDescription}
      additionalRobotsProps={{
        maxSnippet: -1,
        maxImagePreview: 'large',
        maxVideoPreview: -1,
        noarchive: false
      }}
      openGraph={{
        siteName: globals?.company || 'Company Name',
        url: `${page.url}`,
        title: metaTitle,
        description: metaDescription,
        type: 'website',
        images: [
          {
            url: ogImageUrl,
            width: 1200,
            height: 630,
            alt: metaTitle
          }
        ]
      }}
      twitter={{
        cardType: 'summary_large_image',
        title: metaTitle,
        description: metaDescription,
        image: ogImageUrl,
        imageAlt: metaTitle
      }}
    />
  {/if}

  <JsonLd
    schema={{
      '@type': 'WebPage',
      '@context': 'https://schema.org',
      name: metaTitle,
      description: metaDescription,
      url: `${page.url}`,
      image: ogImageUrl,
      publisher: {
        '@type': 'Organization',
        name: globals?.company || 'Company Name'
      }
    }}
  />
{:else}
  <MetaTags
    titleTemplate="%s | {globals?.company}"
    title={fallbackTitle || 'Loading...'}
    description={fallbackDescription}
  />
{/if}
