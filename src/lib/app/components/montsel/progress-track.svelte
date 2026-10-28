<script lang="ts">
	let {
		completed,
		total,
		label,
		showCount = true
	}: {
		completed: number;
		total: number | null;
		label?: string;
		showCount?: boolean;
	} = $props();

	const percent = $derived(total ? Math.min(100, Math.round((completed / total) * 100)) : 0);
</script>

<div class="flex flex-col gap-1">
	{#if label || showCount}
		<div class="text-muted-foreground flex items-center justify-between text-xs">
			<span>{label ?? ''}</span>
			{#if showCount && total}<span>{completed} of {total}</span>{/if}
		</div>
	{/if}
	<div
		class="bg-muted h-1.5 w-full overflow-hidden rounded-full"
		role="progressbar"
		aria-valuenow={total ? completed : undefined}
		aria-valuemin={0}
		aria-valuemax={total ?? undefined}
		aria-label={label ?? 'Progress'}
	>
		<div class="bg-foreground h-full rounded-full transition-[width]" style:width={`${percent}%`}></div>
	</div>
</div>
