<script lang="ts">
	import * as Sheet from '#lib/components/ui/sheet/index.js';
	import * as Alert from '#lib/components/ui/alert/index.js';
	import { Badge } from '#lib/components/ui/badge/index.js';
	import { Button } from '#lib/components/ui/button/index.js';
	import { enhance } from '$app/forms';
	import type { DashboardData } from '#lib/auth/security/services/dashboard-types.js';
	import type { RecommendedActionItem } from './triage/types';
	import { humaniseRiskFactors } from '#lib/auth/security/core/risk-factor-labels.js';

	let { open, item, events = [], blockedIPs = [], onClose, onViewRelated }: {
		open: boolean;
		item: RecommendedActionItem | null;
		events?: NonNullable<DashboardData['events']>;
		blockedIPs?: DashboardData['blockedIPs'];
		onClose: () => void;
		onViewRelated: (item: RecommendedActionItem) => void;
	} = $props();
	let isSubmitting = $state(false);
	let actionError = $state('');
	const matchingEvents = $derived(events.filter((event) => {
		if (!item?.entityId) return false;
		switch (item.entityType) {
			case 'ip': return event.ip === item.entityId;
			case 'session': return event.sessionId === item.entityId || event.id === item.entityId;
			case 'user': return event.userId === item.entityId;
			case 'event': return event.id === item.entityId;
			default: return false;
		}
	}));
	const ip = $derived(item?.entityType === 'ip' ? item.entityId : matchingEvents[0]?.ip);
	const existingBlock = $derived(blockedIPs.find((entry) => entry.ip === ip));
</script>

<Sheet.Root {open} onOpenChange={(next) => { if (!next) onClose(); }}>
	<Sheet.Content class="overflow-y-auto sm:max-w-xl">
		<Sheet.Header>
			<Sheet.Title>{item?.title ?? 'This record is no longer in the current sample'}</Sheet.Title>
			<Sheet.Description>{item?.reason ?? 'The monitoring window may have moved or the source may be unavailable. Return to the current records to continue.'}</Sheet.Description>
		</Sheet.Header>
		<div class="flex flex-col gap-5 px-4 pb-6">
			{#if actionError}<Alert.Root variant="destructive"><Alert.Title>Access could not be updated</Alert.Title><Alert.Description>{actionError}</Alert.Description></Alert.Root>{/if}
			{#if item}
				<div class="flex flex-wrap gap-2">
					<Badge variant={item.severity === 'critical' ? 'destructive' : 'secondary'}>{item.severity}</Badge>
					<Badge variant="outline">{item.sourceLabel}</Badge>
				</div>
				<div class="flex flex-col gap-2">
					<h3 class="font-medium">Why does this matter?</h3>
					<p class="text-muted-foreground text-sm">{existingBlock ? 'An IP block is recorded. Check whether the activity and affected users justify keeping it in place.' : 'This observation needs context before you change access. Check the time, source and affected account against activity you expect.'}</p>
					<p class="text-muted-foreground text-sm">Opening this review does not resolve the observation or change anyone's access.</p>
				</div>
				<div class="flex flex-col gap-3">
					<h3 class="font-medium">What was recorded?</h3>
					{#if item.entityId}<p class="text-sm break-all">{item.entityType}: {item.entityId}</p>{/if}
					{#if matchingEvents.length > 0}
						<p class="text-muted-foreground text-sm">{matchingEvents.length} related {matchingEvents.length === 1 ? 'event' : 'events'} in the available sample. Showing up to 20.</p>
						<ul class="flex flex-col gap-3">
							{#each matchingEvents.slice(0, 20) as event (event.id)}
								<li class="flex flex-col gap-1 rounded-md border p-3 text-sm">
									<p class="font-medium break-all">{event.path}</p>
									<p class="text-muted-foreground break-all">{event.ip} · {new Date(event.timestamp).toLocaleString()} (local time)</p>
									<p>{event.riskLevel} risk ({event.riskScore}/100) · {event.blocked ? 'Blocked request' : 'Not recorded as blocked'}</p>
									{#if event.factors?.length}<p class="text-muted-foreground break-words">Signals: {humaniseRiskFactors(event.factors)}</p>{/if}
								</li>
							{/each}
						</ul>
					{:else}
						<Alert.Root><Alert.Title>Detailed events are not in the current sample</Alert.Title><Alert.Description>The source summary may still be available. This is not evidence that the observation was resolved.</Alert.Description></Alert.Root>
					{/if}
					{#if existingBlock}
						<p class="text-sm break-words">Block reason: {existingBlock.reason}. Recorded {new Date(existingBlock.blockedAt).toLocaleString()}.</p>
					{/if}
				</div>
				<Button variant="outline" onclick={() => onViewRelated(item)}>View related records</Button>
				{#if ip}
					<details>
						<summary class="cursor-pointer py-2 font-medium">Change access for {ip}</summary>
						{#if !existingBlock}<p class="text-muted-foreground text-sm">No block for this address was returned in the limited block list. Its current block status is unknown. A new request may update an existing block.</p>{/if}
						<form method="POST" action={existingBlock ? '?/unblockIp' : '?/blockIp'} class="flex flex-col gap-3 pt-3" use:enhance={() => {
							isSubmitting = true;
							actionError = '';
							return async ({ update, result }) => { try {
								if (result.type === 'error') { actionError = 'The request failed. Check the current block records before trying again.'; return; }
								if (result.type === 'failure' || (result.type === 'success' && result.data?.success === false)) actionError = 'The request was not completed. The existing access state may still apply.';
								await update();
							} finally { isSubmitting = false; } };
						}}>
							<input type="hidden" name="ip" value={ip} />
							<Alert.Root>
								<Alert.Title>{existingBlock ? 'Allow requests from this address again?' : 'Request an IP block for this address?'}</Alert.Title>
								<Alert.Description>{existingBlock ? 'Removing this block allows the address to try again; other security checks still apply.' : 'This affects everyone sharing the IP address and does not sign out existing sessions. Review the evidence before continuing.'}</Alert.Description>
							</Alert.Root>
							<Button type="submit" variant={existingBlock ? 'outline' : 'destructive'} disabled={isSubmitting}>{isSubmitting ? 'Saving…' : existingBlock ? 'Remove IP block' : 'Request IP block'}</Button>
						</form>
					</details>
				{/if}
			{/if}
		</div>
	</Sheet.Content>
</Sheet.Root>
