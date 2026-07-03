<script lang="ts">
	import DirectusImage from "$lib/components/shared/DirectusImage.svelte";
	import setAttr from "$lib/features/directus/visualEditing";
	import { fade } from "scripts/actions";
	import Container from "$lib/components/ui/Container.svelte";
	import Headline from "$lib/components/ui/Headline.svelte";

	interface Props {
		data: {
			id: string;
			title?: string;
			image?: string;
		};
	}

	let { data }: Props = $props();
	const { title, image, id } = $derived(data);
</script>

<section
	class="relative w-full min-h-dvh overflow-hidden"
	data-directus={setAttr({
		collection: "block_image_divider",
		item: id,
		fields: "title",
		mode: "popover",
	})}
>
	{#if image}
		<div class="relative h-96 sm:h-120 lg:h-168">
			<div
				class="h-full w-full"
				data-directus={setAttr({
					collection: "block_image_divider",
					item: id,
					fields: "image",
					mode: "modal",
				})}
			>
				<DirectusImage
					uuid={image}
					alt={title || "Image Divider"}
					layout="fullWidth"
					fit="cover"
					width={1920}
					height={800}
					sizes="100vw"
					breakpoints={[320, 640, 768, 1024, 1280, 1920]}
					maxWidth={1920}
					class="min-h-dvh w-full object-cover"
					loading="lazy"
				/>
			</div>

			<div
				class="absolute inset-y-0 left-0 min-h-dvh w-[82%] bg-black/40 sm:w-[62%] lg:w-[50vw]"
			></div>
			<!-- <div
				class="absolute inset-y-0 left-[40%] w-[34%] bg-linear-to-r from-[#0b1623]/72 via-[#0b1623]/40 to-transparent sm:left-[30%] sm:w-[28%] lg:left-[23%] lg:w-[22%]"
			></div> -->

			{#if title}
				<div class="absolute inset-0">
					<div
						use:fade={{ x: -15, delay: 0.2, duration: 1 }}
						class="max-w-[16rem] px-5 pt-5 sm:max-w-[20rem] sm:px-8 sm:pt-7 lg:min-w-4xl lg:px-10 lg:pt-8"
					>
						<Headline
							headline={title}
							size="md"
							class="leading-none text-white text-balance"
							data-directus={setAttr({
								collection: "block_image_divider",
								item: id,
								fields: "title",
								mode: "popover",
							})}
						/>
					</div>
				</div>
			{/if}
		</div>
	{:else if title}
		<div class="bg-[#0b1623] px-5 py-12 sm:px-8 sm:py-16 lg:px-10 lg:py-20">
			<div class="max-w-[16rem] sm:max-w-60 lg:max-w-md">
				<Headline
					headline={title}
					size="md"
					class="text-white"
					data-directus={setAttr({
						collection: "block_image_divider",
						item: id,
						fields: "title",
						mode: "popover",
					})}
				/>
			</div>
		</div>
	{/if}
</section>
