<script lang="ts">
	import { goto } from "$app/navigation";
	import { authClient } from "#lib/auth/auth-client.js";
	import { publicEnv } from "#lib/auth/shared/env/index.js";
	import { logger, securityLogger } from "#lib/auth/shared/logger.js";
	import { scheduleMessageClear } from "#lib/components/forms/auth-forms.js";
	import { Button } from "#lib/components/ui/button/index.js";
	import { Input } from "#lib/components/ui/input/index.js";
	import { Label } from "#lib/components/ui/label/index.js";
	import { Alert, AlertDescription } from "#lib/components/ui/alert/index.js";
	import * as InputOTP from "#lib/components/ui/input-otp/index.js";
	import { PinInput } from "bits-ui";
	import { Mail, Loader, CircleCheck, RefreshCw } from "@lucide/svelte";
	import AuthFormCard from "./AuthFormCard.svelte";
	import AuthFormAlert from "./AuthFormAlert.svelte";
	import AuthFormSocialRow from "./AuthFormSocialRow.svelte";
	import AuthFormFooterLink from "./AuthFormFooterLink.svelte";

	type Props = {
		title?: string;
		description?: string;
		/** Where to redirect after a successful code verification. Default: /auth/dashboard. */
		redirectTo?: string;
		/** Footer link below the card body. */
		altLink?: { label: string; href: string; linkText: string };
		showSocial?: boolean;
		/** Resend cooldown in seconds. Default: 30. */
		resendCooldownSeconds?: number;
		/** Optional initial email value. */
		initialEmail?: string;
	};

	let {
		title = "Sign in with email code",
		description = "We'll email you a 6-digit code to verify and sign you in.",
		redirectTo = "/auth/dashboard",
		altLink = {
			label: "Don't have an account?",
			href: "/auth/sign-up",
			linkText: "Create one",
		},
		showSocial = true,
		resendCooldownSeconds = 30,
		initialEmail = "",
	}: Props = $props();

	// ================================
	// State
	// ================================
	// Intentionally captured once: the email is a prefill the user can edit.
	// svelte-ignore state_referenced_locally
	let email = $state(initialEmail);
	let otp = $state("");
	let otpSent = $state(false);
	let emailSent = $state("");
	let success = $state(false);
	let isSubmitting = $state(false);
	let error = $state("");
	let resendCooldown = $state(0);
	let resendTimer: ReturnType<typeof setInterval> | null = null;

	let hasError = $derived(error.length > 0);
	let canResend = $derived(resendCooldown === 0 && !isSubmitting);
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

	function startCooldown(seconds = resendCooldownSeconds) {
		resendCooldown = seconds;
		if (resendTimer) clearInterval(resendTimer);
		resendTimer = setInterval(() => {
			resendCooldown = Math.max(0, resendCooldown - 1);
			if (resendCooldown === 0 && resendTimer) {
				clearInterval(resendTimer);
				resendTimer = null;
			}
		}, 1000);
	}

	async function sendOtp(target: string) {
		error = "";
		success = false;
		isSubmitting = true;
		try {
			const { error: otpError } =
				await authClient.emailOtp.sendVerificationOtp({
					email: target,
					type: "sign-in",
				});
			if (otpError) {
				error =
					otpError.message ||
					"Failed to send verification code. Please try again.";
				return;
			}
			otpSent = true;
			emailSent = target;
			otp = "";
			startCooldown();
		} catch (err) {
			error =
				err instanceof Error
					? err.message
					: "An unexpected error occurred";
			logger.error("[otp] send error", err);
		} finally {
			isSubmitting = false;
		}
	}

	async function handleEmailSubmit(event: SubmitEvent) {
		event.preventDefault();
		const trimmed = email.trim();
		if (!trimmed) return;
		await sendOtp(trimmed);
	}

	async function handleVerifyOtp() {
		error = "";
		if (!otp || otp.length < 6) {
			error = "Please enter the 6-digit code";
			return;
		}
		isSubmitting = true;
		try {
			const { error: verifyError } = await authClient.signIn.emailOtp({
				email: emailSent,
				otp,
			});
			if (verifyError) {
				error =
					verifyError.message ||
					"Invalid or expired code. Please try again.";
				return;
			}
			success = true;
			setTimeout(() => goto(redirectTo), 500);
		} catch (err) {
			error =
				err instanceof Error
					? err.message
					: "An unexpected error occurred";
			securityLogger.error("[otp] verify error", err);
		} finally {
			isSubmitting = false;
		}
	}

	function handleOtpSubmit(event: SubmitEvent) {
		event.preventDefault();
		handleVerifyOtp();
	}

	function handleResend() {
		if (canResend) sendOtp(emailSent);
	}

	function handleUseDifferentEmail() {
		if (resendTimer) {
			clearInterval(resendTimer);
			resendTimer = null;
		}
		otpSent = false;
		emailSent = "";
		otp = "";
		error = "";
		resendCooldown = 0;
	}
