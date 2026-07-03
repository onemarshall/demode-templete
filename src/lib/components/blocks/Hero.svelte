<script lang="ts">
	import DirectusImage from "$lib/components/shared/DirectusImage.svelte";
	import BaseText from "$lib/components/ui/Text.svelte";
	import ButtonGroup from "./ButtonGroup.svelte";
	import type { ButtonProps } from "./Button.svelte";
	import Headline from "$lib/components/ui/Headline.svelte";
	import setAttr from "$lib/features/directus/visualEditing";
	import { fade } from "scripts/actions";
	import { getDirectusAssetURL } from "$lib/features/directus/asset-utils";

	interface Props {
		data: {
			id: string;
			title: string;
			headline: string;
			word: string;
			layout: "top" | "middle" | "bottom";
			description: string;
			alignment: "top" | "middle" | "bottom";
			image: string | null;
			video: {
				id: string;
				poster?: string | null;
			} | null;
			show_event_info?: boolean | null;
			event_badge?: string | null;
			event_date?: string | null;
			event_location?: string | null;
			button_group?: {
				id: string;
				buttons: Array<{
					id: string;
					label: string | null;
					variant: string | null;
					url: string | null;
					type: "url" | "page" | "post";
					pagePermalink?: string | null;
					postSlug?: string | null;
				}>;
			};
		};
	}

	let { data }: Props = $props();
	const alignment = $derived(data?.alignment);
	const headline = $derived(data?.headline);
	const description = $derived(data?.description);
	const image = $derived(data?.image);
	const video = $derived(data?.video);
	const button_group = $derived(data?.button_group);
	const layout = $derived(data?.layout);
	const id = $derived(data?.id);
	const word = $derived(data?.word);

	const showEventInfo = $derived(Boolean(data?.show_event_info));
	const eventBadge = $derived(
		showEventInfo ? data?.event_badge?.trim() || null : null,
	);
	const eventDate = $derived(
		showEventInfo ? data?.event_date?.trim() || null : null,
	);
	const eventLocation = $derived(
		showEventInfo ? data?.event_location?.trim() || null : null,
	);
	const hasEventMeta = $derived(Boolean(eventDate || eventLocation));

	// Determine which media to display: video takes priority over image
	const videoAssetId = $derived(video?.id ?? null);
	const hasVideo = $derived(Boolean(videoAssetId));
	const hasImage = $derived(image && !hasVideo);
	const mediaType = $derived(hasVideo ? "video" : hasImage ? "image" : null);

	// Get poster image for video (fallback to image if available)
	const posterImage = $derived(video?.poster ?? null);

	type LayoutPosition = "top" | "middle" | "bottom";

	function normalizeLayout(value: Props["data"]["layout"]): LayoutPosition {
		return value;
	}

	const verticalLayout = $derived<LayoutPosition>(normalizeLayout(layout));

	const validVariants = [
		"default",
		"destructive",
		"outline",
		"pill",
		"secondary",
		"ghost",
		"link",
	] as const;

	function toButtonVariant(variant: string | null): ButtonProps["variant"] {
		if (
			variant &&
			validVariants.includes(variant as (typeof validVariants)[number])
		) {
			return variant as ButtonProps["variant"];
		}

		return null;
	}

	const buttons = $derived<ButtonProps[]>(
		(button_group?.buttons ?? []).map((button) => ({
			id: button.id,
			label: button.label,
			variant: toButtonVariant(button.variant),
			url: button.url,
			type: button.type,
			page: button.pagePermalink
				? { permalink: button.pagePermalink }
				: undefined,
			post: button.postSlug ? { slug: button.postSlug } : undefined,
		})),
	);
</script>

<section
	class="relative isolate overflow-hidden rounded-none bg-primary-900 text-white min-h-[680px] md:min-h-[760px]"
