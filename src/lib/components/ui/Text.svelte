<script lang="ts">
	import { cn } from "$lib/utils";
	import SafeHtml from "$lib/components/layout/SafeHtml.svelte";
	import type { Snippet } from "svelte";
	import type { HTMLAttributes } from "svelte/elements";

	interface Props extends HTMLAttributes<HTMLDivElement> {
		content?: string | null;
		children?: Snippet;
	}

	let { content, class: className, children, ...rest }: Props = $props();
</script>

<div class={cn("prose max-w-none", className)} {...rest}>
	{#if content}
		<SafeHtml {content} />
	{/if}
	{@render children?.()}
</div>
