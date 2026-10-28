<script lang="ts">
	/**
	 * Optional project context. Every field can be left blank; Skip is always
	 * available and does not record anything.
	 *
	 * Context may shape examples later in the flow. It never changes what a
	 * commitment means.
	 */
	import { Button } from '$lib/components/ui/button';
	import type { ProjectContext } from '../shared/types.js';

	let {
		values = {},
		skipHref,
		submitLabel = 'Continue'
	}: {
		values?: ProjectContext;
		skipHref: string;
		submitLabel?: string;
	} = $props();
</script>

<form method="POST" class="flex max-w-xl flex-col gap-5">
	<div class="flex flex-col gap-2">
		<label for="projectName" class="text-sm font-medium">Project name</label>
		<input
			id="projectName"
			name="projectName"
			value={values.projectName ?? ''}
			maxlength="120"
			class="border-input bg-background h-9 rounded-md border px-3 text-sm"
		/>
	</div>

	<div class="flex flex-col gap-2">
		<label for="clientName" class="text-sm font-medium">Client or organisation</label>
		<input
			id="clientName"
			name="clientName"
			value={values.clientName ?? ''}
			maxlength="120"
			class="border-input bg-background h-9 rounded-md border px-3 text-sm"
		/>
	</div>

	<div class="grid gap-4 sm:grid-cols-2">
		<div class="flex flex-col gap-2">
			<label for="projectType" class="text-sm font-medium">Project type</label>
			<input
				id="projectType"
				name="projectType"
				value={values.projectType ?? ''}
				maxlength="80"
				placeholder="Website, packaging, brand identity"
				class="border-input bg-background h-9 rounded-md border px-3 text-sm"
			/>
		</div>
		<div class="flex flex-col gap-2">
			<label for="industry" class="text-sm font-medium">Industry</label>
			<input
				id="industry"
				name="industry"
				value={values.industry ?? ''}
				maxlength="80"
				class="border-input bg-background h-9 rounded-md border px-3 text-sm"
			/>
		</div>
	</div>

	<div class="flex flex-col gap-2">
		<label for="description" class="text-sm font-medium">What is this project?</label>
		<textarea
			id="description"
			name="description"
			rows="3"
			maxlength="600"
			class="border-input bg-background rounded-md border px-3 py-2 text-sm"
		>{values.description ?? ''}</textarea>
	</div>

	<div class="flex flex-wrap items-center gap-3">
		<Button type="submit">{submitLabel}</Button>
		<Button variant="ghost" href={skipHref}>Skip</Button>
	</div>
</form>
