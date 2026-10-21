<script lang="ts">
	import { publicEnv } from "#lib/auth/shared/env/index.js";
	import { scheduleMessageClear } from "#lib/components/forms/auth-forms.js";
	import { Button } from "#lib/components/ui/button/index.js";
	import { Input } from "#lib/components/ui/input/index.js";
	import { Label } from "#lib/components/ui/label/index.js";
	import { Loader } from "@lucide/svelte";
	import AuthFormCard from "./AuthFormCard.svelte";
	import AuthFormAlert from "./AuthFormAlert.svelte";
	import AuthFormSocialRow from "./AuthFormSocialRow.svelte";
	import AuthFormFooterLink from "./AuthFormFooterLink.svelte";
	import AuthEmailField from "./AuthEmailField.svelte";
	import AuthPasswordField from "./AuthPasswordField.svelte";
	import PasskeyButton from "./PasskeyButton.svelte";

	type Mode = "sign-in" | "sign-up";

	/**
	 * SvelteKit `form()` remote action. We accept the concrete shape from
	 * the call site (sign-in passes `login`, sign-up passes `signup`)
	 * with input + output generics that vary per page. The structural
	 * union of those two doesn't simplify cleanly under TS strict, so we
	 * type the prop loosely and the page-level `import { login }` /
	 * `import { signup }` provides the real shape.
	 */
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	type RemoteFormAction = any;

	type Props = {
		mode: Mode;
		/**
		 * SvelteKit remote `form()` action that owns server-side submission,
		 * cookie setting, and (for sign-in) the 303 redirect. Pages import
		 * either `login` or `signup` from `#lib/remote/auth.remote.js` and pass it
		 * here.
		 */
		formAction: RemoteFormAction;
		title?: string;
		description?: string;
		submitLabel?: string;
		submitLoadingLabel?: string;
		altLink?: { label: string; href: string; linkText: string };
		showPasskey?: boolean;
		showSocial?: boolean;
		showForgotPassword?: boolean;
		/** Where social/passkey buttons should land. Default: /auth/dashboard. */
		redirectTo?: string;
	};

	const SIGN_UP_SUCCESS_MESSAGE =
		"If this email can be used to create an account, you will receive a verification email shortly. Please check your inbox.";

	let {
		mode,
		formAction,
		title = mode === "sign-in" ? "Sign In" : "Create Account",
		description = mode === "sign-in"
			? "Enter your email below to sign in to your account"
			: "Enter your information below to create your account",
		redirectTo = "/auth/dashboard",
		submitLabel = mode === "sign-in" ? "Sign In" : "Create Account",
		submitLoadingLabel = mode === "sign-in"
			? "Signing in..."
			: "Creating account...",
		altLink = mode === "sign-in"
			? {
					label: "Don't have an account?",
					href: "/auth/sign-up",
					linkText: "Sign up",
				}
			: {
					label: "Already have an account?",
					href: "/auth/sign-in",
					linkText: "Sign in",
				},
		showPasskey = mode === "sign-in",
		showSocial = true,
		showForgotPassword = mode === "sign-in",
	}: Props = $props();

	let verifiedMessage = $state("");

	// ---- last sign-in method (from Better Auth lastLoginMethod plugin cookie) ----
	// The server plugin always sets `better-auth.last_used_login_method` (httpOnly: false).
	// We read it directly from document.cookie so it works even if the client plugin
	// is not loaded (PUBLIC_AUTH_LAST_LOGIN_METHOD_PLUGIN not set in env).
	let lastSignInMethod = $state<string | null>(null);

	function readLastUsedLoginMethod(): string | null {
		if (typeof document === "undefined") return null;
		// Read the cookie the server plugin sets after every sign-in.
		// The cookie is httpOnly:false so it is visible to document.cookie.
		// We do NOT call authClient.getLastUsedLoginMethod() — that method
		// makes an HTTP request to /api/auth/get-last-used-login-method which
		// is not a registered Better Auth endpoint and returns 404.
		const cookieName = "better-auth.last_used_login_method";
		const match = document.cookie
			.split(";")
			.map((c) => c.trim())
			.find((c) => c.startsWith(cookieName + "="));
		return match
			? decodeURIComponent(match.slice(cookieName.length + 1))
			: null;
	}

	$effect(() => {
		lastSignInMethod = readLastUsedLoginMethod();
	});

	const isEmailLastUsed = $derived(
		mode === "sign-in" && lastSignInMethod === "email",
	);
	const isPasskeyLastUsed = $derived(
		mode === "sign-in" && lastSignInMethod === "passkey",
	);

	// ---- result + derived state ----
	const resultError = $derived.by(() => {
		const r = formAction.result;
		if (
			r &&
			typeof r === "object" &&
			"error" in r &&
			typeof r.error === "string"
		) {
			return r.error;
		}
		return "";
	});
	const resultOk = $derived.by(() => {
		const r = formAction.result;
		return Boolean(
			r &&
				typeof r === "object" &&
				"ok" in r &&
				(r as { ok: unknown }).ok,
		);
	});
	const submittedEmail = $derived.by(() => {
		const r = formAction.result;
		if (
			r &&
			typeof r === "object" &&
			"email" in r &&
			typeof r.email === "string"
		) {
			return r.email;
		}
		return "";
	});

	const successMessage = $derived(
		mode === "sign-up" && resultOk ? SIGN_UP_SUCCESS_MESSAGE : "",
	);
	const hasError = $derived(resultError.length > 0);
	const hasSuccess = $derived(successMessage.length > 0);

	const socialEnabled = $derived(
		showSocial && Boolean(publicEnv.PUBLIC_AUTH_SOCIAL_LOGINS_ENABLED),
	);
	const passkeyEnabled = $derived(
		showPasskey && Boolean(publicEnv.PUBLIC_AUTH_PASSKEYS_PLUGIN),
	);

	// Locally-cleared copy of the error so scheduleMessageClear can hide it
	// after a few seconds even though the underlying formAction.result is
	// still populated until the next submit.
	let dismissedError = $state("");
	const displayError = $derived(
		resultError === dismissedError ? "" : resultError,
	);

	$effect(() =>
		scheduleMessageClear({
			hasError: displayError.length > 0,
			hasSuccess,
			clear: () => {
				dismissedError = resultError;
			},
			delayMs: 5000,
		}),
	);

	// Sign-in: surface the "Your email is verified" hint from the verify-email flow.
	$effect(() => {
		if (mode !== "sign-in") return;
		if (typeof window === "undefined") return;
		const params = new URLSearchParams(window.location.search);
		if (params.get("verified") === "true") {
			verifiedMessage = "Your email is verified. Please sign in.";
			const url = new URL(window.location.href);
			url.searchParams.delete("verified");
			window.history.replaceState({}, "", url.toString());
		}
	});
