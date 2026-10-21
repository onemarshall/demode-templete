<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { RefreshCcw, ShieldCheck, ShieldAlert, ShieldX } from '@lucide/svelte';
	import type { SecurityStatus } from './derive-status';

	let {
		status,
		lastRefreshLabel,
		isRefreshing,
		onRefresh,
		onReviewActions
	}: {
		status: SecurityStatus;
		lastRefreshLabel: string;
		isRefreshing: boolean;
		onRefresh: () => void;
		onReviewActions: () => void;
	} = $props();

	const tone = $derived(
		status.level === 'act_now'
			? {
					container:
						'border-destructive/40 bg-destructive/10 dark:bg-destructive/15 text-destructive-foreground',
					accent: 'text-destructive',
					Icon: ShieldX,
					cta: 'destructive' as const,
					ctaLabel: 'Review critical issues'
				}
			: status.level === 'watch'
				? {
						container:
							'border-amber-500/40 bg-amber-50 dark:bg-amber-950/30 text-amber-950 dark:text-amber-100',
						accent: 'text-amber-600 dark:text-amber-400',
						Icon: ShieldAlert,
						cta: 'default' as const,
						ctaLabel: 'Review what to watch'
					}
				: {
						container:
							'border-emerald-500/40 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-950 dark:text-emerald-100',
						accent: 'text-emerald-600 dark:text-emerald-400',
						Icon: ShieldCheck,
						cta: 'outline' as const,
						ctaLabel: 'View details'
					}
	);
</script>

<section
	class="rounded-lg border-2 p-6 shadow-sm transition-colors {tone.container}"
	aria-label="Security status"
>
	<div class="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
		<div class="flex items-start gap-4">
			<tone.Icon class="h-10 w-10 shrink-0 {tone.accent}" aria-hidden="true" />
			<div class="space-y-1">
				<h2 class="text-xl font-semibold leading-tight md:text-2xl">
					{status.headline}
				</h2>
				<p class="text-sm opacity-90 md:text-base">{status.detail}</p>
				<p class="text-xs opacity-70">Last checked {lastRefreshLabel}</p>
			</div>
		</div>

		<div class="flex shrink-0 items-center gap-2">
			<Button
				variant="ghost"
				size="sm"
				onclick={onRefresh}
				disabled={isRefreshing}
				class="gap-2"
				aria-label="Refresh status"
			>
				<RefreshCcw class="h-4 w-4 {isRefreshing ? 'animate-spin' : ''}" />
				Refresh
			</Button>
			<Button variant={tone.cta} size="sm" onclick={onReviewActions}>
				{tone.ctaLabel}
			</Button>
		</div>
	</div>
</section>
