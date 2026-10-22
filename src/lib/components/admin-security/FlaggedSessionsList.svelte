<script lang="ts">
	import * as Card from '#lib/components/ui/card/index.js';
	import { Badge } from '#lib/components/ui/badge/index.js';
	import { Button } from '#lib/components/ui/button/index.js';
	import * as Alert from '#lib/components/ui/alert/index.js';
	import { Eye, Ban, RefreshCw } from '@lucide/svelte';
	import { enhance } from '$app/forms';
	import type { FlaggedSession } from '#lib/auth/security/types.js';
	import { humaniseRiskFactor } from '#lib/auth/security/core/risk-factor-labels.js';

	let { sessions, selectedEntityId }: { sessions: FlaggedSession[]; selectedEntityId?: string } = $props();
	let actionInProgress = $state<string | null>(null);
	let actionError = $state<string | null>(null);
</script>

<Card.Root>
	<Card.Header>
		<Card.Title class="flex items-center gap-2"><Eye /> Which recorded sessions need review?</Card.Title>
		<Card.Description>
			Risk signals are reasons to investigate, not proof of account misuse. Expand a record to see the evidence and available response.
		</Card.Description>
	</Card.Header>
	<Card.Content>
		{#if actionError}
			<Alert.Root variant="destructive" class="mb-4"><Alert.Title>IP could not be blocked</Alert.Title><Alert.Description>{actionError}</Alert.Description></Alert.Root>
		{/if}
		<div class="flex flex-col gap-3">
			{#each sessions ?? [] as session, index (`${session.sessionId}:${index}`)}
				<details class="rounded-lg border p-4" open={selectedEntityId === session.sessionId}>
					<summary class="cursor-pointer break-words">
						<span class="inline-flex max-w-full flex-wrap items-center gap-2 align-middle">
							<span class="font-mono text-sm">{session.ip}</span>
							<Badge variant={session.riskLevel === 'critical' ? 'destructive' : session.riskLevel}>Risk: {session.riskScore}/100 · {session.riskLevel}</Badge>
							{#if session.isBlocked}<Badge variant="secondary">Blocked</Badge>{/if}
						</span>
					</summary>
					<div class="mt-4 flex flex-col gap-4">
						<dl class="grid gap-3 break-all text-sm sm:grid-cols-2">
							<div><dt class="text-muted-foreground">Session reference</dt><dd>{session.sessionId}</dd></div>
							<div><dt class="text-muted-foreground">User</dt><dd>{session.userId ?? 'Not recorded'}</dd></div>
							<div><dt class="text-muted-foreground">Recorded at</dt><dd>{new Date(session.flaggedAt).toLocaleString()}</dd></div>
							<div><dt class="text-muted-foreground">Device trust</dt><dd>{session.trustLevel ?? 'Not assessed'}</dd></div>
						</dl>
						<div class="flex flex-col gap-2">
							<h4 class="text-sm font-medium">Why this needs review</h4>
							<div class="flex flex-wrap gap-1">
								{#each session.riskFactors ?? session.factors ?? [] as factor, factorIndex (`${factor}:${factorIndex}`)}
									<Badge variant="outline">{humaniseRiskFactor(factor)}</Badge>
								{:else}<p class="text-muted-foreground text-sm">The source did not record individual risk factors.</p>{/each}
							</div>
						</div>
						{#if session.isBlocked}
							<p class="text-muted-foreground text-sm">This record was blocked when recorded. Check current enforcement in Blocked IPs before taking another action.</p>
						{:else}
							<details>
								<summary class="cursor-pointer text-sm font-medium">Block requests from this IP…</summary>
								<p class="text-muted-foreground my-3 text-sm">Blocking {session.ip} can also affect other people using the same network. It does not revoke an existing sign-in session. You can remove the block in Blocked IPs.</p>
								<form method="POST" action="?/blockIp" use:enhance={() => {
									actionInProgress = session.sessionId;
									actionError = null;
									return async ({ update, result }) => {
										try {
											if (result.type === 'error' || result.type === 'failure' || (result.type === 'success' && result.data?.success === false)) actionError = 'The request failed. Review the block list before retrying.';
											if (result.type !== 'error') await update();
										} finally { actionInProgress = null; }
									};
								}}>
									<input type="hidden" name="ip" value={session.ip} />
									<Button type="submit" variant="destructive" size="sm" disabled={actionInProgress !== null}>
										{#if actionInProgress === session.sessionId}<RefreshCw data-icon="inline-start" class="animate-spin" />{:else}<Ban data-icon="inline-start" />{/if}
										Confirm IP block
									</Button>
								</form>
							</details>
						{/if}
					</div>
				</details>
			{:else}
				<p class="text-muted-foreground py-6 text-sm">No flagged records were returned. Check monitoring coverage above before drawing conclusions about current activity.</p>
			{/each}
		</div>
	</Card.Content>
</Card.Root>
