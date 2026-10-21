<script lang="ts">
	import { Button } from '#lib/components/ui/button/index.js';
	import { RefreshCw, Trash2, Check } from '@lucide/svelte';
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';

	let { form }: { form: any } = $props();

	// State for Clear Cache functionality
	let isClearing = $state(false);
	let showSuccess = $state(false);
	let dataCleared = $state(false);

	// Show success message when form returns success
	$effect(() => {
		if (form?.success) {
			showSuccess = true;
			setTimeout(() => {
				showSuccess = false;
			}, 3000);
		}
	});
</script>

<div class="flex items-center justify-between">
	<div>
		<h1 class="text-3xl font-bold">Security Dashboard</h1>
		<p class="text-muted-foreground">Aggregate security intelligence across all users</p>
	</div>
	<div class="flex items-center gap-3">
		{#if showSuccess && form?.success}
			<div class="flex items-center gap-2 text-sm text-green-600">
				<Check class="h-4 w-4" />
				<span>Cache cleared successfully</span>
			</div>
		{/if}
		<form
			method="POST"
			action="?/clearCache"
			use:enhance={() => {
				isClearing = true;
				return async ({ update, result }) => {
					await update();
					isClearing = false;

					if (result.type === 'success') {
						// Show cleared state for 2 seconds before refreshing
						dataCleared = true;
						setTimeout(() => {
							invalidateAll();
							dataCleared = false;
						}, 2000);
					}
				};
			}}
		>
			<Button variant="outline" type="submit" class="gap-2" disabled={isClearing}>
				{#if isClearing}
					<RefreshCw class="h-4 w-4 animate-spin" />
					Clearing...
				{:else}
					<Trash2 class="h-4 w-4" />
					Reset Dashboard Data
				{/if}
			</Button>
		</form>
	</div>
</div>
