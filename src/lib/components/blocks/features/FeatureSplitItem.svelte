<script lang="ts">
	/* eslint-disable svelte/no-navigation-without-resolve */
	import { resolve } from "$app/paths";
	import { setAttr } from "$lib/features/directus/visualEditing";
	import {
		resolveDirectusLink,
		type DirectusLinkValue,
	} from "$lib/utils/directus-links";
	import DirectusImage from "$lib/components/shared/DirectusImage.svelte";
	import Headline from "$lib/components/ui/Headline.svelte";

	interface FeatureSplitItemData {
		id: string | number;
		title?: string | null;
		description?: string | null;
		link_label?: string | null;
		theme?: "light" | "dark" | null;
		image?: string | null | { id: string };
		link?: string | DirectusLinkValue | null;
		reverse_layout?: boolean | null;
		is_first?: boolean | null;
		is_last?: boolean | null;
	}

	let { data } = $props<{
		data: FeatureSplitItemData;
	}>();

	const link = $derived(resolveDirectusLink(data.link));

	const containerClass = $derived(
		data.theme === "dark" ? "bg-gray-900" : "bg-gray-200",
	);
	const contentClass = $derived(
		data.theme === "dark"
			? "bg-gray-700 text-white"
			: "bg-gray-200 text-foreground",
	);
	const headingClass = $derived(
		data.theme === "dark" ? "text-white" : "text-foreground",
	);
	const imageOrderClass = $derived(data.reverse_layout ? "lg:order-2" : "");
	const isFirst = $derived(Boolean(data.is_first));
	const isLast = $derived(Boolean(data.is_last));
	const imageWrapperClass = $derived(
		data.reverse_layout
			? `overflow-hidden ${
					isFirst
						? "rounded-t-sm lg:rounded-tr-sm"
						: "rounded-t-none lg:rounded-tr-none"
				} ${
					isLast
						? "rounded-b-none lg:rounded-br-sm"
						: "rounded-b-none lg:rounded-br-none"
				} lg:rounded-tl-none lg:rounded-bl-none`
			: `overflow-hidden ${
					isFirst
						? "rounded-t-sm lg:rounded-tl-sm"
						: "rounded-t-none lg:rounded-tl-none"
				} ${
					isLast
						? "rounded-b-none lg:rounded-bl-sm"
						: "rounded-b-none lg:rounded-bl-none"
				} lg:rounded-tr-none lg:rounded-br-none`,
	);
	const contentRoundingClass = $derived(
		data.reverse_layout
			? `${isFirst ? "rounded-t-none lg:rounded-tl-sm" : "rounded-t-none lg:rounded-tl-none"} ${
					isLast
						? "rounded-b-sm lg:rounded-bl-sm"
						: "rounded-b-none lg:rounded-bl-none"
				} lg:rounded-tr-none lg:rounded-br-none`
			: `${isFirst ? "rounded-t-none lg:rounded-tr-sm" : "rounded-t-none lg:rounded-tr-none"} ${
					isLast
						? "rounded-b-sm lg:rounded-br-sm"
						: "rounded-b-none lg:rounded-br-none"
				} lg:rounded-tl-none lg:rounded-bl-none`,
	);
</script>

<section
	class="relative z-1 px-0"
	data-directus={setAttr({
		collection: "block_feature_split_items",
		item: data.id,
		fields: "title,description,link_label,link,image,theme,reverse_layout",
		mode: "popover",
	})}
>
	<!-- <div class="mx-auto w-[calc(100%-3rem)] max-w-lg lg:max-w-5xl xl:max-w-7xl"> -->
	<div class="lg:grid lg:grid-cols-2">
		{#if data.image}
			<div
				class={`h-[18em] md:h-[30em] ${imageOrderClass} ${imageWrapperClass}`}
			>
				<DirectusImage
					uuid={typeof data.image === "object" && data.image !== null
						? data.image.id
						: data.image}
					alt={data.title || "Feature image"}
					layout="fullWidth"
					class="h-full w-full object-cover"
					sizes="(max-width: 1024px) 100vw, 50vw"
					maxWidth={960}
				/>
			</div>
		{/if}

		<div
			class={`flex h-full flex-col gap-3 p-6 lg:p-8 ${contentClass} ${contentRoundingClass} ${containerClass}`}
		>
			<Headline headline={data.title} size="md" class={headingClass} />

			{#if data.description}
				<p class="text-sm leading-6 opacity-85 text-balance">
					{data.description}
				</p>
			{/if}

			{#if link.href && data.link_label}
				<p class="mt-auto">
					{#if !link.isExternal}
						<a
							href={resolve(link.href as "/")}
							class="group relative inline-block origin-bottom-left text-inherit no-underline transition-all duration-300 ease-out hover:scale-[1.3] after:absolute after:bottom-0 after:left-0 after:z-1 after:h-[2px] after:w-full after:bg-current after:opacity-[0.15] after:transition-all after:duration-300 after:ease-out after:content-[''] hover:after:h-full"
						>
							<span
								class="relative z-2 inline-block transition-all duration-300 ease-out group-hover:scale-[0.7]"
							>
								{data.link_label}
							</span>
						</a>
					{:else}
						<a
							href={link.href}
							target="_blank"
							rel="noopener noreferrer"
							class="group relative inline-block origin-bottom-left text-inherit no-underline transition-all duration-300 ease-out hover:scale-[1.3] after:absolute after:bottom-0 after:left-0 after:z-1 after:h-[2px] after:w-full after:bg-current after:opacity-[0.15] after:transition-all after:duration-300 after:ease-out after:content-[''] hover:after:h-full"
						>
							<span
								class="relative z-2 inline-block transition-all duration-300 ease-out group-hover:scale-[0.7]"
							>
								{data.link_label}
							</span>
						</a>
					{/if}
				</p>
			{/if}
		</div>
	</div>
	<!-- </div> -->
</section>
