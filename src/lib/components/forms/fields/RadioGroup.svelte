<script lang="ts">
	import * as RadioGroup from '$lib/components/ui/radio-group/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import { fromStore } from 'svelte/store';
	import type { SuperForm } from 'sveltekit-superforms';

	interface RadioGroupFieldProps {
		name: string;
		options: { value: string; text: string }[];
		form: SuperForm<Record<string, unknown>>;
	}

	const { name, options, form }: RadioGroupFieldProps = $props();

	const formValues = $derived(fromStore(form.form));
	const currentValue = $derived((formValues.current[name] as string | undefined) ?? '');

	const handleChange = (newValue: string) => {
		form.form.update((data) => ({ ...data, [name]: newValue }));
	};
</script>

<RadioGroup.Root {name} value={currentValue} onValueChange={handleChange}>
	{#each options as option (option.value)}
		<div class="flex items-center gap-x-2">
			<RadioGroup.Item id={`${name}-${option.value}`} value={option.value} />
			<Label for={`${name}-${option.value}`} class="text-sm">
				{option.text}
			</Label>
		</div>
	{/each}
</RadioGroup.Root>
