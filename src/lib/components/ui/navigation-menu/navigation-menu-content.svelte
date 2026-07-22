<script lang="ts">
	import { NavigationMenu as NavigationMenuPrimitive } from "bits-ui";
	import { cn } from "$lib/utils";

	let {
		ref = $bindable(null),
		class: className,
		...restProps
	}: NavigationMenuPrimitive.ContentProps = $props();
</script>

<NavigationMenuPrimitive.Content
	bind:ref
	data-slot="navigation-menu-content"
	class={cn(
		"nav-content inset-s-0 top-0 w-full p-2 pe-2.5 md:absolute md:w-auto",
		"group-data-[viewport=false]/navigation-menu:bg-popover group-data-[viewport=false]/navigation-menu:text-popover-foreground group-data-[viewport=false]/navigation-menu:top-full group-data-[viewport=false]/navigation-menu:mt-1.5 group-data-[viewport=false]/navigation-menu:rounded-md group-data-[viewport=false]/navigation-menu:border group-data-[viewport=false]/navigation-menu:shadow **:data-[slot=navigation-menu-link]:focus:ring-0 **:data-[slot=navigation-menu-link]:focus:outline-none",
		className
	)}
	{...restProps}
/>

<style>
	:global(.nav-content[data-state="open"]) {
		animation: navContentIn 200ms ease-out forwards;
	}

	:global(.nav-content[data-state="closed"]) {
		animation: navContentOut 150ms ease-in forwards;
	}

	:global(.nav-content[data-motion]) {
		animation: navContentIn 200ms ease-out forwards;
	}

	@keyframes navContentIn {
		from {
			opacity: 0;
			transform: translateY(8px) scale(0.96);
		}
		to {
			opacity: 1;
			transform: translateY(0) scale(1);
		}
	}

	@keyframes navContentOut {
		from {
			opacity: 1;
			transform: translateY(0) scale(1);
		}
		to {
			opacity: 0;
			transform: translateY(8px) scale(0.96);
		}
	}
</style>
