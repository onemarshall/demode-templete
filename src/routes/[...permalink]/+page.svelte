<script lang="ts">
	import { invalidateAll } from '$app/navigation'
	import { page } from '$app/state'
	import { env } from '$env/dynamic/public'
	import PageBuilder from '$lib/components/layout/PageBuilder.svelte'
	import type { PageBuilderModel } from '$lib/content/schema'
	import { Button } from '$lib/components/ui/button'
	import { Pencil } from '@lucide/svelte'
	import { setAttr } from '$lib/features/directus/visualEditing'

	let { data }: { data: { page: PageBuilderModel } } = $props()

	$effect(() => {
		if (page.data.visualEditingEnabled && data.page?.path) {
			applyVisualEditing()
		}
	})

	const applyVisualEditing = async () => {
		const { apply } = await import('@directus/visual-editing')
		const directusUrl = env.PUBLIC_DIRECTUS_URL || 'http://localhost:8055'

		apply({
			directusUrl,
			onSaved: async () => {
				await invalidateAll()
			},
		})

		apply({
			directusUrl,
			elements: document.querySelector('#visual-editing-button') as HTMLElement,
			customClass: 'visual-editing-button-class',
			onSaved: async () => {
				await invalidateAll()
			},
		})
	}
</script>

<svelte:head>
	<title>{data.page.title} | {page.data.siteData?.globals?.title || 'Site Name'}</title>
</svelte:head>

<div class="relative">
	<PageBuilder sections={data.page.blocks} />
	{#if page.data.visualEditingEnabled && data.page?.path}
		<div class="fixed inset-x-0 bottom-4 z-50 flex w-full items-center justify-center gap-2 p-4">
			<!-- Visual Editing Helper -->
			<Button
				id="visual-editing-button"
				variant="secondary"
				class="visual-editing-button-class"
				data-directus={setAttr({
					collection: 'pages',
					item: data.page.path,
					fields: ['blocks'],
					mode: 'modal',
				})}
			>
				<Pencil class="mr-2 size-4" />
				Edit All Blocks
			</Button>
		</div>
	{/if}
</div>

<style>
	:global(
			.directus-visual-editing-overlay.visual-editing-button-class
				.directus-visual-editing-edit-button
		) {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		transform: none;
		background: transparent;
	}
</style>
