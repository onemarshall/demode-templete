<script lang="ts">
	import * as Card from '#lib/components/ui/card/index.js';
	import { Badge } from '#lib/components/ui/badge/index.js';
	import * as Popover from '#lib/components/ui/popover/index.js';
	import { Info, Shield } from '@lucide/svelte';
	import type { DashboardMetrics } from '#lib/auth/security/types.js';

	let { metrics }: { metrics: DashboardMetrics } = $props();

	const totalSessions = $derived(() => metrics?.summary?.totalSessions ?? 0);

	const deviceTrustStats = $derived(() => {
		const trusted = metrics?.signalBreakdown?.deviceTrust ?? 0;
		const total = totalSessions();
		return {
			trusted,
			suspicious: Math.max(total - trusted, 0)
		};
	});

	type HealthStatus = 'operational' | 'degraded' | 'critical';

	const statusMeta: Record<HealthStatus, { label: string; badge: string }> = {
		operational: {
			label: 'Operational',
			badge: 'border-emerald-200 text-emerald-700 bg-emerald-50'
		},
		degraded: {
			label: 'Degraded',
			badge: 'border-amber-200 text-amber-800 bg-amber-50'
		},
		critical: {
			label: 'Critical',
			badge: 'border-red-200 text-red-800 bg-red-50'
		}
	};

	const behaviorHuman = $derived(() => metrics?.signalBreakdown?.behaviorTrust ?? 0);
	const behaviorSuspicious = $derived(() => metrics?.signalBreakdown?.automationDetected ?? 0);
	const locationTrusted = $derived(() => metrics?.signalBreakdown?.locationTrust ?? 0);
	const locationSuspicious = $derived(() => metrics?.signalBreakdown?.vpnDetected ?? 0);
	const vpnDetected = $derived(() => metrics?.signalBreakdown?.vpnDetected ?? 0);
	const captchaTriggered = $derived(() => metrics?.signalBreakdown?.captchaTriggered ?? 0);

	function clampPercent(value: number): number {
		if (!Number.isFinite(value)) return 0;
		return Math.min(100, Math.max(0, value));
	}

	function coerceToPercent(value: number, total: number): number {
		if (!Number.isFinite(value)) return 0;
		if (value <= 1) {
			return clampPercent(value * 100);
		}
		if (total > 0 && value > 1 && value <= total) {
			return clampPercent((value / total) * 100);
		}
		if (value <= 100) {
			return clampPercent(value);
		}
		if (total > 0) {
			return clampPercent((value / total) * 100);
		}
		return 0;
	}

	const deviceTrustedPct = $derived(() =>
		coerceToPercent(metrics?.signalBreakdown?.deviceTrust ?? 0, totalSessions())
	);
	const deviceSuspiciousPct = $derived(() => clampPercent(100 - deviceTrustedPct()));

	const behaviorHumanPct = $derived(() =>
		coerceToPercent(metrics?.signalBreakdown?.behaviorTrust ?? 0, totalSessions())
	);
	const behaviorSuspiciousPct = $derived(() => clampPercent(100 - behaviorHumanPct()));

	const locationTrustedPct = $derived(() =>
		coerceToPercent(metrics?.signalBreakdown?.locationTrust ?? 0, totalSessions())
	);
	const locationSuspiciousPct = $derived(() => clampPercent(100 - locationTrustedPct()));

	const vpnDetectedPct = $derived(() =>
		coerceToPercent(metrics?.signalBreakdown?.vpnDetected ?? 0, totalSessions())
	);
	const captchaTriggeredPct = $derived(() =>
		coerceToPercent(metrics?.signalBreakdown?.captchaTriggered ?? 0, totalSessions())
	);
	const protectionSuspiciousPct = $derived(() =>
		clampPercent(Math.max(vpnDetectedPct(), captchaTriggeredPct()))
	);

	function formatPercent(value: number): string {
		if (!Number.isFinite(value)) return '0%';
		const rounded = Math.round(value * 10) / 10;
		return `${Number.isInteger(rounded) ? rounded.toFixed(0) : rounded.toFixed(1)}%`;
	}

	function statusFromSuspiciousPercent(percent: number): HealthStatus {
		if (percent >= 50) return 'critical';
		if (percent >= 10) return 'degraded';
		return 'operational';
	}

	const deviceStatus = $derived(
		(): HealthStatus => statusFromSuspiciousPercent(deviceSuspiciousPct())
	);
	const behaviorStatus = $derived(
		(): HealthStatus => statusFromSuspiciousPercent(behaviorSuspiciousPct())
	);
	const locationStatus = $derived(
		(): HealthStatus => statusFromSuspiciousPercent(locationSuspiciousPct())
	);
	const protectionStatus = $derived(
		(): HealthStatus => statusFromSuspiciousPercent(protectionSuspiciousPct())
	);

	const overallSuspiciousPct = $derived(() =>
		Math.max(
			deviceSuspiciousPct(),
			behaviorSuspiciousPct(),
			locationSuspiciousPct(),
			protectionSuspiciousPct()
		)
	);

	const overallStatus = $derived((): HealthStatus => {
		const statuses: HealthStatus[] = [
			deviceStatus(),
			behaviorStatus(),
			locationStatus(),
			protectionStatus()
		];
		if (statuses.includes('critical')) return 'critical';
		if (statuses.includes('degraded')) return 'degraded';
		return 'operational';
	});

	function formatStatusLabel(status: HealthStatus, suspiciousPct: number): string {
		const base = statusMeta[status].label;
		if (status === 'operational') return base;
		return `${base} · ${formatPercent(suspiciousPct)} suspicious`;
	}

	const statusThresholdsText = 'Operational < 10% suspicious · Degraded ≥ 10% · Critical ≥ 50%';
