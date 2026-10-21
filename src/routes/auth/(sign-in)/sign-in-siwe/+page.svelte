<script lang="ts">
	import { goto, invalidateAll } from "$app/navigation";
	import { Button } from "$lib/components/ui/button";
	import { Separator } from "$lib/components/ui/separator";
	import { ArrowLeft } from "@lucide/svelte";
	import { authClient } from "$lib/auth-client";
	import { WalletConnect, SignMessage } from "$lib/components/auth/siwe";
	import { generateSIWEMessage } from "$lib/auth/modules/siwe/client";
	import { logger, securityLogger } from "$lib/auth/shared/logger";
	import { AuthFormCard, AuthFormAlert } from "$lib/components/forms/auth";

	interface EthereumProvider {
		request(args: { method: string; params?: unknown[] }): Promise<unknown>;
		isWalletConnect?: boolean;
	}

	const REDIRECT_DESTINATION = "/auth/profile";

	let currentStep = $state<"connect" | "sign" | "loading">("connect");
	let walletAddress = $state("");
	let provider = $state<EthereumProvider | null>(null);
	let siweMessage = $state("");
	let error = $state("");
	let isLoading = $state(false);

	async function handleWalletConnect(address: string, p: EthereumProvider) {
		error = "";
		isLoading = true;
		currentStep = "loading";
		provider = p;

		try {
			logger.info("Generating SIWE nonce", {
				address: `${address.substring(0, 6)}...`,
			});

			// Better Auth 1.7: the nonce endpoint no longer accepts walletAddress/chainId.
			// The address and chain are read from the signed SIWE message at verification time.
			const { data: nonceData, error: nonceError } =
				await authClient.siwe.nonce();

			if (nonceError || !nonceData) {
				error = "Failed to generate authentication nonce";
				securityLogger.error("SIWE nonce generation failed", {
					error: nonceError,
				});
				currentStep = "connect";
				return;
			}

			const message = generateSIWEMessage(
				address,
				window.location.hostname,
				nonceData.nonce,
				"Sign in with Ethereum to the app.",
				1,
			);

			walletAddress = address;
			siweMessage = message;
			currentStep = "sign";

			logger.info("SIWE message generated", {
				address: `${address.substring(0, 6)}...`,
			});
		} catch (err) {
			error =
				err instanceof Error
					? err.message
					: "Failed to generate SIWE message";
			securityLogger.error("SIWE message generation error", { error });
			currentStep = "connect";
		} finally {
			isLoading = false;
		}
	}

	async function handleMessageSign(signature: string) {
		error = "";
		isLoading = true;

		try {
			logger.info("Verifying SIWE signature", {
				address: `${walletAddress.substring(0, 6)}...`,
			});

			const { data: authData, error: authError } =
				await authClient.siwe.verify({
					message: siweMessage,
					signature,
				});

			if (authError || !authData) {
				const errorMessage = getErrorMessage(authError);
				if (isDuplicateUserError(errorMessage)) {
					await handleExistingUser();
					return;
				}
				error = "Signature verification failed. Please try again.";
				securityLogger.error("SIWE verification failed", {
					error: authError,
				});
				currentStep = "sign";
				return;
			}

			logger.info("SIWE authentication successful", {
				userId: authData.user?.id,
			});

			await invalidateAll();
			window.location.href = REDIRECT_DESTINATION;
		} catch (err) {
			error =
				err instanceof Error ? err.message : "Authentication failed";
			securityLogger.error("SIWE authentication error", { error });
			currentStep = "sign";
		} finally {
			isLoading = false;
		}
	}

	function getErrorMessage(authError: unknown): string {
		if (typeof authError === "string") return authError;
		if (authError && typeof authError === "object") {
			const obj = authError as Record<string, unknown>;
			return (obj.message as string) || (obj.error as string) || "";
		}
		return "";
	}

	function isDuplicateUserError(message: string): boolean {
		return (
			message.includes("duplicate key") ||
			message.includes("already exists") ||
			message.includes("SIWE_DUPLICATE_USER") ||
			message.includes("useremail_key")
		);
	}

	async function handleExistingUser() {
		logger.info("SIWE user already exists, attempting session recovery");
		try {
			const session = await authClient.getSession();
			if (session?.data?.user) {
				logger.info("Session recovered for existing user");
				await goto(REDIRECT_DESTINATION);
				return;
			}
		} catch {
			// Session recovery failed
		}
		error =
			"This wallet is already registered. Please try signing in again.";
		currentStep = "sign";
		isLoading = false;
	}

	function handleBack() {
		if (currentStep === "sign") {
			currentStep = "connect";
			walletAddress = "";
			siweMessage = "";
			provider = null;
			error = "";
		} else {
			goto("/auth/sign-in");
		}
	}
</script>

<AuthFormCard
	title="Sign In With Ethereum"
	description="Securely authenticate using your Ethereum wallet"
>
	<AuthFormAlert variant="error" message={error} />

	{#if currentStep === "connect"}
		<WalletConnect {isLoading} onConnect={handleWalletConnect} />
	{:else if currentStep === "sign" && provider}
		<SignMessage
			{walletAddress}
			message={siweMessage}
			{provider}
			{isLoading}
			onSign={handleMessageSign}
		/>
	{:else if currentStep === "loading"}
		<div class="flex flex-col items-center justify-center space-y-4 py-8">
			<div
				class="border-primary h-8 w-8 animate-spin rounded-full border-b-2"
			></div>
			<p class="text-muted-foreground text-sm">
				Preparing authentication...
			</p>
		</div>
	{/if}

	<Separator />

	<div class="space-y-3">
		<Button
			variant="outline"
			class="w-full"
			disabled={isLoading}
			onclick={handleBack}
		>
			<ArrowLeft class="h-4 w-4" />
			{currentStep === "sign" ? "Back to Wallet" : "Back to Sign In"}
		</Button>

		<p class="text-muted-foreground text-center text-xs">
			By signing, you agree to our Terms of Service and Privacy Policy
		</p>
	</div>
</AuthFormCard>
