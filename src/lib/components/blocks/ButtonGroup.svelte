<script lang="ts">
	import { cn } from '$lib/utils'
	import Button, { type ButtonProps } from './Button.svelte'
	import type { HTMLAttributes } from 'svelte/elements'

	interface ButtonGroupProps extends HTMLAttributes<HTMLDivElement> {
		buttons: ButtonProps[]
	}

	let { buttons, ...props }: ButtonGroupProps = $props()

	const containerClasses = $derived(cn('button-group', props.class))
</script>

{#if buttons && buttons.length > 0}
	<div {...props} class={containerClasses}>
		{#each buttons as button, i (button.id ?? i)}
			<Button {...button} />
		{/each}
	</div>
{/if}
