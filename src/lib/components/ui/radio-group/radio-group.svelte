<script lang="ts">
	import type { Snippet } from "svelte";
	import { setRadioContext } from "./context";

	interface Props {
		value?: string;
		name?: string;
		onValueChange?: (value: string) => void;
		children?: Snippet;
	}

	let { value = "", name, onValueChange, children }: Props = $props();

	setRadioContext({
		getValue: () => value,
		setValue: (next) => onValueChange?.(next),
		getName: () => name ?? "",
	});
</script>

<div role="radiogroup">
	{@render children?.()}
</div>
