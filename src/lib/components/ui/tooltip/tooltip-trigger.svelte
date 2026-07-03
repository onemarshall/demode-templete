<script lang="ts">
	import { cn } from "$lib/utils";
	import type { Snippet } from "svelte";
	import type { HTMLButtonAttributes } from "svelte/elements";

	let { class: className, children, type = "button", ...rest }: HTMLButtonAttributes & { children?: Snippet } =
		$props();
</script>

<button {type} class={cn("inline-flex items-center", className)} {...rest}>
	{@render children?.()}
</button>
