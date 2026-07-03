<script lang="ts">
	import * as Select from '$lib/components/ui/select/index.js'
	import { fromStore } from 'svelte/store'
	import type { SuperForm } from 'sveltekit-superforms'

	interface SelectFieldProps {
		name: string
		options: { value: string; text: string }[]
		placeholder?: string | null
		form: SuperForm<Record<string, unknown>>
	}

	const { name, options, placeholder, form }: SelectFieldProps = $props()

	const formValues = $derived(fromStore(form.form))

	const currentValue = $derived((formValues.current[name] as string | undefined) ?? '')

	const activeLabel = $derived(
		options.find((option) => option.value === currentValue)?.text ||
			placeholder ||
			'Select an option'
	)

	const handleChange = (value: string) => {
		form.form.update((data) => ({ ...data, [name]: value }))
	}
</script>

<Select.Root type="single" {name} value={currentValue} onValueChange={handleChange}>
	<!-- Grid sizer: trigger and an invisible list of every option occupy the same
	     grid cell, so the cell (and the visible trigger) auto-sizes to the widest
	     option text. -->
	<div class="inline-grid items-stretch">
		<div class="col-start-1 row-start-1">
			<Select.Trigger class="bg-muted/40 w-full">
				{activeLabel}
			</Select.Trigger>
		</div>
		<div
			aria-hidden="true"
			class="pointer-events-none invisible col-start-1 row-start-1 h-0 overflow-hidden px-3 pr-9 text-sm"
		>
			<span class="block whitespace-nowrap">{placeholder || 'Select an option'}</span>
			{#each options as option (option.value)}
				<span class="block whitespace-nowrap">{option.text}</span>
			{/each}
		</div>
	</div>
	<Select.Content
		class="bg-popover text-popover-foreground border-border border shadow-md"
	>
		{#each options as option (option.value)}
			<Select.Item
				value={option.value}
				class="data-[highlighted]:bg-gray-200 data-[highlighted]:text-popover-foreground"
			>
				{option.text}
			</Select.Item>
		{/each}
	</Select.Content>
</Select.Root>
