<script lang="ts">
	import { onMount } from "svelte";
	import { afterNavigate, beforeNavigate } from "$app/navigation";
	import "$lib/components/ui/cursix/styles.css";
	import "css/app.css";
	import { setNavigationContext } from "$lib/content/context";
	import { CookieConsent, Loader } from "$lib/components/core";
	import { ScrollToTop } from "$lib/components/ui";
	import type { LayoutData } from "./$types";
	import { smoothScroll, cursix } from "scripts/actions";
	import CmsMeta from "$lib/components/core/CmsMeta.svelte";
	import MenuMain from "$lib/components/layout/morphing/index.svelte";
	import Footer from "$lib/components/layout/Footer.svelte";

	let {
		children,
		data,
	}: { children: import("svelte").Snippet; data: LayoutData } = $props();
	let hasCompletedInitialLoad = false;
	let isNavigating = $state(false);
	let prefersReducedMotion = $state(false);

	setNavigationContext(() => data.headerNavigation ?? []);

	const waitForNextPaint = () =>
		new Promise<void>((resolve) => {
			requestAnimationFrame(() => {
				requestAnimationFrame(() => resolve());
			});
		});

	function setLoadingState(isLoading: boolean) {
		document.body.classList.toggle("is-loading", isLoading);
		document.body.classList.toggle("is-loaded", !isLoading);
		document.body.classList.toggle("is-hide", isLoading);
	}

	async function revealPage() {
		if (!prefersReducedMotion) {
			await waitForNextPaint();
		}
		hasCompletedInitialLoad = true;
		isNavigating = false;
		setLoadingState(false);
	}

	function handleInitialDOMContentLoaded() {
		void revealPage();
	}

	beforeNavigate((navigation) => {
		if (!hasCompletedInitialLoad) return;
		if (navigation.willUnload) return;
		isNavigating = true;
	});

	afterNavigate(() => {
		void revealPage();
	});

	onMount(() => {
		const media = window.matchMedia("(prefers-reduced-motion: reduce)");
		prefersReducedMotion = media.matches;
		const onChange = (e: MediaQueryListEvent) => {
			prefersReducedMotion = e.matches;
		};
		media.addEventListener("change", onChange);

		if (document.readyState !== "loading") {
			void revealPage();
		} else {
			document.addEventListener(
				"DOMContentLoaded",
				handleInitialDOMContentLoaded,
				{ once: true },
			);
		}

		return () => {
			media.removeEventListener("change", onChange);
			document.removeEventListener(
				"DOMContentLoaded",
				handleInitialDOMContentLoaded,
			);
			setLoadingState(false);
		};
	});
</script>

<svelte:head>
	<link
		rel="preload"
		href="https://use.typekit.net/tck6tzf.css"
		as="style"
		onload={(e) => {
			(e.currentTarget as HTMLLinkElement).rel = "stylesheet";
		}}
	/>
	<noscript>
		<link rel="stylesheet" href="https://use.typekit.net/tck6tzf.css" />
	</noscript>
</svelte:head>

<div use:cursix={{ speed: 0.6 }}>
	<CmsMeta globals={data.globals} />
	<MenuMain globals={data.globals} />

	<div
		class="pointer-events-none fixed top-0 left-0 z-4000 h-05 w-[min(28vw,16rem)] bg-linear-to-r from-transparent via-primary to-transparent opacity-0 motion-safe:transition-opacity motion-safe:duration-200 motion-safe:ease-out motion-safe:animate-[route-progress-slide_0.9s_ease-in-out_infinite]"
		class:opacity-100={isNavigating}
		aria-hidden="true"
	></div>

	<div id="smooth-wrapper" use:smoothScroll={{ smooth: 2, effects: false }}>
		<div id="smooth-content">
			{@render children()}
			<Footer
				navigation={data.footerNavigation ?? []}
				copyrightNavigation={data.copyrightNavigation ?? []}
				globals={data.globals}
			/>
		</div>
	</div>
</div>
<CookieConsent />
<ScrollToTop />
<Loader />

<style>
	@keyframes -global-route-progress-slide {
		from {
			transform: translateX(-120%);
		}

		to {
			transform: translateX(calc(100vw + 120%));
		}
	}
</style>
