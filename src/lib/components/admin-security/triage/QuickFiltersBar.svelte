<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import type { ActionSource, ActionStatus, ActionsFilterState, Severity } from './types';

	let {
		value,
		availableSeverities,
		availableSources,
		availableStatuses,
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

<Card.Root>
	<Card.Content class="space-y-3 pt-4">
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
					{#each availableSources as source}
						<option value={source}>{source.replaceAll('_', ' ')}</option>
					{/each}
				</select>
			</div>

			<div>
				<label class="mb-1 block text-xs font-medium" for="actions-filter-status">Status</label>
				<select
					id="actions-filter-status"
					class="bg-background border-input h-9 w-full rounded-md border px-3 text-sm"
					value={value.status}
					onchange={(event) =>
						update({
							status: (event.currentTarget as HTMLSelectElement)
								.value as ActionsFilterState['status']
						})}
				>
					<option value="all">All statuses</option>
					{#each availableStatuses as status}
						<option value={status}>{status.replaceAll('_', ' ')}</option>
					{/each}
				</select>
			</div>
		</div>

		<div class="flex flex-wrap items-center gap-2">
			<span class="text-muted-foreground text-xs">Severity:</span>
			<Button
				size="sm"
				variant={value.severity === 'all' ? 'default' : 'outline'}
				onclick={() => update({ severity: 'all' })}
				class="h-7 px-2 text-xs"
			>
				All
			</Button>
			{#each availableSeverities as severity}
				<Button
					size="sm"
					variant={value.severity === severity ? 'default' : 'outline'}
					onclick={() => update({ severity })}
					class="h-7 px-2 text-xs capitalize"
				>
					{severity}
				</Button>
			{/each}

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
	</Card.Content>
</Card.Root>
