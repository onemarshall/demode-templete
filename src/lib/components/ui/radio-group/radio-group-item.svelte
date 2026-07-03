<script lang="ts">
	import { cn } from "$lib/utils";
	import type { HTMLInputAttributes } from "svelte/elements";
	import { getRadioContext } from "./context";

	let { value, class: className, ...rest }: Omit<HTMLInputAttributes, "type"> & { value: string } =
		$props();

	const context = getRadioContext();
	const checked = $derived(context?.getValue() === value);
</script>

<input
	type="radio"
	name={context?.getName?.()}
	{value}
	checked={checked}
	onchange={() => context?.setValue(value)}
	class={cn("accent-primary size-4", className)}
	{...rest}
/>
