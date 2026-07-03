<script lang="ts">
	import type { FormField as FormFieldType } from "$lib/types/directus-schema";
	import { Checkbox } from "$lib/components/ui/checkbox";
	import Input from "$lib/components/ui/input/input.svelte";
	import { Textarea } from "$lib/components/ui/textarea";
	import { Label } from "$lib/components/ui/label/index.js";
	import { Info } from "@lucide/svelte";
	import CheckBoxGroup from "./fields/CheckBoxGroupField.svelte";
	import RadioGroup from "./fields/RadioGroup.svelte";
	import SelectField from "./fields/SelectField.svelte";
	import * as Form from "$lib/components/ui/form/index.js";
	import * as Tooltip from "$lib/components/ui/tooltip/index.js";
	import type { SuperForm } from "sveltekit-superforms";
	import FileUploadField from "./fields/FileUploadField.svelte";

	interface FieldProps {
		field: FormFieldType;
		form: SuperForm<Record<string, unknown>>;
		layout?: "single" | "multi";
	}

	const { field, form, layout = "single" }: FieldProps = $props();

	const { errors } = $derived(form);

	const fieldName = $derived(field.name as string);

	const { form: formData } = $derived(form);
	const widthClass = $derived(
		layout === "single"
			? "flex-[100%]"
			: field.width
				? {
						100: "flex-[100%]",
						50: "flex-[calc(50%-1rem)]",
						67: "flex-[calc(67%-1rem)]",
						33: "flex-[calc(33%-1rem)]",
					}[field.width] || "flex-[100%]"
				: "flex-[100%]",
	);
</script>

{#if (field.type as string) === "content"}
	<!-- Static content block: renders the label as HTML, with no input.
	     Author can put paragraphs, links, etc. in the Label field. -->
	<div
		class={`text-card-foreground prose prose-sm max-w-none [&_a]:text-primary [&_a]:underline ${widthClass}`}
	>
		{@html field.label ?? ""}
	</div>
{:else if field.type !== "hidden"}
	<div class={`flex shrink-0 flex-col justify-center gap-1.5 ${widthClass}`}>
		<Form.Field {form} name={field.name!}>
			<Form.Control>
				{#snippet children({ props })}
					{#if field.type !== "checkbox"}
						<Form.Label
							for={field.name}
							class="text-card-foreground flex items-center gap-1 text-sm font-medium"
						>
							<span>{field.label}</span>
							{#if field.required}
								<span
									class="text-destructive"
									aria-hidden="true">*</span
								>
								<span class="sr-only">(required)</span>
							{/if}
							{#if field.help}
								<Tooltip.Provider>
									<Tooltip.Root>
										<Tooltip.Trigger class="ml-0.5">
											<Info
												class="text-muted-foreground size-4"
											/>
										</Tooltip.Trigger>
										<Tooltip.Content
											class="bg-background border max-w-xs"
										>
											{field.help}
										</Tooltip.Content>
									</Tooltip.Root>
								</Tooltip.Provider>
							{/if}
						</Form.Label>
					{/if}

					{#if field.type === "text"}
						<Input
							{...props}
							placeholder={field.placeholder || ""}
							name={field.name || ""}
							bind:value={$formData[field.name!] as string}
							type={field.validation?.includes("email")
								? "email"
								: "text"}
							class="bg-muted/40"
						/>
					{:else if field.type === "textarea"}
						<Textarea
							{...props}
							placeholder={field.placeholder || ""}
							name={field.name || ""}
							bind:value={$formData[field.name!] as string}
							required={field.required}
							class="bg-muted/40 min-h-36"
						/>
					{:else if field.type === "checkbox"}
						<div class="flex items-center gap-x-3">
							<Checkbox
								{...props}
								name={field.name}
								bind:checked={$formData[field.name!] as boolean}
								required={!!field.required}
								class="data-[state=checked]:bg-primary/35!"
							/>
							<Label
								for={field.name}
								class="leading-none [&_a]:text-primary [&_a]:underline"
							>
								{@html field.label ?? ""}
							</Label>
						</div>
					{:else if field.type === "checkbox_group"}
						<CheckBoxGroup
							name={field.name || ""}
							options={field.choices || []}
							{form}
						/>
					{:else if field.type === "select"}
						<SelectField
							name={field.name || ""}
							options={field.choices || []}
							{form}
						/>
					{:else if field.type === "radio"}
						<RadioGroup
							name={field.name || ""}
							options={field.choices || []}
							{form}
						/>
					{:else if field.type === "file"}
						<FileUploadField name={field.name || ""} {form} />
					{:else}
						<p>Unknown field type: {field.type}</p>
					{/if}
				{/snippet}
			</Form.Control>
			<Form.Description>{field.help}</Form.Description>
			{#if $errors[fieldName]}
				<Form.FieldErrors>
					{#each Array.isArray($errors[fieldName]) ? $errors[fieldName] : [] as error, i (i)}
						<p class="text-red-500">{error}</p>
					{/each}
				</Form.FieldErrors>
			{/if}
		</Form.Field>
	</div>
{/if}
