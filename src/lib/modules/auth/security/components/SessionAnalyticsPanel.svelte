<script lang="ts">
	import * as Card from '#lib/components/ui/card/index.js';
	import { Badge } from '#lib/components/ui/badge/index.js';
	import type { SessionAnalytics } from '../services/sdk.js';
	let { sessionAnalytics = null }: { sessionAnalytics: SessionAnalytics | null } = $props();
	function formatDuration(ms: number): string {
		const minutes = Math.floor(ms / 60000);
		return minutes < 60 ? `${minutes}m` : `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
	}
</script>
<Card.Root>
	<Card.Header>
		<Card.Title>What session activity was recorded?</Card.Title>
		<Card.Description>Observed session identifiers and explicit end events in the recent sample. These records do not establish which sessions are currently active or concurrent.</Card.Description>
	</Card.Header>
	<Card.Content class="flex flex-col gap-6">
		{#if sessionAnalytics}
			<dl class="grid gap-4 sm:grid-cols-3">
				<div><dt class="text-muted-foreground text-sm">Distinct observed sessions</dt><dd class="text-2xl font-semibold">{sessionAnalytics.activeSessionsCount}</dd></div>
				<div><dt class="text-muted-foreground text-sm">Average recorded duration</dt><dd class="text-2xl font-semibold">{sessionAnalytics.averageSessionDuration == null ? 'Unavailable' : formatDuration(sessionAnalytics.averageSessionDuration)}</dd><p class="text-muted-foreground text-xs">Only explicit duration measurements; no inferred lifetime</p></div>
				<div><dt class="text-muted-foreground text-sm">Recorded end events</dt><dd class="text-2xl font-semibold">{sessionAnalytics.invalidationReasons.reduce((sum, reason) => sum + reason.count, 0)}</dd></div>
			</dl>
			{#if sessionAnalytics.sessionDurationDistribution.some((bucket) => bucket.count > 0)}
				<div><h4 class="mb-3 text-sm font-medium">Explicitly recorded session durations</h4><dl class="flex flex-col gap-2">{#each sessionAnalytics.sessionDurationDistribution as bucket (bucket.range)}<div class="flex justify-between gap-3 text-sm"><dt>{bucket.range}</dt><dd>{bucket.count}</dd></div>{/each}</dl></div>
			{/if}
			{#if sessionAnalytics.concurrentSessionsPerUser.length > 0}
				<div><h4 class="mb-3 text-sm font-medium">Users with multiple observed session identifiers</h4><div class="flex flex-col gap-2">{#each sessionAnalytics.concurrentSessionsPerUser as user (user.userId)}<div class="flex flex-wrap justify-between gap-2 rounded border px-3 py-2 text-sm"><span class="break-all font-mono text-xs">{user.userId}</span><Badge variant="secondary">{user.sessionCount} observed sessions</Badge></div>{/each}</div></div>
			{/if}
			{#if sessionAnalytics.invalidationReasons.length > 0}
				<div><h4 class="mb-3 text-sm font-medium">Recorded reasons for ending sessions</h4><dl class="flex flex-col gap-2">{#each sessionAnalytics.invalidationReasons as reason (reason.reason)}<div class="flex justify-between gap-3 text-sm"><dt>{reason.reason}</dt><dd>{reason.count}</dd></div>{/each}</dl></div>
			{/if}
		{:else}<p class="text-muted-foreground py-8 text-sm">Session analytics are unavailable.</p>{/if}
	</Card.Content>
</Card.Root>
