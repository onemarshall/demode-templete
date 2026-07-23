<script lang="ts">
	import { onMount } from "svelte";

	let loader: HTMLDivElement | undefined = $state(undefined);
	let isLoaded = $state(false);
	let reducedMotion = $state(false);
	let hidden = $state(false);

	onMount(() => {
		const body = document.body;
		const media = window.matchMedia("(prefers-reduced-motion: reduce)");
		reducedMotion = media.matches;

		const onMediaChange = (e: MediaQueryListEvent) => {
			reducedMotion = e.matches;
		};

		const setLoaded = () => {
			const loaded = body.classList.contains("is-loaded");
			isLoaded = loaded;

			if (loaded && reducedMotion) {
				hidden = true;
			} else if (!loaded) {
				hidden = false;
			}
		};

		const onTransitionEnd = () => {
			if (isLoaded) hidden = true;
		};

		loader?.addEventListener("transitionend", onTransitionEnd);
		media.addEventListener("change", onMediaChange);
		const observer = new MutationObserver(setLoaded);
		observer.observe(body, {
			attributes: true,
			attributeFilter: ["class"],
		});

		setLoaded();

		return () => {
			loader?.removeEventListener("transitionend", onTransitionEnd);
			media.removeEventListener("change", onMediaChange);
			observer.disconnect();
		};
	});
</script>

<div
	bind:this={loader}
	class:hidden
	aria-hidden={isLoaded ? "true" : undefined}
	class="loader fixed inset-0 z-[3002] grid h-full w-full place-items-center bg-gray-950 motion-safe:transition-all motion-safe:duration-500 motion-safe:ease-[cubic-bezier(0.22,1,0.36,1)]"
	role="status"
	aria-live="polite"
	aria-atomic="true"
>
	<div class="Alert">
		<p class="sr-only">Content is loading...</p>
		<div class="relative inline-block size-16" aria-hidden="true">
			<div
				class="absolute inset-0 rounded-full bg-primary/80 motion-safe:animate-[circle-loader_1.2s_ease-out_infinite]"
			></div>
			<div
				class="absolute inset-0 rounded-full bg-primary/80 motion-safe:animate-[circle-loader_1.2s_ease-out_infinite] [animation-delay:0.6s]"
			></div>
		</div>
	</div>
</div>

<style>
	:global(body.is-loaded) .loader {
		opacity: 0;
		visibility: hidden;
		pointer-events: none;
	}

	.loader.hidden {
		display: none;
	}

	@keyframes -global-circle-loader {
		from {
			transform: scale(0);
			opacity: 0.8;
		}
		to {
			transform: scale(1);
			opacity: 0;
		}
	}
</style>
