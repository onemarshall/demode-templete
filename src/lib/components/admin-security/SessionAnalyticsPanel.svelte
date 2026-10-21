<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';
	import { Users, Clock, Activity, LogOut } from '@lucide/svelte';
	import type { SessionAnalytics } from '$lib/auth/security/services/sdk';

	let { sessionAnalytics = null }: { sessionAnalytics: SessionAnalytics | null } = $props();

	function formatDuration(ms: number): string {
		const minutes = Math.floor(ms / 60000);
		if (minutes < 60) return `${minutes}m`;
		const hours = Math.floor(minutes / 60);
		return `${hours}h ${minutes % 60}m`;
	}

	const maxDistribution = $derived(() => {
		if (!sessionAnalytics?.sessionDurationDistribution) return 1;
		return Math.max(...sessionAnalytics.sessionDurationDistribution.map((d) => d.count), 1);
	});
</script>

<Card.Root>
	<Card.Header>
		<Card.Title class="flex items-center gap-2">
			<Activity class="h-5 w-5" />
			How are people staying signed in?
		</Card.Title>
		<Card.Description>Active sessions, how long they last, and how they end.</Card.Description>
	</Card.Header>
	<Card.Content class="space-y-6">
		{#if sessionAnalytics}
			<!-- Summary Stats -->
			<div class="grid gap-4 sm:grid-cols-3">
				<div class="rounded-lg border p-4 text-center">
					<div class="flex items-center justify-center gap-2">
						<Users class="h-5 w-5 text-blue-500" />
						<span class="text-2xl font-bold text-blue-600"
							>{sessionAnalytics.activeSessionsCount}</span
						>
					</div>
					<p class="text-muted-foreground text-sm">Active Sessions</p>
				</div>
				<div class="rounded-lg border p-4 text-center">
					<div class="flex items-center justify-center gap-2">
						<Clock class="h-5 w-5 text-purple-500" />
						<span class="text-2xl font-bold text-purple-600"
							>{formatDuration(sessionAnalytics.averageSessionDuration)}</span
						>
					</div>
					<p class="text-muted-foreground text-sm">Avg Duration</p>
				</div>
				<div class="rounded-lg border p-4 text-center">
					<div class="flex items-center justify-center gap-2">
						<LogOut class="h-5 w-5 text-orange-500" />
						<span class="text-2xl font-bold text-orange-600">
							{sessionAnalytics.invalidationReasons.reduce((sum, r) => sum + r.count, 0)}
						</span>
					</div>
					<p class="text-muted-foreground text-sm">Sessions Ended</p>
				</div>
			</div>

			<!-- Duration Distribution -->
			<div>
				<h4 class="mb-3 text-sm font-medium">Session Duration Distribution</h4>
				<div class="space-y-2">
					{#each sessionAnalytics.sessionDurationDistribution as bucket}
						{@const max = maxDistribution()}
						{@const widthPercent = max > 0 ? (bucket.count / max) * 100 : 0}
						<div class="flex items-center gap-3">
							<span class="text-muted-foreground w-20 text-xs">{bucket.range}</span>
							<div class="h-4 flex-1 overflow-hidden rounded bg-gray-100">
								<div
									class="h-full rounded bg-blue-500 transition-all"
									style="width: {widthPercent}%"
								></div>
							</div>
							<span class="w-8 text-right text-xs font-medium">{bucket.count}</span>
						</div>
					{/each}
				</div>
			</div>

			<!-- Concurrent Sessions Per User -->
			{#if sessionAnalytics.concurrentSessionsPerUser.length > 0}
				<div>
					<h4 class="mb-3 text-sm font-medium">Users with Multiple Sessions</h4>
					<div class="space-y-2">
						{#each sessionAnalytics.concurrentSessionsPerUser as user}
							<div class="flex items-center justify-between rounded border px-3 py-2 text-sm">
								<span class="font-mono text-xs">{user.userId}</span>
								<Badge variant="secondary">{user.sessionCount} sessions</Badge>
							</div>
						{/each}
					</div>
				</div>
			{/if}

			<!-- Invalidation Reasons -->
			{#if sessionAnalytics.invalidationReasons.length > 0}
				<div>
					<h4 class="mb-3 text-sm font-medium">Session End Reasons</h4>
					<div class="grid gap-2 sm:grid-cols-2">
						{#each sessionAnalytics.invalidationReasons as reason}
							<div class="flex items-center justify-between rounded border px-3 py-2">
								<span class="text-sm">{reason.reason}</span>
								<Badge variant="outline">{reason.count}</Badge>
							</div>
						{/each}
					</div>
				</div>
			{/if}
		{:else}
			<div class="text-muted-foreground flex flex-col items-center justify-center py-8">
				<Activity class="mb-2 h-8 w-8 opacity-50" />
				<p>No session data available</p>
			</div>
		{/if}
	</Card.Content>
</Card.Root>
