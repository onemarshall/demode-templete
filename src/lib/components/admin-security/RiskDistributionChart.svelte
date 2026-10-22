<script lang="ts">
	import * as Card from '#lib/components/ui/card/index.js';
	import * as Chart from '#lib/components/ui/chart/index.js';
	import { BarChart } from 'layerchart';
	import { Button } from '#lib/components/ui/button/index.js';
	import type { DashboardMetrics } from '#lib/auth/security/types.js';
	import { RISK_LEVEL_THRESHOLDS } from '#lib/auth/security/core/risk-levels.js';

	type RiskLevel = 'low' | 'medium' | 'high' | 'critical';
	let { metrics, onSelectRisk }: { metrics: DashboardMetrics; onSelectRisk?: (risk: RiskLevel) => void } = $props();
	const config = { count: { label: 'Recorded events', color: 'var(--chart-1)' } } satisfies Chart.ChartConfig;
	const rows = $derived([
		{ risk: 'low' as RiskLevel, label: `Low (0–<${RISK_LEVEL_THRESHOLDS.medium})`, count: metrics.riskDistribution.low },
		{ risk: 'medium' as RiskLevel, label: `Medium (${RISK_LEVEL_THRESHOLDS.medium}–<${RISK_LEVEL_THRESHOLDS.high})`, count: metrics.riskDistribution.medium },
		{ risk: 'high' as RiskLevel, label: `High (${RISK_LEVEL_THRESHOLDS.high}–<${RISK_LEVEL_THRESHOLDS.critical})`, count: metrics.riskDistribution.high },
		{ risk: 'critical' as RiskLevel, label: `Critical (${RISK_LEVEL_THRESHOLDS.critical}–100)`, count: metrics.riskDistribution.critical }
	]);
	const total = $derived(rows.reduce((sum, row) => sum + row.count, 0));
</script>
<Card.Root>
	<Card.Header>
		<Card.Title>How much recorded activity has elevated risk?</Card.Title>
		<Card.Description>Event counts in the recent sample, using the security engine's 0–100 risk scale.</Card.Description>
	</Card.Header>
	<Card.Content class="flex flex-col gap-4">
		{#if total > 0}
			<p class="text-sm">{metrics.riskDistribution.high + metrics.riskDistribution.critical} of {total} events were classified high or critical. A risk score is a signal for review, not proof of an attack.</p>
			<Chart.Container {config} class="h-48 w-full aspect-auto" aria-label="Recorded events by risk level; exact counts follow">
				<BarChart data={rows} x="count" y="label" orientation="horizontal" axis="y" padding={{ left: 58, right: 12, top: 8, bottom: 8 }} props={{ yAxis: { format: (value: string) => value.split(' (')[0] }, bars: { strokeWidth: 0 } }} series={[{ key: 'count', ...config.count }]} onBarClick={(_event, detail) => onSelectRisk?.(detail.data.risk)}>
					{#snippet tooltip()}<Chart.Tooltip />{/snippet}
				</BarChart>
			</Chart.Container>
			<dl class="grid grid-cols-2 gap-3 text-sm">{#each rows as row (row.label)}<div><dt class="text-muted-foreground">{row.label}</dt><dd>{row.count} events ({Math.round(row.count / total * 100)}%)</dd>{#if onSelectRisk}<Button variant="outline" size="sm" disabled={row.count === 0} onclick={() => onSelectRisk?.(row.risk)} aria-label={`Review ${row.risk} risk events`}>Review events</Button>{/if}</div>{/each}</dl>
		{:else}<p class="text-muted-foreground py-4 text-sm">No risk-scored events in the returned sample.</p>{/if}
	</Card.Content>
</Card.Root>
