<script lang="ts">
	import type { PageBuilderBlock } from '$lib/content/schema'
	import BaseBlock from '$lib/components/blocks/BaseBlock.svelte'

	interface Props {
		sections: PageBuilderBlock[]
	}

	let { sections }: Props = $props()

	const validBlocks = $derived(
		sections
			.filter((block) => block.hide_block !== true)
			.sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0))
	)
</script>

{#each validBlocks as block (block.id)}
	<BaseBlock {block} />
{/each}
