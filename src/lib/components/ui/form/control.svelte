<script lang="ts">
	import type { Snippet } from "svelte";
	import { getFormFieldContext } from "./context";

	interface Props {
		children?: Snippet<[{ props: { id: string; name: string } }]>;
	}

	let { children }: Props = $props();
	const field = getFormFieldContext();
	const controlProps = $derived({
		id: field?.getName() ?? "",
		name: field?.getName() ?? "",
	});
</script>

{@render children?.({ props: controlProps })}
