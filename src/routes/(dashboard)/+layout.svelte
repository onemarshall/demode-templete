<script lang="ts">
	import AppShell from "$lib/app/shell/app-shell.svelte";
	import BrandSwitcher from "$lib/modules/tenancy/components/BrandSwitcher.svelte";
	import type { LayoutData } from "./$types";
	import type { Snippet } from "svelte";
	let { data, children }: { data: LayoutData; children: Snippet } = $props();
</script>

<AppShell user={data.user}>
	<div class="mx-auto flex w-full max-w-5xl flex-col gap-8 p-4 md:p-8">
		<BrandSwitcher organisations={data.organisations} />
		{@render children()}
	</div>
</AppShell>
