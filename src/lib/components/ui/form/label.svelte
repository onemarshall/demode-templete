<script lang="ts">
	import Label from "$lib/components/ui/label/label.svelte";
	import type { ComponentProps, Snippet } from "svelte";

	let { children, ...rest }: ComponentProps<typeof Label> & { children?: Snippet } = $props();
</script>

<Label {...rest}>{@render children?.()}</Label>
