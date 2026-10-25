<script lang="ts">
	import { authClient } from '#lib/modules/auth/client/client.js';
	import * as Card from '#lib/components/ui/card/index.js';
	import * as Alert from '#lib/components/ui/alert/index.js';
	import { Button } from '#lib/components/ui/button/index.js';
	import { Badge } from '#lib/components/ui/badge/index.js';
	import PageHeader from '#lib/app/shell/page-header.svelte';
	import { invalidateAll } from '$app/navigation';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
	let isLoading = $state(false);
	let pending = $state<string | null>(null);
	let error = $state('');
	let success = $state('');
	let session = $derived(data.session);
	let allSessions = $derived(data.allSessions);

	async function handleRefresh() {
		isLoading = true;
		error = '';
		try { await invalidateAll(); }
		catch (err) { error = err instanceof Error ? err.message : 'Could not refresh sessions.'; }
		finally { isLoading = false; }
	}

	async function revokeSession(token?: string) {
		pending = token ?? 'others';
		error = '';
		success = '';
		try {
			const result = token ? await authClient.revokeSession({ token }) : await authClient.revokeOtherSessions();
			if (result.error) throw new Error(result.error.message ?? 'Could not sign out sessions.');
			success = token ? 'That session was signed out.' : 'Other sessions were signed out. This session remains active.';
			await invalidateAll();
		} catch (err) { error = err instanceof Error ? err.message : 'Could not sign out sessions.'; }
		finally { pending = null; }
	}

	function formatDate(value: string | Date) {
		const date = new Date(value);
		return Number.isFinite(date.getTime()) ? date.toLocaleString() : 'Not recorded';
	}

	function formatDevice(userAgent: string | null | undefined): string {
		if (!userAgent) return 'Browser and device not recorded';
		const browser = /Edg(?:e|A|iOS)?\//i.test(userAgent) ? 'Edge'
			: /OPR\/|Opera/i.test(userAgent) ? 'Opera'
			: /Firefox\/|FxiOS\//i.test(userAgent) ? 'Firefox'
			: /Chrome\/|CriOS\//i.test(userAgent) ? 'Chrome'
			: /Safari\//i.test(userAgent) ? 'Safari' : 'Unrecognised browser';
		const os = /iPhone|iPad|iPod/i.test(userAgent) ? 'iOS'
			: /Android/i.test(userAgent) ? 'Android'
			: /Windows/i.test(userAgent) ? 'Windows'
			: /Macintosh|Mac OS X/i.test(userAgent) ? 'macOS'
			: /Linux/i.test(userAgent) ? 'Linux' : 'unknown device';
		return `${browser} on ${os}`;
	}
</script>

<div class="mx-auto flex w-full max-w-4xl flex-col gap-6">
	<PageHeader title="Where am I signed in?" description="Review the browsers using your account. Sign out a session you do not recognise." />
	{#if error}<Alert.Root variant="destructive"><Alert.Title>Action could not be completed</Alert.Title><Alert.Description>{error}</Alert.Description></Alert.Root>{/if}
	{#if success}<p role="status" class="text-sm">{success}</p>{/if}

	<Card.Root>
		<Card.Header>
			<Card.Title>Active sessions returned ({allSessions.length})</Card.Title>
			<Card.Description>Browser names are inferred from recorded browser information. An IP address can be shared by several people.</Card.Description>
		</Card.Header>
		<Card.Content class="flex flex-col gap-4">
			<div class="flex flex-wrap gap-2">
				<Button variant="outline" size="sm" onclick={handleRefresh} disabled={isLoading || pending !== null}>{isLoading ? 'Refreshing…' : 'Refresh sessions'}</Button>
				{#if allSessions.some((entry) => entry.id !== session.id)}
					<details>
						<summary class="cursor-pointer p-2 text-sm">Sign out all other sessions…</summary>
						<p class="text-muted-foreground my-3 text-sm">Other browsers will need to sign in again. This does not remove their trusted-device settings.</p>
						<Button variant="destructive" size="sm" onclick={() => revokeSession()} disabled={pending !== null}>Confirm other sign-outs</Button>
					</details>
				{/if}
			</div>
			{#each allSessions as entry (entry.id)}
				<div class="flex flex-col items-start gap-3 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between">
					<div class="min-w-0 flex flex-col gap-1">
						<div class="flex flex-wrap items-center gap-2"><p class="text-sm font-medium">{formatDevice(entry.userAgent)}</p>{#if entry.id === session.id}<Badge>This session</Badge>{/if}</div>
						<p class="text-muted-foreground text-xs">Last recorded update: {formatDate(entry.updatedAt)}</p>
						<p class="text-muted-foreground break-all text-xs">IP: {entry.ipAddress ?? 'Not recorded'}</p>
					</div>
					{#if entry.id !== session.id}<Button size="sm" variant="outline" onclick={() => revokeSession(entry.token)} disabled={pending !== null}>{pending === entry.token ? 'Signing out…' : 'Sign out session'}</Button>{/if}
				</div>
			{:else}
				<p class="text-muted-foreground text-sm">No session list was returned. Your current session is still active; refresh before drawing conclusions about other sign-ins.</p>
			{/each}
		</Card.Content>
	</Card.Root>

	<Card.Root>
		<Card.Header><Card.Title>What if I do not recognise a session?</Card.Title><Card.Description>Sign it out, then review your account's sign-in methods. Removing trust affects future verification and does not end an active session.</Card.Description></Card.Header>
		<Card.Content class="flex flex-wrap gap-2"><Button href="/auth/security" variant="outline">Review account protection</Button><Button href="/auth/trusted-devices" variant="outline">Review device trust</Button></Card.Content>
	</Card.Root>

	<details class="rounded-lg border p-4">
		<summary class="cursor-pointer text-sm">Account and current-session details</summary>
		<dl class="mt-4 grid gap-3 break-words text-sm sm:grid-cols-2">
			<div><dt class="text-muted-foreground">Account</dt><dd>{data.user.email}</dd></div>
			<div><dt class="text-muted-foreground">Email verification</dt><dd>{data.user.emailVerified ? 'Verified' : 'Not verified'}</dd></div>
			<div><dt class="text-muted-foreground">Two-factor authentication</dt><dd>{data.user.twoFactorEnabled === undefined ? 'Status unavailable' : data.user.twoFactorEnabled ? 'Enabled' : 'Not enabled'}</dd></div>
			<div><dt class="text-muted-foreground">Passkey records returned</dt><dd>{data.passkeyCount}</dd></div>
			<div><dt class="text-muted-foreground">Linked account records returned</dt><dd>{data.accountCount}</dd></div>
			<div><dt class="text-muted-foreground">Session expires</dt><dd>{formatDate(session.expiresAt)}</dd></div>
		</dl>
	</details>
</div>
