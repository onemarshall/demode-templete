<!-- src/lib/components/icons/X.svelte -->
<script lang="ts">
	interface Props {
		size?: number;
		class?: string;
	}

	let { size = 16, class: className = '' }: Props = $props();
</script>

<svg width={size} height={size} viewBox="0 0 32 32" fill="currentColor" class={className}>
	<title>x</title>
	<g fill="currentColor">
		<polygon
			points="14.457 20.202 5.876 30 1.123 30 12.237 17.304 14.457 20.202"
			fill="currentColor"
		></polygon>
		<polygon
			points="17.051 10.988 24.908 2 29.658 2 19.251 13.902 17.051 10.988"
			fill="currentColor"
		></polygon>
		<path
			d="M31.488,30h-9.559L.512,2H10.313L31.488,30Zm-8.248-2.843h2.632L8.883,4.694h-2.824L23.241,27.157Z"
			fill="currentColor"
		></path>
	</g>
</svg>
