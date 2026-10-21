<script lang="ts">
	let { endpoint, class: className = '' }: { endpoint?: string; class?: string } = $props();
</script>

<div data-testid="cap-widget" data-endpoint={endpoint} class={className}></div>
