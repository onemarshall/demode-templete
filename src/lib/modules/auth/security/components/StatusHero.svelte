<script lang="ts">
	import * as Card from '#lib/components/ui/card/index.js';
	import { Badge } from '#lib/components/ui/badge/index.js';
	import { Button } from '#lib/components/ui/button/index.js';
	import { Separator } from '#lib/components/ui/separator/index.js';
	import type { SecurityStatus } from './derive-status';
	import type { RecommendedActionItem } from './triage/types';

	let {
		status,
		actions = [],
		onReviewTopTier,
		onShowAll,
		onCheckCoverage
	}: {
		status: SecurityStatus;
		actions: RecommendedActionItem[];
		onReviewTopTier?: () => void;
		onShowAll?: () => void;
		onCheckCoverage?: () => void;
	} = $props();

	const DIAL_RADIUS = 62;
	const DIAL_CIRCUMFERENCE = 2 * Math.PI * DIAL_RADIUS;

	// The open queue: acknowledgement records review, resolution clears the item.
	const queue = $derived(actions.filter((action) => action.status !== 'resolved'));
	// The dial charts the top severity tier present in the queue. It only
	// appears when that tier is worth an instrument (critical or high); a ring
	// around medium/low observations would grant them false weight.
	const topTier = $derived(
		queue.some((action) => action.severity === 'critical')
			? 'critical'
			: queue.some((action) => action.severity === 'high')
				? 'high'
				: null
	);
	const topCount = $derived(
		topTier ? queue.filter((action) => action.severity === topTier).length : 0
	);
	const showDial = $derived(topTier !== null && queue.length > 0);
	const dialDasharray = $derived(
		showDial
			? `${((topCount / queue.length) * DIAL_CIRCUMFERENCE).toFixed(1)} ${DIAL_CIRCUMFERENCE.toFixed(1)}`
			: ''
	);
	const dialAria = $derived(
		showDial
			? `${topCount} of ${queue.length} reviews in the queue are ${topTier} severity`
			: ''
	);
	const tierColor = $derived(topTier === 'high' ? 'var(--warning)' : 'var(--destructive)');
	const tierTextClass = $derived(topTier === 'high' ? 'text-warning' : 'text-destructive');
	const badgeText = $derived(
		status.level === 'act_now'
			? 'Act now'
			: status.level === 'watch'
				? 'Review needed'
				: status.level === 'unknown'
					? 'Limited visibility'
					: 'No prioritised checks'
	);
	const badgeVariant = $derived(
		status.level === 'act_now'
			? 'destructive'
			: status.level === 'unknown' || (status.level === 'watch' && topTier === 'high')
				? 'warning'
				: 'secondary'
	);
	const bannerClass = $derived(
		status.level === 'act_now'
			? 'bg-destructive/10 ring-destructive/30'
			: status.level === 'watch' && topTier === 'high'
				? 'bg-warning/10 ring-warning/30'
				: ''
	);
</script>

<Card.Root class="gap-0 py-0 {bannerClass}" aria-label="Security status">
	<div
		class="flex flex-col-reverse items-start gap-5 px-(--card-spacing) py-(--card-spacing) sm:flex-row sm:items-center sm:gap-6"
	>
		{#if showDial}
			<div
				class="mx-auto flex flex-none flex-col items-center gap-1 sm:mx-0"
				role="img"
				aria-label={dialAria}
			>
				<div class="relative size-[150px]">
					<svg viewBox="0 0 150 150" class="size-full -rotate-90" aria-hidden="true">
						<circle
							cx="75"
							cy="75"
							r={DIAL_RADIUS}
							fill="none"
							stroke-width="12"
							class="stroke-foreground/15"
						/>
						<circle
							cx="75"
							cy="75"
							r={DIAL_RADIUS}
							fill="none"
							stroke-width="12"
							stroke-dasharray={dialDasharray}
							style:stroke={tierColor}
						/>
					</svg>
					<div class="absolute inset-0 flex flex-col items-center justify-center">
						<span class="text-[42px] leading-none font-extrabold">{topCount}</span>
						<span class="text-[13px] font-bold {tierTextClass}">{topTier}</span>
					</div>
				</div>
				<span class="text-muted-foreground text-xs">
					of {queue.length} reviews are <span class="font-bold {tierTextClass}">{topTier}</span>
				</span>
			</div>
			<Separator orientation="vertical" class="hidden sm:block" />
		{/if}
		<div class="flex min-w-0 flex-1 flex-col gap-2">
			<div class="flex flex-wrap items-center gap-2">
				<Badge variant={badgeVariant}>{badgeText}</Badge>
				<span class="text-muted-foreground text-sm">Does anything need my attention?</span>
			</div>
			<Card.Title class="text-2xl font-extrabold tracking-tight">{status.headline}</Card.Title>
			<Card.Description class="max-w-[52ch]">{status.detail}</Card.Description>
			{#if status.level === 'act_now' && onReviewTopTier}
				<div class="mt-1 flex flex-wrap gap-2.5">
					<Button variant="destructive" onclick={onReviewTopTier}>Review the critical signals</Button>
				</div>
			{:else if status.level === 'watch' && topTier === 'high' && onReviewTopTier}
				<div class="mt-1 flex flex-wrap gap-2.5">
					<Button variant="outline" onclick={onReviewTopTier}>Review the high-severity signals</Button>
				</div>
			{:else if status.level === 'watch' && onShowAll}
				<div class="mt-1 flex flex-wrap gap-2.5">
					<Button variant="outline" onclick={onShowAll}>Show all {queue.length} reviews</Button>
				</div>
			{:else if status.level === 'unknown' && onCheckCoverage}
				<div class="mt-1 flex flex-wrap gap-2.5">
					<Button variant="outline" onclick={onCheckCoverage}>Check monitoring coverage</Button>
				</div>
			{/if}
		</div>
	</div>
</Card.Root>
