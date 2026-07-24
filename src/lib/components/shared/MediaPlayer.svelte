<script lang="ts">
	import { getDirectusAssetURL } from "$lib/services/directus/asset-utils";

	interface Props {
		video: { service?: string; id: string } | null;
		title?: string;
		class?: string;
	}

	let { video, title = "", class: className = "" }: Props = $props();

	const videoEmbedUrl = $derived.by(() => {
		if (!video?.service || !video?.id) return null;
		if (video.service === "youtube")
			return `https://www.youtube-nocookie.com/embed/${video.id}?autoplay=0&rel=0`;
		if (video.service === "vimeo")
			return `https://player.vimeo.com/video/${video.id}?dnt=1`;
		return null;
	});

	const directusVideoUrl = $derived.by(() => {
		if (!video?.id || video?.service) return null;
		return getDirectusAssetURL(video.id);
	});

	let videoTitle = $state<string | null>(null);

	$effect(() => {
		if (!video?.service || !video?.id) {
			videoTitle = null;
			return;
		}

		const service = video.service;
		const vid = video.id;
		let cancelled = false;

		const oembedUrl =
			service === "vimeo"
				? `https://vimeo.com/api/oembed.json?url=https://vimeo.com/${vid}`
				: service === "youtube"
					? `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${vid}&format=json`
					: null;

		if (!oembedUrl) return;

		fetch(oembedUrl)
			.then((r) => r.json() as Promise<{ title?: string }>)
			.then((json) => {
				if (!cancelled) videoTitle = json.title ?? null;
			})
			.catch(() => {
				if (!cancelled) videoTitle = null;
			});

		return () => {
			cancelled = true;
		};
	});
</script>

{#if video}
	<div class={className}>
		<div class="aspect-video w-full overflow-hidden rounded-sm">
			{#if videoEmbedUrl}
				<iframe
					src={videoEmbedUrl}
					title={videoTitle || title || "Video"}
					class="h-full w-full"
					frameborder="0"
					allow="autoplay; fullscreen; picture-in-picture"
					allowfullscreen
				></iframe>
			{:else if directusVideoUrl}
				<video
					controls
					playsinline
					preload="metadata"
					class="h-full w-full object-cover"
					src={directusVideoUrl}
				>
					<track kind="captions" />
				</video>
			{/if}
		</div>
		{#if videoTitle}
			<p class="mt-3 text-sm text-black/50 italic">{videoTitle}</p>
		{/if}
	</div>
{/if}
