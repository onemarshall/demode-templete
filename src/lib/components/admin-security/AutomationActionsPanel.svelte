<script lang="ts">
	import * as Card from '#lib/components/ui/card/index.js';
	import { Badge } from '#lib/components/ui/badge/index.js';
	import { Bot } from '@lucide/svelte';
	import type { AutomationAction } from '#lib/auth/security/services/sdk.js';

	let { actions = [] }: { actions: AutomationAction[] } = $props();

	function formatTimeAgo(timestamp: number): string {
		const diff = Date.now() - timestamp;
		const minutes = Math.floor(diff / 60000);
		if (minutes < 1) return 'just now';
		if (minutes < 60) return `${minutes}m ago`;
		const hours = Math.floor(minutes / 60);
		if (hours < 24) return `${hours}h ago`;
		return `${Math.floor(hours / 24)}d ago`;
	}

	const actionVariant = {
		blocked: 'destructive',
		rate_limited: 'secondary',
		captcha: 'outline'
	} as const;
</script>

<Card.Root>
	<Card.Header>
		<Card.Title class="flex items-center gap-2">
			<Bot class="h-5 w-5" />
			What did the system do recently?
		</Card.Title>
		<Card.Description>Automated blocks, throttles and captcha challenges in the recorded sample.</Card.Description>
	</Card.Header>
	<Card.Content class="flex flex-col gap-3">
		{#if actions.length > 0}
			<ul class="flex flex-col gap-2">
				{#each actions as entry (entry.id)}
					<li class="flex flex-col gap-1 rounded-md border p-3 sm:flex-row sm:items-center sm:justify-between">
						<div class="flex min-w-0 flex-col gap-1">
							<p class="font-medium break-all">{entry.path}</p>
							<p class="text-muted-foreground text-sm break-all">
								{entry.ip} · {formatTimeAgo(entry.timestamp)} · risk {entry.riskScore} ({entry.riskLevel})
							</p>
						</div>
						<Badge variant={actionVariant[entry.action]} class="shrink-0">{entry.label}</Badge>
					</li>
				{/each}
			</ul>
		{:else}
			<div class="text-muted-foreground flex flex-col items-center justify-center py-8">
				<Bot class="mb-2 h-8 w-8 opacity-50" />
				<p>No automated actions in the available records</p>
				<p class="text-sm">An empty feed does not establish that no protection was needed.</p>
			</div>
		{/if}
	</Card.Content>
</Card.Root>
