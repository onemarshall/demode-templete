<!-- src/routes/auth/2fa-verify/+page.svelte -->
<script lang="ts">
	import { twoFactorVerificationSchema } from '#lib/components/forms/schema.js';
	import { createSpaForm, handleSubmitFlow, scheduleMessageClear } from '#lib/components/forms/auth-forms.js';
	import { authClient } from '#lib/auth/auth-client.js';
	import { goto, invalidate } from '$app/navigation';
	import * as Card from '#lib/components/ui/card/index.js';
	import * as Form from '#lib/components/ui/form/index.js';
	import { Checkbox } from '#lib/components/ui/checkbox/index.js';
	import { Label } from '#lib/components/ui/label/index.js';
	import { Button } from '#lib/components/ui/button/index.js';
	import { Alert, AlertDescription } from '#lib/components/ui/alert/index.js';
	import { Separator } from '#lib/components/ui/separator/index.js';
	import { Activity, Loader, ArrowLeft, Shield } from '@lucide/svelte';
	import { logger, securityLogger } from '#lib/auth/shared/logger.js';
	import { refreshSession } from '#lib/auth/client/helpers.js';

	// Import our new components
	import VerificationMethodSelector from '#lib/components/security/two-factor/MethodSelector.svelte';
	import CodeInput from '#lib/components/security/two-factor/CodeInput.svelte';
	import EmailCodeRequest from '#lib/components/security/two-factor/EmailCodeRequest.svelte';
	import StatusMessage from '#lib/components/security/two-factor/StatusMessage.svelte';

	let { data } = $props();
	const reason = $derived(data?.reason ?? 'pending');
	const isStale = $derived(data?.isStale ?? false);
	const redirectTo = $derived(
		typeof data?.redirectTo === 'string' ? data.redirectTo : '/auth/dashboard'
	);

	// Consolidated state management
	let verificationState = $state({
		method: 'totp' as VerificationMethod,
		isLoading: false,
		isOtpLoading: false,
		error: '',
		success: '',
		emailCodeSent: false,
		codes: {
			otp: '',
			backup: ''
		}
	});

	// Types
	type VerificationMethod = 'totp' | 'otp' | 'backup';
	type VerificationConfig = {
		method: VerificationMethod;
		code: string;
		trustDevice?: boolean;
	};

	function sanitizeRedirectTo(value: string): string {
		if (value.startsWith('/') && !value.startsWith('//') && !value.includes('://')) return value;
		return '/auth/dashboard';
	}

	const REDIRECT_DESTINATION = $derived(sanitizeRedirectTo(redirectTo));

	// Derived values
	let isAnyLoading = $derived(verificationState.isLoading || verificationState.isOtpLoading);
	let hasError = $derived(verificationState.error.length > 0);
	let hasSuccess = $derived(verificationState.success.length > 0);
	let currentCode = $derived(
		verificationState.method === 'backup'
			? verificationState.codes.backup
			: verificationState.codes.otp
	);
	let isCodeValid = $derived(
		verificationState.method === 'backup'
			? verificationState.codes.backup.length >= 8
			: verificationState.codes.otp.length === 6
	);

	const form = createSpaForm<{ trustDevice?: boolean }>({
		defaults: { trustDevice: false },
		schema: twoFactorVerificationSchema,
		onSubmit: async (formData) => {
			trustDeviceValue = Boolean(formData.get('trustDevice'));
			await handleVerification();
		}
	});

	const { form: formData, enhance } = form;
	let trustDeviceValue = $derived(Boolean($formData?.trustDevice));

	// Unified verification handler
	async function handleVerification() {
		await handleSubmitFlow({
			run: async () => {
				const config: VerificationConfig = {
					method: verificationState.method,
					code: currentCode,
					...(trustDeviceValue && verificationState.method !== 'backup'
						? { trustDevice: true }
						: {})
				};

				if (!isCodeValid) {
					throw new Error(getValidationError(verificationState.method));
				}

				if (!authClient.twoFactor) {
					throw new Error('Two-factor authentication is not enabled. Please contact support.');
				}

				logger.info('2FA verification attempt:', {
					method: config.method.toUpperCase(),
					codeLength: config.code.length,
					trustDevice: config.trustDevice
				});

				const result = await executeVerification(config);

				if (result.error) {
					securityLogger.error(`${config.method.toUpperCase()} verification failed:`, result.error);
					const message = result.error.message || getDefaultError(config.method);
					const code = (result.error as unknown as { code?: string }).code;

					const looksStale =
						typeof code === 'string'
							? code.toLowerCase().includes('two_factor') || code.toLowerCase().includes('2fa')
							: /expired|invalid|stale|two[- ]factor|2fa|withheld/i.test(message);

					if (looksStale) {
						await goto(
							`/auth/2fa?reason=stale&redirectTo=${encodeURIComponent(REDIRECT_DESTINATION)}`,
							{
								replace: true,
								refreshAll: true
							}
						);
						return;
					}

					throw new Error(message);
				}

				try {
					await refreshSession(authClient);
					await invalidate('auth:session');
				} catch (err) {
					securityLogger.error('Failed to refresh session after 2FA verification', {
						error: err instanceof Error ? err.message : String(err)
					});
					throw new Error(
						'We verified your code, but could not finalize your session. Please try again.'
					);
				}
			},
			setLoading: (v: boolean) => (verificationState.isLoading = v),
			setError: (v: string) => (verificationState.error = v),
			setSuccess: (v: string) => (verificationState.success = v),
			successMessage: 'Verification successful! Redirecting...',
			redirect: { goto, href: REDIRECT_DESTINATION, delayMs: 1000 }
		});
	}

	// Execute verification based on method
	async function executeVerification(config: VerificationConfig) {
		const verificationMethods = {
			totp: () =>
				authClient.twoFactor!.verifyTotp({
					code: config.code,
					...(config.trustDevice ? { trustDevice: true } : {})
				}),
			otp: () =>
				authClient.twoFactor!.verifyOtp({
					code: config.code,
					...(config.trustDevice ? { trustDevice: true } : {})
				}),
			backup: () =>
				authClient.twoFactor!.verifyBackupCode({
					code: config.code,
					...(config.trustDevice ? { trustDevice: true } : {})
				})
		};

		return await verificationMethods[config.method]();
	}

	// Error message helpers
	function getValidationError(method: VerificationMethod): string {
		const errors = {
			totp: 'Please enter a valid 6-digit verification code',
			otp: 'Please enter a valid 6-digit verification code',
			backup: 'Please enter a valid backup code'
		};
		return errors[method];
	}

	function getDefaultError(method: VerificationMethod): string {
		const errors = {
			totp: 'Invalid verification code. Please try again.',
			otp: 'Invalid verification code. Please try again.',
			backup: 'Invalid backup code. Please try again.'
		};
		return errors[method];
	}

	// Send OTP handler
	async function sendNewOtp() {
		verificationState.isOtpLoading = true;
		verificationState.error = '';

		try {
			logger.info('Requesting new OTP');

			if (!authClient.twoFactor) {
				throw new Error('Two-factor authentication is not enabled. Please contact support.');
			}

			const { data: resultData, error: authError } = await authClient.twoFactor.sendOtp();

			if (authError) {
				securityLogger.error('Failed to send OTP:', authError);
				verificationState.error = authError.message || 'Failed to send verification code.';
				return;
			}

			verificationState.emailCodeSent = true;
			verificationState.success = 'Verification code sent to your email. Please check your inbox.';

			setTimeout(() => {
				verificationState.success = '';
			}, 5000);
		} catch (err) {
			securityLogger.error('Failed to send OTP:', err);
			verificationState.error = 'Failed to send verification code. Please try again.';
		} finally {
			verificationState.isOtpLoading = false;
		}
	}

	// Method switching
	function switchMethod(method: VerificationMethod) {
		verificationState.method = method;
		verificationState.error = '';
		verificationState.success = '';
		verificationState.codes.otp = '';
		verificationState.codes.backup = '';

		if (method !== 'otp') {
			verificationState.emailCodeSent = false;
		}
	}

	// Auto-clear messages
	$effect(() =>
		scheduleMessageClear({
			hasError,
			hasSuccess,
			clear: () => {
				verificationState.error = '';
				if (!verificationState.success.includes('Redirecting')) {
					verificationState.success = '';
				}
			},
			delayMs: 5000
		})
	);
