<script lang="ts">
	/* eslint-disable svelte/no-navigation-without-resolve */
	import { resolvePathname } from "$lib/utils/path";
	import {
		Button as ShadcnButton,
		buttonVariants,
		type ButtonSize,
		type ButtonVariant,
	} from "$lib/components/ui/button";

	import type { LucideIcon } from "@lucide/svelte";
	import { ArrowRight, Plus } from "@lucide/svelte";
	import { cn } from "$lib/utils";
	import { resolveDirectusLink } from "$lib/utils/directus-links";

	export interface ButtonProps {
		id?: string;
		label?: string | null;
		variant?: ButtonVariant | null;
		url?: string | null;
		type?: "page" | "post" | "url" | "submit" | null;
		page?: { permalink: string | null };
		post?: { slug: string | null };
		button_size?: ButtonSize;
		icon?: "arrow" | "plus";
		customIcon?: LucideIcon;
		iconPosition?: "left" | "right";
		class?: string;
		onClick?: () => void;
		disabled?: boolean;
		block?: boolean;
	}

	const {
		id: _id,
		label,
		variant,
		url,
		type,
		page,
		post,
		button_size,
		icon,
		customIcon,
		iconPosition = "left",
		class: className,
		onClick,
		disabled = false,
		block = false,
	}: ButtonProps = $props();

	const size = $derived<ButtonSize>(button_size || "default");

	const icons: Record<string, LucideIcon> = {
		arrow: ArrowRight,
		plus: Plus,
	};

	const Icon = $derived(customIcon || (icon ? icons[icon] : null));

	const link = $derived(resolveDirectusLink({ type, page, post, url }));

	const buttonClasses = $derived.by(() =>
		cn(
			buttonVariants({ variant: variant ?? "default", size }),
			className,
			disabled && "opacity-50 cursor-not-allowed",
			block && "w-full",
		),
	);
</script>

{#snippet content()}
	<span class="flex items-center space-x-2">
		{#if Icon && iconPosition === "left"}
			<Icon class="size-4 shrink-0" />
		{/if}

		{#if label}
			<span>{label}</span>
		{/if}

		{#if Icon && iconPosition === "right"}
			<Icon class="size-4 shrink-0" />
		{/if}
	</span>
{/snippet}

{#if link.href}
	<ShadcnButton
		id={_id}
		href={link.isExternal ? link.href : resolvePathname(link.href)}
		target={link.isExternal ? "_blank" : undefined}
		rel={link.isExternal ? "noopener noreferrer" : undefined}
		variant={variant ?? "default"}
		{size}
		class={buttonClasses}
		{disabled}
		onclick={onClick}
	>
		{@render content()}
	</ShadcnButton>
{:else}
	<ShadcnButton
		id={_id}
		type="submit"
		variant={variant ?? "default"}
		{size}
		class={buttonClasses}
		{disabled}
		onclick={onClick}
	>
		{@render content()}
	</ShadcnButton>
{/if}
