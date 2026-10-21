<!-- src/lib/components/profile/SessionsTab.svelte -->
<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import { Separator } from '$lib/components/ui/separator';
	import { Monitor, Smartphone, Globe, Calendar } from '@lucide/svelte';
	import { goto } from '$app/navigation';

	interface Props {
		session: any;
		allSessions?: any[];
	}

	let { session, allSessions = [] }: Props = $props();

	function formatDate(dateString: string | Date) {
		return new Date(dateString).toLocaleString();
	}

	function getDeviceIcon(userAgent: string) {
		if (userAgent?.includes('Mobile')) return Smartphone;
		return Monitor;
	}
</script>

<Card.Root>
	<Card.Header>
		<Card.Title class="flex items-center gap-2">
			<Globe class="h-5 w-5" />
			Active Sessions
		</Card.Title>
		<Card.Description>Manage your active sessions across devices.</Card.Description>
	</Card.Header>
	<Card.Content class="space-y-4">
		<!-- Current Session -->
		<div class="rounded-lg border p-4">
			<div class="flex items-center justify-between">
				<div class="flex items-center gap-3">
					<Monitor class="text-muted-foreground h-5 w-5" />
					<div>
						<h4 class="font-medium">Current Session</h4>
						<p class="text-muted-foreground text-sm">
							{session?.ipAddress || 'Unknown location'}
						</p>
					</div>
				</div>
				<Badge variant="success">Active</Badge>
			</div>
			<div class="text-muted-foreground mt-2 text-xs">
				<div class="flex items-center gap-1">
					<Calendar class="h-3 w-3" />
					Started {formatDate(session?.createdAt)}
				</div>
			</div>
		</div>

		{#if allSessions.length > 1}
			<Separator />

			<!-- Other Sessions -->
			<div class="space-y-3">
				<h4 class="font-medium">Other Sessions</h4>
				{#each allSessions.filter((s) => s.id !== session?.id) as otherSession}
					{@const DeviceIcon = getDeviceIcon(otherSession.userAgent || '')}
					<div class="rounded-lg border p-3">
						<div class="flex items-center justify-between">
							<div class="flex items-center gap-3">
								<DeviceIcon class="text-muted-foreground h-4 w-4" />
								<div>
									<p class="text-sm font-medium">
										{otherSession.userAgent?.split(' ')[0] || 'Unknown Device'}
									</p>
									<p class="text-muted-foreground text-xs">
										{otherSession.ipAddress || 'Unknown location'}
									</p>
								</div>
							</div>
							<Button variant="outline" size="sm">Revoke</Button>
						</div>
						<div class="text-muted-foreground mt-1 text-xs">
							Last active {formatDate(otherSession.updatedAt)}
						</div>
					</div>
				{/each}
			</div>
		{/if}

		<Separator />

		<div class="flex justify-between">
			<Button variant="outline" onclick={() => goto('/auth/sessions')}>
				View Detailed Sessions
			</Button>
			<Button variant="destructive">Sign Out All Devices</Button>
		</div>
	</Card.Content>
</Card.Root>
