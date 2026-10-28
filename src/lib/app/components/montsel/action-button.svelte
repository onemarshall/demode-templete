<script lang="ts">
	import { Button, type ButtonSize } from '$lib/components/ui/button';
	import { ArrowRightIcon } from '@lucide/svelte';
	import type { PrimaryAction } from '#lib/modules/products/shared/access.js';

	let {
		action,
		size = 'default',
		class: className = ''
	}: { action: PrimaryAction; size?: ButtonSize; class?: string } = $props();
</script>

{#if action.kind === 'unavailable' || !action.href}
	<Button variant="outline" {size} disabled title="This product is not open yet">
		{action.label}
	</Button>
{:else if action.kind === 'learn'}
	<Button variant="outline" {size} href={action.href} class={className}>
		{action.label}
	</Button>
{:else}
	<Button variant="default" {size} href={action.href} class={className}>
		{action.label}
		<ArrowRightIcon />
	</Button>
{/if}
