<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';
	import {
		TrendingUp,
		TrendingDown,
		CheckCircle,
		XCircle,
		ShieldAlert,
		KeyRound,
		Users,
		Lock
	} from '@lucide/svelte';
	import type { AuthStats } from '$lib/auth/security/services/sdk';

	let { authStats = null }: { authStats: AuthStats | null } = $props();

	const maxHourlyTotal = $derived(() => {
		if (!authStats?.hourlyRates) return 1;
		return Math.max(...authStats.hourlyRates.map((h) => h.successCount + h.failureCount), 1);
	});

	function formatHour(hour: number): string {
		return `${hour.toString().padStart(2, '0')}:00`;
	}

	function formatTime(timestamp: number): string {
		return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
	}

	const overallStatus = $derived(() => {
		if (!authStats) return 'operational';
		if (authStats.successRate >= 95 && authStats.bruteForceAttempts.length === 0)
			return 'operational';
		if (authStats.successRate >= 80 || authStats.bruteForceAttempts.length <= 2) return 'degraded';
		return 'critical';
	});

	const statusMeta = {
		operational: { label: 'Healthy', badge: 'border-emerald-200 text-emerald-700 bg-emerald-50' },
		degraded: { label: 'Warning', badge: 'border-amber-200 text-amber-800 bg-amber-50' },
		critical: { label: 'Critical', badge: 'border-red-200 text-red-800 bg-red-50' }
	};
</script>

