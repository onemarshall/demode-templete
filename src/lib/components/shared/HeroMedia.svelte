<script lang="ts">
	import DirectusImage from "$lib/components/shared/DirectusImage.svelte";
	import { getDirectusAssetURL } from "$lib/services/directus/asset-utils";

	interface Props {
		mediaType: "video" | "image" | null;
		image?: string | null;
		videoId?: string | null;
		poster?: string | null;
		alt?: string;
		class?: string;
	}

	let { mediaType, image, videoId, poster, alt = "", class: className = "" }: Props =
		$props();

	const posterUrl = $derived(
		poster ? getDirectusAssetURL(poster) : videoId ? getDirectusAssetURL(videoId) : null,
	);
	const videoUrl = $derived(videoId ? getDirectusAssetURL(videoId) : null);
</script>

{#if mediaType === "video" && videoUrl}
	<div class="hero-video-wrapper {className}">
		{#if posterUrl}
			<img src={posterUrl} {alt} class="h-full w-full object-cover" loading="eager" />
		{/if}
		<video
			autoplay
			loop
			muted
			playsinline
			src={videoUrl}
			class="h-full w-full object-cover"
		></video>
	</div>
{:else if image}
	<DirectusImage
		uuid={image}
		layout="fullWidth"
		loading="eager"
		fetchpriority="high"
		alt={alt || "Hero Image"}
		sizes="100vw"
		class="h-full w-full object-cover object-top {className}"
	/>
{/if}

<style>
	:global(.hero-video-wrapper),
	.hero-video-wrapper {
		position: absolute;
		inset: 0;
	}

	.hero-video-wrapper img,
	.hero-video-wrapper video {
		position: absolute;
		top: 0;
		left: 0;
		object-fit: cover;
		height: 100%;
		width: 100%;
	}

	.hero-video-wrapper img {
		display: none;
	}

	@media (prefers-reduced-motion: reduce) {
		.hero-video-wrapper video {
			visibility: hidden;
		}
		.hero-video-wrapper img {
			display: block;
		}
	}
</style>
