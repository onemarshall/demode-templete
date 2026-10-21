<script lang="ts">
	import CapWidgetAdapter from '$lib/components/forms/shared/CapWidgetAdapter.svelte';
	import { computeCapEndpoint } from './captcha-endpoint';

	type Props = {
		onSolve: (token: string) => void | Promise<void>;
		onError?: (err: Error) => void;
		/** Error text shown beneath the widget. */
		error?: string;
		/** Optional intro text rendered above the widget. */
		message?: string;
		class?: string;
	};

	let {
		onSolve,
		onError,
		error = '',
		message = 'Please complete the captcha to continue.',
		class: className = '',
	}: Props = $props();

	const endpoint = computeCapEndpoint();

	function handleError(err: Error) {
		if (onError) onError(err);
	}
</script>

<div class="rounded-lg border border-border p-4 {className}">
	{#if !endpoint}
		<p class="text-destructive text-sm">Captcha endpoint is not configured.</p>
	{:else}
		{#if message}
			<p class="text-muted-foreground mb-2 text-sm">{message}</p>
		{/if}
		<CapWidgetAdapter
			{endpoint}
			onSolve={onSolve}
			onerror={handleError}
			class="w-full"
		/>
		{#if error}
			<p class="text-destructive mt-2 text-sm">{error}</p>
		{/if}
	{/if}
</div>
