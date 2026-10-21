<!-- src/lib/components/profile/security/PasskeyManager/PasskeyManager.svelte -->
<script lang="ts">
	import * as Card from '#lib/components/ui/card/index.js';
	import { KeyRound } from '@lucide/svelte';
	import { authClient } from '#lib/auth-client.js';
	import { logger } from '#lib/auth/shared/logger.js';
	import {
		PasskeyWebAuthnCheck,
		PasskeyItem,
		PasskeyList,
		PasskeyMessages,
		PasskeyAddSection
	} from './index';

	import type { User } from 'better-auth';
	import type { Passkey } from '@better-auth/passkey';

	interface Props {
		user: User;
		onSuccess?: (result: unknown) => void;
		onError?: (error: Error) => void;
		onRemove?: (passkeyId: string) => Promise<void>;
		disabled?: boolean;
	}

	let { user, onSuccess, onError, onRemove, disabled = false }: Props = $props();

	let passkeys = $state<Passkey[]>([]);
	let isLoading = $state(false);
	let messages = $state<{ error: string | null; success: string | null }>({
		error: null,
		success: null
	});

	async function loadPasskeys(): Promise<void> {
		if (!user?.id) return;

		isLoading = true;
		try {
			const response = await authClient.passkey.listUserPasskeys();
			if (response.error) {
				throw new Error(response.error.message || 'Failed to load passkeys');
			}
			passkeys = Array.isArray(response.data) ? response.data : [];
			messages.error = null;
		} catch (error) {
			messages.error = 'Failed to load existing passkeys. Please refresh the page.';
			logger.error('Error loading passkeys:', error);
		} finally {
			isLoading = false;
		}
	}

	$effect(() => {
		if (user?.id) {
			loadPasskeys();
		}
	});
</script>

<Card.Root>
	<Card.Header>
		<Card.Title class="flex items-center gap-2">
			<KeyRound class="h-5 w-5" />
			Passkeys
		</Card.Title>
		<Card.Description>Use passkeys for secure, passwordless authentication.</Card.Description>
	</Card.Header>
	<Card.Content class="space-y-4">
		<PasskeyMessages bind:messages />
		<PasskeyWebAuthnCheck />
		<PasskeyAddSection
			{user}
			{disabled}
			{onSuccess}
			{onError}
			onPasskeyAdded={loadPasskeys}
			bind:messages
		/>
		<PasskeyList {passkeys} {disabled} {onRemove} onPasskeyDeleted={loadPasskeys} bind:messages />
	</Card.Content>
</Card.Root>
