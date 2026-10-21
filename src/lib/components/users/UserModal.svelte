<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import { enhance } from '$app/forms';
	import {
		banUser,
		unbanUser,
		setRole,
		setUserPassword,
		revokeSession,
		revokeAllSessions,
		removeUser
	} from '#lib/remote/admin.remote.js';
	import * as Dialog from '#lib/components/ui/dialog/index.js';
	import * as Tabs from '#lib/components/ui/tabs/index.js';
	import { Button } from '#lib/components/ui/button/index.js';
	import { Input } from '#lib/components/ui/input/index.js';
	import { Label } from '#lib/components/ui/label/index.js';
	import { Switch } from '#lib/components/ui/switch/index.js';
	import type { UserDetail, SessionItem, DateLike } from './types';
	import * as Alert from '#lib/components/ui/alert/index.js';
	import type { SubmitFunction } from '$app/forms';
	import { formatDateTime, getInitials } from './utils';
	import { logger } from '#lib/auth/shared/logger.js';

	interface Props {
		open: boolean;
		user: UserDetail | null;
		sessions: SessionItem[];
		pendingAction: string | null;
		onClose: () => void;
		createEnhanceHandler: (actionName: string, confirmMessage?: string) => SubmitFunction;
		onStatusChange?: (id: string, banned: boolean) => void;
		confirmPrompt: (message: string) => Promise<boolean>;
	}

	let {
		open,
		user,
		sessions,
		pendingAction,
		onClose,
		createEnhanceHandler,
		onStatusChange,
		confirmPrompt
	}: Props = $props();

	// Local state
	let showBanForm = $state(false);
	let showPasswordForm = $state(false);
	let activeTab = $state('details');
	let banNotice = $state<{ message: string; isError: boolean } | null>(null);
	let localBanned = $state<boolean | null>(null);
	let lastUserId = $state<string | null>(null);
	let loadingTimeout: ReturnType<typeof setTimeout> | null = null;
	let banSubmitting = $state(false);
	let roleInput = $state('');

	// Derived
	const isBanned = $derived(localBanned ?? Boolean(user?.banned));
	const isImpersonating = $derived(sessions?.some((s) => s.impersonatedBy) ?? false);
	const initials = $derived(getInitials(user?.name, user?.email));
	const mfaEnabled = $derived(Boolean((user as any)?.mfaEnabled));
	const lastSessionAt = $derived<DateLike>(
		(() => {
			if (!sessions?.length) return user?.updatedAt ?? null;
			const dates = sessions
				.map((s) => s.createdAt ?? s.expiresAt ?? null)
				.filter((d): d is Exclude<DateLike, null> => Boolean(d))
				.map((d) => new Date(d).getTime())
				.filter((n) => Number.isFinite(n));
			if (!dates.length) return user?.updatedAt ?? null;
			return new Date(Math.max(...dates)).toISOString();
		})()
	);

	/** Reset all form state to defaults */
	function resetFormState() {
		showBanForm = false;
		showPasswordForm = false;
		banNotice = null;
		banSubmitting = false;
		activeTab = 'details';
	}

	// Reset forms when modal closes or user changes
	$effect(() => {
		if (!open) {
			resetFormState();
		}

		// If open without a user, immediately close to avoid stuck loading UI
		if (open && !user) {
			onClose?.();
		}

		// When user changes, reset optimistic state
		const currentId = user?.id ?? null;
		if (currentId !== lastUserId) {
			lastUserId = currentId;
			localBanned = null;
			resetFormState();
			roleInput = user?.role ?? '';

			if (loadingTimeout) {
				clearTimeout(loadingTimeout);
			}
			loadingTimeout = setTimeout(() => {
				if (open && !user) {
					onClose?.();
				}
			}, 2000);
		}

		// Cleanup timeout on unmount
		return () => {
			if (loadingTimeout) {
				clearTimeout(loadingTimeout);
				loadingTimeout = null;
			}
		};
	});

	const presetRoles = ['user', 'admin', 'moderator'] as const;
	const permissionSummaryText = $derived<string>(
		(() => {
			const role = roleInput?.trim().toLowerCase();
			if (role === 'admin') return 'Full admin privileges across users, roles, and sessions.';
			if (role === 'moderator') return 'Can manage content/users with limited admin controls.';
			if (role === 'user') return 'Standard access with no elevated permissions.';
			if (!role) return 'No role selected. Defaults may apply.';
			return `Custom role "${role}". Permissions depend on backend configuration.`;
		})()
	);

	function maskToken(token: string): string {
		if (token.length <= 12) return `${token.slice(0, 4)}•••`;
		return `${token.slice(0, 8)}•••${token.slice(-4)}`;
	}

	function isExpired(expiresAt: DateLike | undefined): boolean {
		if (!expiresAt) return false;
		try {
			return new Date(expiresAt) < new Date();
		} catch {
			return false;
		}
	}

	async function handleBanToggle(checked: boolean) {
		if (pendingAction || !user) return;

		if (checked && !isBanned) {
			showBanForm = true;
			return;
		}

		if (!checked && isBanned) {
			const ok = await confirmPrompt('Unban this user?');
			if (!ok) return;

			try {
				const formData = new FormData();
				formData.append('userId', user.id);
				return formData;
			} catch (e) {
				logger.error('Failed to unban user:', e);
			}
		}
	}
