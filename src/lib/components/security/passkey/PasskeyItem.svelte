<!-- src/lib/components/profile/security/PasskeyManager/components/PasskeyItem.svelte -->
<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { KeyRound, Trash2, Loader } from '@lucide/svelte';
	import { authClient } from '$lib/auth-client';
	import { toast } from 'svelte-sonner';
	import { logger, securityLogger } from '$lib/auth/shared/logger';
	import type { Passkey } from '@better-auth/passkey';

	interface Props {
		passkey: Passkey;
		index: number;
		disabled?: boolean;
		onRemove?: (passkeyId: string) => Promise<void>;
		onPasskeyDeleted: () => Promise<void>;
		deletingPasskeyId: string | null;
		messages: { error: string | null; success: string | null };
	}

	let {
		passkey,
		index,
		disabled = false,
		onRemove,
		onPasskeyDeleted,
		deletingPasskeyId = $bindable(),
		messages = $bindable()
	}: Props = $props();

	let isDeleting = $derived(deletingPasskeyId === passkey.id);
	let isAnyLoading = $derived(!!deletingPasskeyId || disabled);

	async function handleDeletePasskey(): Promise<void> {
		deletingPasskeyId = passkey.id;
		messages.error = null;
		messages.success = null;

		try {
			logger.info('Deleting passkey:', passkey.id);

			if (onRemove) {
				await onRemove(passkey.id);
			} else {
				const response = await authClient.passkey.deletePasskey({
					id: passkey.id
				});

				if (response.error) {
					throw new Error(response.error.message || 'Failed to delete passkey');
				}
			}

			await onPasskeyDeleted();
			const message = 'Passkey deleted successfully!';
			messages.success = message;
			toast.success(message);

			setTimeout(() => {
				messages.success = null;
			}, 3000);
		} catch (error) {
			securityLogger.error('Error deleting passkey:', error);
			const message =
				error instanceof Error ? error.message : 'Failed to delete passkey. Please try again.';
			messages.error = message;
			toast.error(message);
		} finally {
			deletingPasskeyId = null;
		}
	}
</script>

<div
	class="flex items-center justify-between rounded-md bg-gray-50 p-3 transition-colors hover:bg-gray-100 dark:bg-gray-900 dark:hover:bg-gray-800"
>
	<div class="flex items-center gap-3">
		<div class="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900">
			<KeyRound class="h-4 w-4 text-blue-600 dark:text-blue-400" />
		</div>
		<div class="flex flex-col">
			<span class="text-sm font-medium text-gray-900 dark:text-gray-100">
				{passkey.name ?? `Passkey ${index + 1}`}
			</span>
			<span class="text-xs text-gray-500 dark:text-gray-400">
				Created: {new Date(passkey.createdAt).toLocaleDateString()}
			</span>
		</div>
	</div>
	<Button
		variant="ghost"
		size="sm"
		class="text-red-600 hover:bg-red-50 hover:text-red-800 dark:text-red-400 dark:hover:bg-red-950 dark:hover:text-red-200"
		onclick={handleDeletePasskey}
		disabled={isAnyLoading}
		aria-label="Delete passkey"
	>
		{#if isDeleting}
			<Loader class="h-4 w-4 animate-spin" />
		{:else}
			<Trash2 class="h-4 w-4" />
		{/if}
	</Button>
</div>
