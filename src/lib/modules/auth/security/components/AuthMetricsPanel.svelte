<script lang="ts">
	import * as Card from '#lib/components/ui/card/index.js';
	import * as Chart from '#lib/components/ui/chart/index.js';
	import { Badge } from '#lib/components/ui/badge/index.js';
	import { BarChart } from 'layerchart';
	import type { AuthStats } from '../services/sdk.js';
	let { authStats = null }: { authStats: AuthStats | null } = $props();
	const config = {
		successCount: { label: 'Successful', color: 'var(--chart-1)' },
		failureCount: { label: 'Failed', color: 'var(--chart-2)' }
	} satisfies Chart.ChartConfig;
	const rows = $derived((authStats?.hourlyRates ?? []).map((row) => ({ ...row, label: `${String(row.hour).padStart(2, '0')}:${String(new Date(row.timestamp).getUTCMinutes()).padStart(2, '0')}` })));
	const total = $derived((authStats?.successCount ?? 0) + (authStats?.failureCount ?? 0));
</script>
<Card.Root>
	<Card.Header><Card.Title>Are people having trouble signing in?</Card.Title><Card.Description>Recorded sign-in outcomes from the recent event sample. Times are UTC; these counts do not establish service availability.</Card.Description></Card.Header>
	<Card.Content class="flex flex-col gap-6">
		{#if authStats}
			<dl class="grid grid-cols-2 gap-4 sm:grid-cols-4">
				<div><dt class="text-muted-foreground text-sm">Successful</dt><dd class="text-2xl font-semibold">{authStats.successCount}</dd></div>
				<div><dt class="text-muted-foreground text-sm">Failed</dt><dd class="text-2xl font-semibold">{authStats.failureCount}</dd></div>
				<div><dt class="text-muted-foreground text-sm">Failure rate</dt><dd class="text-2xl font-semibold">{total > 0 ? `${(authStats.failureCount / total * 100).toFixed(1)}%` : 'No attempts'}</dd></div>
				<div><dt class="text-muted-foreground text-sm">Repeated failure patterns</dt><dd class="text-2xl font-semibold">{authStats.bruteForceAttempts.length}</dd></div>
			</dl>
			{#if total > 0}
				<p class="text-sm">{authStats.failureCount} of {total} recorded attempts failed. Repeated failures can warrant investigation; a failed attempt alone does not confirm an attack.</p>
				<Chart.Container {config} class="h-56 w-full aspect-auto" aria-label="Successful and failed sign-in events by UTC hour; exact counts follow">
					<BarChart data={rows} x="label" axis="x" seriesLayout="stack" legend series={[{ key: 'successCount', ...config.successCount }, { key: 'failureCount', ...config.failureCount }]} props={{ bars: { strokeWidth: 0 }, xAxis: { format: (value: string) => Number(value.slice(0, 2)) % 6 === 0 ? value : '' } }}>
						{#snippet tooltip()}<Chart.Tooltip />{/snippet}
					</BarChart>
				</Chart.Container>
				<details><summary class="cursor-pointer text-sm font-medium">View hourly sign-in counts</summary><div class="mt-3 overflow-x-auto"><table class="w-full text-left text-sm"><caption class="sr-only">Recorded sign-in counts by UTC hour</caption><thead><tr><th scope="col" class="p-2">Hour (UTC)</th><th scope="col" class="p-2">Successful</th><th scope="col" class="p-2">Failed</th></tr></thead><tbody>{#each rows as row (row.hour)}<tr class="border-t"><th scope="row" class="p-2 font-normal">{row.label}</th><td class="p-2">{row.successCount}</td><td class="p-2">{row.failureCount}</td></tr>{/each}</tbody></table></div></details>
			{:else}<p class="text-muted-foreground text-sm">No sign-in attempts were recorded in the returned sample.</p>{/if}
			<div class="grid gap-4 sm:grid-cols-2">
				<div class="rounded-lg border p-4"><h4 class="text-sm font-medium">Two-factor authentication adoption</h4>{#if authStats.twoFactorAdoptionRate != null && authStats.twoFactorEnabledCount != null && authStats.totalUsersCount != null}<p class="mt-2 text-2xl font-semibold">{authStats.twoFactorAdoptionRate.toFixed(0)}%</p><p class="text-muted-foreground text-sm">{authStats.twoFactorEnabledCount} of {authStats.totalUsersCount} users</p>{:else}<p class="mt-2 text-sm">Unavailable</p><p class="text-muted-foreground text-xs">An authoritative user and enrollment count is not connected.</p>{/if}</div>
				<div class="rounded-lg border p-4"><h4 class="text-sm font-medium">Recorded password reset requests</h4><p class="mt-2 text-2xl font-semibold">{authStats.passwordResetRequests}</p><p class="text-muted-foreground text-xs">In the recent event sample</p></div>
			</div>
			{#if authStats.bruteForceAttempts.length > 0}
				<div><h4 class="mb-3 text-sm font-medium">Repeated sign-in failure patterns</h4><div class="flex flex-col gap-2">{#each authStats.bruteForceAttempts as attempt (`${attempt.userId}-${attempt.ip}`)}<div class="flex flex-wrap items-center justify-between gap-3 rounded border px-3 py-2 text-sm"><div class="min-w-0"><p class="break-all font-mono text-xs">{attempt.userId}</p><p class="text-muted-foreground break-all">From {attempt.ip}</p></div><div class="flex flex-wrap items-center gap-2"><Badge variant="secondary">{attempt.failureCount} failures</Badge>{#if attempt.isBlocked}<Badge variant="destructive">IP currently blocked</Badge>{/if}</div></div>{/each}</div></div>
			{/if}
		{:else}<p class="text-muted-foreground py-8 text-sm">Authentication analytics are unavailable.</p>{/if}
	</Card.Content>
</Card.Root>
