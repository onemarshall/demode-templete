<script lang="ts">
	import { Button } from "$lib/components/ui/button";
	import * as Alert from "$lib/components/ui/alert";
	import { Loader, Boxes, CircleAlert } from "@lucide/svelte";
	import { logger, securityLogger } from "$lib/auth/shared/logger";
	import { publicEnv } from "$lib/auth/shared/env";
	import { onMount, onDestroy } from "svelte";

	// Types
	interface EthereumProvider {
		request(args: { method: string; params?: unknown[] }): Promise<unknown>;
		on?(event: string, listener: (...args: unknown[]) => void): void;
		removeListener?(
			event: string,
			listener: (...args: unknown[]) => void,
		): void;
		isWalletConnect?: boolean;
		connected?: boolean;
		chainId?: number;
		connect?(): Promise<void>;
	}

	interface Props {
		isLoading?: boolean;
		onConnect?: (
			address: string,
			provider: EthereumProvider,
		) => Promise<void>;
	}

	let { isLoading = false, onConnect }: Props = $props();

	let error = $state("");
	let isConnecting = $state(false);
	let walletConnectReady = $state(false);
	let walletConnectProvider = $state<EthereumProvider | null>(null);

	// Check for injected wallet (MetaMask, etc.)
	function getInjectedProvider(): EthereumProvider | null {
		if (typeof window !== "undefined" && "ethereum" in window) {
			return (window as { ethereum: EthereumProvider }).ethereum;
		}
		return null;
	}

	// Initialize WalletConnect
	async function initWalletConnect() {
		try {
			const { EthereumProvider } = await import(
				"@walletconnect/ethereum-provider"
			);

			const projectId =
				typeof publicEnv.PUBLIC_WALLETCONNECT_ID === "string"
					? publicEnv.PUBLIC_WALLETCONNECT_ID
					: "";
			if (!projectId) {
				logger.debug("WalletConnect Project ID not configured");
				walletConnectReady = false;
				return;
			}

			const provider = await EthereumProvider.init({
				projectId,
				chains: [1, 137, 42161, 8453, 10],
				showQrModal: true,
			});

			walletConnectProvider = provider;
			walletConnectReady = true;

			logger.debug("WalletConnect provider initialized");
		} catch (err) {
			logger.debug("WalletConnect not available", { error: err });
			walletConnectReady = false;
		}
	}

	onMount(() => {
		initWalletConnect();
	});

	onDestroy(() => {
		walletConnectProvider = null;
	});

	async function handleConnectMetaMask() {
		error = "";
		isConnecting = true;

		try {
			const ethereum = getInjectedProvider();
			if (!ethereum) {
				error =
					"No Ethereum wallet detected. Please install MetaMask or another Web3 wallet.";
				return;
			}

			const accounts = (await ethereum.request({
				method: "eth_requestAccounts",
			})) as string[];

			const address = accounts?.[0];
			if (!address) {
				error = "No accounts found. Please connect your wallet.";
				return;
			}

			logger.info("Wallet connected via MetaMask", {
				address: `${address.substring(0, 6)}...`,
			});

			if (onConnect) {
				await onConnect(address, ethereum);
			}
		} catch (err) {
			error =
				err instanceof Error ? err.message : "Failed to connect wallet";
			securityLogger.error("MetaMask connection failed", { error });
		} finally {
			isConnecting = false;
		}
	}

	async function handleConnectWalletConnect() {
		error = "";
		isConnecting = true;

		try {
			if (!walletConnectProvider?.connect) {
				error =
					"WalletConnect is not available. Please use MetaMask or refresh the page.";
				return;
			}

			await walletConnectProvider.connect();

			const accounts = (await walletConnectProvider.request({
				method: "eth_requestAccounts",
			})) as string[];

			const address = accounts?.[0];
			if (!address) {
				error = "No accounts found. Please connect your wallet.";
				return;
			}

			logger.info("Wallet connected via WalletConnect", {
				address: `${address.substring(0, 6)}...`,
			});

			if (onConnect) {
				await onConnect(address, walletConnectProvider);
			}
		} catch (err) {
			const message =
				err instanceof Error ? err.message : "Failed to connect";

			if (message.includes("Connection request reset")) {
				error = "Connection was interrupted. Please try again.";
			} else if (message.includes("User rejected")) {
				error = "You rejected the connection. Please try again.";
			} else if (message.includes("timeout")) {
				error = "Connection timed out. Please try again.";
			} else {
				error = message;
			}

			securityLogger.error("WalletConnect connection failed", { error });
		} finally {
			isConnecting = false;
		}
	}

	const hasInjectedWallet = $derived(
		typeof window !== "undefined" && "ethereum" in window,
	);
</script>

<div class="space-y-4">
	{#if error}
		<Alert.Root variant="destructive">
			<CircleAlert class="h-4 w-4" />
			<Alert.Description>{error}</Alert.Description>
		</Alert.Root>
	{/if}

	<div class="space-y-3">
		{#if hasInjectedWallet}
			<Button
				onclick={handleConnectMetaMask}
				disabled={isLoading || isConnecting}
				class="w-full"
				size="lg"
			>
				{#if isConnecting}
					<Loader class="h-4 w-4 animate-spin" />
					Connecting...
				{:else}
					<Boxes class="h-4 w-4" />
					Connect with MetaMask
				{/if}
			</Button>
		{/if}

		{#if walletConnectReady}
			<Button
				onclick={handleConnectWalletConnect}
				disabled={isLoading || isConnecting}
				// variant="outline"
				class="w-full"
				size="lg"
			>
				{#if isConnecting}
					<Loader class="h-4 w-4 animate-spin" />
					Connecting...
				{:else}
					<Boxes class="h-4 w-4" />
					Connect with WalletConnect
				{/if}
			</Button>
		{/if}

		{#if !hasInjectedWallet && !walletConnectReady}
			<Alert.Root>
				<CircleAlert class="h-4 w-4" />
				<Alert.Description>
					No wallet detected. Please install MetaMask or another Web3
					wallet.
				</Alert.Description>
			</Alert.Root>
		{/if}
	</div>

	<p class="text-muted-foreground text-center text-xs">
		Sign in securely with your Ethereum wallet using SIWE
	</p>
</div>
