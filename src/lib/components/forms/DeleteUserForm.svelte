<!-- lib/components/forms/DeleteUserForm.svelte -->
<script lang="ts">
	import { authClient } from '$lib/auth-client';
	import { goto } from '$app/navigation';
	import { Button } from '$lib/components/ui/button/index.js';
	import * as Alert from '$lib/components/ui/alert/index.js';
	import { PasswordInput } from '$lib/components/ui/password-input';
	import * as Dialog from '$lib/components/ui/alert-dialog/index.js';
	import { Trash2, CircleAlertIcon, CircleCheckBig } from '@lucide/svelte';

	type DeleteUserData = {
		user?: {
			id: string;
			email: string;
			isOAuthUser?: boolean;
		};
	};

	type DeleteUserFormProps = {
		data?: DeleteUserData;
		class?: string;
		onclick?: (event: MouseEvent) => void;
	};

	let {
		data,
		class: className = '',
		onclick: triggerClick,
		...buttonProps
	}: DeleteUserFormProps & Record<string, unknown> = $props();

	const isOAuthUser = $derived(data?.user?.isOAuthUser ?? false);

	let showDeleteDialog = $state(false);
	let deletePassword = $state('');
	let deleteError = $state<string | null>(null);
	let success = $state('');
	let isDeleting = $state(false);

	const requiresPassword = $derived(!isOAuthUser);
	const isDeleteDisabled = $derived(
		isDeleting || (requiresPassword && deletePassword.trim().length === 0)
	);

	function openDeleteDialog(event: MouseEvent) {
		triggerClick?.(event);
		showDeleteDialog = true;
	}

	function handleDialogOpenChange(open: boolean) {
		showDeleteDialog = open;
		if (!open) {
			deletePassword = '';
			deleteError = null;
			success = '';
		}
	}

	async function handleDeleteUser(event: SubmitEvent) {
		deleteError = null;
		success = '';
		event.preventDefault();

		if (isDeleteDisabled) {
			return;
		}

		isDeleting = true;

		try {
			const password = requiresPassword ? deletePassword.trim() : '';

			if (password) {
				await authClient.deleteUser({
					password,
					callbackURL: '/auth/goodbye'
				});
			} else {
				await authClient.deleteUser({
					callbackURL: '/auth/goodbye'
				});
			}

			success = isOAuthUser
				? 'Account deletion email sent. Check your inbox to confirm the deletion.'
				: 'Account deletion initiated. Check your email for verification.';

			deletePassword = '';

			setTimeout(() => {
				handleDialogOpenChange(false);
				goto('/');
			}, 3000);
		} catch (err) {
			deleteError = err instanceof Error ? err.message : 'Failed to delete account';
		} finally {
			isDeleting = false;
		}
	}
</script>

<!-- Trigger Button -->
<Button
	variant="destructive"
	onclick={openDeleteDialog}
	class={className}
	{...buttonProps as Record<string, unknown>}
>
	<Trash2 class="h-4 w-4" />
	Delete My Account
</Button>

<!-- Delete Account Dialog -->
<Dialog.Root open={showDeleteDialog} onOpenChange={handleDialogOpenChange}>
	<Dialog.Content class="sm:max-w-[425px]">
		<form class="space-y-6" onsubmit={handleDeleteUser}>
			<Dialog.Header>
				<Dialog.Title>Delete Account</Dialog.Title>
				<Dialog.Description>
					This will permanently delete your account and all associated data. This action cannot be
					undone.
				</Dialog.Description>
			</Dialog.Header>

			<div class="grid gap-4">
				{#if success}
					<Alert.Root variant="default">
						<CircleCheckBig class="size-4" />
						<Alert.Title>Success</Alert.Title>
						<Alert.Description>{success}</Alert.Description>
					</Alert.Root>
				{/if}

				{#if deleteError}
					<Alert.Root variant="destructive">
						<CircleAlertIcon class="size-4" />
						<Alert.Title>Error</Alert.Title>
						<Alert.Description>{deleteError}</Alert.Description>
					</Alert.Root>
				{/if}

				{#if !success}
					<div class="space-y-4">
						<div class="text-muted-foreground text-sm">
							{#if isOAuthUser}
								<p class="flex items-center gap-2">
									<span>✉️</span>
									We'll send a confirmation email to verify this deletion.
								</p>
							{:else}
								<p class="flex items-center gap-2">
									<span>⚠️</span>
									Enter your password to confirm account deletion.
								</p>
							{/if}
						</div>

						{#if requiresPassword}
							<PasswordInput
								bind:value={deletePassword}
								placeholder="Enter your password"
								required
							/>
						{/if}
					</div>
				{/if}
			</div>

			<Dialog.Footer>
				<Button
					type="button"
					variant="outline"
					onclick={() => handleDialogOpenChange(false)}
					disabled={isDeleting}
				>
					Cancel
				</Button>

				<Button type="submit" variant="destructive" disabled={isDeleteDisabled}>
					{#if isDeleting}
						<svg class="h-4 w-4 animate-spin" viewBox="0 0 24 24">
							<circle
								class="opacity-25"
								cx="12"
								cy="12"
								r="10"
								stroke="currentColor"
								stroke-width="4"
							></circle>
							<path
								class="opacity-75"
								fill="currentColor"
								d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
							></path>
						</svg>
					{/if}
					{isDeleting ? 'Deleting account...' : 'Delete account'}
				</Button>
			</Dialog.Footer>
		</form>
	</Dialog.Content>
</Dialog.Root>
