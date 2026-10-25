<script lang="ts">
	import * as Card from '#lib/components/ui/card/index.js';
	import type { DashboardMetrics, TrustedDevicesResponse } from '../types.js';
	let { metrics, devices }: { metrics: DashboardMetrics; devices: TrustedDevicesResponse | null } = $props();
</script>
<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
	<Card.Root><Card.Header><Card.Title>Recorded events</Card.Title><Card.Description>In the recent sample</Card.Description></Card.Header><Card.Content><p class="text-2xl font-semibold">{metrics.summary.totalRequests}</p></Card.Content></Card.Root>
	<Card.Root><Card.Header><Card.Title>Elevated risk</Card.Title><Card.Description>High or critical events</Card.Description></Card.Header><Card.Content><p class="text-2xl font-semibold">{metrics.riskDistribution.high + metrics.riskDistribution.critical}</p><p class="text-muted-foreground text-xs">{metrics.riskDistribution.critical} critical; review the associated evidence</p></Card.Content></Card.Root>
	<Card.Root><Card.Header><Card.Title>Blocked events</Card.Title><Card.Description>In the recent sample</Card.Description></Card.Header><Card.Content><p class="text-2xl font-semibold">{metrics.summary.blockedRequests}</p><p class="text-muted-foreground text-xs">Blocks do not establish that other activity is safe</p></Card.Content></Card.Root>
	<Card.Root><Card.Header><Card.Title>Device inventory</Card.Title><Card.Description>Current device records</Card.Description></Card.Header><Card.Content>{#if devices}<p class="text-2xl font-semibold">{devices.total}</p><p class="text-muted-foreground text-xs">{devices.devices.length} returned device records</p>{:else}<p class="text-sm">Unavailable</p><p class="text-muted-foreground text-xs">Device inventory is not connected</p>{/if}</Card.Content></Card.Root>
</div>
