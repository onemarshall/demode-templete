<!-- src/lib/components/profile/tabs/SiweTab.svelte -->
<script lang="ts">
	import * as Card from '#lib/components/ui/card/index.js';
	import { Button } from '#lib/components/ui/button/index.js';
	import { Badge } from '#lib/components/ui/badge/index.js';
	import { Separator } from '#lib/components/ui/separator/index.js';
	import * as Alert from '#lib/components/ui/alert/index.js';
	import { Copy, Check, Boxes, ExternalLink } from '@lucide/svelte';
	import { authClient } from '#lib/auth/auth-client.js';
	import { logger, securityLogger } from '#lib/auth/shared/logger.js';
	import type { User } from 'better-auth';

	interface Props {
		user: User;
	}

	let { user }: Props = $props();

	let isCopied = $state(false);
	let error = $state('');
	let success = $state('');

	// Extract wallet address from user data
	const walletAddress = $derived(
		(user as any)?.walletAddresses?.[0]?.address || (user as any)?.primaryWallet?.address || null
	);

	const chainId = $derived(
		(user as any)?.walletAddresses?.[0]?.chainId || (user as any)?.primaryWallet?.chainId || 1
	);

	const chainName = $derived(getChainName(chainId));
	const explorerUrl = $derived(getExplorerUrl(walletAddress, chainId));

	function getChainName(id: number): string {
		const chains: Record<number, string> = {
			1: 'Ethereum Mainnet',
			137: 'Polygon',
			42161: 'Arbitrum',
			8453: 'Base',
			10: 'Optimism',
			11155111: 'Ethereum Sepolia',
			80002: 'Polygon Amoy',
			421614: 'Arbitrum Sepolia'
		};
		return chains[id] || `Chain ${id}`;
	}

	function getExplorerUrl(address: string | null, chainId: number): string {
		if (!address) return '';

		const explorers: Record<number, string> = {
			1: 'https://etherscan.io',
			137: 'https://polygonscan.com',
			42161: 'https://arbiscan.io',
			8453: 'https://basescan.org',
			10: 'https://optimistic.etherscan.io',
			11155111: 'https://sepolia.etherscan.io',
			80002: 'https://amoy.polygonscan.com',
			421614: 'https://sepolia-explorer.arbitrum.io'
		};

		const baseUrl = explorers[chainId] || explorers[1];
		return `${baseUrl}/address/${address}`;
	}

	function formatAddress(address: string | null): string {
		if (!address) return '';
		return `${address.slice(0, 6)}...${address.slice(-4)}`;
	}

	async function copyAddress() {
		if (!walletAddress) return;

		try {
			await navigator.clipboard.writeText(walletAddress);
			isCopied = true;
			setTimeout(() => {
				isCopied = false;
			}, 2000);
		} catch (err) {
			securityLogger.error('Failed to copy address:', err);
			error = 'Failed to copy address';
		}
	}
</script>

