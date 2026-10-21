<script lang="ts">
	import type { UserDetailProps } from './types';
	import { formatDateTime, getInitials } from './utils';

	let { user }: UserDetailProps = $props();

	// Derived values
	const isBanned = $derived(user?.banned ?? false);
	const displayName = $derived(user?.name ?? user?.email ?? user?.id ?? '—');
	const displayStatus = $derived(user?.status ?? (isBanned ? 'banned' : 'active'));
	const initials = $derived(getInitials(user?.name, user?.email));
</script>

{#if user}
	<div class="bg-card text-card-foreground rounded-lg border shadow-sm">
		<div class="flex items-center gap-3 border-b px-4 py-3">
			<div
				class="bg-primary/10 text-primary flex h-10 w-10 items-center justify-center rounded-full text-sm font-semibold"
			>
				{initials}
			</div>
			<div class="min-w-0 flex-1">
				<p class="text-muted-foreground text-xs tracking-wide uppercase">User</p>
				<p class="truncate text-lg font-semibold">{displayName}</p>
				{#if user.name && user.email}
					<p class="text-muted-foreground truncate text-sm">{user.email}</p>
				{/if}
			</div>
		</div>

		<div class="flex flex-wrap gap-2 border-b px-4 py-3">
			<span class="bg-muted rounded-full px-3 py-1 text-sm">{user.role ?? 'user'}</span>
			{#if isBanned}
				<span class="bg-destructive/10 text-destructive rounded-full px-3 py-1 text-sm">Banned</span
				>
			{:else}
				<span class="rounded-full bg-emerald-500/10 px-3 py-1 text-sm text-emerald-600">Active</span
				>
			{/if}
		</div>

		<div class="divide-y text-sm">
			<div class="flex justify-between px-4 py-3">
				<span class="text-muted-foreground">ID</span>
				<code class="bg-muted max-w-[180px] truncate rounded px-1.5 py-0.5 font-mono text-xs"
					>{user.id}</code
				>
			</div>
			<div class="flex justify-between px-4 py-3">
				<span class="text-muted-foreground">Status</span>
				<span class={isBanned ? 'text-destructive' : 'text-emerald-600'}>
					{displayStatus}
				</span>
			</div>
			<div class="flex justify-between px-4 py-3">
				<span class="text-muted-foreground">Created</span>
				<span>{formatDateTime(user.createdAt)}</span>
			</div>
			<div class="flex justify-between px-4 py-3">
				<span class="text-muted-foreground">Updated</span>
				<span>{formatDateTime(user.updatedAt)}</span>
			</div>
			{#if isBanned}
				<div class="bg-destructive/5 space-y-2 px-4 py-3">
					<div class="flex justify-between">
						<span class="text-muted-foreground">Ban reason</span>
						<span class="text-destructive max-w-[180px] truncate">{user.banReason ?? '—'}</span>
					</div>
					<div class="flex justify-between">
						<span class="text-muted-foreground">Ban expires</span>
						<span class="text-destructive">
							{user.banExpires ? formatDateTime(user.banExpires) : '—'}
						</span>
					</div>
				</div>
			{/if}
		</div>
	</div>
{:else}
	<div class="bg-card text-card-foreground rounded-lg border shadow-sm">
		<div class="flex flex-col items-center justify-center px-4 py-8 text-center">
			<svg
				class="text-muted-foreground/50 mb-3 h-12 w-12"
				fill="none"
				viewBox="0 0 24 24"
				stroke="currentColor"
				stroke-width="1.5"
			>
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
				/>
			</svg>
			<p class="text-muted-foreground text-sm">Select a user to view details</p>
		</div>
	</div>
{/if}
