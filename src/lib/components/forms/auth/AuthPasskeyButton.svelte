<script lang="ts">
	import { Button } from "#lib/components/ui/button/index.js";
	import { KeyRound, Plus, Loader } from "@lucide/svelte";
	import { authClient } from "#lib/auth-client.js";
	import { goto, invalidateAll } from "$app/navigation";
	import { page } from "$app/state";
	import { dev } from "$app/env";
	import { publicEnv } from "#lib/auth/shared/env/index.js";
	import { createConsola } from "consola/browser";
	import { securityLogger } from "#lib/auth/shared/logger.js";
	import { describePasskeyError } from "./passkey-errors";

	const logger = createConsola({
		level: 3,
		formatOptions: {
			colors: true,
			date: true,
		},
	});

	// Constants
	const MAX_RETRIES = 2;
	const RETRY_DELAY = 1000;
	const DEFAULT_DEVICE_NAME = "My Device";
	const DEFAULT_REDIRECT = "/auth/dashboard";

	// Types
	interface WebAuthnCapabilities {
		supported: boolean;
		conditionalUI: boolean;
		userVerification: boolean;
	}

	interface Props {
		mode?: "signin" | "add";
		text?: string;
		loadingText?: string;
		redirectTo?: string;
		deviceName?: string;
		disabled?: boolean;
		isLoading?: boolean;
		onSuccess?: (result: unknown) => void;
		onError?: (error: Error) => void;
		/** Whether passkey was the last used sign-in method (shows a badge). */
		lastUsed?: boolean;
	}

	// Props with defaults
	let {
		mode = "signin",
		text,
		loadingText,
		redirectTo = DEFAULT_REDIRECT,
		deviceName = DEFAULT_DEVICE_NAME,
		onSuccess,
		onError,
		disabled,
		isLoading,
		lastUsed = false,
	}: Props = $props();

	const effectiveText = $derived(
		text ?? (mode === "add" ? "Add Passkey" : "Sign in with Passkey"),
	);
	const effectiveLoadingText = $derived(
		loadingText ??
			(mode === "add" ? "Adding Passkey..." : "Authenticating..."),
	);

	// State
	let isPasskeyLoading = $state(false);
	let webAuthnCapabilities = $state<WebAuthnCapabilities>({
		supported: false,
		conditionalUI: false,
		userVerification: false,
	});

	// Better Auth session handling
	const session = authClient.useSession();
	let sessionData = $derived($session?.data);
	let isPending = $derived($session?.isPending ?? false);
	let sessionError = $derived($session?.error);
	let isAuthenticated = $derived(!!sessionData?.user);
	let isEmailVerified = $derived(sessionData?.user?.emailVerified ?? false);

	// Enhanced disabled state logic (includes external disabled & loading props)
	let isDisabled = $derived(
		disabled ||
			isLoading ||
			!webAuthnCapabilities.supported ||
			isPasskeyLoading ||
			isPending ||
			(mode === "add" && (!isAuthenticated || !isEmailVerified)),
	);

	// ✅ FIXED: Proper WebAuthn support detection
	function checkWebAuthnSupported(): boolean {
		if (typeof window === "undefined") return false;

		try {
			return !!(
				window.PublicKeyCredential &&
				navigator.credentials &&
				typeof navigator.credentials.create === "function" &&
				typeof navigator.credentials.get === "function" &&
				window.isSecureContext
			);
		} catch (error) {
			return false;
		}
	}

	async function getWebAuthnCapabilities(): Promise<WebAuthnCapabilities> {
		if (!checkWebAuthnSupported()) {
			return {
				supported: false,
				conditionalUI: false,
				userVerification: false,
			};
		}

		try {
			const capabilities: WebAuthnCapabilities = {
				supported: true,
				conditionalUI: false,
				userVerification: false,
			};

			// Check for Conditional UI support
			if (window.PublicKeyCredential.isConditionalMediationAvailable) {
				capabilities.conditionalUI =
					await window.PublicKeyCredential.isConditionalMediationAvailable();
			}

			// Check for User Verification support
			if (
				window.PublicKeyCredential
					.isUserVerifyingPlatformAuthenticatorAvailable
			) {
				capabilities.userVerification =
					await window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
			}

			return capabilities;
		} catch (error) {
			return {
				supported: true,
				conditionalUI: false,
				userVerification: false,
			};
		}
	}

	function logWebAuthnSupport(capabilities: WebAuthnCapabilities): void {
		logger.info("[Passkey] WebAuthn Capabilities:", {
			...capabilities,
			userAgent: navigator?.userAgent ?? "n/a",
			isSecureContext: window?.isSecureContext ?? false,
			protocol: window?.location.protocol ?? "n/a",
		});
	}

	// Initialize WebAuthn capabilities
	$effect(() => {
		getWebAuthnCapabilities().then((capabilities) => {
			webAuthnCapabilities = capabilities;
			if (dev) {
				logWebAuthnSupport(capabilities);
			}
		});
	});

	// Rest of your functions remain the same...
	async function delay(ms: number): Promise<void> {
		return new Promise((resolve) => setTimeout(resolve, ms));
	}

	function isRetryableError(error: unknown): boolean {
		if (typeof error !== "object" || error === null) return false;

		const err = error as {
			status?: number;
			code?: string;
			name?: string;
			message?: string;
		};

		const retryableStatuses = [408, 429, 500, 502, 503, 504];
		const retryableNames = ["NetworkError", "TimeoutError", "AbortError"];
		const retryableCodes = ["ECONNABORTED", "ETIMEDOUT", "ENOTFOUND"];

		return !!(
			(err.status && retryableStatuses.includes(err.status)) ||
			(err.name && retryableNames.includes(err.name)) ||
			(err.code && retryableCodes.includes(err.code)) ||
			(err.message && err.message.includes("fetch"))
		);
	}

	function getErrorMessage(error: Error, mode: string): string {
		const errorMessages: Record<string, string> = {
			NotAllowedError: "Passkey operation was cancelled or not allowed",
			NotSupportedError: "Passkeys are not supported on this device",
			SecurityError:
				"Security error: Please ensure you are on a secure connection (HTTPS)",
			InvalidStateError:
				mode === "add"
					? "A passkey already exists for this account on this device"
					: "Invalid passkey state",
			AbortError: "Passkey operation was aborted",
			ConstraintError: "Passkey constraints not satisfied",
			DataError: "Invalid passkey data",
			UnknownError: "An unknown error occurred with the passkey",
			TimeoutError: "Passkey operation timed out",
		};

		// Better Auth reports WebAuthn failures with a machine readable code
		// (e.g. "ERROR_INVALID_RP_ID") but replaces the message with a generic
		// "Auth cancelled". Prefer the code so the real reason is shown.
		const failure = error as Error & { code?: string; status?: number };
		if (failure.code) {
			return describePasskeyError({
				code: failure.code,
				message: error.message,
				status: failure.status,
				mode: mode === "add" ? "add" : "signin",
			});
		}

		return (
			errorMessages[error.name] ||
			error.message ||
			`${mode === "add" ? "Adding passkey" : "Authentication"} failed`
		);
	}

	async function executePasskeyAction(attempt: number = 0): Promise<unknown> {
		if (dev) {
			logger.info(
				`[Passkey] Attempt ${attempt + 1}/${MAX_RETRIES + 1} - ${mode}`,
			);
		}

		try {
			logger.info("[Passkey] Calling authClient method", {
				mode,
				method: mode === "add" ? "addPasskey" : "signIn.passkey",
			});

			// Log WebAuthn API availability
			logger.info("[Passkey] WebAuthn API check", {
				hasCredentials: !!navigator.credentials,
				hasGet: typeof navigator.credentials?.get === "function",
				hasCreate: typeof navigator.credentials?.create === "function",
				isSecureContext: window.isSecureContext,
				mode,
			});

			// Create a promise that rejects after 60 seconds (WebAuthn default timeout)
			const timeoutPromise = new Promise((_, reject) =>
				setTimeout(
					() =>
						reject(
							new Error(
								"Passkey operation timed out after 60 seconds",
							),
						),
					60000,
				),
			);

			const authPromise =
				mode === "add"
					? authClient.passkey.addPasskey({ name: deviceName })
					: authClient.signIn.passkey();

			const result = await Promise.race([authPromise, timeoutPromise]);

			// Better Auth returns { data, error } even from passkey calls — surface
			// the error rather than treating any result as success.
			const wrapped = result as
				| {
						data?: unknown;
						error?: { message?: string; code?: string; status?: number };
				  }
				| undefined;
			if (wrapped?.error) {
				logger.error("[Passkey] authClient returned error", {
					mode,
					error: wrapped.error,
				});
				// Keep the machine readable code on the error: it is the only
				// signal that distinguishes a cancelled ceremony from a
				// misconfigured relying party ID.
				const failure = new Error(
					wrapped.error.message || "Passkey authentication failed",
				) as Error & { code?: string; status?: number };
				failure.code = wrapped.error.code;
				failure.status = wrapped.error.status;
				throw failure;
			}

			logger.info("[Passkey] authClient method returned", {
				mode,
				hasResult: !!result,
				resultType: typeof result,
				resultKeys:
					result && typeof result === "object"
						? Object.keys(result as Record<string, unknown>)
						: [],
			});

			if (mode === "signin") {
				await invalidateAll();
			}

			return result;
		} catch (error) {
			logger.error("[Passkey] authClient method threw error", {
				mode,
				errorName: error instanceof Error ? error.name : typeof error,
				errorMessage:
					error instanceof Error ? error.message : String(error),
				errorStack: error instanceof Error ? error.stack : undefined,
			});

			if (dev) {
				securityLogger.error(
					`[Passkey] Attempt ${attempt + 1} failed:`,
					error,
				);
			}

			if (attempt < MAX_RETRIES && isRetryableError(error)) {
				await delay(RETRY_DELAY * (attempt + 1));
				return executePasskeyAction(attempt + 1);
			}
			throw error;
		}
	}

	async function handlePasskeyAction(): Promise<void> {
		logger.info("[Passkey] Button clicked", {
			webAuthnSupported: webAuthnCapabilities.supported,
			isPasskeyLoading,
			mode,
		});

		if (!webAuthnCapabilities.supported) {
			logger.error(
				"[Passkey] WebAuthn not supported",
				webAuthnCapabilities,
			);
			return;
		}

		if (isPasskeyLoading) {
			logger.warn("[Passkey] Already loading, ignoring click");
			return;
		}

		if (mode === "add") {
			if (!isAuthenticated) {
				const error = new Error("Please sign in to add a passkey");
				logger.error("[Passkey] Not authenticated", {
					isAuthenticated,
				});
				onError?.(error);
				return;
			}

			if (!isEmailVerified) {
				const error = new Error(
					"Please verify your email before adding a passkey",
				);
				logger.error("[Passkey] Email not verified", {
					isEmailVerified,
				});
				onError?.(error);
				return;
			}
		}

		isPasskeyLoading = true;
		logger.info("[Passkey] Starting passkey action", { mode });

		try {
			const result = await executePasskeyAction();

			if (dev) {
				logger.info(`[Passkey] Successfully completed ${mode}`, {
					result,
				});
			}

			onSuccess?.(result);

			if (mode === "signin") {
				const callbackURL = page.url.searchParams.get("callbackURL");
				const redirectTarget = callbackURL || redirectTo;

				await delay(100);
				await goto(redirectTarget);
			}
		} catch (error) {
			const errorMessage = getErrorMessage(error as Error, mode);
			const enhancedError = new Error(errorMessage);

			if (dev) {
				securityLogger.error(`[Passkey] ${mode} failed:`, {
					originalError: error,
					enhancedMessage: errorMessage,
				});
			}

			onError?.(enhancedError);
		} finally {
			isPasskeyLoading = false;
		}
	}
	if (dev) {
		logger.debug(
			"PUBLIC_AUTH_PASSKEYS_PLUGIN",
			publicEnv.PUBLIC_AUTH_PASSKEYS_PLUGIN,
		);
	}
