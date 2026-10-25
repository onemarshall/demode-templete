<script lang="ts">
	import * as Card from '#lib/components/ui/card/index.js';
	import { Badge } from '#lib/components/ui/badge/index.js';
	import { UserX, AlertTriangle, Lock, Activity } from '@lucide/svelte';
	import type { UserRiskProfile } from '../services/sdk.js';

	let { userRiskProfiles = [] }: { userRiskProfiles: UserRiskProfile[] } = $props();

	function formatTimeAgo(timestamp: number): string {
		const diff = Date.now() - timestamp;
		const minutes = Math.floor(diff / 60000);
		if (minutes < 60) return `${minutes}m ago`;
		const hours = Math.floor(minutes / 60);
		if (hours < 24) return `${hours}h ago`;
		return `${Math.floor(hours / 24)}d ago`;
	}

	const riskLevelColors: Record<string, string> = {
		low: 'bg-green-100 text-green-800 border-green-200',
		medium: 'bg-amber-100 text-amber-800 border-amber-200',
		high: 'bg-orange-100 text-orange-800 border-orange-200',
		critical: 'bg-red-100 text-red-800 border-red-200'
	};

	const riskLevelBg: Record<string, string> = {
		low: 'bg-green-500',
		medium: 'bg-amber-500',
		high: 'bg-orange-500',
		critical: 'bg-red-500'
	};
</script>

<Card.Root>
	<Card.Header>
		<Card.Title class="flex items-center gap-2">
			<UserX class="h-5 w-5" />
			Which users look risky?
		</Card.Title>
		<Card.Description>Accounts ranked by observed risk in the recent event sample. Scores are signals for review, not proof of compromise.</Card.Description>
	</Card.Header>
	<Card.Content>
		{#if userRiskProfiles.length > 0}
			<div class="space-y-3">
				{#each userRiskProfiles as user (user.userId)}
					<div
						class="rounded-lg border p-3"
						class:border-red-200={user.riskLevel === 'critical'}
						class:bg-red-50={user.riskLevel === 'critical'}
						class:border-orange-200={user.riskLevel === 'high'}
						class:bg-orange-50={user.riskLevel === 'high'}
					>
						<div class="flex items-center justify-between">
							<div class="flex items-center gap-3">
								<div class="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100">
									<span class="text-sm font-medium">{user.userId.slice(0, 2).toUpperCase()}</span>
								</div>
								<div>
									<div class="flex items-center gap-2">
										<span class="font-mono text-sm">{user.userId}</span>
										{#if user.isLocked === true}
											<Badge variant="destructive" class="text-xs">
												<Lock class="mr-1 h-3 w-3" />
												Locked
											</Badge>
										{:else if user.isLocked == null}
											<Badge variant="outline">Lock status unavailable</Badge>
										{/if}
									</div>
									<div class="text-muted-foreground flex items-center gap-2 text-xs">
										<span>Last recorded event: {formatTimeAgo(user.lastActivity)}</span>
										{#if user.suspiciousActivities > 0}
											<span class="flex items-center gap-1 text-amber-600">
												<AlertTriangle class="h-3 w-3" />
												{user.suspiciousActivities} suspicious
											</span>
										{/if}
									</div>
								</div>
							</div>
							<div class="flex items-center gap-3">
								<div class="text-right">
									<div class="text-lg font-bold">{user.riskScore}/100</div>
									<Badge variant="outline" class={riskLevelColors[user.riskLevel] ?? ''}>
										{user.riskLevel}
									</Badge>
								</div>
								<div class="h-12 w-2 overflow-hidden rounded-full bg-gray-200">
									<div
										class={`w-full transition-all ${riskLevelBg[user.riskLevel] ?? 'bg-gray-500'}`}
										style="height: {user.riskScore}%"
									></div>
								</div>
							</div>
						</div>
						{#if user.lockoutHistory.length > 0}
							<div class="mt-2 border-t pt-2">
								<span class="text-muted-foreground text-xs">Lockout history:</span>
								{#each user.lockoutHistory.slice(0, 2) as lockout (`${lockout.lockedAt}-${lockout.reason}`)}
									<div class="text-xs text-red-600">
										{lockout.reason} - {formatTimeAgo(lockout.lockedAt)}
									</div>
								{/each}
							</div>
						{/if}
					</div>
				{/each}
			</div>
		{:else}
			<div class="text-muted-foreground flex flex-col items-center justify-center py-8">
				<Activity class="mb-2 h-8 w-8 opacity-50" />
				<p>No user risk data available</p>
			</div>
		{/if}
	</Card.Content>
</Card.Root>
