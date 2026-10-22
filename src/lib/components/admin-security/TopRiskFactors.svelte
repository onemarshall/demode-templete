<script lang="ts">
	import * as Card from '#lib/components/ui/card/index.js';
	import * as Chart from '#lib/components/ui/chart/index.js';
	import { BarChart } from 'layerchart';
	import type { DashboardMetrics } from '#lib/auth/security/types.js';
	let { metrics }: { metrics: DashboardMetrics } = $props();
	const config = { count: { label: 'Occurrences', color: 'var(--chart-2)' } } satisfies Chart.ChartConfig;
	const rows = $derived((metrics.topRiskFactors ?? metrics.topFactors ?? []).toSorted((a, b) => b.count - a.count).slice(0, 5).map((factor) => ({ label: factor.label ?? factor.factor, count: factor.count })));
</script>
<Card.Root>
	<Card.Header>
		<Card.Title>Which signals occur most often?</Card.Title>
		<Card.Description>Most frequent risk factors in the recent event sample. Several factors can occur in one event; frequency does not measure severity or contribution.</Card.Description>
	</Card.Header>
	<Card.Content class="flex flex-col gap-4">
		{#if rows.length > 0}
			<Chart.Container {config} class="h-56 w-full aspect-auto" aria-label="Risk factor occurrence counts; full labels and values follow">
				<BarChart data={rows} x="count" y="label" orientation="horizontal" axis="y" padding={{ left: 136, right: 12, top: 8, bottom: 8 }} series={[{ key: 'count', ...config.count }]} props={{ bars: { strokeWidth: 0 }, yAxis: { format: (value: string) => value.length > 21 ? `${value.slice(0, 21)}…` : value } }}>
					{#snippet tooltip()}<Chart.Tooltip />{/snippet}
				</BarChart>
			</Chart.Container>
			<dl class="flex flex-col gap-2 text-sm">{#each rows as row (row.label)}<div class="flex justify-between gap-4"><dt>{row.label}</dt><dd class="shrink-0">{row.count} occurrences</dd></div>{/each}</dl>
		{:else}<p class="text-muted-foreground py-4 text-sm">No risk factors recorded in the returned sample.</p>{/if}
	</Card.Content>
</Card.Root>