</script>

<Button
	variant="outline"
	class="mb-4 w-full"
	size="lg"
	onclick={handlePasskeyAction}
	disabled={isDisabled}
	aria-label={isPasskeyLoading ? effectiveLoadingText : effectiveText}
>
	{#if isPasskeyLoading}
		<Loader class="h-4 w-4 animate-spin" />
		{effectiveLoadingText}
	{:else if mode === "add"}
		<Plus class="h-4 w-4" aria-hidden="true" />
		{effectiveText}
	{:else}
		<KeyRound class="h-4 w-4" aria-hidden="true" />
		{effectiveText}
	{/if}
	{#if lastUsed && !isPasskeyLoading}
		<span
			class="ml-auto rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary"
		>
			Last used
		</span>
	{/if}
</Button>

<!-- Enhanced status messages -->
{#if !webAuthnCapabilities.supported}
	<p
		class="text-muted-foreground mt-2 flex w-full items-center gap-2 text-sm"
		role="alert"
	>
		<KeyRound class="h-4 w-4" aria-hidden="true" />
		Passkey authentication is not supported in this browser.
	</p>
{:else if mode === "add" && !isAuthenticated}
	<p
		class="mt-2 w-full rounded-md border border-blue-200 bg-blue-50 p-3 text-sm text-blue-700 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-200"
		role="alert"
	>
		<strong>Sign in required:</strong> You must be signed in to add a passkey.
	</p>
{:else if mode === "add" && !isEmailVerified}
	<p
		class="mt-2 w-full rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200"
		role="alert"
	>
		<strong>Email verification required:</strong> Please verify your email before
		adding a passkey.
	</p>
{:else if sessionError}
	<p
		class="mt-2 w-full rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-200"
		role="alert"
	>
		<strong>Session error:</strong>
		{sessionError.message}
	</p>
{/if}
