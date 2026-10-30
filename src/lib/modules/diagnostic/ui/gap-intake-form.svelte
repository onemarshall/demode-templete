<script lang="ts">
	/**
	 * Gap intake. Gap starts from the sector pattern, buyer pressure and the
	 * organisation's stated intent — not from a five-dimension score.
	 */
	import { Button } from '$lib/components/ui/button';
	import DecisionFrameFields from './decision-frame-fields.svelte';
	import SectorField from './sector-field.svelte';

	let {
		values = {},
		fieldErrors = {},
		sectors = [],
		sectorError = null,
		submitLabel = 'Record this Gap engagement'
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
		<label for="geography" class="text-sm font-medium">Geography</label>
		<input
			id="geography"
			name="geography"
			required
			maxlength="80"
			value={text('geography')}
			placeholder="GB"
			class="border-input bg-background h-9 rounded-md border px-3 text-sm"
		/>
		{#if fieldErrors.geography}
			<p class="text-destructive text-sm">{fieldErrors.geography}</p>
		{:else}
			<p class="text-muted-foreground text-sm">A country code or name, for example GB or United Kingdom.</p>
		{/if}
	</div>

	<div class="flex flex-col gap-2">
		<label for="buyerInput" class="text-sm font-medium">What the buyer needs</label>
		<textarea
			id="buyerInput"
			name="buyerInput"
			required
			rows="4"
			maxlength="4000"
			class="border-input bg-background rounded-md border px-3 py-2 text-sm"
			placeholder="The buyer pressure or decision criteria you have evidence for."
			value={text('buyerInput')}
		></textarea>
		{#if fieldErrors.buyerInput}
			<p class="text-destructive text-sm">{fieldErrors.buyerInput}</p>
		{/if}
	</div>

	<div class="flex flex-col gap-2">
		<label for="organisationalIntent" class="text-sm font-medium"
			>What the organisation says it believes or intends</label
		>
		<textarea
			id="organisationalIntent"
			name="organisationalIntent"
			required
			rows="4"
			maxlength="4000"
			class="border-input bg-background rounded-md border px-3 py-2 text-sm"
			placeholder="The stated position, belief or intent, in the organisation's own words."
			value={text('organisationalIntent')}
		></textarea>
		{#if fieldErrors.organisationalIntent}
			<p class="text-destructive text-sm">{fieldErrors.organisationalIntent}</p>
		{/if}
	</div>

	<div class="flex flex-col gap-2">
		<label for="availableProof" class="text-sm font-medium">Proof already available</label>
		<textarea
			id="availableProof"
			name="availableProof"
			required
			rows="4"
			maxlength="4000"
			class="border-input bg-background rounded-md border px-3 py-2 text-sm"
			placeholder="Case notes, references, data or other evidence that can support a claim."
			value={text('availableProof')}
		></textarea>
		{#if fieldErrors.availableProof}
			<p class="text-destructive text-sm">{fieldErrors.availableProof}</p>
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
			placeholder="Homepage, services, sector research and the buyer notes supplied"
			class="border-input bg-background h-9 rounded-md border px-3 text-sm"
		/>
		{#if fieldErrors.evidenceScope}
			<p class="text-destructive text-sm">{fieldErrors.evidenceScope}</p>
		{:else}
			<p class="text-muted-foreground text-sm">
				Which evidence the diagnostic should use. A Gap cannot claim more than it reviewed.
			</p>
		{/if}
	</div>

	<div>
		<Button type="submit">{submitLabel}</Button>
	</div>
</form>
