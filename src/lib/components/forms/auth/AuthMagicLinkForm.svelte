<script lang="ts">
	import { authClient } from "$lib/auth-client";
	import { publicEnv } from "$lib/auth/shared/env";
	import { securityLogger } from "$lib/auth/shared/logger";
	import { scheduleMessageClear } from "$lib/components/forms/auth-forms";
	import { Button } from "$lib/components/ui/button";
	import { Input } from "$lib/components/ui/input";
	import { Label } from "$lib/components/ui/label";
	import { Alert, AlertDescription } from "$lib/components/ui/alert";
	import { Mail, Loader, CircleCheck } from "@lucide/svelte";
	import AuthFormCard from "./AuthFormCard.svelte";
	import AuthFormAlert from "./AuthFormAlert.svelte";
	import AuthFormSocialRow from "./AuthFormSocialRow.svelte";
	import AuthFormFooterLink from "./AuthFormFooterLink.svelte";

	type Mode = "sign-in" | "sign-up";

	type Props = {
		mode: Mode;
		title?: string;
		description?: string;
		/** URL the magic link should land on. Default: /auth/profile. */
		callbackURL?: string;
		altLink?: { label: string; href: string; linkText: string };
		showSocial?: boolean;
		/** Show the "Enter verification code" link inside the success card. Default: sign-up only. */
		showVerifyCodeLink?: boolean;
		verifyCodeHref?: string;
		/** Optional initial email value (e.g. read from a load function). */
		initialEmail?: string;
	};

	let {
		mode,
		title = mode === "sign-in" ? "Sign In" : "Create Account",
		description = mode === "sign-in"
			? "Enter your email to sign in with a magic link"
			: "Enter your information below to create your account",
		callbackURL = "/auth/profile",
		altLink = mode === "sign-in"
			? {
					label: "Don't have an account?",
					href: "/auth/sign-up",
					linkText: "Create one",
				}
			: {
					label: "Already have an account?",
					href: "/auth/sign-in",
					linkText: "Sign in",
				},
		showSocial = true,
		showVerifyCodeLink = mode === "sign-up",
		verifyCodeHref = "/auth/sign-up-magic-link/verify",
		initialEmail = "",
	}: Props = $props();

	// ================================
	// State
	// ================================
	// Intentionally captured once: the email is user-editable after prefill.
	// svelte-ignore state_referenced_locally
	let email = $state(initialEmail);
	let isSubmitting = $state(false);
	let error = $state("");
	let success = $state(false);
	let emailSent = $state("");

	let hasError = $derived(error.length > 0);
	const socialEnabled = $derived(
		showSocial && Boolean(publicEnv.PUBLIC_AUTH_SOCIAL_LOGINS_ENABLED),
	);

	$effect(() =>
		scheduleMessageClear({
			hasError,
			hasSuccess: false,
			clear: () => {
				error = "";
			},
			delayMs: 5000,
		}),
	);

	function sanitizeErrorMessage(message: string): string {
		return message === "Missing CAPTCHA response" ? "" : message;
	}

	async function handleSubmit(event: SubmitEvent) {
		event.preventDefault();
		const trimmed = email.trim();
		if (!trimmed) return;

		isSubmitting = true;
		error = "";

		try {
			const { error: linkError } = await authClient.signIn.magicLink({
				email: trimmed,
				callbackURL,
			});
			if (linkError) {
				throw new Error(
					linkError.message ||
						"Failed to send magic link. Please try again.",
				);
			}
			success = true;
			emailSent = trimmed;
			email = "";
		} catch (err) {
			const msg =
				err instanceof Error
					? err.message
					: "Failed to send magic link. Please try again.";
			error = sanitizeErrorMessage(msg);
			securityLogger.error(`[${mode}-magic-link] submit failed`, {
				error: msg,
			});
		} finally {
			isSubmitting = false;
		}
	}

	function handleSendAnother() {
		success = false;
		emailSent = "";
		email = "";
	}
</script>

<AuthFormCard {title} {description}>
	<AuthFormAlert variant="error" message={error} />

	{#if success && emailSent}
		<Alert
			variant="default"
			class="border-green-200 bg-green-50 dark:bg-green-400"
		>
			<AlertDescription class="text-green-700 dark:text-green-400">
				<div class="flex items-start gap-3">
					<CircleCheck class="mt-0.5 h-5 w-5 shrink-0" />
					<div class="flex-1">
						<p class="font-semibold">Check your email!</p>
						<p class="mt-1 text-sm">
							We've sent a magic link to <strong
								>{emailSent}</strong
							>. Click the link in the email to sign in.
						</p>
						<p class="mt-2 text-xs">
							The link will expire in 5 minutes.
						</p>
						{#if mode === "sign-up"}
							<Button
								variant="outline"
								size="sm"
								onclick={handleSendAnother}
								class="mt-3 border-green-300 text-green-700 hover:bg-green-100"
							>
								Send another link
							</Button>
						{/if}
					</div>
				</div>
			</AlertDescription>
		</Alert>

		{#if mode !== "sign-up"}
			<Button
				variant="outline"
				size="sm"
				onclick={handleSendAnother}
				class="border-green-300 text-green-700 hover:bg-green-100"
			>
				Send another link
			</Button>
		{/if}

		{#if showVerifyCodeLink}
			<div class="rounded-lg border border-blue-200 bg-blue-50 p-4">
				<p class="text-sm text-blue-900">
					Didn't receive the email?
					<a
						href={verifyCodeHref}
						class="font-semibold text-blue-600 hover:text-blue-700"
					>
						Enter verification code
					</a>
				</p>
			</div>
		{/if}
	{:else}
		{#if socialEnabled}
			<AuthFormSocialRow
				{callbackURL}
				disabled={isSubmitting}
				showSeparator
				separatorLabel="Or continue with"
			/>
		{/if}

		<form onsubmit={handleSubmit} class="space-y-4" novalidate>
			<div class="space-y-2">
				<Label for="magic-link-email">Email address</Label>
				<Input
					id="magic-link-email"
					name="email"
					type="email"
					bind:value={email}
					placeholder="you@example.com"
					disabled={isSubmitting}
					autocomplete="email"
					required
				/>
			</div>

			<Button
				type="submit"
				class="w-full"
				disabled={isSubmitting || !email.trim()}
			>
				{#if isSubmitting}
					<Loader class="h-4 w-4 animate-spin" />
					Sending magic link...
				{:else}
					<Mail class="h-4 w-4" />
					Send magic link
				{/if}
			</Button>
		</form>

		<div class="rounded-lg border border-blue-200 bg-blue-50 p-4">
			<p class="text-sm text-blue-900">
				<strong>How it works:</strong> We'll send you a link via email. Click
				it to sign in instantly—no password needed!
			</p>
		</div>

		<AuthFormFooterLink
			label={altLink.label}
			href={altLink.href}
			linkText={altLink.linkText}
			class="mt-4"
		/>
	{/if}
</AuthFormCard>

<div class="text-muted-foreground mt-4 text-center text-xs">
	By clicking continue, you agree to our
	<a href="/legal/terms" class="font-medium hover:underline"
		>Terms of Service</a
	>
	and
	<a href="/legal/privacy" class="font-medium hover:underline"
		>Privacy Policy</a
	>.
</div>