</script>

<div class="flex flex-1 flex-col items-center justify-center px-6 py-12">
	<!-- Header -->

	<!-- Live region for screen readers -->
	<div aria-live="polite" class="sr-only">
		{#if hasError}
			Error: {verificationState.error}
		{/if}
		{#if hasSuccess}
			Success: {verificationState.success}
		{/if}
	</div>

	<Card.Root class="mx-auto w-full max-w-md">
		<Card.Header class="flex flex-col gap-3">
			<div class="flex flex-wrap items-center justify-between gap-4">
				<div>
					<Card.Title class="flex items-center gap-2 text-lg">
						<Activity class="h-5 w-5" />
						Two-Factor Verification
					</Card.Title>
					<Card.Description>
						{#if isStale}
							Your previous 2FA attempt expired. Please sign in again to start a new verification.
						{:else if reason === 'withheld'}
							We’re holding your session until you complete 2FA. Enter a code below to continue.
						{:else}
							Complete 2FA to finish signing in.
						{/if}
					</Card.Description>
				</div>
			</div>
		</Card.Header>

		<Card.Content class="space-y-6">
			{#if isStale}
				<Alert variant="destructive">
					<AlertDescription>
						This 2FA session is no longer active. Start a fresh sign-in to continue.
					</AlertDescription>
					<Button href="/auth/sign-in" variant="secondary" class="mt-3 w-full">
						Restart sign-in
					</Button>
				</Alert>
			{:else}
				<!-- Status Messages -->
				<StatusMessage
					{hasSuccess}
					{hasError}
					success={verificationState.success}
					error={verificationState.error}
				/>

				<!-- Method Selector -->
				<VerificationMethodSelector
					bind:method={verificationState.method}
					disabled={isAnyLoading}
					{switchMethod}
				/>

				<!-- Email Code Request -->
				{#if verificationState.method === 'otp' && !verificationState.emailCodeSent}
					<EmailCodeRequest {sendNewOtp} isLoading={verificationState.isOtpLoading} />
				{/if}

				<!-- Code Input Form -->
				{#if verificationState.method !== 'otp' || verificationState.emailCodeSent}
					<form use:enhance class="space-y-6">
						<CodeInput
							method={verificationState.method}
							bind:otpValue={verificationState.codes.otp}
							bind:backupCodeValue={verificationState.codes.backup}
							disabled={isAnyLoading}
						/>

						<div class="flex items-center justify-between">
							<div class="flex items-center space-x-2">
								<Checkbox name="trustDevice" bind:checked={$formData.trustDevice} />
								<Label for="trustDevice">Trust this device for faster sign-in</Label>
							</div>

							<Button type="submit" disabled={!isCodeValid || isAnyLoading}>
								{#if isAnyLoading}
									<Loader class="mr-2 h-4 w-4 animate-spin" />
								{/if}
								Verify
							</Button>
						</div>
					</form>
				{/if}
			{/if}

			<!-- Resend Code Option -->
			{#if verificationState.method === 'otp' && verificationState.emailCodeSent}
				<div class="text-center">
					<p class="text-muted-foreground mb-2 text-sm">Didn't receive the code?</p>
					<Button
						variant="outline"
						size="sm"
						onclick={sendNewOtp}
						disabled={verificationState.isOtpLoading}
					>
						{#if verificationState.isOtpLoading}
							<Loader class="h-4 w-4 animate-spin" />
							Sending...
						{:else}
							Resend Code
						{/if}
					</Button>
				</div>
			{/if}

			<Separator />

			<!-- Navigation -->
			<div class="flex items-center justify-center">
				<Button variant="ghost">
					<a href="/auth/sign-in" class="flex items-center gap-2 text-sm">
						<ArrowLeft class="h-4 w-4" />
						Back to Sign In
					</a>
				</Button>
			</div>
		</Card.Content>
	</Card.Root>

	<div class="text-muted-foreground mt-4 text-center text-xs">
		Having trouble?{' '}
		<a href="/support" class="hover:text-foreground underline">Contact Support</a>
	</div>
</div>
