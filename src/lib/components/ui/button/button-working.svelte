<script lang="ts">
	interface Props {
		label?: string
		type?: 'button' | 'submit' | 'reset'
		disabled?: boolean
		class?: string
		children?: import('svelte').Snippet
		[key: string]: unknown
	}

	let {
		label,
		type = 'button',
		disabled = false,
		class: className = '',
		children,
		...restProps
	}: Props = $props()
</script>

<button {type} {disabled} class={className} {...restProps}>
	{#if children}{@render children()}{:else}{label}{/if}
</button>
