<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';
	import {
		TrendingUp,
		TriangleAlert,
		Lock,
		Globe,
		Smartphone,
		Shield,
		Activity
	} from '@lucide/svelte';
	import type { DashboardMetrics } from '$lib/auth/security/types';

	let { metrics }: { metrics: DashboardMetrics } = $props();

	type HealthStatus = 'operational' | 'degraded' | 'critical';

	const statusMeta: Record<HealthStatus, { label: string; badge: string }> = {
		operational: {
			label: 'Operational',
			badge: 'border-emerald-200 text-emerald-700 bg-emerald-50'
		},
		degraded: {
			label: 'Degraded',
			badge: 'border-amber-200 text-amber-800 bg-amber-50'
		},
		critical: {
			label: 'Critical',
			badge: 'border-red-200 text-red-800 bg-red-50'
		}
	};

	function getRiskMeta(factor: string): { status: HealthStatus; label: string } {
		if (factor.includes('failed') || factor.includes('block') || factor.includes('brute')) {
			return { status: 'critical', label: 'High Risk' };
		}
		if (
			factor.includes('vpn') ||
			factor.includes('tor') ||
			factor.includes('proxy') ||
			factor.includes('suspicious')
		) {
			return { status: 'degraded', label: 'Medium Risk' };
		}
		return { status: 'operational', label: 'Low Risk' };
	}

	const overallStatus = $derived((): HealthStatus => {
		const factors = metrics?.topRiskFactors ?? [];
		if (factors.length === 0) return 'operational';
		const statuses = factors.slice(0, 5).map((riskFactor) => getRiskMeta(riskFactor.factor).status);
		if (statuses.includes('critical')) return 'critical';
		if (statuses.includes('degraded')) return 'degraded';
		return 'operational';
	});
</script>

<Card.Root class="bg-card border shadow-md">
	<Card.Header class="flex flex-col gap-3">
		<div class="flex flex-wrap items-center justify-between gap-4">
			<div>
				<Card.Title class="flex items-center gap-2 text-lg">
					<TrendingUp class="h-5 w-5" />
					What's driving today's risk?
				</Card.Title>
				<Card.Description>The most common reasons we're flagging activity right now.</Card.Description>
			</div>

			<Badge variant="secondary" class={`capitalize ${statusMeta[overallStatus()]?.badge ?? ''}`}>
				{statusMeta[overallStatus()]?.label ?? overallStatus()}
			</Badge>
		</div>
	</Card.Header>
	<Card.Content>
		{#if metrics?.topRiskFactors && metrics.topRiskFactors.length > 0}
			<div class="space-y-3">
				{#each metrics.topRiskFactors.slice(0, 5) as riskFactor}
					{@const riskMeta = getRiskMeta(riskFactor.factor)}
					<div class="bg-muted/30 rounded-lg border p-4">
						<div class="flex items-start justify-between gap-2">
							<div class="flex items-start gap-3">
								{#if riskFactor.factor.includes('authentication')}
									<Lock class="mt-1 h-4 w-4 text-blue-500" />
								{:else if riskFactor.factor.includes('failed') || riskFactor.factor.includes('block') || riskFactor.factor.includes('brute')}
									<TriangleAlert class="mt-1 h-4 w-4 text-red-500" />
								{:else if riskFactor.factor.includes('vpn') || riskFactor.factor.includes('tor') || riskFactor.factor.includes('proxy')}
									<Globe class="mt-1 h-4 w-4 text-orange-500" />
								{:else if riskFactor.factor.includes('device')}
									<Smartphone class="mt-1 h-4 w-4 text-purple-500" />
								{:else if riskFactor.factor.includes('captcha') || riskFactor.factor.includes('automation')}
									<Shield class="mt-1 h-4 w-4 text-yellow-500" />
								{:else}
									<Activity class="mt-1 h-4 w-4 text-gray-500" />
								{/if}

								<div>
									<p class="text-muted-foreground text-xs tracking-wide uppercase">Risk Factor</p>
									<p class="mt-1 text-sm font-semibold">{riskFactor.label}</p>
								</div>
							</div>

							<Badge
								variant="secondary"
								class={`capitalize ${statusMeta[riskMeta.status]?.badge ?? ''}`}
							>
								{riskMeta.label}
							</Badge>
						</div>

						<div class="mt-3 grid grid-cols-2 gap-2 text-xs">
							<div class="text-muted-foreground">Occurrences</div>
							<div class="text-right font-medium">{riskFactor.count}</div>
							<div class="text-muted-foreground">Avg contribution</div>
							<div class="text-right font-medium">
								{(riskFactor.averageRiskContribution ?? 0).toFixed(1)}
							</div>
						</div>
					</div>
				{/each}
			</div>
		{:else}
			<div class="bg-muted/30 text-muted-foreground rounded-lg border p-8 text-center">
				<TrendingUp class="mx-auto h-8 w-8 opacity-50" />
				<p class="mt-2 text-sm font-medium">No risk factors detected</p>
			</div>
		{/if}
	</Card.Content>
</Card.Root>
