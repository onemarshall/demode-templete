<script lang="ts">
	/* eslint-disable svelte/no-navigation-without-resolve */
	import { resolve } from '$app/paths'
	import {
		Button as ShadcnButton,
		buttonVariants,
		type ButtonSize,
		type ButtonVariant,
	} from '$lib/components/ui/button'

	import { Icon as Icontype, ArrowRight, Plus } from '@lucide/svelte'
	import { cn } from '$lib/utils'
	import { resolveDirectusLink } from '$lib/utils/directus-links'

	export interface ButtonProps {
		id?: string
		label?: string | null
		variant?: ButtonVariant | null
		url?: string | null
		type?: 'page' | 'post' | 'url' | 'submit' | null
		page?: { permalink: string | null }
		post?: { slug: string | null }
		button_size?: ButtonSize
		icon?: 'arrow' | 'plus'
		customIcon?: typeof Icontype
		iconPosition?: 'left' | 'right'
		class?: string
		onClick?: () => void
		disabled?: boolean
		block?: boolean
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
		iconPosition = 'left',
		class: className,
		onClick,
		disabled = false,
		block = false,
	}: ButtonProps = $props()

	const size = $derived<ButtonSize>(button_size || 'default')

	const icons: Record<string, typeof Icontype> = {
		arrow: ArrowRight,
		plus: Plus,
	}

	const Icon = $derived(customIcon || (icon ? icons[icon] : null))

	const link = $derived(resolveDirectusLink({ type, page, post, url }))

	const buttonClasses = $derived.by(() =>
		cn(
			buttonVariants({ variant: variant ?? 'default', size }),
			className,
			disabled && 'opacity-50 cursor-not-allowed',
			block && 'w-full'
		)
	)
</script>

{#snippet content()}
	<span class="flex items-center space-x-2">
		{#if icon && iconPosition === 'left' && Icon}
			<Icon class="size-4 shrink-0" />
		{/if}

		{#if label}
			<span>{label}</span>
		{/if}

		{#if icon && iconPosition === 'right' && Icon}
			<Icon class="size-4 shrink-0" />
		{/if}
	</span>
{/snippet}

{#if link.href}
	<ShadcnButton
		variant={variant ?? 'default'}
		{size}
		class={buttonClasses}
		{disabled}
		onclick={onClick}
	>
		{#if !link.isExternal}
			<a href={resolve(link.href as '/')}>{@render content()}</a>
		{:else}
			<a href={link.href} target="_blank" rel="noopener noreferrer">
				{@render content()}
			</a>
		{/if}
	</ShadcnButton>
{:else}
	<ShadcnButton
		type="submit"
		variant={variant ?? 'default'}
		{size}
		class={buttonClasses}
		{disabled}
	>
		{@render content()}
	</ShadcnButton>
{/if}
