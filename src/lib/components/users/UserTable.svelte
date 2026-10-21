<script lang="ts">
	import type { UserListItem, UserTableProps } from './types';
	import { Button } from '$lib/components/ui/button';

	let {
		users = [],
		selectedUserId = null,
		onSelect,
		hasFilters = false
	}: UserTableProps = $props();

	const STATUS_CONFIG = {
		banned: {
			label: 'banned',
			classes: 'bg-destructive/15 text-destructive border-destructive/20'
		},
		pending: {
			label: 'pending',
			classes: 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/20'
		},
		active: {
			label: 'active',
			classes: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/20'
		}
	} as const;

	function getStatus(user: UserListItem) {
		if (user.banned) return STATUS_CONFIG.banned;
		if (user.status === 'pending') return STATUS_CONFIG.pending;
		return STATUS_CONFIG.active;
	}

	function formatDate(date: string | Date | null | undefined): string {
		if (!date) return '—';
		try {
			return new Date(date).toLocaleDateString();
		} catch {
			return '—';
		}
	}

	function formatDateTime(date: string | Date | null | undefined): string {
		if (!date) return '—';
		try {
			return new Date(date).toLocaleString();
		} catch {
			return '—';
		}
	}

	function getInitial(user: UserListItem): string {
		return (user.name || user.email || '?').charAt(0).toUpperCase();
	}
</script>

<div class="bg-card overflow-hidden rounded-lg border shadow-sm">
	<table class="divide-border min-w-full divide-y">
		<thead class="bg-muted/50 text-xs">
			<tr class="text-foreground/80 text-left font-semibold">
				<th class="px-4 py-3">User</th>
				<th class="px-4 py-3">Email</th>
				<th class="hidden px-4 py-3 sm:table-cell">Role</th>
				<th class="px-4 py-3">Status</th>
				<th class="hidden px-4 py-3 md:table-cell">Last active</th>
				<th class="hidden px-4 py-3 md:table-cell">MFA</th>
				<th class="hidden px-4 py-3 md:table-cell">Created</th>
				<th class="px-4 py-3">
					<span class="sr-only">Actions</span>
				</th>
			</tr>
		</thead>
		<tbody class="divide-border bg-background divide-y text-xs">
			{#if users.length === 0}
				<tr>
					<td class="text-muted-foreground px-4 py-8 text-center text-sm" colspan="6">
						{hasFilters ? 'No users match your filters.' : 'No users found.'}
					</td>
				</tr>
			{:else}
				{#each users as user (user.id)}
					{@const status = getStatus(user)}
					<tr
						class="hover:bg-muted/40 transition-colors {user.id === selectedUserId
							? 'bg-primary/5'
							: ''}"
					>
						<td class="text-foreground font-small px-4 py-3">
							<div class="flex items-center gap-3">
								<div
									class="bg-primary/10 text-primary flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold"
								>
									{getInitial(user)}
								</div>
								<span class="truncate">{user.name ?? '—'}</span>
							</div>
						</td>
						<td class="text-muted-foreground max-w-[200px] truncate px-4 py-3">
							{user.email ?? '—'}
						</td>
						<td class="hidden px-4 py-3 sm:table-cell">
							<span class="bg-muted rounded-full px-3 py-2 text-xs capitalize">
								{user.role ?? 'user'}
							</span>
						</td>
						<td class="px-4 py-3">
							<span
								class="inline-flex items-center rounded-full px-3 py-2 text-xs font-medium capitalize {status.classes}"
							>
								{status.label}
							</span>
						</td>
						<td class="text-muted-foreground hidden px-4 py-3 md:table-cell">
							{formatDateTime(user.lastActive ?? user.updatedAt ?? user.createdAt)}
						</td>
						<td class="text-muted-foreground hidden px-4 py-3 md:table-cell">
							{#if user.mfaEnabled}
								<span class="rounded bg-emerald-500/10 px-3 py-1 text-xs text-emerald-700"
									>Enabled</span
								>
							{:else}
								<span class="bg-muted text-muted-foreground rounded px-3 py-1 text-xs"
									>Not enabled</span
								>
							{/if}
						</td>
						<td class="text-muted-foreground hidden px-4 py-3 md:table-cell">
							{formatDate(user.createdAt)}
						</td>
						<td class="px-4 py-3 text-right">
							<Button variant="outline" size="sm" onclick={() => onSelect?.(user.id)}>
								Manage
							</Button>
						</td>
					</tr>
				{/each}
			{/if}
		</tbody>
	</table>
</div>