</script>

<AuthFormCard {title} {description}>
	{#if verifiedMessage}
		<AuthFormAlert variant="success" message={verifiedMessage} />
	{/if}

	<AuthFormAlert variant="error" message={displayError} />
	<AuthFormAlert variant="success" message={successMessage} />

	{#if passkeyEnabled}
		<PasskeyButton
			mode="signin"
			text="Sign in with Passkey"
			loadingText="Signing in..."
			deviceName="My Device"
			{redirectTo}
			disabled={formAction.pending}
			lastUsed={isPasskeyLastUsed}
		/>
		{#if socialEnabled}
			<div class="relative">
				<div class="absolute inset-0 flex items-center">
					<div class="w-full border-t"></div>
				</div>
				<div class="relative flex justify-center text-xs uppercase">
					<span class="bg-background text-muted-foreground px-2">
						{mode === "sign-in" ? "Sign in with" : "Sign up with"}
					</span>
				</div>
			</div>
		{/if}
	{/if}

	{#if socialEnabled}
		<AuthFormSocialRow
			callbackURL={redirectTo}
			disabled={formAction.pending}
			showSeparator
			separatorLabel="Or continue with"
			lastUsedProvider={lastSignInMethod}
		/>
	{/if}

	<form {...formAction} class="space-y-4">
		{#if mode === "sign-up" && formAction.fields.name}
			{@const nameField = formAction.fields.name}
			<div class="space-y-2">
				<Label for="name">Full Name</Label>
				<Input
					{...nameField.as("name" as never)}
					type="text"
					required
					autocomplete="name"
					placeholder="Enter your full name"
					disabled={formAction.pending}
				/>
				{#if nameField.issues()?.[0]}
					{@const firstNameIssue = nameField.issues()?.[0]}
					{#if firstNameIssue}
						<p class="text-destructive text-sm">
							{firstNameIssue.message}
						</p>
					{/if}
				{/if}
			</div>
		{/if}

		<AuthEmailField
			inputProps={formAction.fields.email.as("email" as never)}
			placeholder="Enter your email"
			disabled={formAction.pending}
			issues={formAction.fields.email.issues() ?? []}
		/>

		<div>
			{#if showForgotPassword}
				<div class="mb-2 flex items-center justify-between">
					<Label for="password">Password</Label>
					<a
						href="/auth/forgot-password"
						class="text-primary text-sm font-medium hover:underline"
					>
						Forgot password?
					</a>
				</div>
				<AuthPasswordField
					inputProps={formAction.fields.password.as(
						"password" as never,
					)}
					label=""
					placeholder="Enter your password"
					disabled={formAction.pending}
					issues={formAction.fields.password.issues() ?? []}
				/>
			{:else}
				<AuthPasswordField
					inputProps={formAction.fields.password.as(
						"password" as never,
					)}
					label="Password"
					placeholder="Create a password"
					disabled={formAction.pending}
					issues={formAction.fields.password.issues() ?? []}
				/>
			{/if}
		</div>

		{#if mode === "sign-up" && formAction.fields.passwordConfirm}
			{@const confirmField = formAction.fields.passwordConfirm}
			<AuthPasswordField
				inputProps={confirmField.as("passwordConfirm" as never)}
				label="Confirm Password"
				placeholder="Confirm your password"
				disabled={formAction.pending}
				issues={confirmField.issues() ?? []}
			/>
		{/if}

		<Button type="submit" class="w-full" disabled={formAction.pending}>
			{#if formAction.pending}
				<Loader class="mr-2 h-4 w-4 animate-spin" />
				{submitLoadingLabel}
			{:else}
				{submitLabel}
				{#if isEmailLastUsed}
					<span
						class="ml-2 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary"
					>
						Last used
					</span>
				{/if}
			{/if}
		</Button>
	</form>

	{#if mode === "sign-up" && resultOk && submittedEmail}
		<p class="text-muted-foreground text-center text-sm">
			If an account can be created for
			<span class="font-medium">{submittedEmail}</span>, a verification
			email will arrive shortly.
		</p>
	{/if}

	<AuthFormFooterLink
		label={altLink.label}
		href={altLink.href}
		linkText={altLink.linkText}
		class="mt-4"
	/>
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
