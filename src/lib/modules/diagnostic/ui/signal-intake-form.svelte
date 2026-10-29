<script lang="ts">
	/**
	 * Signal intake. Every field except the declared scope is required because
	 * the engine refuses a run without a commissioned decision, an owner, a
	 * reader and a timing — a reading with no decision attached cannot be
	 * interpreted by the person receiving it.
	 */
	import { Button } from '$lib/components/ui/button';
	import type { SignalIntake } from '../shared/registry.js';

	let {
		values = {},
		fieldErrors = {},
		submitLabel = 'Record this engagement'
	}: {
		values?: Partial<SignalIntake> & { declaredScope?: string | string[] };
		fieldErrors?: Record<string, string>;
		submitLabel?: string;
	} = $props();

	const scopeValue = $derived(
		Array.isArray(values.declaredScope)
			? values.declaredScope.join(', ')
			: (values.declaredScope ?? '')
	);
</script>

<form method="POST" class="flex max-w-xl flex-col gap-5">
	<div class="flex flex-col gap-2">
		<label for="subjectUrl" class="text-sm font-medium">Public address to read</label>
		<input
			id="subjectUrl"
			name="subjectUrl"
			type="url"
			inputmode="url"
			required
			value={values.subjectUrl ?? ''}
			placeholder="https://example.org"
			class="border-input bg-background h-9 rounded-md border px-3 text-sm"
		/>
		{#if fieldErrors.subjectUrl}
			<p class="text-destructive text-sm">{fieldErrors.subjectUrl}</p>
		{:else}
			<p class="text-muted-foreground text-sm">
				The site or page the reading is about. Signal reads only what is already public.
			</p>
		{/if}
	</div>

	<div class="flex flex-col gap-2">
		<label for="commissionedDecision" class="text-sm font-medium"
			>What decision does this reading inform?</label
		>
		<textarea
			id="commissionedDecision"
			name="commissionedDecision"
			required
			rows="3"
			maxlength="600"
			class="border-input bg-background rounded-md border px-3 py-2 text-sm"
			placeholder="Whether the public surface reads as a coherent, credible offer to a first-time buyer."
			value={values.commissionedDecision ?? ''}
		></textarea>
		{#if fieldErrors.commissionedDecision}
			<p class="text-destructive text-sm">{fieldErrors.commissionedDecision}</p>
		{/if}
	</div>

	<div class="grid gap-4 sm:grid-cols-2">
		<div class="flex flex-col gap-2">
			<label for="decisionOwner" class="text-sm font-medium">Who decides</label>
			<input
				id="decisionOwner"
				name="decisionOwner"
				required
				maxlength="120"
				value={values.decisionOwner ?? ''}
				placeholder="Managing director"
				class="border-input bg-background h-9 rounded-md border px-3 text-sm"
			/>
			{#if fieldErrors.decisionOwner}
				<p class="text-destructive text-sm">{fieldErrors.decisionOwner}</p>
			{/if}
		</div>

		<div class="flex flex-col gap-2">
			<label for="intendedReader" class="text-sm font-medium">Who reads it</label>
			<input
				id="intendedReader"
				name="intendedReader"
				required
				maxlength="120"
				value={values.intendedReader ?? ''}
				placeholder="Referrer, commissioner or supporter"
				class="border-input bg-background h-9 rounded-md border px-3 text-sm"
			/>
			{#if fieldErrors.intendedReader}
				<p class="text-destructive text-sm">{fieldErrors.intendedReader}</p>
			{/if}
		</div>
	</div>

	<div class="flex flex-col gap-2">
		<label for="decisionTiming" class="text-sm font-medium">When it is needed</label>
		<input
			id="decisionTiming"
			name="decisionTiming"
			required
			maxlength="120"
			value={values.decisionTiming ?? ''}
			placeholder="Before the autumn campaign planning"
			class="border-input bg-background h-9 rounded-md border px-3 text-sm"
		/>
		{#if fieldErrors.decisionTiming}
			<p class="text-destructive text-sm">{fieldErrors.decisionTiming}</p>
		{/if}
	</div>

	<div class="flex flex-col gap-2">
		<label for="declaredScope" class="text-sm font-medium">Declared scope (optional)</label>
		<input
			id="declaredScope"
			name="declaredScope"
			maxlength="600"
			value={scopeValue}
			placeholder="Homepage, services, about"
			class="border-input bg-background h-9 rounded-md border px-3 text-sm"
		/>
		<p class="text-muted-foreground text-sm">
			Which public surfaces the reading should cover. Separate them with commas. A reading cannot
			claim more than it read.
		</p>
	</div>

	<div>
		<Button type="submit">{submitLabel}</Button>
	</div>
</form>
