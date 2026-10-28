<script lang="ts">
	/**
	 * Public product shell. Deliberately minimal: no sidebar, no brand switcher,
	 * nothing that implies an account the visitor does not have.
	 */
	import type { LayoutProps } from './$types';

	let { children }: LayoutProps = $props();
</script>

<div class="flex min-h-dvh flex-col">
	<header class="border-b">
		<div class="mx-auto flex w-full max-w-4xl items-center justify-between px-6 py-4">
			<a href="/visual-contract" class="text-sm font-semibold">Montsel</a>
			<span class="text-muted-foreground text-xs">Visual Contract</span>
		</div>
	</header>
	<main class="mx-auto w-full max-w-4xl flex-1 px-6 py-10">
		{@render children()}
	</main>
	<footer class="text-muted-foreground mx-auto w-full max-w-4xl px-6 py-6 text-xs">
		<p>The Visual Contract is a product of DeMode.</p>
	</footer>
</div>
