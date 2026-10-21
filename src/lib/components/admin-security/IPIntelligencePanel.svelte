<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';
	import { Globe, ShieldAlert, Eye, Wifi } from '@lucide/svelte';
	import type { IPIntelligence } from '$lib/auth/security/services/sdk';

	let { ipIntelligence = null }: { ipIntelligence: IPIntelligence | null } = $props();

	function formatTimeAgo(timestamp: number): string {
		const diff = Date.now() - timestamp;
		const minutes = Math.floor(diff / 60000);
		if (minutes < 60) return `${minutes}m ago`;
		const hours = Math.floor(minutes / 60);
		if (hours < 24) return `${hours}h ago`;
		return `${Math.floor(hours / 24)}d ago`;
	}

	const categoryColors: Record<string, string> = {
		trusted: 'bg-green-100 text-green-800 border-green-200',
		neutral: 'bg-gray-100 text-gray-800 border-gray-200',
		suspicious: 'bg-amber-100 text-amber-800 border-amber-200',
		malicious: 'bg-red-100 text-red-800 border-red-200'
	};
</script>

<Card.Root>
	<Card.Header>
		<Card.Title class="flex items-center gap-2">
			<Globe class="h-5 w-5" />
			Where is traffic coming from?
		</Card.Title>
		<Card.Description>The reputation of IPs hitting your site, and any known bad actors.</Card.Description>
	</Card.Header>
	<Card.Content class="space-y-6">
		{#if ipIntelligence}
			<!-- IP Reputation Scores -->
			{#if ipIntelligence.ipReputationScores.length > 0}
				<div>
					<h4 class="mb-3 flex items-center gap-2 text-sm font-medium">
						<Eye class="h-4 w-4" />
						IP Reputation Scores
					</h4>
					<div class="space-y-2">
						{#each ipIntelligence.ipReputationScores as ip}
							<div class="flex items-center justify-between rounded border px-3 py-2 text-sm">
								<div class="flex items-center gap-3">
									<code class="text-xs">{ip.ip}</code>
									<Badge variant="outline" class={categoryColors[ip.category] ?? ''}>
										{ip.category}
									</Badge>
								</div>
								<div class="flex items-center gap-2">
									<div class="h-2 w-16 overflow-hidden rounded-full bg-gray-200">
										<div
											class="h-full transition-all"
											class:bg-green-500={ip.score >= 80}
											class:bg-amber-500={ip.score >= 50 && ip.score < 80}
											class:bg-red-500={ip.score < 50}
											style="width: {ip.score}%"
										></div>
									</div>
									<span class="w-8 text-right text-xs font-medium">{ip.score}</span>
								</div>
							</div>
						{/each}
					</div>
				</div>
			{/if}

			<!-- Known Bad Actors -->
			{#if ipIntelligence.knownBadActors.length > 0}
				<div>
					<h4 class="mb-3 flex items-center gap-2 text-sm font-medium">
						<ShieldAlert class="h-4 w-4 text-red-500" />
						Known Bad Actors
					</h4>
					<div class="space-y-2">
						{#each ipIntelligence.knownBadActors as actor}
							<div
								class="flex items-center justify-between rounded border border-red-200 bg-red-50 px-3 py-2 text-sm"
							>
								<div class="flex items-center gap-3">
									<code class="text-xs">{actor.ip}</code>
									<span class="text-red-700">{actor.reason}</span>
								</div>
								<span class="text-muted-foreground text-xs"
									>First seen: {formatTimeAgo(actor.firstSeen)}</span
								>
							</div>
						{/each}
					</div>
				</div>
			{/if}

			<!-- Tor Exit Nodes -->
			{#if ipIntelligence.torExitNodes.length > 0}
				<div>
					<h4 class="mb-3 flex items-center gap-2 text-sm font-medium">
						<Wifi class="h-4 w-4 text-purple-500" />
						Tor/VPN/Proxy Detected
					</h4>
					<div class="flex flex-wrap gap-2">
						{#each ipIntelligence.torExitNodes as node}
							<Badge variant="outline" class="border-purple-200 bg-purple-50 text-purple-700">
								{node.ip}
							</Badge>
						{/each}
					</div>
				</div>
			{/if}

			<!-- Blocked IPs Summary -->
			{#if ipIntelligence.blockedIPs.length > 0}
				<div>
					<h4 class="mb-3 text-sm font-medium">
						Currently Blocked ({ipIntelligence.blockedIPs.length})
					</h4>
					<div class="text-muted-foreground text-sm">
						{ipIntelligence.blockedIPs
							.slice(0, 3)
							.map((ip) => ip.ip)
							.join(', ')}
						{#if ipIntelligence.blockedIPs.length > 3}
							<span> and {ipIntelligence.blockedIPs.length - 3} more</span>
						{/if}
					</div>
				</div>
			{/if}
		{:else}
			<div class="text-muted-foreground flex flex-col items-center justify-center py-8">
				<Globe class="mb-2 h-8 w-8 opacity-50" />
				<p>No IP intelligence data available</p>
			</div>
		{/if}
	</Card.Content>
</Card.Root>
