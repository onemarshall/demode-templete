<script lang="ts">
	/**
	 * Direction intake. Direction tests one supplied proposal; it does not
	 * create a replacement. The proposal and its version are required.
	 */
	import { Button } from '$lib/components/ui/button';
	import DecisionFrameFields from './decision-frame-fields.svelte';
	import SectorField from './sector-field.svelte';

	let {
		values = {},
		fieldErrors = {},
		sectors = [],
		sectorError = null,
		submitLabel = 'Record this Direction engagement'
	}: {
		values?: Record<string, unknown>;
		fieldErrors?: Record<string, string>;
		sectors?: Array<{ ref: string; name: string }>;
		sectorError?: string | null;
		submitLabel?: string;
	} = $props();

	const text = (key: string) => String(values[key] ?? '');
</script>

<form method="POST" class="flex max-w-2xl flex-col gap-5">
	<DecisionFrameFields {values} {fieldErrors} />

	<SectorField {values} {fieldErrors} {sectors} {sectorError} />

	<div class="flex flex-col gap-2">
		<label for="buyerInput" class="text-sm font-medium">Primary buyer group and evidence</label>
		<textarea
			id="buyerInput"
			name="buyerInput"
			required
			rows="3"
			maxlength="4000"
			class="border-input bg-background rounded-md border px-3 py-2 text-sm"
			placeholder="Who the proposal is for, and the buyer evidence you can supply."
			value={text('buyerInput')}
		></textarea>
		{#if fieldErrors.buyerInput}
			<p class="text-destructive text-sm">{fieldErrors.buyerInput}</p>
		{/if}
	</div>

	<div class="flex flex-col gap-2">
		<label for="decisionContext" class="text-sm font-medium">Decision context</label>
		<textarea
			id="decisionContext"
			name="decisionContext"
			required
			rows="3"
			maxlength="2000"
			class="border-input bg-background rounded-md border px-3 py-2 text-sm"
			placeholder="The approval decision, the date and what happens if it is approved."
			value={text('decisionContext')}
		></textarea>
		{#if fieldErrors.decisionContext}
			<p class="text-destructive text-sm">{fieldErrors.decisionContext}</p>
		{/if}
	</div>

	<div class="flex flex-col gap-2">
		<label for="proposedDirection" class="text-sm font-medium">The proposal to test</label>
		<textarea
			id="proposedDirection"
			name="proposedDirection"
			required
			rows="6"
			maxlength="8000"
			class="border-input bg-background rounded-md border px-3 py-2 text-sm"
			placeholder="The exact position, audience, promise, proof and tone you intend to approve."
			value={text('proposedDirection')}
		></textarea>
		{#if fieldErrors.proposedDirection}
			<p class="text-destructive text-sm">{fieldErrors.proposedDirection}</p>
		{:else}
			<p class="text-muted-foreground text-sm">
				Paste the proposal as it will be approved. The diagnostic does not improve or replace it.
			</p>
		{/if}
	</div>

	<div class="flex flex-col gap-2">
		<label for="proposalVersion" class="text-sm font-medium">Proposal version</label>
		<input
			id="proposalVersion"
			name="proposalVersion"
			required
			maxlength="80"
			value={text('proposalVersion')}
			placeholder="v3, 29 October board draft"
			class="border-input bg-background h-9 rounded-md border px-3 text-sm"
		/>
		{#if fieldErrors.proposalVersion}
			<p class="text-destructive text-sm">{fieldErrors.proposalVersion}</p>
		{/if}
	</div>

	<div class="flex flex-col gap-2">
		<label for="constraints" class="text-sm font-medium">Constraints</label>
		<textarea
			id="constraints"
			name="constraints"
			required
			rows="3"
			maxlength="4000"
			class="border-input bg-background rounded-md border px-3 py-2 text-sm"
			placeholder="Budget, time, capability or regulatory constraints that affect execution."
			value={text('constraints')}
		></textarea>
		{#if fieldErrors.constraints}
			<p class="text-destructive text-sm">{fieldErrors.constraints}</p>
		{/if}
	</div>

	<div class="flex flex-col gap-2">
		<label for="claimSupport" class="text-sm font-medium">Proof behind the central claims</label>
		<textarea
			id="claimSupport"
			name="claimSupport"
			required
			rows="4"
			maxlength="4000"
			class="border-input bg-background rounded-md border px-3 py-2 text-sm"
			placeholder="What supports the promise, and what is still asserted rather than evidenced."
			value={text('claimSupport')}
		></textarea>
		{#if fieldErrors.claimSupport}
			<p class="text-destructive text-sm">{fieldErrors.claimSupport}</p>
		{/if}
	</div>

	<div class="flex flex-col gap-2">
		<label for="expectedCommitment" class="text-sm font-medium">Expected commitment</label>
		<input
			id="expectedCommitment"
			name="expectedCommitment"
			required
			maxlength="2000"
			value={text('expectedCommitment')}
			placeholder="The spend, work or approval this direction commits."
			class="border-input bg-background h-9 rounded-md border px-3 text-sm"
		/>
		{#if fieldErrors.expectedCommitment}
			<p class="text-destructive text-sm">{fieldErrors.expectedCommitment}</p>
		{/if}
	</div>

	<div class="flex flex-col gap-2">
		<label for="currentEvidence" class="text-sm font-medium">Current public evidence</label>
		<textarea
			id="currentEvidence"
			name="currentEvidence"
			required
			rows="3"
			maxlength="4000"
			class="border-input bg-background rounded-md border px-3 py-2 text-sm"
			placeholder="What the current public material says, and the current gap."
			value={text('currentEvidence')}
		></textarea>
		{#if fieldErrors.currentEvidence}
			<p class="text-destructive text-sm">{fieldErrors.currentEvidence}</p>
		{/if}
	</div>

	<div class="flex flex-col gap-2">
		<label for="readinessEvidence" class="text-sm font-medium">Readiness evidence</label>
		<textarea
			id="readinessEvidence"
			name="readinessEvidence"
			required
			rows="3"
			maxlength="4000"
			class="border-input bg-background rounded-md border px-3 py-2 text-sm"
			placeholder="What shows the organisation can execute this direction now."
			value={text('readinessEvidence')}
		></textarea>
		{#if fieldErrors.readinessEvidence}
			<p class="text-destructive text-sm">{fieldErrors.readinessEvidence}</p>
		{/if}
	</div>

	<div class="flex flex-col gap-2">
		<label for="evidenceScope" class="text-sm font-medium">Evidence scope</label>
		<input
			id="evidenceScope"
			name="evidenceScope"
			required
			maxlength="600"
			value={text('evidenceScope')}
			placeholder="Current site, sector research, the supplied proposal and the buyer notes"
			class="border-input bg-background h-9 rounded-md border px-3 text-sm"
		/>
		{#if fieldErrors.evidenceScope}
			<p class="text-destructive text-sm">{fieldErrors.evidenceScope}</p>
		{:else}
			<p class="text-muted-foreground text-sm">
				Which evidence the review should use. A Direction cannot test more than it reviewed.
			</p>
		{/if}
	</div>

	<div>
		<Button type="submit">{submitLabel}</Button>
	</div>
</form>
