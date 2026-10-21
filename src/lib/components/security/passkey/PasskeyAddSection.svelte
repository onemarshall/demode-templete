<!-- src/lib/components/profile/security/PasskeyManager/components/PasskeyAddSection.svelte -->
<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import * as Form from '$lib/components/ui/form';
	import { Plus, KeyRound, Loader } from '@lucide/svelte';
	import { authClient } from '$lib/auth-client';
	import { superForm } from 'sveltekit-superforms';
	import { zod4Client } from 'sveltekit-superforms/adapters';
	import { toast } from 'svelte-sonner';
	import { logger, securityLogger } from '$lib/auth/shared/logger';
	import { passkeySchema } from '$lib/components/forms/schema';
	import { PasskeyWebAuthnCheck } from './index';
	import type { User } from 'better-auth';
	import { createWebAuthnStore } from '$lib/auth/client/stores/webauthn.svelte.ts';

	interface Props {
		user: User;
		disabled?: boolean;
		onSuccess?: (result: unknown) => void;
		onError?: (error: Error) => void;
		onPasskeyAdded: () => Promise<void>;
		messages: { error: string | null; success: string | null };
	}

	let {
		user,
		disabled = false,
		onSuccess,
		onError,
		onPasskeyAdded,
		messages = $bindable()
	}: Props = $props();

	const webAuthnStore = createWebAuthnStore();
	let isWebAuthnSupported = $derived(webAuthnStore.isSupported);

	let isPasskeyLoading = $state(false);
	let showAddForm = $state(false);
	let isAnyLoading = $derived(isPasskeyLoading || disabled);

	const passkeyForm = superForm(
		{ name: '' },
		{
			validators: zod4Client(passkeySchema),
			SPA: true,
			invalidateAll: false,
			onSubmit: async ({ formData, cancel }) => {
				cancel();
				const name = formData.get('name') as string;
				await handleAddPasskey(name);
			}
		}
	);

	const { form: passkeyFormData, enhance } = passkeyForm;

	async function handleAddPasskey(name: string): Promise<void> {
		// Clear previous messages
		messages.error = null;
		messages.success = null;

		if (!isWebAuthnSupported) {
			const errorMsg = 'WebAuthn is not supported in this browser.';
			messages.error = errorMsg;
			toast.error(errorMsg);
			return;
		}

		if (!user?.id) {
			const errorMsg = 'User not authenticated.';
			messages.error = errorMsg;
			toast.error(errorMsg);
			return;
		}

		isPasskeyLoading = true;

		try {
			const passkeyName = name.trim() || `Passkey ${Date.now()}`;
			logger.info('Starting passkey creation with name:', passkeyName);

			// Add WebAuthn API debugging
			logger.info('[Passkey] WebAuthn API check', {
				hasCredentials: !!navigator.credentials,
				hasCreate: typeof navigator.credentials?.create === 'function',
				isSecureContext: window.isSecureContext
			});

			// Use Better Auth's built-in passkey.addPasskey() method
			logger.info('[Passkey] Calling authClient.passkey.addPasskey()...');
			const result = await authClient.passkey.addPasskey({ name: passkeyName });

			logger.info('[Passkey] Better Auth response:', result);

			// Handle Better Auth response structure
			if (result?.error) {
				// Explicit error from Better Auth
				throw new Error(result.error.message || 'Failed to create passkey');
			}

			// Reload passkeys to ensure UI is in sync
			try {
				await onPasskeyAdded();
				logger.info('Successfully reloaded passkeys after creation');
			} catch (reloadError) {
				logger.warn('Failed to reload passkeys, but passkey might have been created:', reloadError);
			}

			// Show success message
			const successMsg = `Passkey "${passkeyName}" created successfully!`;
			messages.success = successMsg;
			toast.success(successMsg);

			// Reset form and hide it
			$passkeyFormData.name = '';
			showAddForm = false;

			// Call success callback if provided
			if (onSuccess) {
				onSuccess(result?.data || result);
			}
		} catch (error) {
			securityLogger.error('Error adding passkey:', error);

			let errorMessage = 'An unexpected error occurred while creating the passkey.';

			if (error instanceof Error) {
				const errorMsg = error.message.toLowerCase();

				// Handle WebAuthn specific errors
				if (errorMsg.includes('invalidstateerror') || errorMsg.includes('invalid state')) {
					errorMessage =
						'A passkey for this device already exists. Try using a different device or browser.';
				} else if (errorMsg.includes('notsupportederror') || errorMsg.includes('not supported')) {
					errorMessage = 'Your device does not support passkey creation.';
				} else if (errorMsg.includes('notallowederror') || errorMsg.includes('not allowed')) {
					errorMessage = 'Passkey creation was cancelled or not allowed.';
				} else if (errorMsg.includes('aborterror') || errorMsg.includes('abort')) {
					errorMessage = 'Passkey creation was interrupted. Please try again.';
				} else if (errorMsg.includes('user cancel')) {
					errorMessage = 'Passkey creation was cancelled by user.';
				} else {
					errorMessage = error.message;
				}
			}

			// Always try to reload passkeys in case the creation actually succeeded
			// but we got a misleading error
			try {
				logger.info('Attempting to reload passkeys despite error to check if creation succeeded');
				await onPasskeyAdded();

				// If reload succeeds, check if we have more passkeys than before
				// This is a fallback to handle cases where creation succeeds but we get confusing errors
				logger.info('Passkey reload successful - creation might have succeeded despite error');
			} catch (reloadError) {
				logger.error('Failed to reload passkeys after error:', reloadError);
			}

			messages.error = errorMessage;
			toast.error(errorMessage);

			if (onError && error instanceof Error) {
				onError(error);
			}
		} finally {
			isPasskeyLoading = false;
		}
	}

	function toggleAddForm(): void {
		showAddForm = !showAddForm;
		messages.error = null;
		messages.success = null;
		if (!showAddForm) {
			$passkeyFormData.name = '';
		}
	}
