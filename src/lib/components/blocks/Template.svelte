<!--
  BLOCK CATALOG — block_[name]
  ════════════════════════════════════════════════════════════════════════════════

  VISUAL
  [Describe the rendered layout. What does the eye see first? Column structure,
  image placement, density, spacing. Write this by looking at the live block.]

  BEST FOR
  [What content type and editorial intent does this block suit best? When should
  an editor reach for this over other blocks?]

  AVOID WHEN
  [Explicit situations where this block breaks down or where a different block
  should be used instead. Name the alternative.]

  TONE / FEEL
  [The design character — not the mechanics. E.g. "editorial and considered",
  "high-energy, promotional", "quiet, academic". Write from the live render.]

  REQUIRED CONTENT
  [Minimum content needed for the block to not look broken. List required vs
  optional fields.]

  PAIRS WELL WITH
  [What blocks naturally come before and after this one in a page sequence.]

  FIELDS
  [List the key fields from the Directus collection.]
  ════════════════════════════════════════════════════════════════════════════════
-->
<script lang="ts">
	import { cn } from "$lib/utils";
	import { setAttr } from "$lib/services/directus/visualEditing";
	import DirectusImage from "$lib/components/shared/DirectusImage.svelte";
	import Text from "$lib/components/ui/Text.svelte";
	import Headline from "$lib/components/ui/Headline.svelte";

	interface Template {
		id: string;
		title?: string | null;
		description?: string | null;
		content?: string | null;
		date_created?: string | null;
		user_created?: string | null;
		date_updated?: string | null;
		user_updated?: string | null;
		// Add any additional fields specific to your template block
		[key: string]:
			| string
			| number
			| boolean
			| null
			| undefined
			| Record<string, unknown>;
	}

	let { data } = $props<{
		data: Template;
	}>();

	// Add your component logic here
</script>

<div
	class={cn("template-block", {
		// Add conditional classes here
	})}
	data-directus={setAttr({
		collection: "template_blocks",
		item: data.id,
		fields: "content",
		mode: "popover",
	})}
>
	<div class="container mx-auto px-4 py-12">
		<!-- Add your block content here -->
		<div class="prose max-w-none">
			<Headline headline={data?.title} size="md" class="mb-4" />

			{#if data?.content}
				<Text
					content={data?.content}
					data-directus={setAttr({
						collection: "block_richtext",
						item: data.id,
						fields: "content",
						mode: "drawer",
					})}
				/>
			{/if}

			{#if data?.image}
				<DirectusImage
					uuid={typeof data.image === "object" && data.image !== null
						? data.image.id
						: data.image}
					alt={data.title}
					fill
					sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
					class="h-auto w-full object-cover transition-transform duration-300"
				/>
			{/if}
		</div>
	</div>
</div>

<style>
	/* Add your component styles here */
</style>
