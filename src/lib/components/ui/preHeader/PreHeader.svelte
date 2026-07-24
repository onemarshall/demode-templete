<!-- PreHeader.svelte -->
<script lang="ts">
	import { fade } from 'svelte/transition';
	import { getCookie, setCookie } from '$lib/utils/cookies';
	import { onMount } from 'svelte';
	let showPreHeader = $state(true);
	let {
		content = 'Heads up! This a pre headers demo!',
		cookieName = 'preHeaderDismissed',
		cookieExpires = 2
	} = $props();

	function hidePreHeader() {
		showPreHeader = false;
		setCookie(cookieName, 'true', cookieExpires);
		document.body.classList.remove('Header');
	}

	onMount(() => {
		const cookieValue = getCookie(cookieName);
		showPreHeader = !cookieValue;
		document.body.classList.add('Header');
	});
</script>

{#if showPreHeader}
	<div class="fixed top-0 left-0 w-full z-1000 bg-gray-900 text-white antialiased">
		<div class="container max-w-7xl mx-auto flex items-center justify-between h-16 relative px-4">
			<div class="text-center text-sm pr-8">
				<p class="text-white">
					{content}
					<a href="#0" class="underline hover:no-underline transition-colors">Learn more</a>
				</p>
			</div>
			<button
				class="absolute right-4 top-1/2 -translate-y-1/2 will-change-transform transition-transform duration-300 hover:scale-110"
				onmousedown={hidePreHeader}
			>
				<svg class="block w-5 h-5" viewBox="0 0 20 20">
					<title>Close header banner</title>
					<g
						fill="none"
						stroke="white"
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
					>
						<line x1="4" y1="4" x2="16" y2="16" />
						<line x1="16" y1="4" x2="4" y2="16" />
					</g>
				</svg>
			</button>
		</div>
	</div>
{/if}
