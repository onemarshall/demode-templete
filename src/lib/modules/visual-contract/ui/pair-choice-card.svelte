<script lang="ts">
	/**
	 * One pair, two equally visible options.
	 *
	 * Native radios give keyboard arrow navigation and a real selection state for
	 * free. `Learn more` is a separate button, outside the label, so revealing the
	 * explanation can never record a choice. Selection is local until the form is
	 * submitted, so the chosen side responds immediately.
	 */
	import { CheckIcon } from '@lucide/svelte';
	import type { PairDefinition, ChoiceValue } from '../shared/types.js';

	let {
		pair,
		value = $bindable(null)
	}: {
		pair: PairDefinition;
		value?: ChoiceValue | null;
	} = $props();

	let revealed = $state<ChoiceValue | null>(null);

	const options = $derived([pair.a, pair.b]);
</script>

<fieldset class="border-0 p-0">
	<legend class="sr-only">Which direction matters more for this project?</legend>
	<div class="grid gap-4 sm:grid-cols-2">
		{#each options as option (option.value)}
			{@const isSelected = value === option.value}
			<div
				class="flex flex-col rounded-xl border transition-colors motion-reduce:transition-none {isSelected ? 'ring-foreground/20' : ''}"
				class:border-foreground={isSelected}
				class:ring-2={isSelected}
			>
				<label class="flex cursor-pointer flex-col gap-2 p-6">
					<input
						type="radio"
						name="value"
						value={option.value}
						checked={isSelected}
						onchange={() => (value = option.value)}
						class="sr-only"
					/>
					<span class="flex items-center gap-2">
						<span class="text-xl font-semibold">{option.word}</span>
						{#if isSelected}
							<CheckIcon class="size-4" aria-hidden="true" />
							<span class="sr-only">Selected</span>
						{/if}
					</span>
					<span class="text-muted-foreground text-sm">{option.gloss}</span>
				</label>
				<div class="border-t px-6 py-3">
					<button
						type="button"
						class="text-muted-foreground hover:text-foreground text-xs underline underline-offset-4"
						aria-expanded={revealed === option.value}
						aria-controls={`reveal-${option.value}`}
						onclick={() => (revealed = revealed === option.value ? null : option.value)}
					>
						{revealed === option.value ? 'Hide' : 'Learn more'}
					</button>
					{#if revealed === option.value}
						<p id={`reveal-${option.value}`} class="text-muted-foreground mt-2 text-sm">
							{option.reveal}
						</p>
					{/if}
				</div>
			</div>
		{/each}
	</div>
</fieldset>
