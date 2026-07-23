<script lang="ts">
	import { setAttr } from "$lib/features/directus/visualEditing";
	import { getDirectusAssetURL } from "$lib/features/directus/asset-utils";
	import { fade, parallaxImage } from "scripts/actions";
	import Container from "$lib/components/ui/Container.svelte";
	import DirectusImage from "$lib/components/shared/DirectusImage.svelte";
	import Text from "$lib/components/ui/Text.svelte";
	import ButtonGroup from "$lib/components/blocks/ButtonGroup.svelte";
	import type { ButtonProps } from "$lib/components/blocks/Button.svelte";
	import MediaPlayer from "$lib/components/shared/MediaPlayer.svelte";
	import TypoEventDetails from "$lib/components/shared/TypoEventDetails.svelte";
	import TypoEventResources from "$lib/components/shared/TypoEventResources.svelte";

	interface ImageWithFocalPoint {
		id: string;
		focal_point_x?: number | null;
		focal_point_y?: number | null;
		width?: number | null;
		height?: number | null;
	}

	const getFocalPosition = (
		img: ImageWithFocalPoint | string | null | undefined,
	): string | undefined => {
		if (!img || typeof img === "string") return undefined;
		const { focal_point_x, focal_point_y, width, height } = img;
		if (focal_point_x == null || focal_point_y == null || !width || !height)
			return undefined;
		const x = Math.round((focal_point_x / width) * 100);
		const y = Math.round((focal_point_y / height) * 100);
		return `${x}% ${y}%`;
	};

	interface VideoField {
		service?: string;
		id?: string;
		url?: string;
		[key: string]: unknown;
	}

	interface TypoTempleteBlock {
		id: string | number;
		layout?: "v1" | "v2" | "v3" | "v4" | "v5" | "v6" | null;
		label?: string | null;
		title?: string | null;
		content?: string | null;
		image?: ImageWithFocalPoint | string | null;
		image_second?: ImageWithFocalPoint | string | null;
		show_image?: boolean | null;
		show_content?: boolean | null;
		show_button?: boolean | null;
		show_video?: boolean | null;
		video?: VideoField | null;
		show_event_info?: boolean | null;
		subtitle?: string | null;
		partner_name?: string | null;
		partner_url?: string | null;
		programme_pdf?:
			| string
			| {
					id: string;
					filename_download?: string | null;
					title?: string | null;
					type?: string | null;
			  }
			| null;
		programme_pdf_label?: string | null;
		gallery_url?: string | null;
		press_release_post?:
			| string
			| {
					id: string;
					slug?: string | null;
					title?: string | null;
			  }
			| null;
		press_release_post_label?: string | null;
		buttons?: {
			id: string;
			buttons?: Array<Record<string, unknown>>;
		} | null;
	}

	let { data } = $props<{ data: TypoTempleteBlock }>();

	const layout = $derived(data.layout ?? "v1");
	const label = $derived(data.label?.trim() || "");
	const title = $derived(data.title?.trim() || "");
	const content = $derived(data.content ?? "");
	const imageId = $derived(
		typeof data.image === "string" ? data.image : (data.image?.id ?? null),
	);
	const image2Id = $derived(
		typeof data.image_second === "string"
			? data.image_second
			: (data.image_second?.id ?? null),
	);
	const imageFocal = $derived(getFocalPosition(data.image));
	const image2Focal = $derived(getFocalPosition(data.image_second));
	const showImage = $derived(data.show_image !== false);
	const showContent = $derived(data.show_content !== false);
	const showButton = $derived(data.show_button === true);
	const showVideo = $derived(data.show_video === true);
	const video = $derived(data.video ?? null);

	const showEventInfo = $derived(Boolean(data.show_event_info));
	const subtitle = $derived(
		showEventInfo ? data.subtitle?.trim() || null : null,
	);
	const partnerName = $derived(
		showEventInfo ? data.partner_name?.trim() || null : null,
	);
	const partnerUrl = $derived(
		showEventInfo ? data.partner_url?.trim() || null : null,
	);

	const programmePdfFile = $derived.by(() => {
		if (!showEventInfo || !data.programme_pdf) return null;
		if (typeof data.programme_pdf === "string") {
			return {
				id: data.programme_pdf,
				title: null,
				filename_download: null,
			};
		}
		return data.programme_pdf;
	});
	const programmePdfUrl = $derived(
		programmePdfFile ? getDirectusAssetURL(programmePdfFile) : null,
	);
	const programmePdfLabel = $derived(
		showEventInfo
			? data.programme_pdf_label?.trim() ||
					programmePdfFile?.title ||
					(programmePdfFile
						? "View the Summer School programme"
						: null)
			: null,
	);

	const galleryUrl = $derived(
		showEventInfo ? data.gallery_url?.trim() || null : null,
	);

	const pressReleasePost = $derived.by(() => {
		if (!showEventInfo || !data.press_release_post) return null;
		if (typeof data.press_release_post === "string") {
			return { id: data.press_release_post, slug: null, title: null };
		}
		return data.press_release_post;
	});
	const pressReleaseUrl = $derived(
		pressReleasePost?.slug ? `/news/${pressReleasePost.slug}` : null,
	);
	const pressReleaseLabel = $derived(
		showEventInfo
			? data.press_release_post_label?.trim() ||
					pressReleasePost?.title ||
					(pressReleasePost ? "Read the press release" : null)
			: null,
	);

	const buttons = $derived<ButtonProps[]>(
		(data.buttons?.buttons ?? []).map(
			(button: Record<string, unknown>) => ({
				id: button.id as string,
				label: button.label as string | null,
				variant:
					(button.variant as ButtonProps["variant"]) ?? "outline",
				url: button.url as string | null,
				type: button.type as ButtonProps["type"],
				page: button.page as { permalink: string | null } | undefined,
				post: button.post as { slug: string | null } | undefined,
				button_size: button.button_size as ButtonProps["button_size"],
			}),
		),
	);
