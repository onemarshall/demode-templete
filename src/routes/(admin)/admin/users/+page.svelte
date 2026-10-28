<script lang="ts">
	import { goto, invalidateAll } from '$app/navigation';
	import type { PageData, ActionData } from './$types';
	import type { SubmitFunction } from '$app/forms';
	import UserTable from '#lib/modules/auth/features/admin/components/UserTable.svelte';
	import UserModal from '#lib/modules/auth/features/admin/components/UserModal.svelte';
	import * as Dialog from '#lib/components/ui/dialog/index.js';
	import { Button } from '#lib/components/ui/button/index.js';
	import * as Select from '#lib/components/ui/select/index.js';
	import PageHeader from '#lib/app/shell/page-header.svelte';
	import type { UserListItem } from '#lib/modules/auth/features/admin/shared/types.js';

	interface Props {
		data: PageData;
		form: ActionData;
	}

	let { data, form }: Props = $props();

	// Modal state
	let showUserModal = $state(false);
	let pendingAction = $state<string | null>(null);
	let selectedUser = $state<PageData['user']>(null);
	let localBanStatus = $state<Record<string, boolean>>({});
	let confirmOpen = $state(false);
	let confirmMessage = $state('');
	let confirmResolver: ((value: boolean) => void) | null = null;
	let searchTerm = $state('');
	let statusFilter = $state<'all' | 'active' | 'banned' | 'pending'>('all');
	let roleFilter = $state<'all' | 'admin' | 'user' | 'moderator' | 'custom'>('all');
	let hasFilters = $derived(
		Boolean(searchTerm.trim()) || statusFilter !== 'all' || roleFilter !== 'all'
	);

	// Track previous data.user to avoid redundant effect runs
	let prevDataUserId = $state<string | null>(null);

	// Derived - compute users with local ban status overrides
	const usersWithStatus = $derived(
		(data.users ?? []).map((u: UserListItem) => {
			const localBanned = localBanStatus[u.id];
			const banned = localBanned ?? u.banned ?? false;
			return { ...u, banned, status: banned ? 'banned' : u.status };
		})
	);

	const hasUsers = $derived((data.users?.length ?? 0) > 0);
	const formError = $derived(form && 'error' in form ? form.error : undefined);
	const totalCount = $derived(usersWithStatus.length);
	const activeCount = $derived(usersWithStatus.filter((u) => !u.banned).length);
	const bannedCount = $derived(usersWithStatus.filter((u) => u.banned).length);
	const filteredUsers = $derived(
		usersWithStatus.filter((u) => {
			const term = searchTerm.trim().toLowerCase();
			const matchesTerm =
				!term ||
				(u.name ?? '').toLowerCase().includes(term) ||
				(u.email ?? '').toLowerCase().includes(term);
			const matchesStatus =
				statusFilter === 'all'
					? true
					: statusFilter === 'banned'
						? u.banned === true
						: statusFilter === 'active'
							? u.banned === false
							: (u.status ?? '').toLowerCase() === 'pending';
			const role = (u.role ?? '').toLowerCase();
			const matchesRole =
				roleFilter === 'all'
					? true
					: roleFilter === 'custom'
						? role && !['user', 'admin', 'moderator'].includes(role)
						: role === roleFilter;
			return matchesTerm && matchesStatus && matchesRole;
		})
	);

	// Update selected user when data changes (only on actual user change)
	$effect(() => {
		const currentUserId = data.user?.id ?? null;
		if (data.user && currentUserId !== prevDataUserId) {
			const banned = localBanStatus[data.user.id] ?? data.user.banned ?? false;
			selectedUser = {
				...data.user,
				status: banned ? 'banned' : data.user.status,
				banned
			};
			showUserModal = true;
			prevDataUserId = currentUserId;
		}
	});

	function handleSelectUser(id: string) {
		const found = usersWithStatus.find((u) => u.id === id);
		selectedUser = found ?? null;
		showUserModal = true;
		const url = new URL(window.location.href);
		url.searchParams.set('user', id);
		goto(url.pathname + url.search, { replace: true, reset: false });
	}

	function handleStatusChange(id: string, banned: boolean) {
		localBanStatus = { ...localBanStatus, [id]: banned };
		if (selectedUser?.id === id) {
			selectedUser = { ...selectedUser, banned, status: banned ? 'banned' : selectedUser.status };
		}
	}

	async function handleCloseModal() {
		showUserModal = false;
		selectedUser = null;
		prevDataUserId = null;
		const url = new URL(window.location.href);
		url.searchParams.delete('user');
		await goto(url.pathname + url.search, { replace: true, reset: false });
	}

	function handleConfirmChoice(choice: boolean) {
		confirmOpen = false;
		confirmResolver?.(choice);
		confirmResolver = null;
	}

	const confirmAction = (message: string): Promise<boolean> => {
		confirmMessage = message;
		confirmOpen = true;
		return new Promise((resolve) => {
			confirmResolver = resolve;
		});
	};

	function createEnhanceHandler(actionName: string, confirmMsg?: string): SubmitFunction {
		return async ({ cancel }) => {
			if (confirmMsg) {
				const proceed = await confirmAction(confirmMsg);
				if (!proceed) {
					cancel();
					return;
				}
			}
			pendingAction = actionName;

			return async ({ update }) => {
				await update();
				await invalidateAll();
				pendingAction = null;
			};
		};
	}
