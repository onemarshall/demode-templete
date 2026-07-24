<script lang="ts">
	import { dev } from "$app/env";
	import setAttr from "$lib/services/directus/visualEditing";
	import type { FormField as FormFieldType } from "$lib/types/directus-schema";
	import { buildZodSchema } from "$lib/components/forms/schema";
	import Button from "../blocks/Button.svelte";
	import Field from "./FormField.svelte";
	import { superForm } from "sveltekit-superforms";
	import SuperDebug from "sveltekit-superforms";
	import { untrack } from "svelte";
	import { fromAction } from "svelte/attachments";

	import { zod4Client } from "sveltekit-superforms/adapters";

	interface DynamicFormProps {
		fields: FormFieldType[];
		onSubmit: (data: Record<string, unknown>) => void | Promise<void>;
		submitLabel: string;
		id: string;
		layout?: "single" | "multi";
	}

	let {
		fields,
		onSubmit,
		submitLabel,
		id,
		layout = "single",
	}: DynamicFormProps = $props();

	const initialFields = untrack(() => fields);
	const sortedFields = [...initialFields].sort(
		(a, b) => (a.sort || 0) - (b.sort || 0),
	);
	const formSchema = buildZodSchema(initialFields);

	const defaultValues = initialFields.reduce<Record<string, unknown>>(
		(defaults, field) => {
			if (!field.name) return defaults;
			// Content fields are display-only — no value to seed.
			if ((field.type as string) === "content") return defaults;
			switch (field.type) {
				case "checkbox":
					defaults[field.name] = false;
					break;
				case "checkbox_group":
					defaults[field.name] = [];
					break;
				case "radio":
					defaults[field.name] = "";
					break;
				default:
					defaults[field.name] = "";
					break;
			}

			return defaults;
		},
		{},
	);

	const form = superForm(defaultValues, {
		validators: zod4Client(formSchema),
		SPA: true,
		onUpdate({ form: updatedForm }) {
			if (updatedForm.valid) {
				onSubmit(updatedForm.data);
			}
		},
	});

	const { form: formData, errors, enhance } = form;
	const enhanceAttachment = $derived(fromAction(enhance));
</script>

<form
	method="POST"
	class="flex flex-wrap gap-4"
	{@attach enhanceAttachment}
	data-directus={setAttr({
		collection: "forms",
		item: id,
		fields: "fields",
		mode: "popover",
	})}
>
	{#each sortedFields as field (field.id)}
		<Field {field} {form} {layout} />
	{/each}

	<div class="mt-4 w-full">
		<div
			data-directus={setAttr({
				collection: "forms",
				item: id,
				fields: "submit_label",
				mode: "popover",
			})}
		>
			<Button
				type="submit"
				variant="outline"
				button_size="lg"
				label={submitLabel}
				id={`submit-${submitLabel.replace(/\s+/g, "-").toLowerCase()}`}
			></Button>
		</div>
	</div>
	{#if dev}
		<div class="flex w-full flex-col gap-2 rounded-xl bg-red-200 p-2">
			<p class="text-center text-red-500">Form Debugger</p>
			<SuperDebug data={{ formData: $formData, errors: $errors }} />
		</div>
	{/if}
</form>
