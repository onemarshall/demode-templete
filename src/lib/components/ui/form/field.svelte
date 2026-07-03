<script lang="ts">
	import type { Snippet } from "svelte";
	import { setFormFieldContext } from "./context";

	interface Props {
		name: string;
		form?: unknown;
		children?: Snippet;
	}

	let { name, children }: Props = $props();
	setFormFieldContext({ getName: () => name });
</script>

<div class="flex flex-col gap-2">
	{@render children?.()}
</div>