</script>

<svelte:head>
	<title>Admin · Users &amp; access</title>
</svelte:head>

<div class="space-y-6">
	<!-- Header -->
	<PageHeader title="Users & access" description="Manage accounts, roles and access across the application.">
		{#snippet actions()}
			{#if hasUsers}
				<span class="text-muted-foreground text-sm">{data.users.length} users</span>
			{/if}
		{/snippet}
	</PageHeader>

	<!-- Error display -->
	{#if formError}
		<div
			class="bg-destructive/10 text-destructive border-destructive/20 rounded-lg border px-4 py-3 text-sm"
		>
			{formError}
		</div>
	{/if}

	<!-- Metrics + Filters -->
	<div class="flex flex-col gap-4">
		<div class="grid gap-3 sm:grid-cols-3">
			<div class="bg-card border-muted/60 rounded-lg border p-3 text-sm shadow-sm">
				<p class="text-muted-foreground text-xs mb-2">Total users</p>
				<h3 class="text-5xl font-semibold">{totalCount}</h3>
			</div>
			<div class="bg-card border-muted/60 rounded-lg border p-3 text-sm shadow-sm">
				<p class="text-muted-foreground text-xs mb-2">Active</p>
				<h3 class="text-5xl font-semibold text-emerald-600">{activeCount}</h3>
			</div>
			<div class="bg-card border-muted/60 rounded-lg border p-3 text-sm shadow-sm">
				<p class="text-muted-foreground text-xs mb-2">Banned</p>
				<h3 class="text-destructive text-5xl font-semibold">{bannedCount}</h3>
			</div>
		</div>

		<div class="border-muted/60 bg-card flex flex-col gap-3 rounded-lg border p-3 shadow-sm">
			<div class="flex flex-row gap-3 md:flex-row md:items-center">
				<input
					class="bg-background border-input w-full rounded-md border px-3 py-2 text-sm"
					placeholder="Search name or email..."
					value={searchTerm}
					oninput={(e) => (searchTerm = (e.currentTarget as HTMLInputElement).value)}
				/>
				<div class="flex gap-2">
					<Select.Root
						type="single"
						value={statusFilter}
						onValueChange={(v: string | undefined) =>
							(statusFilter = (v as typeof statusFilter) ?? 'all')}
					>
						<Select.Trigger class="w-40 justify-between text-sm" data-size="default">
							<span data-slot="select-value">
								{statusFilter === 'all'
									? 'All status'
									: statusFilter.charAt(0).toUpperCase() + statusFilter.slice(1)}
							</span>
						</Select.Trigger>
						<Select.Content class="min-w-40">
							<Select.Item value="all">All status</Select.Item>
							<Select.Item value="active">Active</Select.Item>
							<Select.Item value="banned">Banned</Select.Item>
							<Select.Item value="pending">Pending</Select.Item>
						</Select.Content>
					</Select.Root>

					<Select.Root
						type="single"
						value={roleFilter}
						onValueChange={(v: string | undefined) =>
							(roleFilter = (v as typeof roleFilter) ?? 'all')}
					>
						<Select.Trigger class="w-40 justify-between text-sm" data-size="default">
							<span data-slot="select-value">
								{roleFilter === 'all'
									? 'All roles'
									: roleFilter.charAt(0).toUpperCase() + roleFilter.slice(1)}
							</span>
						</Select.Trigger>
						<Select.Content class="min-w-40">
							<Select.Item value="all">All roles</Select.Item>
							<Select.Item value="admin">Admin</Select.Item>
							<Select.Item value="moderator">Moderator</Select.Item>
							<Select.Item value="user">User</Select.Item>
							<Select.Item value="custom">Custom</Select.Item>
						</Select.Content>
					</Select.Root>
				</div>
			</div>
		</div>
	</div>

	<!-- User Table -->
	<UserTable
		users={filteredUsers}
		selectedUserId={data.selectedId}
		onSelect={handleSelectUser}
		{hasFilters}
	/>

	<!-- User Modal -->
	<UserModal
		open={showUserModal}
		user={selectedUser ?? data.user}
		sessions={data.sessions ?? []}
		{pendingAction}
		onClose={handleCloseModal}
		{createEnhanceHandler}
		onStatusChange={handleStatusChange}
		confirmPrompt={confirmAction}
	/>
</div>

<!-- Confirm Dialog -->
<Dialog.Root open={confirmOpen} onOpenChange={(open) => !open && handleConfirmChoice(false)}>
	<Dialog.Overlay class="fixed inset-0 z-1000" />
	<Dialog.Content class="z-1001 sm:max-w-md">
		<Dialog.Header>
			<Dialog.Title>Confirm</Dialog.Title>
			<Dialog.Description>{confirmMessage}</Dialog.Description>
		</Dialog.Header>
		<div class="flex justify-end gap-2 pt-4">
			<Button type="button" variant="outline" onclick={() => handleConfirmChoice(false)}>
				Cancel
			</Button>
			<Button type="button" variant="destructive" onclick={() => handleConfirmChoice(true)}>
				Confirm
			</Button>
		</div>
	</Dialog.Content>
</Dialog.Root>