<div class="space-y-6">
	<!-- Wallet Connection Status -->
	<Card.Root>
		<Card.Header>
			<div class="flex items-center gap-2">
				<Boxes class="h-5 w-5" />
				<Card.Title>Wallet Connection</Card.Title>
			</div>
			<Card.Description>Manage your Ethereum wallet connection</Card.Description>
		</Card.Header>
		<Card.Content class="space-y-4">
			{#if walletAddress}
				<!-- Connected Wallet Info -->
				<div class="space-y-4">
					<div class="bg-muted/50 rounded-lg border p-4">
						<div class="space-y-2">
							<div class="flex items-center justify-between">
								<span class="text-muted-foreground text-sm font-medium">Wallet Address</span>
								<Badge variant="success" class="gap-1">
									<Boxes class="h-3 w-3" />
									Connected
								</Badge>
							</div>
							<div class="flex items-center gap-2">
								<code class="bg-background flex-1 rounded px-3 py-2 font-mono text-sm">
									{formatAddress(walletAddress)}
								</code>
								<Button variant="ghost" size="sm" onclick={copyAddress} class="gap-2">
									{#if isCopied}
										<Check class="h-4 w-4" />
										Copied
									{:else}
										<Copy class="h-4 w-4" />
										Copy
									{/if}
								</Button>
								<a href={explorerUrl} target="_blank" rel="noopener noreferrer">
									<Button variant="ghost" size="sm" class="gap-2">
										<ExternalLink class="h-4 w-4" />
									</Button>
								</a>
							</div>
						</div>
					</div>

					<!-- Chain Information -->
					<div class="bg-muted/50 rounded-lg border p-4">
						<div class="space-y-2">
							<span class="text-muted-foreground text-sm font-medium">Network</span>
							<div class="flex items-center gap-2">
								<Badge variant="secondary">{chainName}</Badge>
								<span class="text-muted-foreground text-xs">Chain ID: {chainId}</span>
							</div>
						</div>
					</div>
				</div>
			{:else}
				<!-- No Wallet Connected -->
				<Alert.Root>
					<Boxes class="h-4 w-4" />
					<Alert.Title>No Wallet Connected</Alert.Title>
					<Alert.Description>
						Connect an Ethereum wallet to secure your account with Web3 authentication.
					</Alert.Description>
				</Alert.Root>
			{/if}

			{#if error}
				<Alert.Root variant="destructive">
					<Alert.Title>Error</Alert.Title>
					<Alert.Description>{error}</Alert.Description>
				</Alert.Root>
			{/if}

			{#if success}
				<Alert.Root>
					<Check class="h-4 w-4" />
					<Alert.Title>Success</Alert.Title>
					<Alert.Description>{success}</Alert.Description>
				</Alert.Root>
			{/if}
		</Card.Content>
	</Card.Root>

	<!-- Security Information -->
	<Card.Root>
		<Card.Header>
			<Card.Title>Security Information</Card.Title>
			<Card.Description>Understand your wallet-based security</Card.Description>
		</Card.Header>
		<Card.Content class="space-y-4">
			<div class="space-y-3 text-sm">
				<div class="flex gap-3">
					<div class="mt-1 h-2 w-2 shrink-0 rounded-full bg-green-500"></div>
					<div>
						<p class="font-medium">Cryptographic Verification</p>
						<p class="text-muted-foreground">
							Your wallet signs messages to prove ownership without exposing your private key.
						</p>
					</div>
				</div>
				<div class="flex gap-3">
					<div class="mt-1 h-2 w-2 shrink-0 rounded-full bg-green-500"></div>
					<div>
						<p class="font-medium">No Password Required</p>
						<p class="text-muted-foreground">
							Your Ethereum wallet is your authentication method. No password to remember or reset.
						</p>
					</div>
				</div>
				<div class="flex gap-3">
					<div class="mt-1 h-2 w-2 shrink-0 rounded-full bg-green-500"></div>
					<div>
						<p class="font-medium">Multi-Chain Support</p>
						<p class="text-muted-foreground">
							Connect wallets from different Ethereum-compatible networks.
						</p>
					</div>
				</div>
				<div class="flex gap-3">
					<div class="mt-1 h-2 w-2 shrink-0 rounded-full bg-green-500"></div>
					<div>
						<p class="font-medium">ENS Integration</p>
						<p class="text-muted-foreground">
							Your ENS name and avatar are automatically synced to your profile.
						</p>
					</div>
				</div>
			</div>
		</Card.Content>
	</Card.Root>

	<!-- Recovery Information -->
	<Card.Root>
		<Card.Header>
			<Card.Title>Account Recovery</Card.Title>
			<Card.Description>How to recover your account if needed</Card.Description>
		</Card.Header>
		<Card.Content class="space-y-4">
			<div class="space-y-3 text-sm">
				<p class="text-muted-foreground">
					If you lose access to your wallet, you can recover your account by:
				</p>
				<ol class="text-muted-foreground list-inside list-decimal space-y-2">
					<li>Using a different wallet address you've linked to this account</li>
					<li>Contacting support with proof of wallet ownership</li>
					<li>Using email verification if you've linked an email address</li>
				</ol>
			</div>
		</Card.Content>
	</Card.Root>
</div>
