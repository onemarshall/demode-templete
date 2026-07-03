<script lang="ts">
	import { cn } from "$lib/utils";
	import type { Snippet } from "svelte";
	import type { HTMLButtonAttributes } from "svelte/elements";

	let { class: className, children, type = "button", ...rest }: HTMLButtonAttributes & { children?: Snippet } =
		$props();
</script>

<button
	{type}
	class={cn("border-input bg-background flex h-10 items-center justify-between rounded-md border px-3 py-2 text-sm", className)}
	{...rest}
>
	{@render children?.()}
</button>
