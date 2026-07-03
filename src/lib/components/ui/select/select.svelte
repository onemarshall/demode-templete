<script lang="ts">
	import type { Snippet } from "svelte";
	import { setSelectContext } from "./context";

	interface Props {
		value?: string;
		name?: string;
		type?: "single";
		onValueChange?: (value: string) => void;
		children?: Snippet;
	}

	let { value = "", onValueChange, children }: Props = $props();

	setSelectContext({
		getValue: () => value,
		setValue: (next) => onValueChange?.(next),
	});
</script>

<div class="relative inline-flex flex-col gap-1">
	{@render children?.()}
</div>
