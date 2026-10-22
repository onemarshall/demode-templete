<script lang="ts">
	import * as Card from '#lib/components/ui/card/index.js';
	import * as Chart from '#lib/components/ui/chart/index.js';
	import { Button } from '#lib/components/ui/button/index.js';
	import { BarChart } from 'layerchart';
	import type { DashboardMetrics } from '#lib/auth/security/types.js';
	import type { DashboardData } from '#lib/auth/security/services/sdk.js';

	let { metrics, coverage, onSelectHour }: {
		metrics: DashboardMetrics;
		coverage?: DashboardData['coverage'];
		onSelectHour?: (hour: number, timestamp?: number) => void;
	} = $props();

	const config = {
		other: { label: 'Other recorded events', color: 'var(--chart-1)' },
		blocked: { label: 'Blocked events', color: 'var(--chart-2)' }
	} satisfies Chart.ChartConfig;
	const rows = $derived((metrics.hourlyActivity ?? []).map((hour) => ({
		hour: Number(hour.hour),
		timestamp: hour.timestamp,
		label: hour.timestamp ? new Date(hour.timestamp).toLocaleTimeString('en-GB', { timeZone: 'UTC', hour: '2-digit', minute: '2-digit' }) : `${String(hour.hour).padStart(2, '0')}:00`,
		blocked: hour.blocked,
		other: Math.max(0, hour.requests - hour.blocked)
	})));
	const total = $derived(rows.reduce((sum, row) => sum + row.other + row.blocked, 0));
	const blocked = $derived(rows.reduce((sum, row) => sum + row.blocked, 0));
	const peak = $derived(rows.reduce<(typeof rows)[number] | undefined>((best, row) =>
		!best || row.other + row.blocked > best.other + best.blocked ? row : best, undefined));
	function formatWindow(timestamp: number) {
		return new Date(timestamp).toLocaleString('en-GB', { timeZone: 'UTC', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
	}
</script>

<Card.Root>
	<Card.Header>
		<Card.Title>When did security activity happen?</Card.Title>
		<Card.Description>Recorded events by hour (UTC). Blocked events are separate from other activity.</Card.Description>
	</Card.Header>
	<Card.Content class="flex flex-col gap-4">
		{#if coverage}
			<p class="text-muted-foreground text-xs">
				{formatWindow(coverage.windowStart)} – {formatWindow(coverage.windowEnd)} UTC.
				Recent sample: {coverage.sampleSize} events, up to {coverage.sampleLimit} returned.
				{coverage.limitReached ? 'The sample limit was reached; earlier activity may be missing.' : 'This sample does not prove complete monitoring coverage.'}
			</p>
		{:else}
			<p class="text-muted-foreground text-xs">Recent event sample; full observation coverage is unavailable. Times are UTC.</p>
		{/if}
		{#if total > 0}
			<p class="text-sm">{blocked} of {total} recorded events were blocked. {#if peak}The busiest hour started at {peak.label} UTC.{/if}</p>
			<Chart.Container {config} class="h-64 w-full aspect-auto" aria-label="Security events by UTC hour; exact values and review links follow below">
				<BarChart data={rows} x="label" axis="x" seriesLayout="stack" legend
					series={[{ key: 'other', ...config.other }, { key: 'blocked', ...config.blocked }]}
					props={{ bars: { strokeWidth: 0 }, xAxis: { format: (value: string) => Number(value.slice(0, 2)) % 6 === 0 ? value : '' } }}
					onBarClick={(_event, detail) => onSelectHour?.(Number(detail.data.hour), detail.data.timestamp)}>
					{#snippet tooltip()}<Chart.Tooltip />{/snippet}
				</BarChart>
			</Chart.Container>
			<details>
				<summary class="cursor-pointer text-sm font-medium">View counts and review events by hour</summary>
				<div class="mt-3 overflow-x-auto">
					<table class="w-full text-left text-sm">
						<caption class="sr-only">Recorded event counts by hour in UTC</caption>
						<thead><tr><th scope="col" class="p-2">Hour (UTC)</th><th scope="col" class="p-2">Blocked</th><th scope="col" class="p-2">Other</th>{#if onSelectHour}<th scope="col" class="p-2">Evidence</th>{/if}</tr></thead>
						<tbody>{#each rows as row (row.hour)}<tr class="border-t"><th scope="row" class="p-2 font-normal">{row.label}</th><td class="p-2">{row.blocked}</td><td class="p-2">{row.other}</td>{#if onSelectHour}<td class="p-2"><Button variant="outline" size="sm" disabled={row.blocked + row.other === 0} onclick={() => onSelectHour?.(row.hour, row.timestamp)} aria-label={`Review events at ${row.label} UTC`}>Review</Button></td>{/if}</tr>{/each}</tbody>
					</table>
				</div>
			</details>
		{:else}
			<p class="text-muted-foreground py-8 text-sm">No events in the returned sample. This does not establish that no activity occurred.</p>
		{/if}
	</Card.Content>
</Card.Root>
