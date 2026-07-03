<script lang="ts">
	import { cn } from "$lib/utils";
	import { setAttr } from "$lib/features/directus/visualEditing";
	import { getDirectusAssetURL } from "$lib/features/directus/asset-utils";
	import { goto } from "$app/navigation";
	import { resolve } from "$app/paths";
	import { fade } from "scripts/actions";
	import Container from "$lib/components/ui/Container.svelte";
	import Headline from "$lib/components/ui/Headline.svelte";

	interface FeatureVideoData {
		id: string;
		title?: string | null;
		content?: string | null;
		video?: {
			service: string;
			id: string;
			[key: string]: unknown;
		} | null;
		link?: {
			id: string;
			permalink: string;
			[key: string]: unknown;
		} | null;
		sort?: number;
		user_created?: string | null;
		date_created?: string | null;
		user_updated?: string | null;
		date_updated?: string | null;
	}

	let { data } = $props<{
		data: FeatureVideoData;
	}>();
</script>

<!-- <Container class="py-25"> -->
<div
	class={cn("video-feature pt-56 lg:pt-40 px-3 lg:px-5 pb-3 lg:pb-5")}
	data-directus={setAttr({
		collection: "block_feature_video",
		item: data.id,
		fields: "content",
		mode: "popover",
	})}
