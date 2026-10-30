<script lang="ts">
	/**
	 * The decision frame every family shares. The engine refuses a run without
	 * a commissioned decision, an owner, a reader and a timing.
	 */
	let {
		values = {},
		fieldErrors = {},
		subjectLabel = 'Public address to read',
		subjectHelp = 'The site or page the diagnostic is about.'
	}: {
		values?: Record<string, unknown>;
		fieldErrors?: Record<string, string>;
		subjectLabel?: string;
		subjectHelp?: string;
	} = $props();
</script>

<div class="flex flex-col gap-2">
	<label for="subjectUrl" class="text-sm font-medium">{subjectLabel}</label>
	<input
		id="subjectUrl"
		name="subjectUrl"
		type="url"
		inputmode="url"
		required
		value={String(values.subjectUrl ?? '')}
		placeholder="https://example.org"
		class="border-input bg-background h-9 rounded-md border px-3 text-sm"
	/>
	{#if fieldErrors.subjectUrl}
		<p class="text-destructive text-sm">{fieldErrors.subjectUrl}</p>
	{:else}
		<p class="text-muted-foreground text-sm">{subjectHelp}</p>
	{/if}
</div>

<div class="flex flex-col gap-2">
	<label for="commissionedDecision" class="text-sm font-medium"
		>What decision does this diagnostic inform?</label
	>
	<textarea
		id="commissionedDecision"
		name="commissionedDecision"
		required
		rows="3"
		maxlength="600"
		class="border-input bg-background rounded-md border px-3 py-2 text-sm"
		placeholder="Whether to approve the autumn campaign."
		value={String(values.commissionedDecision ?? '')}
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
			value={String(values.decisionOwner ?? '')}
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
			value={String(values.intendedReader ?? '')}
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
		value={String(values.decisionTiming ?? '')}
		placeholder="Before the autumn campaign planning"
		class="border-input bg-background h-9 rounded-md border px-3 text-sm"
	/>
	{#if fieldErrors.decisionTiming}
		<p class="text-destructive text-sm">{fieldErrors.decisionTiming}</p>
	{/if}
</div>
