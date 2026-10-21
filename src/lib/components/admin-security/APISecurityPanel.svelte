<script lang="ts">
	import * as Card from '#lib/components/ui/card/index.js';
	import { Badge } from '#lib/components/ui/badge/index.js';
	import { Code, AlertTriangle, Key, Activity } from '@lucide/svelte';
	import type { APISecurityStats } from '#lib/auth/security/services/sdk.js';

	let { apiSecurityStats = null }: { apiSecurityStats: APISecurityStats | null } = $props();

	function formatTimeAgo(timestamp: number): string {
		const diff = Date.now() - timestamp;
		const minutes = Math.floor(diff / 60000);
		if (minutes < 60) return `${minutes}m ago`;
		const hours = Math.floor(minutes / 60);
		if (hours < 24) return `${hours}h ago`;
		return `${Math.floor(hours / 24)}d ago`;
	}

	const severityColors: Record<string, string> = {
		low: 'bg-blue-100 text-blue-800',
		medium: 'bg-amber-100 text-amber-800',
		high: 'bg-red-100 text-red-800'
	};
</script>

<Card.Root>
	<Card.Header>
		<Card.Title class="flex items-center gap-2">
			<Code class="h-5 w-5" />
			Is the API being abused?
		</Card.Title>
		<Card.Description>Suspicious endpoint usage and traffic patterns.</Card.Description>
	</Card.Header>
	<Card.Content class="space-y-6">
		{#if apiSecurityStats}
			<!-- Endpoint Abuse -->
			{#if apiSecurityStats.endpointAbuse.length > 0}
				<div>
					<h4 class="mb-3 text-sm font-medium">Endpoint Activity</h4>
					<div class="space-y-2">
						{#each apiSecurityStats.endpointAbuse.slice(0, 6) as endpoint}
							<div
								class="flex items-center justify-between rounded border px-3 py-2 text-sm"
								class:border-red-200={endpoint.isAbusive}
								class:bg-red-50={endpoint.isAbusive}
							>
								<div class="flex items-center gap-2">
									<code class="max-w-[200px] truncate text-xs">{endpoint.endpoint}</code>
									{#if endpoint.isAbusive}
										<Badge variant="destructive" class="text-xs">Abuse detected</Badge>
									{/if}
								</div>
								<div class="flex items-center gap-3 text-xs">
									<span class="text-muted-foreground">{endpoint.uniqueIPs} IPs</span>
									<Badge variant="outline">{endpoint.requestCount} req</Badge>
								</div>
							</div>
						{/each}
					</div>
				</div>
			{/if}

			<!-- Unusual Patterns -->
			{#if apiSecurityStats.unusualPatterns.length > 0}
				<div>
					<h4 class="mb-3 flex items-center gap-2 text-sm font-medium">
						<AlertTriangle class="h-4 w-4 text-amber-500" />
						Unusual Patterns Detected
					</h4>
					<div class="space-y-2">
						{#each apiSecurityStats.unusualPatterns as pattern}
							<div class="flex items-center justify-between rounded border px-3 py-2 text-sm">
								<span>{pattern.pattern}</span>
								<div class="flex items-center gap-2">
									<Badge class={severityColors[pattern.severity] ?? ''}>
										{pattern.severity}
									</Badge>
									<span class="text-muted-foreground text-xs">{pattern.occurrences}x</span>
								</div>
							</div>
						{/each}
					</div>
				</div>
			{/if}

			<!-- API Key Usage -->
			{#if apiSecurityStats.apiKeyUsage.length > 0}
				<div>
					<h4 class="mb-3 flex items-center gap-2 text-sm font-medium">
						<Key class="h-4 w-4" />
						API Key Usage
					</h4>
					<div class="space-y-2">
						{#each apiSecurityStats.apiKeyUsage as key}
							<div class="flex items-center justify-between rounded border px-3 py-2 text-sm">
								<code class="text-xs">{key.keyId}</code>
								<div class="flex items-center gap-3">
									<span class="text-muted-foreground text-xs">{formatTimeAgo(key.lastUsed)}</span>
									<Badge variant="secondary">{key.requestCount} requests</Badge>
								</div>
							</div>
						{/each}
					</div>
				</div>
			{/if}
		{:else}
			<div class="text-muted-foreground flex flex-col items-center justify-center py-8">
				<Activity class="mb-2 h-8 w-8 opacity-50" />
				<p>No API security data available</p>
			</div>
		{/if}
	</Card.Content>
</Card.Root>
