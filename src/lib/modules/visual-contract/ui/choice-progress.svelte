<script lang="ts">
	/** Card N of 6 plus a compact progress indicator. Announced politely on navigation. */
	let { current, total, label = 'Visual Contract' }: { current: number; total: number; label?: string } =
		$props();

	const percent = $derived(Math.round((current / total) * 100));
</script>

<div class="flex flex-col gap-2">
	<div class="text-muted-foreground flex items-center justify-between text-xs">
		<span>{label}</span>
		<span aria-live="polite">Card {current} of {total}</span>
	</div>
	<div
		class="bg-muted h-1.5 w-full overflow-hidden rounded-full"
		role="progressbar"
		aria-valuenow={current}
		aria-valuemin={0}
		aria-valuemax={total}
		aria-label={`${label}: card ${current} of ${total}`}
	>
		<div
			class="bg-foreground h-full rounded-full transition-[width] motion-reduce:transition-none"
			style:width={`${percent}%`}
		></div>
	</div>
</div>
