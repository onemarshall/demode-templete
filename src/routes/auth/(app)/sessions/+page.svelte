<!-- src/routes/auth/sessions/+page.svelte -->
<script lang="ts">
	import { authClient } from '#lib/auth-client.js';
	import SessionSkeleton from '#lib/components/auth/SessionSkeleton.svelte';
	import AuthError from '#lib/components/auth/AuthError.svelte';
	import * as Card from '#lib/components/ui/card/index.js';
	import { Button } from '#lib/components/ui/button/index.js';
	import { Badge } from '#lib/components/ui/badge/index.js';
	import { Avatar, AvatarImage, AvatarFallback } from '#lib/components/ui/avatar/index.js';
	import { getResizedAvatarUrl, getAvatarInitials } from '#lib/components/profile/utils/avatar.js';
	import { Separator } from '#lib/components/ui/separator/index.js';
	import PageHeader from '#lib/components/efferd/app-shell/app-shell-2/page-header.svelte';
	import { goto, invalidateAll } from '$app/navigation';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
	let isLoading = $state(false);
	let error = $state('');

	// Use server data as source of truth
	let user = $derived(data.user);
	let session = $derived(data.session);
	let allSessions = $derived(data.allSessions);

	async function handleRefresh() {
		isLoading = true;
		error = '';
		try {
			await invalidateAll();
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to refresh session';
		} finally {
			isLoading = false;
		}
	}

	async function handleSignOut() {
		try {
			await authClient.signOut({
				fetchOptions: {
					onSuccess: () => goto('/auth/sign-in')
				}
			});
		} catch (err) {
			error = err instanceof Error ? err.message : 'Sign out failed';
		}
	}

	async function revokeSession(sessionToken: string) {
		try {
			await authClient.revokeSession({ token: sessionToken });
			await invalidateAll();
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to revoke session';
		}
	}

	async function revokeAllOtherSessions() {
		try {
			await authClient.revokeOtherSessions();
			await invalidateAll();
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to revoke other sessions';
		}
	}

	function formatDate(dateString: string | Date) {
		return new Date(dateString).toLocaleString();
	}

	function formatDevice(userAgent: string | null | undefined): string {
		if (!userAgent) return 'Unknown device';
		// Extract browser/device name from user agent
		const match = userAgent.match(/^(\S+)/);
		return match?.[1] || 'Unknown device';
	}
</script>

