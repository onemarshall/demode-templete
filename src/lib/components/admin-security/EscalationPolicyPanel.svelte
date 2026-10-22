<script lang="ts">
	import * as Card from '#lib/components/ui/card/index.js';
	import { Badge } from '#lib/components/ui/badge/index.js';
	import { Cog } from '@lucide/svelte';
	import type { EscalationPolicy } from '#lib/auth/security/services/sdk.js';

	let { policy = null }: { policy: EscalationPolicy | null } = $props();

	const actionVariant = {
		block: 'destructive',
		challenge: 'secondary',
		flag: 'outline',
		skip: 'outline'
	} as const;
</script>

<Card.Root>
	<Card.Header>
		<Card.Title class="flex items-center gap-2">
			<Cog class="h-5 w-5" />
			What does the system do automatically?
		</Card.Title>
		<Card.Description>The rules the protection layer applies without a person involved.</Card.Description>
	</Card.Header>
	<Card.Content class="flex flex-col gap-3">
		{#if policy}
			<ul class="flex flex-col gap-2">
				{#each policy.rules as rule (rule.id)}
					<li class="flex flex-col gap-1 rounded-md border p-3 sm:flex-row sm:items-start sm:justify-between">
						<div class="flex min-w-0 flex-col gap-1">
							<p class="font-medium">{rule.label}</p>
							<p class="text-muted-foreground text-sm">{rule.trigger}</p>
							{#if rule.note}<p class="text-muted-foreground text-xs">{rule.note}</p>{/if}
						</div>
						<Badge variant={actionVariant[rule.action]} class="shrink-0">{rule.actionLabel}</Badge>
					</li>
				{/each}
			</ul>
			<p class="text-muted-foreground text-xs">
				{policy.note}
				Policy source: <code>{policy.configFile}</code>
			</p>
		{:else}
			<div class="text-muted-foreground flex flex-col items-center justify-center py-8">
				<Cog class="mb-2 h-8 w-8 opacity-50" />
				<p>Policy configuration is unavailable</p>
			</div>
		{/if}
	</Card.Content>
</Card.Root>
