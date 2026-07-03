<script lang="ts">
	import type { FormField } from "$lib/types/directus-schema";
	import { cn } from "$lib/utils";
	import { CircleCheck } from "@lucide/svelte";
	import { goto } from "$app/navigation";
	import { resolve } from "$app/paths";
	import { submitGenericForm } from "$lib/features/forms/remote/generic.remote";
	import DynamicForm from "./DynamicForm.svelte";

	interface FormBuilderProps {
		class?: string;
		layout?: "single" | "multi";
		form: {
			id: string;
			on_success?: "redirect" | "message" | null;
			submit_label?: string;
			success_message?: string | null;
			title?: string | null;
			success_redirect_url?: string | null;
			is_active?: boolean | null;
			fields: FormField[];
		};
	}

	const {
		form,
		class: className,
		layout = "single",
	}: FormBuilderProps = $props();

	let isSubmitted = $state(false);
	let error = $state<string | null>(null);

	const handleSubmit = async (data: Record<string, unknown>) => {
		try {
			await submitGenericForm({
				formId: form.id,
				submissionData: data,
			});

			if (form.on_success === "redirect" && form.success_redirect_url) {
				if (form.success_redirect_url.startsWith("/")) {
					goto(resolve(form.success_redirect_url as "/"));
				} else {
					window.location.href = form.success_redirect_url;
				}
			} else {
				isSubmitted = true;
			}
		} catch (err) {
			error = "Failed to submit the form. Please try again later.";
		}
	};
</script>

{#if form.is_active}
	{#if isSubmitted}
		<div
			class={cn(
				"bg-card border-border flex flex-col items-center justify-center gap-4 rounded-lg border p-10 text-center shadow-sm",
				className,
			)}
		>
			<CircleCheck class="text-primary size-12" />
			<p class="text-muted-foreground text-base">
				{form.success_message ||
					"Your form has been submitted successfully."}
			</p>
		</div>
	{:else}
		<div
			class={cn(
				"bg-card border-border space-y-6 rounded-lg border p-6 shadow-sm md:p-10",
				className,
			)}
		>
			{#if form.title}
				<h2 class="mb-2 text-2xl font-semibold tracking-tight">
					{form.title}
				</h2>
			{/if}
			{#if error}
				<div
					class="border-destructive/30 bg-destructive/10 text-destructive rounded-md border p-4 text-sm"
					role="alert"
				>
					<strong class="font-semibold">Something went wrong.</strong>
					{error}
				</div>
			{/if}
			<DynamicForm
				fields={form.fields}
				onSubmit={handleSubmit}
				submitLabel={form.submit_label || "Submit"}
				id={form.id}
				{layout}
			/>
		</div>
	{/if}
{/if}
