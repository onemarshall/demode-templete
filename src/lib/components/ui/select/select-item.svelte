<script lang="ts">
	import { cn } from "$lib/utils";
	import type { Snippet } from "svelte";
	import type { HTMLButtonAttributes } from "svelte/elements";
	import { getSelectContext } from "./context";

	let { value, class: className, children, type = "button", ...rest }: HTMLButtonAttributes & {
		value: string;
		children?: Snippet;
	} = $props();

	const context = getSelectContext();
</script>

<button
	{type}
	class={cn("hover:bg-muted flex w-full rounded-sm px-2 py-1.5 text-left text-sm", className)}
	onclick={() => context?.setValue(value)}
	{...rest}
>
	{@render children?.()}
</button>