{#if isLoading}
	<SessionSkeleton />
{:else if error}
	<AuthError {error} retry={handleRefresh} />
{:else if user && session}
	<div class="mx-auto w-full max-w-4xl space-y-6">
		<PageHeader
			title="Sessions &amp; Devices"
			description="Manage your active sessions and trusted devices."
		>
			<!-- {#snippet actions()}
				<Button onclick={handleRefresh} variant="outline" size="sm" disabled={isLoading}>
					{isLoading ? 'Refreshing...' : 'Refresh'}
				</Button>
				<Button onclick={handleSignOut} variant="destructive" size="sm">Sign Out</Button>
			{/snippet} -->
		</PageHeader>

		<div class="grid gap-6 md:grid-cols-2">
			<!-- User Card -->
			<Card.Root>
				<Card.Header>
					<Card.Title>User</Card.Title>
				</Card.Header>
				<Card.Content class="space-y-3">
					<div class="flex items-center gap-3">
						<Avatar class="h-12 w-12">
							{#if user.image}
								<AvatarImage
									src={getResizedAvatarUrl(user.image, 48) || user.image}
									alt="User avatar"
								/>
							{/if}
							<AvatarFallback>
								{getAvatarInitials(user.name, user.email)}
							</AvatarFallback>
						</Avatar>
						<div class="min-w-0">
							<p class="truncate font-semibold">{user.name || 'No name'}</p>
							<p class="text-muted-foreground truncate text-xs">{user.email}</p>
						</div>
					</div>
					<Separator />
					<div class="space-y-2 text-sm">
						<div class="flex flex-row items-center justify-between">
							<span class="text-muted-foreground">ID:</span>
							<span class="font-mono text-xs break-all">{user.id}</span>
						</div>
						<div class="flex items-center justify-between gap-2">
							<span class="text-muted-foreground">Email:</span>
							<div class="flex items-center gap-2">
								<span class="text-xs">{user.email}</span>
								<Badge variant={user.emailVerified ? 'success' : 'secondary'} class="text-xs">
									{user.emailVerified ? 'Verified' : 'Unverified'}
								</Badge>
							</div>
						</div>
					</div>
				</Card.Content>
			</Card.Root>

			<!-- Current Session Card -->
			<Card.Root>
				<Card.Header>
					<Card.Title>Current Session</Card.Title>
				</Card.Header>
				<Card.Content class="space-y-3">
					<div class="space-y-2 text-sm">
						<div class="flex justify-between">
							<span class="text-muted-foreground">ID:</span>
							{#if session?.id}
								<span class="font-mono text-xs">{session.id.substring(0, 12)}...</span>
							{:else}
								<span class="text-muted-foreground font-mono text-xs">Unknown</span>
							{/if}
						</div>
						<div class="flex justify-between">
							<span class="text-muted-foreground">Created:</span>
							{#if session?.createdAt}
								<span class="text-xs">{formatDate(session.createdAt)}</span>
							{:else}
								<span class="text-muted-foreground text-xs">Unknown</span>
							{/if}
						</div>
						<div class="flex justify-between">
							<span class="text-muted-foreground">Expires:</span>
							{#if session?.expiresAt}
								<span class="text-xs">{formatDate(session.expiresAt)}</span>
							{:else}
								<span class="text-muted-foreground text-xs">Unknown</span>
							{/if}
						</div>
						{#if session?.ipAddress}
							<div class="flex justify-between">
								<span class="text-muted-foreground">IP Address:</span>
								<span class="font-mono text-xs">{session.ipAddress}</span>
							</div>
						{/if}
						{#if session?.userAgent}
							<div class="flex justify-between">
								<span class="text-muted-foreground">Device:</span>
								<span class="text-xs">{formatDevice(session.userAgent)}</span>
							</div>
						{/if}
					</div>
				</Card.Content>
			</Card.Root>
		</div>

		<!-- Security & Actions Card -->
		<Card.Root>
			<Card.Header>
				<Card.Title>Security & Actions</Card.Title>
			</Card.Header>
			<Card.Content class="space-y-4">
				<div class="space-y-2">
					<h4 class="text-sm font-semibold">Features</h4>
					<div class="space-y-2">
						<div class="flex justify-between text-sm">
							<span>2FA</span>
							<Badge variant={user.twoFactorEnabled ? 'success' : 'secondary'} class="text-xs">
								{user.twoFactorEnabled ? 'Enabled' : 'Disabled'}
							</Badge>
						</div>
						<div class="flex justify-between text-sm">
							<span>Passkeys</span>
							<Badge variant={data.passkeyCount > 0 ? 'success' : 'secondary'} class="text-xs">
								{data.passkeyCount}
							</Badge>
						</div>
						<div class="flex justify-between text-sm">
							<span>Linked Accounts</span>
							<Badge variant="secondary" class="text-xs">
								{data.accountCount}
							</Badge>
						</div>
					</div>
				</div>
				<Separator />
				<div class="flex flex-wrap gap-2">
					<Button size="sm" onclick={revokeAllOtherSessions} variant="destructive">
						Sign Out All Other Devices
					</Button>
				</div>
			</Card.Content>
		</Card.Root>

		<!-- All Active Sessions -->
		<Card.Root>
			<Card.Header>
				<Card.Title>All Active Sessions ({allSessions.length})</Card.Title>
			</Card.Header>
			<Card.Content>
				{#if allSessions.length === 0}
					<p class="text-muted-foreground text-sm">No active sessions</p>
				{:else}
					<div class="space-y-2">
						{#each allSessions as userSession (userSession.id)}
							<div class="flex items-center justify-between rounded border p-3">
								<div class="flex-1">
									<div class="flex items-center gap-2">
										<p class="text-sm font-medium">
											{formatDevice(userSession.userAgent)}
										</p>
										{#if session && userSession.id === session.id}
											<Badge class="text-xs">Current</Badge>
										{/if}
									</div>
									<p class="text-muted-foreground text-xs">
										{formatDate(userSession.updatedAt)}
									</p>
								</div>
								{#if session && userSession.id !== session.id}
									<Button
										size="sm"
										variant="outline"
										onclick={() => revokeSession(userSession.token)}
									>
										Revoke
									</Button>
								{/if}
							</div>
						{/each}
					</div>
				{/if}
			</Card.Content>
		</Card.Root>

		<!-- Trusted Devices -->
		<Card.Root>
			<Card.Header>
				<Card.Title>Trusted Devices</Card.Title>
				<Card.Description>
					Devices you've marked as trusted can skip two-factor authentication.
				</Card.Description>
			</Card.Header>
			<Card.Content>
				<div class="flex items-center justify-between">
					<div>
						<h4 class="text-sm font-medium">Manage trusted devices</h4>
						<p class="text-muted-foreground text-sm">
							View this device's trust status or revoke trust for all devices
						</p>
					</div>
					<Button variant="outline" onclick={() => goto('/auth/trusted-devices')}>
						Manage Devices
					</Button>
				</div>
			</Card.Content>
		</Card.Root>
	</div>
{:else}
	<AuthError error="No active session found" retry={() => goto('/auth/sign-in')} />
{/if}