>
	<div class="video-feature__box-wrapper flex md:justify-end">
		<div
			class="video-feature__box rounded basis-full max-w-full min-w-0 md:basis-6/12 xl:basis-4/12"
		>
			<div class="p-5 lg:p-8" use:fade={{ x: -10, duration: 0.5 }}>
				{#if data?.title}
					<Headline
						headline={data.title}
						as="h2"
						size="md"
						class="mb-4"
					/>
				{:else}
					<h2 class="text-2xl mb-2 font-serif font-bold">
						Video Title
					</h2>
				{/if}

				{#if data?.content}
					<p class="text-lg opacity-60 text-balance">
						{data.content}
					</p>
				{:else}
					<p class="text-lg opacity-60 text-balance">
						Lorem ipsum dolor sit amet, consectetur adipisicing
						elit.
					</p>
				{/if}
			</div>

			{#if data?.link}
				<a
					use:fade={{ x: -5, delay: 0.2, duration: 0.5 }}
					class="video-feature__link leading-tight p-5 lg:p-8 font-bold"
					href={resolve(`/${data.link.permalink}`)}
					onclick={() => goto(resolve(`/${data.link.permalink}`))}
				>
					<span>{data?.link_text || "About the Summer School"}</span>

					<svg
						class="video-feature__link-icon icon inline-block text-inherit fill-current leading-none shrink-0 w-[16px] h-[16px]"
						viewBox="0 0 16 16"
						aria-hidden="true"
						fill="none"
						stroke="currentColor"
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
					>
						<line x1="5" y1="2" x2="11" y2="8" />
						<line x1="11" y1="8" x2="5" y2="14" />
					</svg>
				</a>
			{:else}
				<a
					class="video-feature__link leading-tight p-5 lg:p-4"
					href="#0"
				>
					<span>Learn More</span>

					<svg
						class="video-feature__link-icon icon inline-block text-inherit fill-current leading-none shrink-0 w-[16px] h-[16px]"
						viewBox="0 0 16 16"
						aria-hidden="true"
						fill="none"
						stroke="currentColor"
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
					>
						<line x1="5" y1="2" x2="11" y2="8" />
						<line x1="11" y1="8" x2="5" y2="14" />
					</svg>
				</a>
			{/if}
		</div>
	</div>

	<figure class="video-feature__video-wrapper" aria-hidden="true">
		{#if data?.video}
			<img src={getDirectusAssetURL(data.video.id)} alt="Video Preview" />
			<video
				autoplay
				loop
				muted
				playsinline
				src={getDirectusAssetURL(data.video.id)}
			></video>
		{:else}
			<!-- <img src="../assets/video/ox_home_page_vid_1.mp4" alt="Video Preview" />
			<video autoplay loop muted playsinline src="../assets/video/ox_home_page_vid_1.mp4"></video> -->
		{/if}
	</figure>
</div>

<!-- </Container> -->

<style>
	.video-feature {
		position: relative;
		z-index: 1;
		overflow: hidden;
	}

	.video-feature__box-wrapper {
		position: relative;
		z-index: 2;
	}

	.video-feature__box {
		background-color: var(--color-sec-50);

		backdrop-filter: blur(10px);
	}

	.video-feature__video-wrapper {
		position: absolute;
		z-index: 1;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		overflow: hidden;
	}
	.video-feature__video-wrapper img,
	.video-feature__video-wrapper video {
		position: absolute;
		top: 0;
		left: 0;

		object-fit: cover;
		height: 100%;
		width: 100%;
	}
	.video-feature__video-wrapper img {
		display: none;
	}
	@media (prefers-reduced-motion: reduce) {
		.video-feature__video-wrapper video {
			visibility: hidden;
		}
		.video-feature__video-wrapper img {
			display: block;
		}
	}

	.video-feature__link {
		--transition-duration: 0.4s;
		position: relative;
		z-index: 1;
		overflow: hidden;
		display: flex;
		align-items: center;
		justify-content: space-between;
		background-color: var(--color-sec-900);
		border-radius: inherit;
		border-top-left-radius: 0;
		border-top-right-radius: 0;
		color: var(--color-sec-50);
		text-decoration: none;
		-webkit-font-smoothing: antialiased;
		-moz-osx-font-smoothing: grayscale;
		transition: var(--transition-duration);
	}
	.video-feature__link > * {
		position: relative;
		z-index: 2;
	}
	.video-feature__link::before {
		content: "";
		position: absolute;
		bottom: -20%;
		left: -5%;
		width: 110%;
		height: 140%;
		background-color: var(--color-sec-300);
		will-change: transform;
		-webkit-transform: scaleY(0) skewY(10deg);
		transform: scaleY(0) skewY(10deg);
		transform-origin: center bottom;
		transition: -webkit-transform var(--transition-duration)
			cubic-bezier(0.645, 0.045, 0.355, 1);
		transition: transform var(--transition-duration)
			cubic-bezier(0.645, 0.045, 0.355, 1);
		transition:
			transform var(--transition-duration)
				cubic-bezier(0.645, 0.045, 0.355, 1),
			-webkit-transform var(--transition-duration) cubic-bezier(0.645, 0.045, 0.355, 1);
	}
	.video-feature__link:hover {
		color: white;
	}
	.video-feature__link:hover::before {
		-webkit-transform: scaleY(1) skewY(0deg);
		transform: scaleY(1) skewY(0deg);
	}
	.video-feature__link:hover .video-feature__link-icon > *:first-child {
		transform: rotate(-180deg);
	}
	.video-feature__link:hover .video-feature__link-icon > *:last-child {
		transform: rotate(180deg);
	}

	.video-feature__link-icon > * {
		will-change: transform;
		transition: -webkit-transform var(--transition-duration)
			cubic-bezier(0.645, 0.045, 0.355, 1);
		transition: transform var(--transition-duration)
			cubic-bezier(0.645, 0.045, 0.355, 1);
		transition:
			transform var(--transition-duration)
				cubic-bezier(0.645, 0.045, 0.355, 1),
			-webkit-transform var(--transition-duration) cubic-bezier(0.645, 0.045, 0.355, 1);
	}
	.video-feature__link-icon > *:first-child {
		-webkit-transform-origin: 8px 5px;
		transform-origin: 8px 5px;
	}
	.video-feature__link-icon > *:last-child {
		-webkit-transform-origin: 8px 11px;
		transform-origin: 8px 11px;
	}
</style>
