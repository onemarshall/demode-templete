<script lang="ts">
	import * as ToggleGroup from '#lib/components/ui/toggle-group/index.js';
	import { Button } from '#lib/components/ui/button/index.js';
	import { Input } from '#lib/components/ui/input/index.js';
	import type { ActionSource, ActionStatus, ActionsFilterState, Severity } from './types';

	let {
		value,
		availableSeverities,
		availableSources,
		onChange,
		onReset
	}: {
		value: ActionsFilterState;
		availableSeverities: readonly Severity[];
		availableSources: readonly ActionSource[];
		availableStatuses: readonly ActionStatus[];
		onChange: (next: ActionsFilterState) => void;
		onReset: () => void;
	} = $props();

	function update(partial: Partial<ActionsFilterState>) {
		onChange({ ...value, ...partial });
	}
</script>

<div class="flex flex-col gap-3 pt-3">
		<div class="grid gap-3 lg:grid-cols-4">
			<div class="lg:col-span-2">
				<label class="mb-1 block text-xs font-medium" for="actions-filter-search">Search</label>
				<Input
					id="actions-filter-search"
					value={value.search}
					oninput={(event) => update({ search: (event.currentTarget as HTMLInputElement).value })}
					placeholder="Search action title, reason, or entity"
				/>
			</div>

			<div>
				<label class="mb-1 block text-xs font-medium" for="actions-filter-source">Source</label>
				<select
					id="actions-filter-source"
					class="bg-background border-input h-9 w-full rounded-md border px-3 text-sm"
					value={value.source}
					onchange={(event) =>
						update({
							source: (event.currentTarget as HTMLSelectElement)
								.value as ActionsFilterState['source']
						})}
				>
					<option value="all">All sources</option>
					{#each availableSources as source (source)}
						<option value={source}>{source.replaceAll('_', ' ')}</option>
					{/each}
				</select>
			</div>

		</div>

		<div class="flex flex-wrap items-center gap-2">
			<span class="text-muted-foreground text-xs">Severity:</span>
			<ToggleGroup.Root type="single" value={value.severity} variant="outline" size="sm" class="flex-wrap" aria-label="Severity" onValueChange={(next) => update({ severity: (next || 'all') as ActionsFilterState['severity'] })}>
				<ToggleGroup.Item value="all">All</ToggleGroup.Item>
				{#each availableSeverities as severity (severity)}
					<ToggleGroup.Item value={severity}>{severity}</ToggleGroup.Item>
				{/each}
			</ToggleGroup.Root>

			<div class="ml-auto flex items-center gap-2">
				<label class="flex items-center gap-2 text-xs">
					<input
						type="checkbox"
						checked={value.newOnly}
						onchange={(event) =>
							update({ newOnly: (event.currentTarget as HTMLInputElement).checked })}
					/>
					New only (15m)
				</label>
				<Button size="sm" variant="ghost" onclick={onReset} class="h-7 px-2 text-xs">Reset</Button>
			</div>
		</div>
</div>
