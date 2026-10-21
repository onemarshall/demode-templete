<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import * as Alert from '$lib/components/ui/alert';
	import { Loader, CircleCheck, CircleAlert } from '@lucide/svelte';
	import { logger, securityLogger } from '$lib/auth/shared/logger';

	// Types
	interface EthereumProvider {
		request(args: { method: string; params?: unknown[] }): Promise<unknown>;
		isWalletConnect?: boolean;
	}

	interface Props {
		walletAddress: string;
		message: string;
		provider: EthereumProvider;
		isLoading?: boolean;
		onSign?: (signature: string) => Promise<void>;
	}

	let { walletAddress, message, provider, isLoading = false, onSign }: Props = $props();

	let error = $state('');
	let isSigning = $state(false);
	let isSuccess = $state(false);

	async function handleSign() {
		error = '';
		isSigning = true;
		isSuccess = false;

		try {
			if (!provider) {
				error = 'Wallet not connected';
				return;
			}

			logger.debug('Signing message', {
				provider: provider.isWalletConnect ? 'WalletConnect' : 'Injected',
				address: `${walletAddress.substring(0, 6)}...`
			});

			const signature = (await provider.request({
				method: 'personal_sign',
				params: [message, walletAddress]
			})) as string;

			if (!signature) {
				error = 'Failed to sign message';
				return;
			}

			logger.info('Message signed successfully', {
				address: `${walletAddress.substring(0, 6)}...`
			});

			isSuccess = true;

			if (onSign) {
				await onSign(signature);
			}
		} catch (err) {
			const errorMessage = err instanceof Error ? err.message : 'Failed to sign message';

			// User-friendly error messages
			if (errorMessage.includes('rejected') || errorMessage.includes('User rejected')) {
				error = 'You rejected the signature request. Please try again.';
			} else if (errorMessage.includes('not authorized') || errorMessage.includes('unauthorized')) {
				error = 'Wallet not authorized. Please disconnect and reconnect your wallet.';
			} else if (errorMessage.includes('Chain')) {
				error = 'Wrong network. Please switch to Ethereum Mainnet.';
			} else if (errorMessage.includes('Connection')) {
				error = 'Connection lost. Please reconnect your wallet.';
			} else {
				error = errorMessage;
			}

			securityLogger.error('Message signing failed', { error: errorMessage });
		} finally {
			isSigning = false;
		}
	}
</script>

<div class="space-y-4">
	{#if error}
		<Alert.Root variant="destructive">
			<CircleAlert class="h-4 w-4" />
			<Alert.Description>{error}</Alert.Description>
		</Alert.Root>
	{/if}

	{#if isSuccess}
		<Alert.Root>
			<CircleCheck class="h-4 w-4" />
			<Alert.Description
				>Message signed successfully! Completing authentication...</Alert.Description
			>
		</Alert.Root>
	{/if}

	<div class="bg-muted space-y-3 rounded-lg p-4">
		<p class="text-sm font-medium">Message to Sign:</p>
		<div class="text-muted-foreground space-y-1 text-xs leading-relaxed">
			{#each message.split('\n') as line}
				{#if line.trim()}
					<div class="break-all">
						{#if line.includes(':')}
							<span class="text-foreground font-medium">{line.split(':')[0]}:</span>
							<span>{line.split(':').slice(1).join(':').trim()}</span>
						{:else}
							<span>{line}</span>
						{/if}
					</div>
				{:else}
					<div class="h-1"></div>
				{/if}
			{/each}
		</div>
	</div>

	<Button
		onclick={handleSign}
		disabled={isLoading || isSigning || isSuccess}
		class="w-full"
		size="lg"
	>
		{#if isSigning || isLoading}
			<Loader class="h-4 w-4 animate-spin" />
			Signing Message...
		{:else if isSuccess}
			<CircleCheck class="h-4 w-4" />
			Message Signed
		{:else}
			Sign Message
		{/if}
	</Button>

	<p class="text-muted-foreground text-center text-xs">
		Sign this message to verify ownership of your wallet
	</p>
</div>