</script>

<section
	class="py-16 lg:py-24"
	data-directus={setAttr({
		collection: "block_typography_image_text",
		item: data.id,
		fields: "layout,label,title,content,image,image_second,show_image,show_content,show_button,buttons,show_video,video",
		mode: "drawer",
	})}
>
	<Container>
		{#if layout === "v1"}
			<!-- Layout 1: Label | Overlapping image cards with title | Content + stacked buttons -->
			<div
				class="grid items-start gap-8 lg:grid-cols-[2rem_minmax(0,1fr)_minmax(0,1.4fr)] lg:gap-5"
			>
				<!-- Label column -->
				<div class="hidden lg:block lg:pt-4">
					{#if label}
						<div use:fade={{ y: 20, duration: 0.8 }}>
							<p
								class="text-[0.85rem] font-semibold uppercase tracking-[0.25em] text-black/70 [writing-mode:vertical-lr]"
							>
								{label}
							</p>
						</div>
					{/if}
				</div>

				<!-- Overlapping card composition -->
				<div use:fade={{ x: -30, duration: 1.2 }} class="relative">
					{#if showImage && imageId}
						<!-- Background accent card -->
						<!-- <div
							class="absolute h-full w-full rounded-sm bg-primary-50"
						></div> -->

						<!-- Main image card with title overlay -->
						<div
							class="relative ml-auto w-100% overflow-hidden rounded-sm lg:w-[80%]"
						>
							<div class="aspect-3/3">
								<DirectusImage
									uuid={imageId}
									alt={title}
									class="absolute inset-0 h-full w-full object-cover"
									fill
									sizes="(min-width: 1024px) 40vw, 85vw"
									objectPosition={imageFocal}
								/>
							</div>
							{#if title}
								<div
									class="absolute left-0 top-0 flex h-full w-full items-start p-6 pt-8 lg:p-8 lg:pt-10"
								>
									<h2
										class="border-l-[3px] border-white/90 pl-4 text-7xl font-serif leading-[0.9] tracking-tight font-medium text-white drop-shadow-lg lg:pl-5 text-balance"
									>
										{title}
									</h2>
								</div>
							{/if}
						</div>
					{:else if showVideo && video}
						<MediaPlayer {video} {title} />
					{:else if title}
						<!-- Fallback: dark card without image -->
						<div
							class="relative ml-auto flex aspect-3/4 w-[85%] items-start overflow-hidden rounded-sm bg-linear-to-br from-primary-700 to-sec/80 p-6 pt-8 lg:w-[80%] lg:p-8 lg:pt-10"
						>
							<h2
								class="border-l-[3px] border-white/90 pl-4 text-7xl font-serif font-medium leading-[0.98] tracking-tight text-white lg:pl-5"
							>
								{title}
							</h2>
						</div>
					{/if}
				</div>

				<!-- Content + buttons column -->
				{#if showContent}
					<div
						use:fade={{ y: 30, duration: 1.4 }}
						class="space-y-6 lg:pl-6 lg:pt-4"
					>
						<!-- Mobile label -->
						{#if label}
							<p
								class="text-[0.65rem] font-semibold uppercase tracking-[0.25em] text-black/30 lg:hidden"
							>
								{label}
							</p>
						{/if}

						{#if content}
							<div
								class="space-y-5 text-3xl leading-relaxed text-black/70 [&_strong]:block [&_strong]:text-base [&_strong]:font-medium [&_strong]:text-black"
							>
								<Text {content} />
							</div>
						{/if}

						{#if showButton && buttons.length > 0}
							<div class="flex flex-col items-start gap-3 pt-2">
								<ButtonGroup {buttons} />
							</div>
						{/if}
					</div>
				{/if}
			</div>
		{:else if layout === "v2"}
			<!-- Layout 2: Content left, image right -->
			<div class="grid items-center gap-8 lg:grid-cols-2 lg:gap-16">
				{#if showContent}
					<div use:fade={{ y: 30, duration: 1.2 }} class="space-y-6">
						{#if label}
							<p
								class="-ml-2 text-[0.85rem] font-semibold uppercase tracking-[0.25em] text-black/70 [writing-mode:vertical-lr] mb-10"
							>
								{label}
							</p>
						{/if}
						{#if title}
							<h2
								class="border-l-[3px] border-black/80 pl-4 text-4xl md:text-7xl font-serif font-semibold leading-[0.98] tracking-tight text-black text-balance lg:pl-5"
							>
								{title}
							</h2>
						{/if}
						<TypoEventDetails
							{subtitle}
							{partnerName}
							{partnerUrl}
						/>
						{#if content}
							<div
								class="text-[0.95rem] leading-relaxed text-black/70"
							>
								<Text {content} />
							</div>
						{/if}
						<TypoEventResources
							{programmePdfUrl}
							{programmePdfLabel}
							{galleryUrl}
							{pressReleaseUrl}
							{pressReleaseLabel}
						/>
						{#if showButton && buttons.length > 0}
							<div class="flex flex-col items-start gap-3 pt-2">
								<ButtonGroup {buttons} />
							</div>
						{/if}
					</div>
				{/if}
				{#if showImage && imageId}
					<div use:fade={{ x: 30, duration: 1.4 }}>
						<div class="overflow-hidden rounded-sm">
							<DirectusImage
								uuid={imageId}
								alt={title}
								class="h-full w-full object-cover"
								sizes="(min-width: 1024px) 50vw, 100vw"
								objectPosition={imageFocal}
							/>
						</div>
					</div>
				{:else if showVideo && video}
					<div use:fade={{ x: 30, duration: 1.4 }}>
						<MediaPlayer {video} {title} />
					</div>
				{/if}
			</div>
		{:else if layout === "v3"}
			<!-- Layout C: Two side-by-side images left, content right -->
			<div class="grid items-center gap-8 lg:grid-cols-2 lg:gap-16">
				{#if showImage && (imageId || image2Id)}
					<div use:fade={{ x: -30, duration: 1.4 }}>
						<div class="grid grid-cols-[2fr_4fr] items-start gap-4">
							{#if imageId}
								<div
									class="overflow-hidden rounded-sm grayscale"
								>
									<DirectusImage
										uuid={imageId}
										alt={title}
										class="aspect-3/5 h-full w-full object-cover"
										fill
										sizes="(min-width: 1024px) 50vw, 50vw"
										objectPosition={imageFocal}
									/>
								</div>
							{/if}
							{#if image2Id}
								<div class="overflow-hidden rounded-sm">
									<DirectusImage
										uuid={image2Id}
										alt={title}
										class="aspect-3/4 h-full w-full object-cover"
										fill
										sizes="(min-width: 1024px) 50vw, 50vw"
										objectPosition={image2Focal}
									/>
								</div>
							{/if}
						</div>
					</div>
				{:else if showVideo && video}
					<div use:fade={{ x: -30, duration: 1.4 }}>
						<MediaPlayer {video} {title} />
					</div>
				{/if}
				{#if showContent}
					<div use:fade={{ y: 30, duration: 1.2 }} class="space-y-6">
						{#if label}
							<p
								class="-ml-2 text-[0.85rem] font-semibold uppercase tracking-[0.25em] text-black/70 md:[writing-mode:vertical-lr] mb-10"
							>
								{label}
							</p>
						{/if}
						{#if title}
							<h2
								class="border-l-[3px] border-black/80 pl-4 text-4xl md:text-7xl font-serif font-semibold leading-[0.98] tracking-tight text-black text-balance lg:pl-5"
							>
								{title}
							</h2>
						{/if}
						{#if content}
							<div
								class="text-[0.95rem] leading-relaxed text-black/70"
							>
								<Text {content} />
							</div>
						{/if}
						{#if showButton && buttons.length > 0}
							<div class="flex flex-col items-start gap-3 pt-2">
								<ButtonGroup {buttons} />
							</div>
						{/if}
					</div>
				{/if}
			</div>
		{:else if layout === "v4"}
			<!-- Layout D: Big title top, full-width image, content below -->
			<div class="border-r-4 border-black">
				{#if label}
					<div use:fade={{ y: 20, duration: 0.8 }}>
						<p
							class="mb-4 inline-block border-b border-black/20 pb-1 text-[0.7rem] font-semibold uppercase tracking-[0.35em] text-black/50"
						>
							{label}
						</p>
					</div>
				{/if}
				{#if title}
					<h2
						use:fade={{ x: -40, duration: 1.3 }}
						class="mb-8 max-w-[18ch] text-[clamp(2.5rem,6vw,6rem)] font-serif font-semibold leading-[0.95] tracking-tight text-black lg:mb-10"
					>
						{title}
					</h2>
				{/if}
			</div>
			{#if showImage && imageId}
				<div class="grid grid-cols-12 gap-4 lg:gap-8">
					<div
						use:fade={{ duration: 1.4 }}
						use:parallaxImage={{ yPercent: 25, scale: 1.1 }}
						class="col-span-12 lg:col-span-8 lg:col-start-5 overflow-hidden rounded-sm"
					>
						<DirectusImage
							uuid={imageId}
							alt={title}
							class="aspect-3/2 h-full w-full object-cover"
							fill
							sizes="(max-width: 1024px) 100vw, 66vw"
							objectPosition={imageFocal}
						/>
					</div>
				</div>
			{:else if showVideo && video}
				<div use:fade={{ duration: 1.4 }}>
					<MediaPlayer {video} {title} />
				</div>
			{/if}
			{#if showContent}
				<div
					use:fade={{ y: 30, duration: 1.4 }}
					class="mt-8 grid grid-cols-12 gap-4 pt-8 lg:mt-10 lg:gap-8 lg:pt-10"
				>
					<div class="col-span-12 lg:col-span-8 lg:col-start-5">
						<div
							class="columns-1 gap-8 text-[1.05rem] leading-relaxed text-black/70 lg:columns-2 [&_p]:mb-4"
						>
							<Text {content} />
						</div>
						{#if showButton && buttons.length > 0}
							<div class="mt-8 flex flex-col items-start gap-3">
								<ButtonGroup {buttons} />
							</div>
						{/if}
					</div>
				</div>
			{/if}
		{:else if layout === "v5"}
			<!-- Layout E: Image right bleeding to edge, content left with large title -->
			<div class="grid items-center lg:grid-cols-[1fr_1.2fr]">
				{#if showContent}
					<div
						use:fade={{ x: -30, duration: 1.2 }}
						class="space-y-6 px-6 py-12 lg:py-0 lg:pr-16"
					>
						{#if label}
							<p
								class="text-[0.75rem] font-semibold uppercase tracking-[0.3em] text-black/40"
							>
								{label}
							</p>
						{/if}
						{#if title}
							<h2
								class="border-l-[3px] border-black/80 pl-4 text-4xl md:text-6xl lg:text-7xl font-serif font-semibold leading-[0.92] tracking-tight text-black text-balance lg:pl-5"
							>
								{title}
							</h2>
						{/if}
						{#if content}
							<div
								class="text-[0.95rem] leading-relaxed text-black/70"
							>
								<Text {content} />
							</div>
						{/if}
						{#if showButton && buttons.length > 0}
							<div class="flex flex-col items-start gap-3 pt-2">
								<ButtonGroup {buttons} />
							</div>
						{/if}
					</div>
				{/if}
				{#if showImage && imageId}
					<div
						use:fade={{ x: 30, duration: 1.4 }}
						class="-mr-(--container-px,1.5rem)"
					>
						<DirectusImage
							uuid={imageId}
							alt={title}
							class="aspect-4/4 h-full w-full object-cover rounded-l-sm"
							fill
							sizes="(min-width: 1024px) 55vw, 100vw"
							objectPosition={imageFocal}
						/>
					</div>
				{:else if showVideo && video}
					<div
						use:fade={{ x: 30, duration: 1.4 }}
						class="-mr-(--container-px,1.5rem)"
					>
						<MediaPlayer {video} {title} />
					</div>
				{/if}
			</div>
		{:else if layout === "v6"}
			<!-- Layout F: Content left, wider image + thin strip right bleeding to edge -->
			<div
				class="grid items-center gap-8 lg:grid-cols-[1.3fr_minmax(0,1fr)] lg:gap-12"
			>
				{#if showContent}
					<div use:fade={{ y: 30, duration: 1.2 }} class="space-y-6">
						{#if label}
							<p
								class="text-[0.7rem] font-semibold uppercase tracking-[0.35em] text-black/40"
							>
								{label}
							</p>
						{/if}
						{#if title}
							<h2
								class="border-l-[3px] border-black/80 pl-4 text-4xl md:text-7xl font-serif font-semibold leading-[0.95] tracking-tight text-black text-balance lg:pl-5"
							>
								{title}
							</h2>
						{/if}
						{#if content}
							<div class=" leading-relaxed text-black/70">
								<Text {content} />
							</div>
						{/if}
						{#if showButton && buttons.length > 0}
							<div class="flex flex-col items-start gap-3 pt-2">
								<ButtonGroup {buttons} />
							</div>
						{/if}
					</div>
				{/if}
				{#if showImage && (imageId || image2Id)}
					<div
						use:fade={{ x: 30, duration: 1.4 }}
						class="-mr-(--container-px,1.5rem) grid lg:grid-cols-[1fr_13rem] gap-3 items-stretch"
					>
						{#if imageId}
							<div
								use:parallaxImage={{ yPercent: 20, scale: 1.1 }}
								class="overflow-hidden rounded-l-sm"
							>
								<DirectusImage
									uuid={imageId}
									alt={title}
									class="aspect-3/4 h-full w-full object-cover"
									fill
									sizes="(min-width: 1024px) 85vw, 80vw"
									objectPosition={imageFocal}
								/>
							</div>
						{/if}
						{#if image2Id}
							<div class="overflow-hidden grayscale">
								<DirectusImage
									uuid={image2Id}
									alt={title}
									class="h-full w-full object-cover"
									fill
									sizes="(min-width: 1024px) 70vw, 80vw"
									objectPosition={image2Focal}
								/>
							</div>
						{/if}
					</div>
				{:else if showVideo && video}
					<div
						use:fade={{ x: 30, duration: 1.4 }}
						class="-mr-(--container-px,1.5rem)"
					>
						<MediaPlayer {video} {title} />
					</div>
				{/if}
			</div>
		{/if}
	</Container>
</section>
