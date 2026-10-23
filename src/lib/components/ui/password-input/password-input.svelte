<script lang="ts">
	import type { HTMLInputAttributes } from "svelte/elements";
	import { cn } from "#lib/utils.ts";
	import { Eye, EyeOff } from "@lucide/svelte";

	type ClassProp = {
		container?: string;
		input?: string;
		icon?: string;
		button?: string;
	};

	type Props = Omit<HTMLInputAttributes, "type" | "class"> & {
		ref?: HTMLInputElement | null;
		class?: ClassProp;
		showPassword?: boolean;
	};

	let {
		showPassword = $bindable(false),
		ref = $bindable(null),
		value = $bindable(),
		class: _class = {},
		...restProps
	}: Props = $props();

	function attachRef(element: HTMLInputElement) {
		ref = element;
		return () => { ref = null; };
	}
</script>

<div class={cn("relative w-full", _class?.container)}>
	<input
		{@attach attachRef}
		class={cn(
			"selection:bg-primary dark:bg-input/30 selection:text-primary-foreground border-input ring-offset-background placeholder:text-muted-foreground flex h-9 w-full min-w-0 rounded-md border bg-transparent px-3 py-2 text-sm font-medium shadow-xs transition-[color,box-shadow] outline-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
			"focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
			"aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
			_class?.input,
		)}
		{...restProps}
		type={showPassword ? "text" : "password"}
		bind:value
	/>
	<button
		type="button"
		aria-label={showPassword ? "Hide password" : "Show password"}
		aria-pressed={showPassword}
		class={cn(
			"text-muted-foreground hover:text-foreground absolute inset-y-0 right-2 flex items-center justify-center p-2",
			_class?.button,
		)}
		onclick={() => (showPassword = !showPassword)}
	>
		{#if showPassword}
			<EyeOff size={18} class={_class?.icon} />
		{:else}
			<Eye size={18} class={_class?.icon} />
		{/if}
	</button>
</div>
