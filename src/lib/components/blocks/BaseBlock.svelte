<script lang="ts">
	import {
		getBlockComponent,
		loadBlock,
		type BlockComponent,
	} from "$lib/components/blocks/loaders";

	interface BaseBlockProps {
		block: {
			collection: string;
			item: unknown;
			id: string;
		};
	}

	let { block }: BaseBlockProps = $props();

	// Component loaded on demand when the route didn't preload this collection
	let lazyComponent = $state<BlockComponent | null | undefined>(undefined);
	const Component = $derived(
		lazyComponent ?? getBlockComponent(block.collection),
	);

	// Fallback for blocks that weren't preloaded by the route's load function
	$effect(() => {
		const collection = block.collection;
		if (getBlockComponent(collection) !== undefined) {
			lazyComponent = undefined;
			return;
		}

		let cancelled = false;
		void loadBlock(collection).then((component) => {
			if (!cancelled) lazyComponent = component;
		});
		return () => {
			cancelled = true;
		};
	});

	// Global ref blocks nest the actual data inside a reference field — unwrap it
	const unwrapItem = (collection: string, item: unknown): unknown => {
		if (!item || typeof item !== "object") return item;
		const refMap: Record<string, string> = {
			block_global_banner_ref: "banner_reference",
			block_global_video_ref: "block_feature_video",
			block_global_fellows_list_ref: "fellows_list_reference",
			block_global_books_ref: "books_reference",
		};
		const key = refMap[collection];
		if (key && key in (item as Record<string, unknown>)) {
			return (item as Record<string, unknown>)[key];
		}
		return item;
	};

	const componentProps = $derived({
		data: unwrapItem(block.collection, block.item),
	});
</script>

{#if Component}
	<Component {...componentProps} />
{:else if Component === null}
	<div class="bg-yellow-100 border-l-4 border-yellow-500 p-4 mb-4">
		<p class="font-bold">
			Warning: No component found for block type "{block.collection}"
		</p>
		<pre class="text-xs mt-2">{JSON.stringify(block, null, 2)}</pre>
	</div>
{/if}
