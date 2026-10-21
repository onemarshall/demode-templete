<script lang="ts">
	import { goto } from "$app/navigation";
	import { authClient } from "#lib/auth-client.js";
	import { logger, securityLogger } from "#lib/auth/shared/logger.js";
	import { scheduleMessageClear } from "#lib/components/forms/auth-forms.js";
	import { Button } from "#lib/components/ui/button/index.js";
	import { Input } from "#lib/components/ui/input/index.js";
	import { Label } from "#lib/components/ui/label/index.js";
	import { Loader, ArrowLeft, Mail } from "@lucide/svelte";
	import AuthFormCard from "./AuthFormCard.svelte";
	import AuthFormAlert from "./AuthFormAlert.svelte";

	type Props = {
		title?: string;
		description?: string;
		/** Where the reset email's link should land. Default: `${origin}/auth/reset-password`. */
		resetRedirectPath?: string;
		/** Where to send the user after success. Default: /auth/sign-in. */
		signInHref?: string;
		/** Delay before redirecting to sign-in. Default 3000ms. */
		successRedirectDelayMs?: number;
		successMessage?: string;
		initialEmail?: string;
	};

	let {
		title = "Forgot Password",
		description = "Enter your email address and we'll send you a link to reset your password",
		resetRedirectPath = "/auth/reset-password",
		signInHref = "/auth/sign-in",
		successRedirectDelayMs = 3000,
		successMessage = "If an account with that email exists, we've sent you a password reset link.",
		initialEmail = "",
	}: Props = $props();

	// Intentionally captured once: the email is user-editable after prefill.
	// svelte-ignore state_referenced_locally
	let email = $state(initialEmail);
	let isSubmitting = $state(false);
	let error = $state("");
	let success = $state("");

	let hasError = $derived(error.length > 0);
	let hasSuccess = $derived(success.length > 0);

	$effect(() =>
		scheduleMessageClear({
			hasError,
			hasSuccess,
			clear: () => {
				error = "";
				success = "";
			},
			delayMs: 5000,
		}),
	);

	async function handleSubmit(event: SubmitEvent) {
		event.preventDefault();
		const trimmed = email.trim();
		if (!trimmed) {
			error = "Please enter your email address";
			return;
		}

		isSubmitting = true;
		error = "";
		success = "";
		try {
			logger.info("Password reset requested for:", { email: trimmed });
			const origin =
				typeof window !== "undefined" ? window.location.origin : "";
			const { error: resetError } = await authClient.requestPasswordReset(
				{
					email: trimmed,
					redirectTo: `${origin}${resetRedirectPath}`,
				},
			);
			if (resetError) {
				throw new Error(
					resetError.message || "Failed to send reset email",
				);
			}
			success = successMessage;
			setTimeout(() => goto(signInHref), successRedirectDelayMs);
		} catch (err) {
			error =
				err instanceof Error
					? err.message
					: "Failed to send reset email. Please try again.";
			securityLogger.error("[forgot-password] submit failed", {
				error: err instanceof Error ? err.message : String(err),
			});
		} finally {
			isSubmitting = false;
		}
	}
</script>

<AuthFormCard {title} {description}>
	<AuthFormAlert variant="success" message={success} />
	<AuthFormAlert variant="error" message={error} />

	<form onsubmit={handleSubmit} class="space-y-4" novalidate>
		<div class="space-y-2">
			<Label for="forgot-email">Email Address</Label>
			<Input
				id="forgot-email"
				name="email"
				type="email"
				bind:value={email}
				placeholder="Enter your email address"
				disabled={isSubmitting}
				autocomplete="email"
				required
			/>
			<p class="text-muted-foreground text-sm">
				We'll send a password reset link to this email address.
			</p>
		</div>

		<Button
			type="submit"
			class="w-full"
			disabled={isSubmitting || !email.trim()}
		>
			{#if isSubmitting}
				<Loader class="h-4 w-4 animate-spin" />
				Sending Reset Link...
			{:else}
				<Mail class="h-4 w-4" />
				Send Reset Link
			{/if}
		</Button>
	</form>

	<div class="flex items-center justify-center">
		<Button variant="ghost">
			<a href={signInHref} class="flex items-center gap-2 text-sm">
				<ArrowLeft class="h-4 w-4" />
				Back to Sign In
			</a>
		</Button>
	</div>
</AuthFormCard>

<div class="text-muted-foreground mt-4 text-center text-xs">
	Remember your password?
	<a href={signInHref} class="hover:text-foreground underline">Sign in here</a
	>
</div>