</script>

<Dialog.Root {open} onOpenChange={(value) => !value && onClose()}>
	{#if user}
		<Dialog.Content class="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
			<!-- Header -->
			<Dialog.Header>
				<div class="flex items-center gap-3">
					<div
						class="bg-primary/10 text-primary flex h-12 w-12 items-center justify-center rounded-full text-lg font-semibold"
					>
						{getInitials(user.name, user.email)}
					</div>
					<div class="min-w-0 flex-1">
						<Dialog.Title class="truncate text-lg">
							{user.name ?? user.email ?? 'User'}
						</Dialog.Title>
						<Dialog.Description class="truncate">
							{user.email ?? user.id}
						</Dialog.Description>
						<div class="text-muted-foreground mt-1 flex flex-wrap items-center gap-2 text-xs">
							<span class="bg-muted inline-flex items-center gap-1 rounded-full px-2 py-1">
								Status:
								<span class={isBanned ? 'text-destructive' : 'text-emerald-600'}>
									{isBanned ? 'Banned' : 'Active'}
								</span>
							</span>
							{#if isBanned}
								{#if user.banReason}
									<span class="bg-destructive/10 text-destructive rounded-full px-2 py-1">
										Reason: {user.banReason}
									</span>
								{/if}
								{#if user.banExpires}
									<span class="rounded-full bg-amber-500/10 px-2 py-1 text-amber-700">
										Expires: {formatDateTime(user.banExpires)}
									</span>
								{/if}
							{/if}
						</div>
					</div>
					<div class="flex items-center gap-2"></div>
				</div>
			</Dialog.Header>

			<!-- Tabs -->
			<Tabs.Root bind:value={activeTab} class="mt-4">
				<Tabs.List class="grid w-full grid-cols-3">
					<Tabs.Trigger value="details">Details</Tabs.Trigger>
					<Tabs.Trigger value="sessions">Sessions ({sessions.length})</Tabs.Trigger>
					<Tabs.Trigger value="actions">Actions</Tabs.Trigger>
				</Tabs.List>

				<!-- Details Tab -->
				<Tabs.Content value="details" class="mt-4 space-y-4">
					<div class="grid gap-4 sm:grid-cols-2">
						<div class="space-y-1">
							<p class="text-muted-foreground text-xs">User ID</p>
							<code class="bg-muted block truncate rounded px-2 py-1 font-mono text-sm">
								{user.id}
							</code>
						</div>
						<div class="space-y-1">
							<p class="text-muted-foreground text-xs">Email</p>
							<p class="truncate text-sm">{user.email ?? '—'}</p>
						</div>
						<div class="space-y-1">
							<p class="text-muted-foreground text-xs">Created</p>
							<p class="text-sm">{formatDateTime(user.createdAt ?? null)}</p>
						</div>
						<div class="space-y-1">
							<p class="text-muted-foreground text-xs">Updated</p>
							<p class="text-sm">{formatDateTime(user.updatedAt ?? null)}</p>
						</div>
						<div class="space-y-1">
							<p class="text-muted-foreground text-xs">Last active</p>
							<p class="text-sm">{formatDateTime(lastSessionAt ?? null)}</p>
						</div>
						<div class="space-y-1">
							<p class="text-muted-foreground text-xs">MFA</p>
							<p class="text-sm">
								{#if mfaEnabled}
									<span class="rounded bg-emerald-500/10 px-2 py-1 text-emerald-700">Enabled</span>
								{:else}
									<span class="bg-muted text-muted-foreground rounded px-2 py-1">Not enabled</span>
								{/if}
							</p>
						</div>
					</div>

					{#if isBanned}
						<div class="bg-destructive/5 border-destructive/20 rounded-lg border p-4">
							<p class="text-destructive mb-2 text-sm font-medium">Ban Information</p>
							<div class="grid gap-2 sm:grid-cols-2">
								<div>
									<p class="text-muted-foreground text-xs">Reason</p>
									<p class="text-sm">{user.banReason ?? '—'}</p>
								</div>
								<div>
									<p class="text-muted-foreground text-xs">Expires</p>
									<p class="text-sm">{formatDateTime(user.banExpires ?? null)}</p>
								</div>
							</div>
						</div>
					{/if}
				</Tabs.Content>

				<!-- Sessions Tab -->
				<Tabs.Content value="sessions" class="mt-4">
					{#if sessions.length === 0}
						<div class="text-muted-foreground py-8 text-center text-sm">No active sessions</div>
					{:else}
						<div class="divide-y rounded-lg border">
							{#each sessions as session (session.token)}
								<div class="flex items-center justify-between gap-4 p-3">
									<div class="min-w-0 flex-1 space-y-1">
										<div class="flex items-center gap-2">
											<code class="bg-muted rounded px-1.5 py-0.5 font-mono text-xs">
												{maskToken(session.token)}
											</code>
											{#if isExpired(session.expiresAt ?? null)}
												<span
													class="bg-destructive/10 text-destructive rounded px-1.5 py-0.5 text-xs"
												>
													Expired
												</span>
											{/if}
											{#if session.impersonatedBy}
												<span class="rounded bg-amber-500/10 px-1.5 py-0.5 text-xs text-amber-600">
													Impersonated
												</span>
											{/if}
										</div>
										<p class="text-muted-foreground text-xs">
											Created: {formatDateTime(session.createdAt ?? null)} · Expires:
											{formatDateTime(session.expiresAt ?? null)}
										</p>
									</div>
									<form {...revokeSession}>
										<input type="hidden" name="sessionToken" value={session.token} />
										<Button
											type="submit"
											variant="ghost"
											size="sm"
											class="text-destructive hover:bg-destructive/10 hover:text-destructive"
										>
											Revoke
										</Button>
									</form>
								</div>
							{/each}
						</div>

						<!-- Revoke All Sessions -->
						<form class="mt-4" {...revokeAllSessions}>
							<input type="hidden" name="userId" value={user.id} />
							<Button
								type="submit"
								variant="outline"
								class="w-full"
								disabled={pendingAction === 'revokeAll'}
							>
								{pendingAction === 'revokeAll' ? 'Revoking...' : 'Revoke All Sessions'}
							</Button>
						</form>
					{/if}
				</Tabs.Content>

				<!-- Actions Tab -->
				<Tabs.Content value="actions" class="mt-4 space-y-6">
					{#if banNotice}
						<Alert.Root variant={banNotice.isError ? 'destructive' : 'success'}>
							<Alert.Description>{banNotice.message}</Alert.Description>
						</Alert.Root>
					{/if}

					<!-- Ban/Unban Section -->
					<div class="space-y-3">
						<div class="flex items-center justify-between">
							<div>
								<p class="font-medium">Account Status</p>
								<p class="text-muted-foreground text-sm">
									{isBanned ? 'This user is currently banned' : 'This user is active'}
								</p>
								{#if isBanned}
									<div
										class="bg-destructive/5 border-destructive/20 mt-3 rounded-lg border p-3 text-sm"
									>
										<p class="text-destructive font-medium">Ban details</p>
										<div class="mt-2 grid gap-2 sm:grid-cols-2">
											<div>
												<p class="text-muted-foreground text-xs">Reason</p>
												<p>{user.banReason ?? '—'}</p>
											</div>
											<div>
												<p class="text-muted-foreground text-xs">Expires</p>
												<p>{formatDateTime(user.banExpires ?? null)}</p>
											</div>
										</div>
									</div>
								{/if}
							</div>
							<div class="flex items-center gap-2">
								<Switch
									checked={isBanned}
									disabled={pendingAction === 'ban' || pendingAction === 'unban'}
									onCheckedChange={handleBanToggle}
								/>
								<span class="text-sm">{isBanned ? 'Banned' : 'Active'}</span>
							</div>
						</div>

						{#if showBanForm && !isBanned}
							<form class="bg-muted/50 space-y-3 rounded-lg p-3" {...banUser}>
								<input type="hidden" name="userId" value={user.id} />
								<div class="space-y-2">
									<Label for="banReason">Ban reason (optional)</Label>
									<Input
										id="banReason"
										name="banReason"
										placeholder="e.g., Violated terms of service"
									/>
								</div>
								<div class="space-y-2">
									<Label for="banExpiresIn">Expires in (seconds, optional)</Label>
									<Input
										id="banExpiresIn"
										name="banExpiresIn"
										type="number"
										min="0"
										placeholder="e.g., 86400 for 24 hours"
									/>
								</div>
								<div class="flex gap-2">
									{#if banSubmitting}
										<Button type="button" variant="destructive" class="flex-1" disabled>
											Submitting...
										</Button>
									{:else}
										<Button
											type="submit"
											variant="destructive"
											disabled={pendingAction === 'ban' || banSubmitting}
											class="flex-1"
										>
											Confirm Ban
										</Button>
										<Button
											type="button"
											variant="outline"
											disabled={banSubmitting}
											onclick={() => (showBanForm = false)}
										>
											Cancel
										</Button>
									{/if}
								</div>
							</form>
						{/if}
					</div>

					<!-- Role Section -->
					<div class="border-t pt-6">
						<p class="mb-3 font-medium">Change Role</p>
						<div class="mb-3 flex flex-wrap gap-2">
							{#each presetRoles as preset}
								<Button
									type="button"
									variant={roleInput === preset ? 'secondary' : 'outline'}
									size="sm"
									onclick={() => (roleInput = preset)}
								>
									{preset}
								</Button>
							{/each}
						</div>
						<form class="flex gap-2" {...setRole}>
							<input type="hidden" name="userId" value={user.id} />
							<Input
								name="role"
								bind:value={roleInput}
								placeholder="user, admin, moderator..."
								class="flex-1"
								required
							/>
							<Button type="submit" disabled={pendingAction === 'setRole'}>
								{pendingAction === 'setRole' ? 'Saving...' : 'Update Role'}
							</Button>
						</form>
						<p class="text-muted-foreground mt-2 text-sm">{permissionSummaryText}</p>
					</div>

					<!-- Password Section -->
					<div class="border-t pt-6">
						<div class="mb-3 flex items-center justify-between">
							<p class="font-medium">Reset Password</p>
							<Button
								variant="ghost"
								size="sm"
								onclick={() => (showPasswordForm = !showPasswordForm)}
							>
								{showPasswordForm ? 'Cancel' : 'Change'}
							</Button>
						</div>
						{#if showPasswordForm}
							<form class="flex gap-2" {...setUserPassword}>
								<input type="hidden" name="userId" value={user.id} />
								<Input
									name="newPassword"
									type="password"
									placeholder="New password (min 8 characters)"
									minlength={8}
									required
									class="flex-1"
								/>
								<Button type="submit" disabled={pendingAction === 'setPassword'}>
									{pendingAction === 'setPassword' ? 'Setting...' : 'Set Password'}
								</Button>
							</form>
						{/if}
					</div>

					<!-- Danger Zone -->
					<div class="border-destructive/20 bg-destructive/5 rounded-lg border p-4">
						<p class="text-destructive mb-2 font-medium">Danger Zone</p>
						<p class="text-muted-foreground mb-3 text-sm">
							Permanently delete this user and all their data. This action cannot be undone.
						</p>
						<ul class="text-muted-foreground mb-4 list-disc space-y-1 pl-5 text-sm">
							<li>User access will be revoked immediately.</li>
							<li>All sessions and tokens will be invalidated.</li>
							<li>User data and audit history may be removed permanently.</li>
						</ul>
						<form {...removeUser}>
							<input type="hidden" name="userId" value={user.id} />
							<Button type="submit" variant="destructive" disabled={pendingAction === 'remove'}>
								{pendingAction === 'remove' ? 'Deleting...' : 'Delete User'}
							</Button>
						</form>
					</div>
				</Tabs.Content>
			</Tabs.Root>
		</Dialog.Content>
	{/if}
</Dialog.Root>
