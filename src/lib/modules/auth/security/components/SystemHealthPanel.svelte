<script lang="ts">
	import * as Card from '#lib/components/ui/card/index.js';
	import { Badge } from '#lib/components/ui/badge/index.js';
	import type { SystemHealthStatus } from '../types.js';
	let { systemHealth }: { systemHealth?: SystemHealthStatus | null } = $props();
</script>

<Card.Root>
	<Card.Header>
		<div class="flex flex-wrap items-center justify-between gap-3">
			<Card.Title>Is infrastructure health measured?</Card.Title>
			<Badge variant={systemHealth?.overallStatus === 'critical' ? 'destructive' : 'secondary'}>{systemHealth?.overallStatus ?? 'Not connected'}</Badge>
		</div>
		<Card.Description>{systemHealth?.summary ?? 'Live infrastructure checks are not connected to this dashboard. Event collection alone does not establish the health of authentication, storage or the database.'}</Card.Description>
	</Card.Header>
	{#if systemHealth}
		<Card.Content class="flex flex-col gap-3">
			<p class="text-muted-foreground text-xs">Last measurement: {new Date(systemHealth.updatedAt).toLocaleString()}</p>
			<dl class="grid gap-3 sm:grid-cols-2">
				{#each systemHealth.metrics as metric (metric.id)}
					<div class="flex flex-col gap-1 rounded-md border p-3"><dt>{metric.label}</dt><dd>{metric.value}{metric.unit ?? ''} · {metric.status}</dd>{#if metric.description}<dd class="text-muted-foreground text-sm">{metric.description}</dd>{/if}</div>
				{/each}
			</dl>
		</Card.Content>
	{/if}
</Card.Root>
