<script lang="ts">
	import setAttr from "$lib/services/directus/visualEditing";
	import type { FormField } from "$lib/types/directus-schema";
	import FormBuilder from "../forms/FormBuilder.svelte";
	import Headline from "$lib/components/ui/Headline.svelte";
	import Tagline from "$lib/components/ui/Tagline.svelte";
	import Container from "$lib/components/ui/Container.svelte";

	interface FormBlockProps {
		data: {
			id: string;
			tagline: string | null;
			headline: string | null;
			layout?: FormLayout | null;
			form: {
				id: string;
				on_success?: "redirect" | "message" | null;
				sort?: number | null;
				submit_label?: string;
				success_message?: string | null;
				title?: string | null;
				success_redirect_url?: string | null;
				is_active?: boolean | null;
				fields: FormField[];
			};
		};
	}

	type FormLayout = "single" | "multi";

	const { data }: FormBlockProps = $props();
	const { tagline, headline, form, layout } = $derived(data);
	const resolvedLayout: FormLayout = $derived(layout ?? "single");
</script>

<section class="mx-auto py-12 md:py-20">
	<Container>
		<div
			class={resolvedLayout === "single"
				? "mx-auto max-w-2xl"
				: "mx-auto max-w-4xl"}
		>
			{#if tagline}
				<Tagline
					{tagline}
					data-directus={setAttr({
						collection: "block_form",
						item: data.id,
						fields: "tagline",
						mode: "popover",
					})}
				/>
			{/if}
			{#if headline}
				<Headline
					{headline}
					data-directus={setAttr({
						collection: "block_form",
						item: data.id,
						fields: "headline",
						mode: "popover",
					})}
				/>
			{/if}
			<div
				data-directus={setAttr({
					collection: "block_form",
					item: data.id,
					fields: ["form"],
					mode: "popover",
				})}
			>
				<FormBuilder {form} layout={resolvedLayout} class="mt-8" />
			</div>
		</div>
	</Container>
</section>