>
	{#if mediaType}
		<div
			class="absolute inset-x-0 top-0 h-full md:inset-0 md:h-auto"
			use:fade={{ x: -30, duration: 1 }}
			data-directus={setAttr({
				collection: "block_hero",
				item: id,
				fields: [mediaType, "layout"],
				mode: "modal",
			})}
		>
			{#if mediaType === "video"}
				<div class="hero-video-wrapper absolute inset-0">
					<img
						src={getDirectusAssetURL(videoAssetId)}
						alt={headline || "Video Preview"}
						class="h-full w-full object-cover"
					/>
					<video
						autoplay
						loop
						muted
						playsinline
						src={getDirectusAssetURL(videoAssetId)}
						class="h-full w-full object-cover"
					></video>
				</div>
			{:else if mediaType === "image"}
				<DirectusImage
					uuid={image}
					layout="fullWidth"
					loading="eager"
					fetchpriority="high"
					alt={headline || "Hero Image"}
					sizes="100vw"
					class="h-full w-full object-cover object-top"
				/>
			{/if}
			<div
				class="absolute inset-0 bg-[linear-gradient(180deg,color-mix(in_srgb,var(--color-contrast-high)_18%,transparent)_0%,color-mix(in_srgb,var(--color-contrast-high)_28%,transparent)_42%,color-mix(in_srgb,var(--color-contrast-high)_78%,transparent)_100%)] md:bg-[linear-gradient(90deg,color-mix(in_srgb,var(--color-contrast-high)_52%,transparent)_0%,color-mix(in_srgb,var(--color-contrast-high)_25%,transparent)_32%,color-mix(in_srgb,var(--color-contrast-high)_22%,transparent)_58%,color-mix(in_srgb,var(--color-contrast-high)_8%,transparent)_100%)]"
			></div>
			<!-- <div
				class="absolute inset-0 bg-[linear-gradient(180deg,color-mix(in_srgb,var(--color-contrast-high)_20%,transparent)_0%,color-mix(in_srgb,var(--color-contrast-high)_10%,transparent)_45%,color-mix(in_srgb,var(--color-contrast-high)_18%,transparent)_100%)]"
			></div> -->
		</div>
	{:else}
		<div
			class="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(28,74,123,0.45),transparent_45%),linear-gradient(135deg,#07152a_0%,#0a2342_100%)]"
		></div>
	{/if}

	<div
		class="relative z-10 flex min-h-[680px] w-full flex-col pt-80 px-6 md:min-h-dvh md:px-10 md:pb-14 md:pt-8 lg:px-14"
	>
		<div
			class={verticalLayout === "top"
				? "flex flex-1 items-start pt-0 md:pt-14"
				: verticalLayout === "middle"
					? "flex flex-1 items-center"
					: "flex flex-1 items-end"}
		>
			<div
				class={verticalLayout === "top"
					? "grid w-full grid-cols-1 gap-8 pb-8 md:grid-cols-[minmax(0,44rem)_auto] md:items-start md:pb-14"
					: verticalLayout === "middle"
						? "grid w-full grid-cols-1 gap-8 md:grid-cols-[minmax(0,80em)_auto] md:items-center"
						: "grid w-full grid-cols-1 gap-8 pb-8 md:grid-cols-[minmax(0,44rem)_auto] md:items-end md:pb-14"}
			>
				<div
					class={alignment === "middle"
						? "flex flex-col items-center gap-5 text-center"
						: alignment === "bottom"
							? "flex flex-col items-end gap-5 text-right"
							: "flex flex-col items-start gap-5 text-left"}
				>
					{#if eventBadge}
						<span
							class="inline-flex items-center rounded-full border border-white/40 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/90 backdrop-blur-sm"
							use:fade={{ x: -20, delay: 0.2, duration: 0.8 }}
							data-directus={setAttr({
								collection: "block_hero",
								item: id,
								fields: "event_badge",
								mode: "popover",
							})}
						>
							{eventBadge}
						</span>
					{/if}

					{#if headline}
						<!-- use:splitText on the wrapper div — SplitText traverses into child text nodes -->

						<div
							class=""
							// use:splitText={{ preset: 'FxType9' }}
							use:fade={{ x: -40, delay: 0.3, duration: 1 }}
							// use:splitText={{ type: 'chars', stagger: 0.01 }}
							data-directus={setAttr({
								collection: "block_hero",
								item: id,
								fields: "headline",
								mode: "popover",
							})}
						>
							<Headline
								{headline}
								as="h1"
								size="xl"
								class="font-serif font-medium text-balance font-heading leading-[1.01] tracking-[-0.02em] text-[#ffffff] "
							/>
						</div>
					{/if}
					{#if description}
						<div
							class="max-w-3xl"
							use:fade={{ x: -30, delay: 0.5, duration: 0.8 }}
							data-directus={setAttr({
								collection: "block_hero",
								item: id,
								fields: "description",
								mode: "popover",
							})}
						>
							<BaseText
								content={description}
								class=" max-w-none! bg-transparent! text-base! leading-6! lg:leading-8! text-[#d4ddf0]! prose-p:my-0 prose-p:text-inherit md:text-2xl! text-balance"
							/>
						</div>
					{/if}

					{#if hasEventMeta}
						<div
							class="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs uppercase tracking-[0.18em] text-white/75"
							use:fade={{ x: -20, delay: 0.65, duration: 0.8 }}
							data-directus={setAttr({
								collection: "block_hero",
								item: id,
								fields: "event_date,event_location",
								mode: "popover",
							})}
						>
							{#if eventDate}
								<span>{eventDate}</span>
							{/if}
							{#if eventDate && eventLocation}
								<span class="text-white/40" aria-hidden="true"
									>·</span
								>
							{/if}
							{#if eventLocation}
								<span>{eventLocation}</span>
							{/if}
						</div>
					{/if}
					{#if button_group && button_group.buttons.length > 0}
						<div
							class={alignment === "middle"
								? "mt-2 flex justify-center"
								: alignment === "bottom"
									? "mt-2 flex justify-end"
									: "mt-2"}
							use:fade={{ x: -40, duration: 0.5 }}
							data-directus={setAttr({
								collection: "block_button_group",
								item: button_group.id,
								fields: "buttons",
								mode: "modal",
							})}
						>
							<ButtonGroup
								{buttons}
								class="flex flex-wrap gap-3 [&_.button-group]:contents [&_button]:rounded-full [&_button]:border [&_button]:border-white [&_button]:bg-transparent [&_button]:px-5 [&_button]:py-2 [&_button]:text-xs [&_button]:font-medium [&_button]:text-white [&_button:hover]:bg-white [&_button:hover]:text-[#07152a]"
							/>
						</div>
					{/if}
				</div>

				<div class="hidden justify-end md:flex">
					<div
						class="flex items-center gap-4 text-[0.95rem] tracking-[0.24em] text-white/75 [writing-mode:vertical-rl]"
					>
						<span class="text-2xl">{word}</span>
					</div>
				</div>
			</div>
		</div>

		<!-- <div
			class="flex items-end justify-between text-[0.7rem] tracking-[0.18em] text-white/45 uppercase"
		>
			<span>Ethics</span>
			<span>Compassionate</span>
		</div> -->
	</div>
</section>

<style>
	:global(.hero-video-wrapper img),
	:global(.hero-video-wrapper video) {
		position: absolute;
		top: 0;
		left: 0;
		object-fit: cover;
		height: 100%;
		width: 100%;
	}
	:global(.hero-video-wrapper img) {
		display: none;
	}
	@media (prefers-reduced-motion: reduce) {
		:global(.hero-video-wrapper video) {
			visibility: hidden;
		}
		:global(.hero-video-wrapper img) {
			display: block;
		}
	}
</style>
