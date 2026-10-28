<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { CheckIcon, CopyIcon } from '@lucide/svelte';

	let { value, label = 'Copy link' }: { value: string; label?: string } = $props();

	let copied = $state(false);
	let failed = $state(false);

	async function copy() {
		try {
			await navigator.clipboard.writeText(value);
			copied = true;
			failed = false;
			setTimeout(() => (copied = false), 2000);
		} catch {
			// Clipboard access can be denied; the link stays visible and selectable.
			failed = true;
		}
	}
</script>

<div class="flex flex-col gap-2">
	<div class="flex flex-wrap items-center gap-2">
		<input
			readonly
			value={value}
			class="border-input bg-muted h-9 min-w-0 flex-1 rounded-md border px-3 text-sm"
			onfocus={(event) => event.currentTarget.select()}
		/>
		<Button variant="outline" onclick={copy}>
			{#if copied}
				<CheckIcon />
				Copied
			{:else}
				<CopyIcon />
				{label}
			{/if}
		</Button>
	</div>
	{#if failed}
		<p class="text-muted-foreground text-xs">Select the link and copy it manually.</p>
	{/if}
	<span class="sr-only" aria-live="polite">{copied ? 'Link copied' : ''}</span>
</div>
