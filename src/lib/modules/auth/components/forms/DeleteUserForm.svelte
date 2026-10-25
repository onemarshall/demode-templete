<script lang="ts">
	import { authClient } from '../../client/client.js';
	import { Button } from '#lib/components/ui/button/index.js';
	import * as Alert from '#lib/components/ui/alert/index.js';
	import { PasswordInput } from '#lib/components/ui/password-input/index.js';
	import { Label } from '#lib/components/ui/label/index.js';
	import { Spinner } from '#lib/components/ui/spinner/index.js';
	import * as Dialog from '#lib/components/ui/alert-dialog/index.js';
	import { Trash2, CircleAlertIcon, CircleCheckBig } from '@lucide/svelte';

	type DeleteUserData = {
		user?: { id: string; email: string };
		hasPassword: boolean;
		deletionEligibility: { allowed: boolean; reason: 'admin' | 'subscription' | 'unavailable' | null; message: string | null };
	};
	let { data, class: className = '' }: { data: DeleteUserData; class?: string } = $props();
	let showDeleteDialog = $state(false);
	let deletePassword = $state('');
	let deleteError = $state<string | null>(null);
	let success = $state('');
	let isDeleting = $state(false);
	const isDeleteDisabled = $derived(
		isDeleting || !data.deletionEligibility.allowed || (data.hasPassword && deletePassword.length === 0)
	);

	function handleDialogOpenChange(open: boolean) {
		if (isDeleting) return;
		showDeleteDialog = open;
		if (!open) {
			deletePassword = '';
			deleteError = null;
			success = '';
		}
	}

	async function handleDeleteUser(event: SubmitEvent) {
		event.preventDefault();
		if (isDeleteDisabled || success) return;
		deleteError = null;
		isDeleting = true;
		try {
			const result = await authClient.deleteUser({
				...(data.hasPassword ? { password: deletePassword } : {}),
				callbackURL: '/auth/goodbye'
			});
			if (result.error) {
				deleteError = result.error.message || 'Unable to request account deletion. Please try again.';
				return;
			}
			if (!result.data?.success) {
				deleteError = 'Unable to confirm the deletion request. Please try again.';
				return;
			}
			success = result.data.message === 'User deleted'
				? 'Your sign-in account has been deleted.'
				: 'Your deletion request was accepted. Check your inbox for a confirmation link. Your account stays active until you confirm it while signed in.';
			deletePassword = '';
		} catch (error) {
			deleteError = error instanceof Error ? error.message : 'Failed to request account deletion.';
		} finally {
			isDeleting = false;
		}
	}
</script>

<div class="flex flex-col items-start gap-3">
	{#if !data.deletionEligibility.allowed}
		<p class="text-muted-foreground text-sm">{data.deletionEligibility.message}</p>
		{#if data.deletionEligibility.reason === 'subscription'}
			<Button href="/auth/billing" variant="outline">Review subscription & billing</Button>
		{/if}
	{:else}
		<p class="text-muted-foreground text-sm">We will email you a confirmation link before deleting your account.</p>
	{/if}
	<Button variant="destructive" onclick={() => handleDialogOpenChange(true)} class={className} disabled={!data.deletionEligibility.allowed}>
		<Trash2 data-icon="inline-start" />
		Review account deletion
	</Button>
</div>

<Dialog.Root open={showDeleteDialog} onOpenChange={handleDialogOpenChange}>
	<Dialog.Content class="sm:max-w-[480px]">
		<form class="flex flex-col gap-6" onsubmit={handleDeleteUser}>
			<Dialog.Header>
				<Dialog.Title>Review account deletion</Dialog.Title>
				<Dialog.Description>
					Deleting your sign-in account cannot be undone. We will ask you to confirm using a link sent to {data.user?.email ?? 'your email address'}.
				</Dialog.Description>
			</Dialog.Header>
			<div class="flex flex-col gap-4">
				{#if success}
					<Alert.Root>
						<CircleCheckBig />
						<Alert.Title>Deletion request</Alert.Title>
						<Alert.Description>{success}</Alert.Description>
					</Alert.Root>
				{:else}
					<p class="text-muted-foreground text-sm">Your profile, sign-in methods and sessions will be removed from the authentication service. Connected service records, billing records and security logs are handled separately and may be retained. This does not erase every record held by connected services.</p>
					{#if data.hasPassword}
						<div class="flex flex-col gap-2">
							<Label for="delete-account-password">Current password</Label>
							<PasswordInput id="delete-account-password" bind:value={deletePassword} autocomplete="current-password" required disabled={isDeleting} />
						</div>
					{:else}
						<p class="text-muted-foreground text-sm">You do not need to create a password. Use the confirmation email to verify your request.</p>
					{/if}
				{/if}
				{#if deleteError}
					<Alert.Root variant="destructive">
						<CircleAlertIcon />
						<Alert.Title>Deletion could not be requested</Alert.Title>
						<Alert.Description>{deleteError}</Alert.Description>
					</Alert.Root>
				{/if}
			</div>
			<Dialog.Footer>
				<Button type="button" variant="outline" onclick={() => handleDialogOpenChange(false)} disabled={isDeleting}>{success ? 'Close' : 'Cancel'}</Button>
				{#if !success}
					<Button type="submit" variant="destructive" disabled={isDeleteDisabled}>
						{#if isDeleting}<Spinner data-icon="inline-start" />{/if}
						{isDeleting ? 'Requesting deletion…' : 'Send confirmation email'}
					</Button>
				{/if}
			</Dialog.Footer>
		</form>
	</Dialog.Content>
</Dialog.Root>
