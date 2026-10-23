<script lang="ts">
	import PageHeader from '#lib/components/efferd/app-shell/app-shell-2/page-header.svelte';
	import * as Card from '#lib/components/ui/card/index.js';
	import { page } from '$app/state';
import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
	const labels: Record<string, string> = {
		sign_in: 'Successful sign-in',
		session_created: 'Authenticated session created',
		password_changed: 'Password changed',
		email_changed: 'Email address changed',
		email_change_requested: 'Email change requested',
		profile_updated: 'Profile updated',
		two_factor_enabled: 'Two-factor authentication enabled',
		two_factor_setup_started: 'Two-factor authentication setup started',
		two_factor_disabled: 'Two-factor authentication disabled',
		role_changed: 'Administrator changed an account role',
		user_removed: 'Administrator removed an account',
		account_deletion_requested: 'Account deletion requested',
		account_unlinked: 'Connected sign-in method removed',
		passkey_added: 'Passkey added',
		passkey_deleted: 'Passkey removed',
		passkey_updated: 'Passkey updated'
	};
	function formatDate(value: string) {
		return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
	}
</script>

<svelte:head><title>Security activity</title></svelte:head>

<div class="mx-auto flex w-full max-w-4xl flex-col gap-6">
	<PageHeader title="Security activity" description="Recent sign-ins and changes to your account." />
	{#if !data.available}
		<Card.Root>
			<Card.Content class="py-6 text-sm text-muted-foreground" role="status">
				Security activity is temporarily unavailable. Try again later.
			</Card.Content>
		</Card.Root>
	{:else if data.history.length === 0}
		<Card.Root>
			<Card.Content class="py-6 text-sm text-muted-foreground">No security activity has been recorded for this account yet.</Card.Content>
		</Card.Root>
	{:else}
		<Card.Root>
			<Card.Header>
				<Card.Title>Recent activity</Card.Title>
				<Card.Description>Records are retained for up to 90 days. Older activity may no longer be available.</Card.Description>
			</Card.Header>
			<Card.Content>
				<ol class="divide-y divide-border">
					{#each data.history as item (item.id)}
						<li class="flex flex-wrap items-start justify-between gap-2 py-4 first:pt-0 last:pb-0">
							<div>
								<p class="font-medium">{labels[item.action] ?? 'Account activity'}</p>
								<p class="mt-1 text-sm text-muted-foreground">
									{item.metadata.method ? `Method: ${item.metadata.method}` : item.category === 'admin' ? 'Administrative action' : 'Account security'}
									{#if item.outcome === 'failure'} · Could not be completed{/if}
								</p>
								{#if item.metadata.device || item.metadata.ipAddress}
									<p class="mt-1 break-all text-xs text-muted-foreground">{item.metadata.device ?? 'Device unknown'}{item.metadata.ipAddress ? ` · ${item.metadata.ipAddress}` : ''}</p>
								{/if}
							</div>
							<time class="text-sm text-muted-foreground" datetime={item.createdAt}>{formatDate(item.createdAt)}</time>
						</li>
					{/each}
				</ol>
			</Card.Content>
		</Card.Root>
		{#if data.next}
			<a class="self-start text-sm underline underline-offset-4" href={`${page.url.pathname}?before=${encodeURIComponent(data.next)}`}>Show older activity</a>
		{/if}
	{/if}
</div>
