<script lang="ts">
	import { cn } from "$lib/utils";
	import type { HTMLInputAttributes } from "svelte/elements";

	interface Props extends Omit<HTMLInputAttributes, "type" | "checked"> {
		checked?: boolean;
		onCheckedChange?: (checked: boolean) => void;
		class?: string;
	}

	let { checked = $bindable(false), onCheckedChange, class: className, ...rest }: Props = $props();

	const handleChange = (event: Event) => {
		checked = (event.currentTarget as HTMLInputElement).checked;
		onCheckedChange?.(checked);
	};
</script>

<input
	type="checkbox"
	bind:checked
	onchange={handleChange}
	class={cn("accent-primary size-4 rounded border", className)}
	{...rest}
/>
