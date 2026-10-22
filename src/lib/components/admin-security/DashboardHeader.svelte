<script lang="ts">
	import { Button } from '#lib/components/ui/button/index.js';
	import { RefreshCw, Trash2 } from '@lucide/svelte';
	import { enhance } from '$app/forms';

	let { form }: { form: unknown } = $props();
	let isClearing = $state(false);
	let resetMessage = $state<string | null>(null);
	let resetError = $state<string | null>(null);
</script>

<details class="max-w-lg">
	<summary class="text-muted-foreground cursor-pointer text-sm">Dashboard tools</summary>
	<div class="mt-3 flex flex-col gap-3">
		<p class="text-muted-foreground text-sm">Reset removes locally recorded dashboard events and clears cached metrics. It can erase investigation history and does not resolve security issues or unblock IPs.</p>
		<details>
			<summary class="cursor-pointer text-sm">Reset dashboard data…</summary>
			<form class="mt-3" method="POST" action="?/clearCache" use:enhance={() => {
				isClearing = true;
				resetMessage = null;
				resetError = null;
				return async ({ update, result }) => {
					try {
						if (result.type === 'success' && result.data?.success === true) {
							resetMessage = typeof result.data.message === 'string' ? result.data.message : 'Dashboard data reset.';
						} else {
							resetError = 'Dashboard data could not be reset. Try again after checking the connection.';
						}
						if (result.type !== 'error') await update();
					} finally { isClearing = false; }
				};
			}}>
				<Button variant="destructive" size="sm" type="submit" disabled={isClearing}>
					{#if isClearing}<RefreshCw data-icon="inline-start" class="animate-spin" />Resetting…{:else}<Trash2 data-icon="inline-start" />Confirm data reset{/if}
				</Button>
			</form>
		</details>
		{#if resetMessage}<p role="status" class="text-sm">{resetMessage}</p>{/if}
		{#if resetError}<p role="alert" class="text-destructive text-sm">{resetError}</p>{/if}
	</div>
</details>
