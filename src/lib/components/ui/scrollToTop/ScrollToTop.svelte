<script lang="ts">
	import { onMount } from "svelte";
	import { browser } from "$app/env";
	let showScrollTop = $state(false);
	let scrolling = $state(false);
	let scrollOffset = 0;
	let scrollOffsetOut = 0;
	let scrollElement: Window | HTMLElement;

	// Configuration from data attributes
	const scrollOffsetInit = 100; // from data-offset="100"
	const scrollOffsetOutInit = 0; // default if not specified

	const updateOffsets = () => {
		// Simple offset calculation based on data-offset attribute
		scrollOffset = scrollOffsetInit;
		scrollOffsetOut = scrollOffsetOutInit;
	};

	const checkBackToTop = () => {
		if (!browser) return;

		updateOffsets();
		const windowTop =
			scrollElement instanceof Window
				? window.scrollY || document.documentElement.scrollTop
				: scrollElement.scrollTop || document.documentElement.scrollTop;

		let condition = windowTop >= scrollOffset;
		if (scrollOffsetOut > 0) {
			condition =
				windowTop >= scrollOffset &&
				window.innerHeight + windowTop < scrollOffsetOut;
		}

		showScrollTop = condition;
		scrolling = false;
	};

	const handleScroll = () => {
		if (!scrolling) {
			scrolling = true;
			if (!window.requestAnimationFrame) {
				setTimeout(() => checkBackToTop(), 250);
			} else {
				window.requestAnimationFrame(checkBackToTop);
			}
		}
	};

	const handleScrollTopClick = (e: MouseEvent) => {
		e.preventDefault();
		if (!window.requestAnimationFrame) {
			scrollElement.scrollTo(0, 0);
		} else {
			scrollElement.scrollTo({ top: 0, behavior: "smooth" });
		}
	};

	if (browser) {
		onMount(() => {
			// Set scroll element (window since no data-element specified)
			scrollElement = window;

			// Initial check
			checkBackToTop();

			// Add scroll listener if offsets are set
			if (scrollOffset > 0 || scrollOffsetOut > 0) {
				scrollElement.addEventListener("scroll", handleScroll);
			}

			return () => {
				scrollElement.removeEventListener("scroll", handleScroll);
			};
		});
	}
</script>

{#if showScrollTop}
	<button
		type="button"
		class="back-to-top {showScrollTop
			? 'back-to-top--is-visible'
			: ''} h-12 w-12 flex fixed right-8 bottom-8 z-10 rounded-full bg-gray-900/90 invisible opacity-0 transition-all hover:bg-gray-950 [&.back-to-top--is-visible]:visible [&.back-to-top--is-visible]:opacity-100 js-back-to-top"
		aria-label="Back to top"
		data-offset="100"
		onclick={handleScrollTopClick}
	>
		<svg
			class="h-5 w-5 block m-auto fill-current text-white leading-none"
			viewBox="0 0 20 20"
		>
			<polyline
				points="2 13 10 5 18 13"
				fill="none"
				stroke="currentColor"
				stroke-linecap="round"
				stroke-linejoin="round"
				stroke-width="2"
			/>
		</svg>
	</button>
{/if}
