<script lang="ts">
	import * as Card from '#lib/components/ui/card/index.js';
	import { Badge } from '#lib/components/ui/badge/index.js';
	import { Radio, ShieldAlert, AlertTriangle, Ban, Info } from '@lucide/svelte';
	import type { ThreatEvent } from '../services/sdk.js';

	let { threatFeed = [] }: { threatFeed: ThreatEvent[] } = $props();

	function formatTime(timestamp: number): string {
		return new Date(timestamp).toLocaleTimeString([], {
			hour: '2-digit',
			minute: '2-digit',
			second: '2-digit'
		});
	}

	function formatTimeAgo(timestamp: number): string {
		const diff = Date.now() - timestamp;
		const seconds = Math.floor(diff / 1000);
		if (seconds < 60) return `${seconds}s ago`;
		const minutes = Math.floor(seconds / 60);
		if (minutes < 60) return `${minutes}m ago`;
		const hours = Math.floor(minutes / 60);
		return `${hours}h ago`;
	}

	const typeIcons = {
		attack: ShieldAlert,
		anomaly: AlertTriangle,
		blocked: Ban,
		warning: Info
	};

	const severityColors: Record<string, string> = {
		low: 'bg-blue-100 text-blue-800 border-blue-200',
		medium: 'bg-amber-100 text-amber-800 border-amber-200',
		high: 'bg-orange-100 text-orange-800 border-orange-200',
		critical: 'bg-red-100 text-red-800 border-red-200'
	};

	const typeColors: Record<string, string> = {
		attack: 'text-red-500',
		anomaly: 'text-amber-500',
		blocked: 'text-orange-500',
		warning: 'text-blue-500'
	};

	const criticalCount = $derived(threatFeed.filter((t) => t.severity === 'critical').length);
	const highCount = $derived(threatFeed.filter((t) => t.severity === 'high').length);
</script>

<Card.Root>
	<Card.Header>
		<div class="flex items-center justify-between">
			<div>
				<Card.Title class="flex items-center gap-2">
					<Radio class="h-5 w-5 animate-pulse text-muted-foreground" />
					What's happened recently?
				</Card.Title>
				<Card.Description>A live feed of security events as they're detected.</Card.Description>
			</div>
			<div class="flex items-center gap-2">
				{#if criticalCount > 0}
					<Badge variant="destructive">{criticalCount} critical</Badge>
				{/if}
				{#if highCount > 0}
					<Badge variant="outline" class="border-orange-200 bg-orange-50 text-orange-700"
						>{highCount} high</Badge
					>
				{/if}
			</div>
		</div>
	</Card.Header>
	<Card.Content>
		{#if threatFeed.length > 0}
			<div class="max-h-[400px] space-y-2 overflow-y-auto">
				{#each threatFeed as threat (threat.id)}
					{@const Icon = typeIcons[threat.type] ?? Info}
					<div
						class="flex items-start gap-3 rounded-lg border p-3 transition-colors hover:bg-gray-50"
						class:border-red-200={threat.severity === 'critical'}
						class:bg-red-50={threat.severity === 'critical'}
						class:border-orange-200={threat.severity === 'high'}
						class:bg-orange-50={threat.severity === 'high'}
					>
						<div class={`mt-0.5 ${typeColors[threat.type] ?? 'text-gray-500'}`}>
							<Icon class="h-5 w-5" />
						</div>
						<div class="min-w-0 flex-1">
							<div class="flex items-center gap-2">
								<Badge variant="outline" class={severityColors[threat.severity] ?? ''}>
									{threat.severity}
								</Badge>
								<Badge variant="secondary" class="text-xs capitalize">
									{threat.type}
								</Badge>
								<code class="text-muted-foreground text-xs">{threat.ip}</code>
							</div>
							<p class="mt-1 text-sm">{threat.description}</p>
							<div class="text-muted-foreground mt-1 flex items-center gap-2 text-xs">
								<span>{formatTime(threat.timestamp)}</span>
								<span>•</span>
								<span>{formatTimeAgo(threat.timestamp)}</span>
								{#if threat.details?.path}
									<span>•</span>
									<code class="max-w-[150px] truncate">{threat.details.path}</code>
								{/if}
							</div>
						</div>
					</div>
				{/each}
			</div>
		{:else}
			<div class="text-muted-foreground flex flex-col items-center justify-center py-8">
				<Radio class="mb-2 h-8 w-8 opacity-50" />
				<p>No threats detected</p>
				<p class="text-xs">System is operating normally</p>
			</div>
		{/if}
	</Card.Content>
</Card.Root>
