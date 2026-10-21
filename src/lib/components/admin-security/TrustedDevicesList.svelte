<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';
	import { Fingerprint, Smartphone, ShieldCheck } from '@lucide/svelte';
	import type { TrustedDevicesResponse } from '$lib/auth/security/types';

	let { devices }: { devices: TrustedDevicesResponse | null } = $props();

	function formatTimestamp(ts: number): string {
		return new Date(ts).toLocaleString();
	}
</script>

<Card.Root>
	<Card.Header>
		<Card.Title class="flex items-center gap-2">
			<Fingerprint class="h-5 w-5" />
			Devices you trust
		</Card.Title>
		<Card.Description>Devices we recognise, with trust scores and recent usage.</Card.Description>
	</Card.Header>
	<Card.Content>
		{#if devices && devices.devices && devices.devices.length > 0}
			<div class="space-y-3">
				{#each devices.devices as device}
					<div class="flex items-center justify-between rounded-lg border p-3">
						<div class="flex items-center gap-3">
							{#if device.trustedAt}
								<ShieldCheck class="h-5 w-5 text-green-500" />
							{:else}
								<Smartphone class="h-5 w-5 text-gray-400" />
							{/if}
							<div class="space-y-1">
								<div class="flex items-center gap-2">
									<span class="font-medium">{device.platform || 'Unknown Device'}</span>
									<Badge variant={device.trustedAt ? 'success' : 'secondary'}>
										{device.trustedAt ? 'Trusted' : 'New'}
									</Badge>
								</div>
								<p class="text-muted-foreground text-xs">
									Trust Score: {device.trustScore}/100
								</p>
								<p class="text-muted-foreground text-xs">
									Last seen: {formatTimestamp(device.lastSeen)}
								</p>
							</div>
						</div>
						<div class="text-right">
							<Badge variant="outline" class="text-xs">
								{device.userAgent?.slice(0, 20) || 'Unknown'}...
							</Badge>
						</div>
					</div>
				{/each}
			</div>
		{:else}
			<div class="text-muted-foreground py-8 text-center">
				<Fingerprint class="mx-auto h-12 w-12 opacity-50" />
				<p class="mt-2">No trusted devices</p>
				<p class="text-sm">Devices will appear here as users authenticate</p>
			</div>
		{/if}
	</Card.Content>
</Card.Root>
