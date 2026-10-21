<script lang="ts">
	import * as Card from '#lib/components/ui/card/index.js';
	import { Badge } from '#lib/components/ui/badge/index.js';
	import type { DashboardMetrics, TrustedDevicesResponse } from '#lib/auth/security/types.js';

	let { metrics, devices }: { metrics: DashboardMetrics; devices: TrustedDevicesResponse | null } =
		$props();

	const deviceTrustStats = $derived(() => {
		const trusted = metrics?.signalBreakdown?.deviceTrust ?? 0;
		const total = metrics?.summary?.totalSessions ?? 0;
		return {
			trusted,
			suspicious: Math.max(total - trusted, 0)
		};
	});

	type HealthStatus = 'operational' | 'degraded' | 'critical';

	const statusMeta: Record<HealthStatus, { label: string; badge: string }> = {
		operational: {
			label: 'Normal',
			badge: 'border-emerald-200 text-emerald-700 bg-emerald-50'
		},
		degraded: {
			label: 'Watch',
			badge: 'border-amber-200 text-amber-800 bg-amber-50'
		},
		critical: {
			label: 'Act now',
			badge: 'border-red-200 text-red-800 bg-red-50'
		}
	};

	const totalSessions = $derived(() => metrics?.summary?.totalSessions ?? 0);
	const activeSessions = $derived(() => metrics?.summary?.activeSessions ?? 0);
	const highRiskSessions = $derived(
		() => (metrics?.riskDistribution?.high ?? 0) + (metrics?.riskDistribution?.critical ?? 0)
	);
	const criticalSessions = $derived(() => metrics?.riskDistribution?.critical ?? 0);
	const vpnDetected = $derived(() => metrics?.signalBreakdown?.vpnDetected ?? 0);
	const captchaTriggered = $derived(() => metrics?.signalBreakdown?.captchaTriggered ?? 0);
	const totalDevices = $derived(() => devices?.total ?? 0);
	const trustedDevices = $derived(
		() => devices?.devices?.filter((d: any) => d.trusted).length ?? 0
	);
	const newDevices = $derived(() => devices?.devices?.filter((d: any) => !d.trusted).length ?? 0);

	const totalSessionsStatus = $derived(
		(): HealthStatus => (totalSessions() === 0 ? 'degraded' : 'operational')
	);
	const highRiskStatus = $derived((): HealthStatus => {
		if (criticalSessions() > 0) return 'critical';
		if (highRiskSessions() > 0) return 'degraded';
		return 'operational';
	});
	const vpnStatus = $derived((): HealthStatus => (vpnDetected() > 0 ? 'degraded' : 'operational'));
	const devicesStatus = $derived(
		(): HealthStatus => (totalDevices() === 0 ? 'degraded' : 'operational')
	);
</script>

<div class="bg-card grid gap-4 rounded-lg border p-6 shadow-sm md:grid-cols-2 lg:grid-cols-4">
	<!-- Total Sessions -->
	<Card.Root class="bg-card shadow-0 py-0">
		<Card.Content class="p-0">
			<div class="bg-muted/30 rounded-lg p-4">
				<div class="flex items-start justify-between gap-2">
					<div>
						<p class="text-muted-foreground text-xs tracking-wide uppercase">Total Sessions</p>
						<p class="text-xl font-semibold">{totalSessions()}</p>
					</div>
					<Badge
						variant="secondary"
						class={`capitalize ${statusMeta[totalSessionsStatus()]?.badge ?? ''}`}
					>
						{statusMeta[totalSessionsStatus()]?.label ?? totalSessionsStatus()}
					</Badge>
				</div>
				<p class="text-muted-foreground mt-2 text-xs">{activeSessions()} active in cache</p>
			</div>
		</Card.Content>
	</Card.Root>

	<!-- High Risk Sessions -->
	<Card.Root class="bg-card py-0">
		<Card.Content class="p-0">
			<div class="bg-muted/30 rounded-lg p-4">
				<div class="flex items-start justify-between gap-2">
					<div>
						<p class="text-muted-foreground text-xs tracking-wide uppercase">High Risk Sessions</p>
						<p class="text-xl font-semibold">{highRiskSessions()}</p>
					</div>
					<Badge
						variant="secondary"
						class={`capitalize ${statusMeta[highRiskStatus()]?.badge ?? ''}`}
					>
						{statusMeta[highRiskStatus()]?.label ?? highRiskStatus()}
					</Badge>
				</div>
				<p class="text-muted-foreground mt-2 text-xs">{criticalSessions()} critical</p>
			</div>
		</Card.Content>
	</Card.Root>

	<!-- VPN Detected -->
	<Card.Root class="bg-card py-0">
		<Card.Content class="p-0">
			<div class="bg-muted/30 rounded-lg p-4">
				<div class="flex items-start justify-between gap-2">
					<div>
						<p class="text-muted-foreground text-xs tracking-wide uppercase">VPN Detected</p>
						<p class="text-xl font-semibold">{vpnDetected()}</p>
					</div>
					<Badge variant="secondary" class={`capitalize ${statusMeta[vpnStatus()]?.badge ?? ''}`}>
						{statusMeta[vpnStatus()]?.label ?? vpnStatus()}
					</Badge>
				</div>
				<p class="text-muted-foreground mt-2 text-xs">
					{captchaTriggered()} CAPTCHA triggered
				</p>
			</div>
		</Card.Content>
	</Card.Root>

	<!-- Total Devices -->
	<Card.Root class="bg-card py-0">
		<Card.Content class="p-0">
			<div class="bg-muted/30 rounded-lg p-4">
				<div class="flex items-start justify-between gap-2">
					<div>
						<p class="text-muted-foreground text-xs tracking-wide uppercase">Total Devices</p>
						<p class="text-xl font-semibold">{totalDevices()}</p>
					</div>
					<Badge
						variant="secondary"
						class={`capitalize ${statusMeta[devicesStatus()]?.badge ?? ''}`}
					>
						{statusMeta[devicesStatus()]?.label ?? devicesStatus()}
					</Badge>
				</div>
				<p class="text-muted-foreground mt-2 text-xs">
					{trustedDevices()} trusted, {newDevices()} new
				</p>
			</div>
		</Card.Content>
	</Card.Root>
</div>
