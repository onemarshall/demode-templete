<!-- src/lib/components/auth/StatusMessage.svelte -->
<script lang="ts">
	import { Alert, AlertDescription } from '#lib/components/ui/alert/index.js';
	import { Shield } from '@lucide/svelte';

	let {
		hasSuccess,
		hasError,
		success,
		error
	}: {
		hasSuccess: boolean;
		hasError: boolean;
		success: string;
		error: string;
	} = $props();
</script>

{#if hasSuccess}
	<Alert
		variant="default"
		class="border-green-200 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-950"
	>
		<Shield class="h-4 w-4" />
		<AlertDescription class="font-medium text-green-700 dark:text-green-200">
			{success}
		</AlertDescription>
	</Alert>
{/if}

{#if error.includes('cookie') || error.includes('session')}
	<Alert variant="destructive" class="border-red-200 bg-red-50 dark:border-red-800">
		<AlertDescription class="font-medium text-red-700 dark:text-red-200">
			Your session has expired. Please
			<a href="/auth/sign-in" class="font-medium underline">sign in again</a>.
		</AlertDescription>
	</Alert>
{:else if hasError}
	<Alert variant="destructive" class="border-red-200 bg-red-50 dark:border-red-800">
		<AlertDescription class="font-medium text-red-700 dark:text-red-200">
			{error}
		</AlertDescription>
	</Alert>
{/if}
