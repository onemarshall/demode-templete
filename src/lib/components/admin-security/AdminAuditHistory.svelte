<script lang="ts">
	import * as Alert from '#lib/components/ui/alert/index.js';
	import * as Card from '#lib/components/ui/card/index.js';
	import type { HistoryEntry } from '#lib/auth/server/history.js';

	let { entries, available, next }: { entries: HistoryEntry[]; available: boolean; next: string | null } = $props();
	const labels: Record<string, string> = {
		role_changed: 'Role changed',
		user_removed: 'User removed',
		password_changed: 'Password changed',
		email_change_requested: 'Email change requested',
		profile_updated: 'Profile updated',
		two_factor_enabled: 'Two-factor authentication enabled',
		two_factor_disabled: 'Two-factor authentication disabled',
		account_deletion_requested: 'Account deletion requested',
		account_unlinked: 'Connected sign-in method removed',
		passkey_added: 'Passkey added',
		passkey_deleted: 'Passkey removed',
		passkey_updated: 'Passkey updated',
		two_factor_setup_started: 'Two-factor authentication setup started',
		sign_in: 'Successful sign-in',
		session_created: 'Authenticated session created'
	};
	function formatDate(value: string) {
		return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
	}
</script>

<Card.Root id="admin-audit-history">
	<Card.Header>
		<Card.Title>Administrative audit history</Card.Title>
		<Card.Description>The latest 50 events are shown per page. Role changes and user removals include the acting administrator, target, and outcome; records are retained for up to 90 days.</Card.Description>
	</Card.Header>
	<Card.Content>
		{#if !available}
			<Alert.Root><Alert.Title>Audit history is unavailable</Alert.Title><Alert.Description>The history store could not be reached. Refresh to try again.</Alert.Description></Alert.Root>
		{:else if entries.length === 0}
			<p class="text-sm text-muted-foreground">No audit events have been recorded in the retention window.</p>
		{:else}
			<ol class="divide-y divide-border">
				{#each entries as item (item.id)}
					<li class="grid gap-2 py-3 first:pt-0 sm:grid-cols-[1fr_auto] sm:items-start">
						<div class="min-w-0">
							<p class="font-medium">{labels[item.action] ?? item.action}</p>
							<p class="mt-1 break-all text-sm text-muted-foreground">Actor: {item.actorId ?? 'Unknown'} · Target: {item.targetId ?? '—'} · {item.outcome}</p>
							{#if item.metadata.role}<p class="text-sm text-muted-foreground">Role set to {item.metadata.role}</p>{/if}
						</div>
						<time class="text-sm text-muted-foreground" datetime={item.createdAt}>{formatDate(item.createdAt)}</time>
					</li>
				{/each}
			</ol>
			{#if next}<a class="mt-4 inline-block text-sm underline underline-offset-4" href={`/admin/security?auditBefore=${encodeURIComponent(next)}#admin-audit-history`}>Show older audit events</a>{/if}
		{/if}
	</Card.Content>
</Card.Root>
