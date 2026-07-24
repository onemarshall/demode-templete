<script lang="ts">
	import { invalidateAll } from '$app/navigation'
	import { page } from '$app/state'
	import { PUBLIC_DIRECTUS_URL } from '$app/env/public'
	import PageBuilder from '$lib/components/layout/PageBuilder.svelte'
	import type { PageBuilderModel } from '$lib/content/schema'
	import { Button } from '$lib/components/ui/button'
	import { Pencil } from '@lucide/svelte'
	import { setAttr } from '$lib/services/directus/visualEditing'
	import type { Attachment } from 'svelte/attachments'

	let { data }: { data: { page: PageBuilderModel } } = $props()

	const visualEditingAttachment: Attachment<HTMLElement> = (node) => {
		let cancelled = false
		void (async () => {
			const { apply } = await import('@directus/visual-editing')
			if (cancelled) return

			const directusUrl = PUBLIC_DIRECTUS_URL || 'http://localhost:8055'

			apply({
				directusUrl,
				onSaved: async () => {
					await invalidateAll()
				},
			})

			const editButton = node.querySelector('#visual-editing-button')
			if (!(editButton instanceof HTMLElement)) return

			apply({
				directusUrl,
				elements: editButton,
				customClass: 'visual-editing-button-class',
				onSaved: async () => {
					await invalidateAll()
				},
			})
		})()

		return () => {
			cancelled = true
		}
	}
</script>

<svelte:head>
	<title>{data.page.title} | {page.data.global?.globals?.title || 'Site Name'}</title>
</svelte:head>

<div
	class="relative"
	{@attach page.data.visualEditingEnabled && data.page?.path && visualEditingAttachment}
>
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
				<Pencil data-icon="inline-start" />
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
