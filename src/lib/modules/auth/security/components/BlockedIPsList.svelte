<script lang="ts">
	import * as Card from '#lib/components/ui/card/index.js';
	import { Badge } from '#lib/components/ui/badge/index.js';
	import { Button } from '#lib/components/ui/button/index.js';
	import type { BlockedIPInfo } from '../services/sdk.js';
	let { blockedIPs = [], onReview }: { blockedIPs: BlockedIPInfo[]; onReview?: (ip: string) => void } = $props();
	function expiry(timestamp?: number) { return !timestamp ? 'No expiry recorded' : timestamp <= Date.now() ? 'Expiry passed; check enforcement' : `Expires ${new Date(timestamp).toLocaleString()}`; }
</script>
<Card.Root>
	<Card.Header>
		<Card.Title>Which IP block records were returned?</Card.Title>
		<Card.Description>Up to five recent records from the block store. A blocked request is not proof that every session from the address has ended.</Card.Description>
	</Card.Header>
	<Card.Content>
		<ul class="flex flex-col gap-3">
			{#each blockedIPs as record (record.ip)}
				<li class="flex flex-col gap-3 rounded-md border p-3 sm:flex-row sm:items-start sm:justify-between">
					<div class="flex min-w-0 flex-col gap-2"><p class="font-medium break-all">{record.ip}</p><p class="text-muted-foreground text-sm break-words">{record.reason}</p><p class="text-muted-foreground text-xs">Recorded {new Date(record.blockedAt).toLocaleString()} · {record.hitCount} recorded hits</p><Badge variant="outline">{expiry(record.expiresAt)}</Badge></div>
					{#if onReview}<Button variant="outline" size="sm" onclick={() => onReview?.(record.ip)}>Review block</Button>{/if}
				</li>
			{:else}<li class="text-muted-foreground py-6 text-sm">No IP block records were returned. Other access restrictions may still apply.</li>{/each}
		</ul>
	</Card.Content>
</Card.Root>
