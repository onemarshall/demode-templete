<!-- src/lib/components/profile/security/PasskeyMessages.svelte -->
<script lang="ts">
	import { CircleAlert, KeyRound } from '@lucide/svelte';

	interface Props {
		messages: { error: string | null; success: string | null };
	}

	let { messages = $bindable() }: Props = $props();

	let hasError = $derived(!!messages.error);
	let hasSuccess = $derived(!!messages.success);

	function clearMessages(): void {
		messages.error = null;
		messages.success = null;
	}

	$effect(() => {
		if (hasError || hasSuccess) {
			const timeout = setTimeout(() => {
				clearMessages();
			}, 8000);
			return () => clearTimeout(timeout);
		}
	});
</script>

{#if hasError}
	<div
		class="flex items-center gap-2 rounded-md bg-red-50 p-3 text-red-800 dark:bg-red-950 dark:text-red-200"
	>
		<CircleAlert class="h-4 w-4 shrink-0" />
		<span class="flex-1 text-sm">{messages.error}</span>
		<button
			onclick={clearMessages}
			class="ml-auto text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-200"
			aria-label="Clear error message"
		>
			×
		</button>
	</div>
{/if}

{#if hasSuccess}
	<div
		class="flex items-center gap-2 rounded-md bg-green-50 p-3 text-green-800 dark:bg-green-950 dark:text-green-200"
	>
		<KeyRound class="h-4 w-4 shrink-0" />
		<span class="text-sm">{messages.success}</span>
	</div>
{/if}
