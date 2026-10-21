<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';
	import { Shield, Clock } from '@lucide/svelte';
	import type { BlockedIPInfo } from '$lib/auth/security/services/sdk';

	let { blockedIPs = [] }: { blockedIPs: BlockedIPInfo[] } = $props();

	function formatTime(timestamp: number): string {
		return new Date(timestamp).toLocaleString();
	}

	function formatTimeRemaining(expiresAt: number | undefined): string {
		if (!expiresAt) return 'Permanent';
		const remaining = expiresAt - Date.now();
		if (remaining <= 0) return 'Expired';
		const hours = Math.floor(remaining / (1000 * 60 * 60));
		const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
		if (hours > 24) return `${Math.floor(hours / 24)}d ${hours % 24}h`;
		if (hours > 0) return `${hours}h ${minutes}m`;
		return `${minutes}m`;
	}
</script>

<Card.Root>
	<Card.Header>
		<Card.Title class="flex items-center gap-2">
			<Shield class="h-5 w-5 text-muted-foreground" />
			Who have we blocked?
		</Card.Title>
		<Card.Description>IP addresses that currently can't access the site.</Card.Description>
	</Card.Header>
	<Card.Content>
		{#if blockedIPs.length > 0}
			<div class="space-y-3">
				{#each blockedIPs as ip (ip.ip)}
					<div class="flex items-center justify-between rounded-lg border p-3">
						<div class="space-y-1">
							<div class="flex items-center gap-2">
								<code class="font-mono text-sm">{ip.ip}</code>
								<Badge variant="destructive" class="text-xs">Blocked</Badge>
							</div>
							<p class="text-muted-foreground text-xs">{ip.reason}</p>
							<div class="text-muted-foreground flex items-center gap-3 text-xs">
								<span class="flex items-center gap-1">
									<Clock class="h-3 w-3" />
									{formatTime(ip.blockedAt)}
								</span>
								<span>Hits: {ip.hitCount}</span>
							</div>
						</div>
						<div class="text-right">
							<Badge variant="outline" class="text-xs">
								{formatTimeRemaining(ip.expiresAt)}
							</Badge>
						</div>
					</div>
				{/each}
			</div>
		{:else}
			<div class="text-muted-foreground flex flex-col items-center justify-center py-8">
				<Shield class="mb-2 h-8 w-8 opacity-50" />
				<p>No blocked IPs</p>
				<p class="text-xs">All IP addresses are currently allowed</p>
			</div>
		{/if}
	</Card.Content>
</Card.Root>
