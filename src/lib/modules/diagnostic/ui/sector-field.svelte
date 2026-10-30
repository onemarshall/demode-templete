<script lang="ts">
	/**
	 * Approved sector selection. Gap and Direction cannot run without an
	 * approved sector intelligence version, so an empty catalogue is stated
	 * plainly rather than hidden behind a free-text field.
	 */
	let {
		values = {},
		fieldErrors = {},
		sectors = [],
		sectorError = null
	}: {
		values?: Record<string, unknown>;
		fieldErrors?: Record<string, string>;
		sectors?: Array<{ ref: string; name: string }>;
		sectorError?: string | null;
	} = $props();

	const selected = $derived(String(values.sectorRef ?? ''));
</script>

<div class="flex flex-col gap-2">
	<label for="sectorRef" class="text-sm font-medium">Sector</label>
	{#if sectorError}
		<p class="text-destructive text-sm">{sectorError}</p>
	{:else if sectors.length === 0}
		<p class="text-destructive text-sm">
			No approved sector research is available yet. Gap and Direction cannot start until the
			sector has approved intelligence.
		</p>
	{:else}
		<select
			id="sectorRef"
			name="sectorRef"
			required
			class="border-input bg-background h-9 rounded-md border px-3 text-sm"
		>
			<option value="">Choose an approved sector</option>
			{#each sectors as sector (sector.ref)}
				<option value={sector.ref} selected={selected === sector.ref}>{sector.name}</option>
			{/each}
		</select>
	{/if}
	{#if fieldErrors.sectorRef}
		<p class="text-destructive text-sm">{fieldErrors.sectorRef}</p>
	{:else}
		<p class="text-muted-foreground text-sm">
			Only sectors with approved research are listed. The sector is checked again when the
			diagnostic starts.
		</p>
	{/if}
</div>
