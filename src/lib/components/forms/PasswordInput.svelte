<script lang="ts">
	import type { HTMLInputAttributes } from 'svelte/elements';
	import type { WithElementRef } from 'bits-ui';
	import { cn } from '#lib/utils.ts';
	import { Eye, EyeOff } from '@lucide/svelte';

	type Props = WithElementRef<Omit<HTMLInputAttributes, 'type'>> & {
		class?: {
			container?: string;
			input?: string;
			icon?: string;
			button?: string;
		};
		showPassword?: boolean;
	};

	let {
		showPassword = $bindable(false),
		ref = $bindable(null),
		value = $bindable(),
		class: _class = {},
		...restProps
	}: Props = $props();
</script>

<div class={cn('relative w-full', _class?.container)}>
	<input
		bind:this={ref}
		class={cn(
			'border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring flex h-10 w-full rounded-md border px-3 py-2 pr-10 text-base file:border-0 file:bg-transparent file:text-sm file:font-medium focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm',
			_class?.input
		)}
		type={showPassword ? 'text' : 'password'}
		bind:value
		{...restProps}
	/>
	<button
		type="button"
		class={cn(
			'text-muted-foreground hover:text-foreground absolute inset-y-0 right-2 flex items-center justify-center p-2',
			_class?.button
		)}
		onclick={() => (showPassword = !showPassword)}
	>
		{#if showPassword}
			<EyeOff size={18} class={_class?.icon} />
		{:else}
			<Eye size={18} class={_class?.icon} />
		{/if}
	</button>
</div>
