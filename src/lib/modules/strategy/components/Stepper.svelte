<script lang="ts">
	type Step = { label: string };

	let {
		steps,
		viewStep = $bindable(0),
		activeStep,
		stepDone,
		canVisit,
		runLabel,
	}: {
		steps: readonly Step[];
		viewStep?: number;
		activeStep: number;
		stepDone: boolean[];
		canVisit: (i: number) => boolean;
		runLabel: string;
	} = $props();
</script>

<section class="space-y-3 rounded-md border p-4">
	<h2 class="font-medium">Where the check stands</h2>
	<div class="space-y-3 rounded-md border p-3" aria-label="Check progress">
		<div class="flex gap-1" aria-hidden="true">
			{#each steps as s, i (s.label)}
				<div class="h-1.5 flex-1 rounded-full {stepDone[i] ? 'bg-green-600' : i === activeStep ? 'bg-foreground' : 'bg-muted'}"></div>
			{/each}
		</div>
		<div class="grid grid-cols-11 gap-1">
			{#each steps as s, i (s.label)}
				<button
					class="flex flex-col items-center gap-1.5 rounded-md p-1.5 text-center {i === viewStep ? 'bg-muted' : ''} {canVisit(i)
						? 'hover:bg-muted/60'
						: 'opacity-40'}"
					onclick={() => canVisit(i) && (viewStep = i)}
					disabled={!canVisit(i)}
					aria-current={i === viewStep ? "step" : undefined}
				>
					<span
						class="flex h-7 w-7 items-center justify-center rounded-full border text-xs font-medium {stepDone[i]
							? 'border-green-700/50 bg-green-600 text-white'
							: i === activeStep
								? 'border-foreground'
								: 'text-muted-foreground'}"
					>
						{stepDone[i] ? "✓" : i + 1}
					</span>
					<span class="text-[11px] leading-tight {i === viewStep ? 'font-medium' : 'text-muted-foreground'}">{s.label}</span>
				</button>
			{/each}
		</div>
	</div>
	<p class="text-xs text-muted-foreground">{runLabel}</p>
</section>
