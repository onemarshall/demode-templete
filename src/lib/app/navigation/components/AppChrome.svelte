<script lang="ts">
	import AppNav from './AppNav.svelte';
	import type { Snippet } from 'svelte';

	type ChromeUser = {
		id: string;
		email: string;
		name?: string | null;
		image?: string | null;
	};

	let { user = null, children }: { user?: ChromeUser | null; children: Snippet } = $props();
</script>

<div class="bg-muted flex min-h-svh flex-col">
	<AppNav {user} />

	<main class="flex flex-1 flex-col px-6 py-12">
		{@render children()}
	</main>
</div>
