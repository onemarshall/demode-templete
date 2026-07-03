<script lang="ts">
	import { resolve } from "$app/paths";
	import { featureSticky } from "scripts/actions/featureSticky";
	import { setAttr } from "$lib/features/directus/visualEditing";
	import {
		resolveDirectusLink,
		type DirectusLinkValue,
	} from "$lib/shared/utils/directus-links";
	import DirectusImage from "$lib/components/shared/DirectusImage.svelte";
	import Container from "$lib/components/ui/Container.svelte";
	import Headline from "$lib/components/ui/Headline.svelte";
	import { Button } from "$lib/components/ui/button/index.js";

	interface FeatureStickyItemData {
		id: string | number;
		title?: string | null;
		sub_title?: string | null;
		image?: string | null | { id: string };
		sort?: number | null;
		cta_label?: string | null;
		cta_link?: DirectusLinkValue | string | null;
		show_cta?: boolean | null;
	}

	interface FeatureStickyBlock {
		id: string | number;
		title?: string | null;
		Version?: "v1" | "v2" | null;
		items?: FeatureStickyItemData[] | null;
	}

	let { data } = $props<{
		data: FeatureStickyBlock;
	}>();

	function getItemLink(item: FeatureStickyItemData) {
		return resolveDirectusLink(item.cta_link);
	}

	function shouldShowItemCta(item: FeatureStickyItemData) {
		const link = getItemLink(item);
		return (
			item.show_cta !== false &&
			Boolean(item.cta_label?.trim() && link.href?.trim())
		);
	}

	let rootElement: HTMLElement | null = $state(null);
	let activeIndex = $state(0);

	const items = $derived(
		(data.items ?? [])
			.slice()
			.sort(
				(a: FeatureStickyItemData, b: FeatureStickyItemData) =>
					(a.sort ?? 0) - (b.sort ?? 0),
			),
	);

	const versionClass = $derived(
		data.Version === "v1" ? "bg-white" : "bg-white",
	);

	function getItemImageUuid(item: FeatureStickyItemData) {
		return typeof item.image === "object" && item.image !== null
			? item.image.id
			: item.image;
	}

	function handleActiveChange(index: number) {
		activeIndex = index;
	}
</script>

<section
	class={`py-8 lg:py-12 ${versionClass}`}
	bind:this={rootElement}
	use:featureSticky={{ onActiveChange: handleActiveChange }}
>
	<Container>
		<div
			data-directus={setAttr({
				collection: "block_feature_sticky",
				item: data.id,
				fields: "title,Version,items",
				mode: "popover",
			})}
		>
			{#if data.title}
				<div class="mb-10 max-w-3xl text-start lg:mb-14">
					<Headline
						headline={data.title}
						size="sm"
						class="tracking-tight"
					/>
				</div>
			{/if}

			{#if items.length}
				<div class="grid grid-cols-12 lg:gap-8">
					<div class="col-span-12 lg:col-span-6 xl:col-span-5">
						<ul
							class="grid grid-cols-12 gap-y-12 lg:gap-y-32 lg:py-[50vh] md:pl-10"
							data-sticky-feature-content-list
						>
							{#each items as item, index (item.id)}
								<li
									class:sticky-feature-current-item={activeIndex ===
										index}
									class="col-span-12"
									data-sticky-feature-item
									data-directus={setAttr({
										collection:
											"block_feature_sticky_items",
										item: item.id,
										fields: "title,sub_title,image,cta_label,cta_link,show_cta",
										mode: "popover",
									})}
								>
									{#if item.title}
										<button
											type="button"
											data-sticky-feature-title
											class="sticky-feature__title relative cursor-default pl-8 text-left text-3xl font-serif font-semibold tracking-tight transition-opacity duration-300 lg:cursor-pointer lg:pl-10 lg:text-6xl lg:opacity-30"
											aria-current={activeIndex === index
												? "true"
												: undefined}
										>
											<span
												aria-hidden="true"
												class="text-primary-500 absolute top-0 -left-1 md:-left-5 text-4xl mg:text-6xl leading-none"
											>
												✛
											</span>
											<span>{item.title}</span>
										</button>
									{/if}

									{#if item.sub_title}
										<p
											data-sticky-feature-title
											class="sticky-feature__title cursor-default mt-4 max-w-xl pl-8 text-base leading-7 text-gray-500 transition-opacity duration-300 lg:mt-5 lg:cursor-pointer lg:pl-10 lg:text-lg lg:opacity-30"
										>
											{item.sub_title}
										</p>
									{/if}

									{#if item.image}
										<figure
											class="mt-5 aspect-16/9 overflow-hidden rounded-sm shadow-md lg:sr-only"
										>
											<DirectusImage
												uuid={getItemImageUuid(item)}
												alt={item.title ||
													"Feature image"}
												layout="constrained"
												class="block h-full w-full object-cover"
												sizes="(max-width: 1024px) 100vw, 50vw"
												maxWidth={960}
											/>
										</figure>
									{/if}

									{#if shouldShowItemCta(item)}
										{@const itemLink = getItemLink(item)}
										<div
											class="sticky-feature__title mt-6 md:pl-8 transition-opacity duration-300 lg:pl-10 lg:opacity-30"
										>
											{#if !itemLink.isExternal}
												<Button
													variant="outline"
													class="rounded-full"
													size="lg"
													href={resolve(
														itemLink.href as "/",
													)}
												>
													{item.cta_label}
												</Button>
											{:else}
												<Button
													variant="outline"
													class="rounded-full"
													size="lg"
													href={itemLink.href}
													target="_blank"
													rel="noopener noreferrer"
												>
													{item.cta_label}
												</Button>
											{/if}
										</div>
									{/if}
								</li>
							{/each}
						</ul>
					</div>

					<div
						class="hidden lg:col-span-6 lg:block xl:col-start-7"
						aria-hidden="true"
						data-sticky-feature-media
					>
						<ul
							class="relative h-screen after:pointer-events-none after:absolute after:right-0 after:bottom-0 after:h-[100px] after:w-screen after:bg-linear-to-t after:from-white after:via-white/80 after:to-white/0 after:content-[''] before:pointer-events-none before:absolute before:top-0 before:right-0 before:h-[100px] before:w-screen before:bg-linear-to-b before:from-white before:via-white/80 before:to-white/0 before:content-['']"
						>
							{#each items as item, index (item.id)}
								<li
									class:sticky-feature-current-item={activeIndex ===
										index}
									class="absolute top-0 left-0 z-1 flex h-full w-full items-center justify-center"
								>
									{#if item.image}
										<figure
											class="sticky-feature__media-figure h-[752px] w-full max-w-[1000px] overflow-hidden rounded-sm shadow-md opacity-0 transition-opacity duration-300"
										>
											<DirectusImage
												uuid={getItemImageUuid(item)}
												alt={item.title ||
													"Feature image"}
												layout="constrained"
												class="block h-full min-h-full w-full min-w-full object-cover"
												sizes="(max-width: 1000px) 70vw, 80vw"
												maxWidth={1000}
											/>
										</figure>
									{/if}
								</li>
							{/each}
						</ul>
					</div>
				</div>
			{/if}
		</div>
	</Container>
</section>

<style>
	.sticky-feature-current-item .sticky-feature__media-figure {
		opacity: 1;
	}

	@media (min-width: 64rem) {
		.sticky-feature__title:hover,
		.sticky-feature-current-item .sticky-feature__title {
			opacity: 1;
		}
	}
</style>