<Card.Root>
	<Card.Header>
		<div class="flex items-center justify-between">
			<div>
				<Card.Title class="flex items-center gap-2">
					<TrendingUp class="h-5 w-5" />
					Are sign-ins healthy?
				</Card.Title>
				<Card.Description
					>How people are signing in, and whether anything looks off.</Card.Description
				>
			</div>
			{#if authStats}
				{@const status = overallStatus()}
				<Badge variant="outline" class={statusMeta[status].badge}>
					{statusMeta[status].label}
				</Badge>
			{/if}
		</div>
	</Card.Header>
	<Card.Content class="space-y-6">
		{#if authStats}
			<!-- Summary Stats -->
			<div class="grid gap-4 sm:grid-cols-4">
				<div class="rounded-lg border p-4 text-center">
					<div class="flex items-center justify-center gap-2">
						<CheckCircle class="h-5 w-5 text-green-500" />
						<span class="text-2xl font-bold text-green-600">{authStats.successCount}</span>
					</div>
					<p class="text-muted-foreground text-sm">Successful</p>
				</div>
				<div class="rounded-lg border p-4 text-center">
					<div class="flex items-center justify-center gap-2">
						<XCircle class="h-5 w-5 text-red-500" />
						<span class="text-2xl font-bold text-red-600">{authStats.failureCount}</span>
					</div>
					<p class="text-muted-foreground text-sm">Failed</p>
				</div>
				<div class="rounded-lg border p-4 text-center">
					<div
						class="text-2xl font-bold"
						class:text-green-600={authStats.successRate >= 95}
						class:text-amber-600={authStats.successRate >= 80 && authStats.successRate < 95}
						class:text-red-600={authStats.successRate < 80}
					>
						{authStats.successRate.toFixed(1)}%
					</div>
					<p class="text-muted-foreground text-sm">Success Rate</p>
				</div>
				<div class="rounded-lg border p-4 text-center">
					<div class="flex items-center justify-center gap-2">
						<ShieldAlert class="h-5 w-5 text-orange-500" />
						<span class="text-2xl font-bold text-orange-600"
							>{authStats.bruteForceAttempts.length}</span
						>
					</div>
					<p class="text-muted-foreground text-sm">Brute Force</p>
				</div>
			</div>

			<!-- Hourly Login Rates Chart -->
			<div>
				<h4 class="mb-3 text-sm font-medium">Login Success/Failure Over Time (24h)</h4>
				<div class="flex h-32 items-end gap-1">
					{#each authStats.hourlyRates as hourData (hourData.timestamp)}
						{@const total = hourData.successCount + hourData.failureCount}
						{@const maxTotal = maxHourlyTotal()}
						{@const heightPercent = maxTotal > 0 ? (total / maxTotal) * 100 : 0}
						{@const successPercent = total > 0 ? (hourData.successCount / total) * 100 : 100}
						<div class="group relative flex flex-1 flex-col items-center">
							<div
								class="relative w-full overflow-hidden rounded-t"
								style="height: {Math.max(heightPercent, 4)}%"
								title="{formatHour(
									hourData.hour
								)}: {hourData.successCount} success, {hourData.failureCount} failed ({hourData.successRate.toFixed(
									0
								)}%)"
							>
								<div
									class="absolute bottom-0 w-full bg-green-500"
									style="height: {successPercent}%"
								></div>
								<div
									class="absolute top-0 w-full bg-red-500"
									style="height: {100 - successPercent}%"
								></div>
							</div>
							{#if hourData.hour % 6 === 0}
								<span class="text-muted-foreground mt-1 text-[0.6rem]">{hourData.hour}h</span>
							{/if}
						</div>
					{/each}
				</div>
				<div class="mt-2 flex items-center justify-center gap-4 text-xs">
					<span class="flex items-center gap-1"
						><span class="h-2 w-2 rounded bg-green-500"></span> Success</span
					>
					<span class="flex items-center gap-1"
						><span class="h-2 w-2 rounded bg-red-500"></span> Failed</span
					>
				</div>
			</div>

			<!-- 2FA Adoption & Password Resets -->
			<div class="grid gap-4 sm:grid-cols-2">
				<div class="rounded-lg border p-4">
					<div class="mb-2 flex items-center gap-2">
						<Lock class="h-4 w-4 text-blue-500" />
						<span class="text-sm font-medium">2FA Adoption</span>
					</div>
					<div class="flex items-baseline gap-2">
						<span
							class="text-3xl font-bold"
							class:text-green-600={authStats.twoFactorAdoptionRate >= 50}
							class:text-amber-600={authStats.twoFactorAdoptionRate >= 25 &&
								authStats.twoFactorAdoptionRate < 50}
							class:text-red-600={authStats.twoFactorAdoptionRate < 25}
						>
							{authStats.twoFactorAdoptionRate.toFixed(0)}%
						</span>
						<span class="text-muted-foreground text-sm">
							({authStats.twoFactorEnabledCount} of {authStats.totalUsersCount} users)
						</span>
					</div>
					<div class="mt-2 h-2 w-full overflow-hidden rounded-full bg-gray-200">
						<div
							class="h-full rounded-full transition-all"
							class:bg-green-500={authStats.twoFactorAdoptionRate >= 50}
							class:bg-amber-500={authStats.twoFactorAdoptionRate >= 25 &&
								authStats.twoFactorAdoptionRate < 50}
							class:bg-red-500={authStats.twoFactorAdoptionRate < 25}
							style="width: {authStats.twoFactorAdoptionRate}%"
						></div>
					</div>
				</div>
				<div class="rounded-lg border p-4">
					<div class="mb-2 flex items-center gap-2">
						<KeyRound class="h-4 w-4 text-purple-500" />
						<span class="text-sm font-medium">Password Resets (24h)</span>
					</div>
					<div class="flex items-baseline gap-2">
						<span class="text-3xl font-bold text-purple-600">{authStats.passwordResetRequests}</span
						>
						<span class="text-muted-foreground text-sm">requests</span>
					</div>
					{#if authStats.passwordResetHourly.some((h) => h.count > 0)}
						<div class="mt-2 flex h-8 items-end gap-px">
							{#each authStats.passwordResetHourly as hourData}
								{@const maxResets = Math.max(
									...authStats.passwordResetHourly.map((h) => h.count),
									1
								)}
								<div
									class="flex-1 rounded-t bg-purple-400"
									style="height: {(hourData.count / maxResets) * 100}%"
									title="{formatHour(hourData.hour)}: {hourData.count} resets"
								></div>
							{/each}
						</div>
					{/if}
				</div>
			</div>

			<!-- Brute Force Attempts -->
			{#if authStats.bruteForceAttempts.length > 0}
				<div>
					<h4 class="mb-3 flex items-center gap-2 text-sm font-medium">
						<ShieldAlert class="h-4 w-4 text-orange-500" />
						Potential Brute Force Attempts
					</h4>
					<div class="space-y-2">
						{#each authStats.bruteForceAttempts as attempt}
							<div
								class="flex items-center justify-between rounded border px-3 py-2 text-sm"
								class:border-red-200={attempt.isBlocked}
								class:bg-red-50={attempt.isBlocked}
							>
								<div class="flex items-center gap-3">
									<Users class="h-4 w-4 text-gray-500" />
									<span class="font-mono text-xs">{attempt.userId}</span>
									<span class="text-muted-foreground">from</span>
									<code class="text-xs">{attempt.ip}</code>
								</div>
								<div class="flex items-center gap-2">
									<Badge variant={attempt.isBlocked ? 'destructive' : 'secondary'} class="text-xs">
										{attempt.failureCount} failures
									</Badge>
									{#if attempt.isBlocked}
										<Badge variant="destructive" class="text-xs">Blocked</Badge>
									{/if}
								</div>
							</div>
						{/each}
					</div>
				</div>
			{/if}
		{:else}
			<div class="text-muted-foreground flex flex-col items-center justify-center py-8">
				<TrendingUp class="mb-2 h-8 w-8 opacity-50" />
				<p>No authentication data available</p>
			</div>
		{/if}
	</Card.Content>
</Card.Root>
