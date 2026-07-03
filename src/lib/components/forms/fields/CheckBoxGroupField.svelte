<script lang="ts">
	import { Checkbox } from '$lib/components/ui/checkbox';
	import type { SuperForm } from 'sveltekit-superforms';

	interface CheckboxGroupFieldProps {
		name: string;
		options: { value: string; text: string }[];
		form: SuperForm<Record<string, unknown>>;
	}

	const { name = 'unknown', options, form }: CheckboxGroupFieldProps = $props();

	const { form: formData } = $derived(form);
	const selectedValues = $derived(($formData[name] as string[] | undefined) ?? []);

	const handleCheckedChange = (optionValue: string, checked: boolean) => {
		formData.update((data) => {
			const current = (data[name] as string[] | undefined) ?? [];
			const next = checked
				? [...current, optionValue]
				: current.filter((v) => v !== optionValue);
			return { ...data, [name]: next };
		});
	};
</script>

<div>
	{#each options as option (option.value)}
		<div class="flex items-center gap-x-2">
			<Checkbox
				id={`${name}-${option.value}`}
				checked={selectedValues.includes(option.value)}
				onCheckedChange={(checked) => handleCheckedChange(option.value, checked)}
			/>
			<label for={`${name}-${option.value}`} class="text-sm">
				{option.text}
			</label>
		</div>
	{/each}
</div>
