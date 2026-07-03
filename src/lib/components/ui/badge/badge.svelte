<script lang="ts">
	import { cn } from "$lib/utils";
	import type { Snippet } from "svelte";
	import type { HTMLAttributes } from "svelte/elements";

	type Variant = "default" | "secondary" | "outline" | "destructive";

	let {
		class: className,
		variant = "default",
		children,
		...rest
	}: HTMLAttributes<HTMLSpanElement> & { variant?: Variant; children?: Snippet } = $props();

	const variantClass = $derived(
		({
			default: "bg-primary text-primary-foreground",
			secondary: "bg-secondary text-secondary-foreground",
			outline: "border border-border text-foreground",
			destructive: "bg-destructive text-destructive-foreground",
		})[variant],
	);
</script>

<span class={cn("inline-flex rounded-md px-2 py-0.5 text-xs font-medium", variantClass, className)} {...rest}>
	{@render children?.()}
</span>