</script>

<Card.Root class="bg-card border shadow-md">
	<Card.Header class="flex flex-col gap-3">
		<div class="flex w-full items-center justify-between gap-4">
			<div>
				<Card.Title class="flex items-center gap-2 text-lg">
					<Shield class="h-5 w-5" />
					Security Signals
					<Popover.Root>
						<Popover.Trigger
							class="text-muted-foreground hover:text-foreground focus-visible:ring-ring inline-flex h-7 w-7 items-center justify-center rounded-md outline-none focus-visible:ring-2"
							type="button"
							aria-label="About Security Signals"
						>
							<Info class="h-4 w-4" />
						</Popover.Trigger>
						<Popover.Content align="end" class="w-80">
							<div class="space-y-2 text-sm">
								<p class="font-medium">What am I looking at?</p>
								<p class="text-muted-foreground text-xs">
									Each card shows the share of sessions that look trusted for that signal.
								</p>
								<div class="text-muted-foreground space-y-1 text-xs">
									<p>
										<span class="text-foreground font-medium">Trusted %</span>
										is the percentage of sessions that pass that trust signal.
									</p>
									<p>
										<span class="text-foreground font-medium">Suspicious %</span>
										is the complement (100% − Trusted).
									</p>
									<p>
										<span class="text-foreground font-medium">Status</span>
										is driven by suspicious rate.
									</p>
								</div>
								<p class="text-muted-foreground text-xs">{statusThresholdsText}</p>
							</div>
						</Popover.Content>
					</Popover.Root>
				</Card.Title>
				<Card.Description>
					Trusted % is shown on each card; status is driven by suspicious rate
				</Card.Description>
			</div>

			<Badge variant="secondary" class={`capitalize ${statusMeta[overallStatus()]?.badge ?? ''}`}>
				{formatStatusLabel(overallStatus(), overallSuspiciousPct())}
			</Badge>
		</div>
	</Card.Header>
	<Card.Content>
		<div class="grid gap-4 sm:grid-cols-2">
			<!-- Device Trust -->
			<div class="bg-muted/30 rounded-lg border p-4">
				<div class="flex items-start justify-between gap-2">
					<div>
						<div class="flex items-center gap-2">
							<p class="text-muted-foreground text-xs tracking-wide uppercase">Device Trust</p>
							<Popover.Root>
								<Popover.Trigger
									class="text-muted-foreground hover:text-foreground focus-visible:ring-ring inline-flex h-6 w-6 items-center justify-center rounded-md outline-none focus-visible:ring-2"
									type="button"
									aria-label="About Device Trust"
								>
									<Info class="h-3.5 w-3.5" />
								</Popover.Trigger>
								<Popover.Content align="end" class="w-80">
									<div class="space-y-2 text-sm">
										<p class="font-medium">Device Trust</p>
										<p class="text-muted-foreground text-xs">
											Measures how often sessions come from devices that appear known and
											consistent.
										</p>
										<p class="text-muted-foreground text-xs">{statusThresholdsText}</p>
									</div>
								</Popover.Content>
							</Popover.Root>
						</div>
						<p class="text-xl font-semibold">{formatPercent(deviceTrustedPct())}</p>
					</div>
					<Badge
						variant="secondary"
						class={`capitalize ${statusMeta[deviceStatus()]?.badge ?? ''}`}
					>
						{formatStatusLabel(deviceStatus(), deviceSuspiciousPct())}
					</Badge>
				</div>
				<p class="text-muted-foreground mt-2 text-xs">Trusted sessions</p>
				<div class="mt-3 grid grid-cols-2 gap-2 text-xs">
					<div class="text-muted-foreground">Trusted</div>
					<div class="text-right font-medium">{formatPercent(deviceTrustedPct())}</div>
					<div class="text-muted-foreground">Suspicious</div>
					<div class="text-right font-medium">{formatPercent(deviceSuspiciousPct())}</div>
				</div>
			</div>

			<!-- Behavior Analysis -->
			<div class="bg-muted/30 rounded-lg border p-4">
				<div class="flex items-start justify-between gap-2">
					<div>
						<div class="flex items-center gap-2">
							<p class="text-muted-foreground text-xs tracking-wide uppercase">Behavior Analysis</p>
							<Popover.Root>
								<Popover.Trigger
									class="text-muted-foreground hover:text-foreground focus-visible:ring-ring inline-flex h-6 w-6 items-center justify-center rounded-md outline-none focus-visible:ring-2"
									type="button"
									aria-label="About Behavior Analysis"
								>
									<Info class="h-3.5 w-3.5" />
								</Popover.Trigger>
								<Popover.Content align="end" class="w-80">
									<div class="space-y-2 text-sm">
										<p class="font-medium">Behavior Analysis</p>
										<p class="text-muted-foreground text-xs">
											Estimates how human-like sessions appear based on activity patterns.
										</p>
										<p class="text-muted-foreground text-xs">{statusThresholdsText}</p>
									</div>
								</Popover.Content>
							</Popover.Root>
						</div>
						<p class="text-xl font-semibold">{formatPercent(behaviorHumanPct())}</p>
					</div>
					<Badge
						variant="secondary"
						class={`capitalize ${statusMeta[behaviorStatus()]?.badge ?? ''}`}
					>
						{formatStatusLabel(behaviorStatus(), behaviorSuspiciousPct())}
					</Badge>
				</div>
				<p class="text-muted-foreground mt-2 text-xs">Session behavior</p>
				<div class="mt-3 grid grid-cols-2 gap-2 text-xs">
					<div class="text-muted-foreground">Human-like</div>
					<div class="text-right font-medium">{formatPercent(behaviorHumanPct())}</div>
					<div class="text-muted-foreground">Suspicious</div>
					<div class="text-right font-medium">{formatPercent(behaviorSuspiciousPct())}</div>
				</div>
			</div>

			<!-- Location Trust -->
			<div class="bg-muted/30 rounded-lg border p-4">
				<div class="flex items-start justify-between gap-2">
					<div>
						<div class="flex items-center gap-2">
							<p class="text-muted-foreground text-xs tracking-wide uppercase">Location Trust</p>
							<Popover.Root>
								<Popover.Trigger
									class="text-muted-foreground hover:text-foreground focus-visible:ring-ring inline-flex h-6 w-6 items-center justify-center rounded-md outline-none focus-visible:ring-2"
									type="button"
									aria-label="About Location Trust"
								>
									<Info class="h-3.5 w-3.5" />
								</Popover.Trigger>
								<Popover.Content align="end" class="w-80">
									<div class="space-y-2 text-sm">
										<p class="font-medium">Location Trust</p>
										<p class="text-muted-foreground text-xs">
											Looks for unusual geolocation patterns and network anomalies (e.g. VPN/proxy
											signals).
										</p>
										<p class="text-muted-foreground text-xs">{statusThresholdsText}</p>
									</div>
								</Popover.Content>
							</Popover.Root>
						</div>
						<p class="text-xl font-semibold">{formatPercent(locationTrustedPct())}</p>
					</div>
					<Badge
						variant="secondary"
						class={`capitalize ${statusMeta[locationStatus()]?.badge ?? ''}`}
					>
						{formatStatusLabel(locationStatus(), locationSuspiciousPct())}
					</Badge>
				</div>
				<p class="text-muted-foreground mt-2 text-xs">Session location</p>
				<div class="mt-3 grid grid-cols-2 gap-2 text-xs">
					<div class="text-muted-foreground">Trusted</div>
					<div class="text-right font-medium">{formatPercent(locationTrustedPct())}</div>
					<div class="text-muted-foreground">Suspicious</div>
					<div class="text-right font-medium">{formatPercent(locationSuspiciousPct())}</div>
				</div>
			</div>

			<!-- Protection Status -->
			<div class="bg-muted/30 rounded-lg border p-4">
				<div class="flex items-start justify-between gap-2">
					<div>
						<div class="flex items-center gap-2">
							<p class="text-muted-foreground text-xs tracking-wide uppercase">Protection Status</p>
							<Popover.Root>
								<Popover.Trigger
									class="text-muted-foreground hover:text-foreground focus-visible:ring-ring inline-flex h-6 w-6 items-center justify-center rounded-md outline-none focus-visible:ring-2"
									type="button"
									aria-label="About Protection Status"
								>
									<Info class="h-3.5 w-3.5" />
								</Popover.Trigger>
								<Popover.Content align="end" class="w-80">
									<div class="space-y-2 text-sm">
										<p class="font-medium">Protection Status</p>
										<p class="text-muted-foreground text-xs">
											Shows the share of sessions that triggered protection controls like VPN
											detection or CAPTCHA.
										</p>
										<p class="text-muted-foreground text-xs">{statusThresholdsText}</p>
									</div>
								</Popover.Content>
							</Popover.Root>
						</div>
						<p class="text-xl font-semibold">{formatPercent(protectionSuspiciousPct())}</p>
					</div>
					<Badge
						variant="secondary"
						class={`capitalize ${statusMeta[protectionStatus()]?.badge ?? ''}`}
					>
						{formatStatusLabel(protectionStatus(), protectionSuspiciousPct())}
					</Badge>
				</div>
				<p class="text-muted-foreground mt-2 text-xs">Sessions flagged</p>
				<div class="mt-3 grid grid-cols-2 gap-2 text-xs">
					<div class="text-muted-foreground">VPN Detected</div>
					<div class="text-right font-medium">{formatPercent(vpnDetectedPct())}</div>
					<div class="text-muted-foreground">CAPTCHA Triggered</div>
					<div class="text-right font-medium">{formatPercent(captchaTriggeredPct())}</div>
				</div>
			</div>
		</div>
	</Card.Content>
</Card.Root>