</script>

<AuthFormCard {title} {description}>
	<AuthFormAlert variant="error" message={error} />

	{#if success}
		<Alert
			variant="default"
			class="border-green-200 bg-green-50 dark:bg-green-400"
		>
			<AlertDescription class="text-green-700 dark:text-green-400">
				<div class="flex items-start gap-3">
					<CircleCheck class="mt-0.5 h-5 w-5 shrink-0" />
					<div class="flex-1">
						<p class="font-semibold">Signed in!</p>
						<p class="mt-1 text-sm">
							Redirecting you to your profile…
						</p>
					</div>
				</div>
			</AlertDescription>
		</Alert>
	{:else}
		{#if socialEnabled}
			<AuthFormSocialRow
				callbackURL={redirectTo}
				disabled={isSubmitting}
				showSeparator
				separatorLabel="Or continue with"
			/>
		{/if}

		{#if !otpSent}
			<form onsubmit={handleEmailSubmit} class="space-y-4" novalidate>
				<div class="space-y-2">
					<Label for="otp-email">Email address</Label>
					<Input
						id="otp-email"
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
						Sending code...
					{:else}
						<Mail class="h-4 w-4" />
						Send code
					{/if}
				</Button>
			</form>

			<div class="rounded-lg border border-blue-200 bg-blue-50 p-4">
				<p class="text-sm text-blue-900">
					<strong>How it works:</strong> We'll email you a 6-digit code.
					Enter it here to sign in—no password needed.
				</p>
			</div>
		{:else}
			<div class="rounded-lg border border-green-200 bg-green-50 p-4">
				<p class="text-sm text-green-900">
					Code sent to <strong>{emailSent}</strong>. Check your inbox
					or spam folder.
				</p>
				<div class="mt-3 flex items-center gap-2">
					<Button
						variant="outline"
						size="sm"
						onclick={handleResend}
						disabled={!canResend}
						class="gap-2"
					>
						{#if isSubmitting}
							<Loader class="h-4 w-4 animate-spin" />
							Sending...
						{:else}
							<RefreshCw class="h-4 w-4" />
							{#if resendCooldown > 0}
								Resend in {resendCooldown}s
							{:else}
								Resend code
							{/if}
						{/if}
					</Button>
					<Button
						variant="ghost"
						size="sm"
						onclick={handleUseDifferentEmail}
					>
						Use a different email
					</Button>
				</div>
			</div>

			<form onsubmit={handleOtpSubmit} class="space-y-4" novalidate>
				<div class="space-y-2">
					<Label for="otp-code">Enter the 6-digit code</Label>
					<InputOTP.Root bind:value={otp} maxlength={6}>
						{#snippet children({
							cells,
						}: {
							cells: PinInput.CellProps["cell"][];
						})}
							<InputOTP.Group>
								{#each cells.slice(0, 3) as cell}
									<InputOTP.Slot {cell} />
								{/each}
							</InputOTP.Group>
							<InputOTP.Separator />
							<InputOTP.Group>
								{#each cells.slice(3, 6) as cell}
									<InputOTP.Slot {cell} />
								{/each}
							</InputOTP.Group>
						{/snippet}
					</InputOTP.Root>
				</div>

				<Button
					type="submit"
					class="w-full"
					disabled={isSubmitting || otp.length < 6}
				>
					{#if isSubmitting}
						<Loader class="h-4 w-4 animate-spin" />
						Verifying...
					{:else}
						<CircleCheck class="h-4 w-4" />
						Verify code
					{/if}
				</Button>
			</form>
		{/if}

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