</script>

<PasskeyWebAuthnCheck />

<div class="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-950">
	<div class="mb-3 flex items-center justify-between">
		<h3 class="text-sm font-medium text-gray-700 dark:text-gray-300">Passkey Management</h3>
	</div>

	{#if !showAddForm}
		<Button
			variant="outline"
			size="lg"
			onclick={toggleAddForm}
			disabled={!isWebAuthnSupported || isAnyLoading}
			aria-label="Add New Passkey"
		>
			<Plus class="h-4 w-4" />
			Add New Passkey
		</Button>
	{:else}
		<form use:enhance class="space-y-4">
			<Form.Field form={passkeyForm} name="name">
				<Form.Control>
					{#snippet children({ props })}
						<Form.Label>Passkey Name</Form.Label>
						<Input
							{...props}
							bind:value={$passkeyFormData.name}
							placeholder="e.g., Work Laptop, iPhone, Personal Key..."
							disabled={isAnyLoading}
						/>
					{/snippet}
				</Form.Control>
				<Form.Description>Choose a memorable name to identify this passkey later</Form.Description>
				<Form.FieldErrors />
			</Form.Field>

			<div class="flex gap-2">
				<Button
					type="submit"
					variant="default"
					disabled={isAnyLoading || !isWebAuthnSupported}
					aria-label="Create Passkey"
				>
					{#if isPasskeyLoading}
						<Loader class="h-4 w-4 animate-spin" />
						Creating...
					{:else}
						<KeyRound class="h-4 w-4" />
						Create Passkey
					{/if}
				</Button>

				<Button
					type="button"
					variant="ghost"
					onclick={toggleAddForm}
					disabled={isPasskeyLoading}
					aria-label="Cancel"
				>
					Cancel
				</Button>
			</div>
		</form>
	{/if}
</div>
