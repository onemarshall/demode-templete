<script lang="ts">
	import { goto } from '$app/navigation';
	import { authClient } from '$lib/auth-client';
	import { logger, securityLogger } from '$lib/auth/shared/logger';
	import { scheduleMessageClear } from '$lib/components/forms/auth-forms';
	import { Button } from '$lib/components/ui/button';
	import { Label } from '$lib/components/ui/label';
	import { PasswordInput } from '$lib/components/ui/password-input';
	import { Loader, ArrowLeft, Lock } from '@lucide/svelte';
	import AuthFormCard from './AuthFormCard.svelte';
	import AuthFormAlert from './AuthFormAlert.svelte';

	type Mode = 'reset' | 'change' | 'set';

	type Props = {
		mode: Mode;
		title?: string;
		description?: string;
		/** Required when mode === 'reset'. Read from URL by the page and passed in. */
		token?: string | null;
		/** Where to redirect after success. Defaults: reset -> sign-in, change/set -> profile. */
		redirectTo?: string;
		successRedirectDelayMs?: number;
		successMessage?: string;
		/** Back-link href + label. Defaults match the mode. */
		backHref?: string;
		backLabel?: string;
		submitLabel?: string;
		submitLoadingLabel?: string;
	};

	let {
		mode,
		title,
		description,
		token,
		redirectTo,
		successRedirectDelayMs = 2000,
		successMessage,
		backHref,
		backLabel,
		submitLabel,
		submitLoadingLabel,
	}: Props = $props();

	const defaults = {
		reset: {
			title: 'Reset Password',
			description: 'Enter your new password below to complete the reset process',
			invalidTokenDescription: 'This password reset link is invalid or has expired',
			redirectTo: '/auth/sign-in',
			successMessage: 'Password reset successful! Redirecting to sign-in...',
			backHref: '/auth/sign-in',
			backLabel: 'Back to Sign In',
			submitLabel: 'Reset Password',
			submitLoadingLabel: 'Resetting Password...',
		},
		change: {
			title: 'Change Password',
			description: 'Enter your current password and choose a new secure password',
			invalidTokenDescription: '',
			redirectTo: '/auth/profile',
			successMessage: 'Password changed successfully! Redirecting to profile...',
			backHref: '/auth/profile',
			backLabel: 'Back to Profile',
			submitLabel: 'Change Password',
			submitLoadingLabel: 'Changing Password...',
		},
		set: {
			title: 'Set Password',
			description: 'Create a password to enable email + password sign-in',
			invalidTokenDescription: '',
			redirectTo: '/auth/profile',
			successMessage: 'Password set successfully! Redirecting to profile...',
			backHref: '/auth/profile',
			backLabel: 'Back to Profile',
			submitLabel: 'Set Password',
			submitLoadingLabel: 'Setting Password...',
		},
	} as const;

	const cfg = $derived(defaults[mode]);
	const effectiveTitle = $derived(title ?? cfg.title);
	const effectiveDescription = $derived(
		mode === 'reset' && !token
			? cfg.invalidTokenDescription
			: (description ?? cfg.description),
	);
	const effectiveRedirectTo = $derived(redirectTo ?? cfg.redirectTo);
	const effectiveSuccessMessage = $derived(successMessage ?? cfg.successMessage);
	const effectiveBackHref = $derived(backHref ?? cfg.backHref);
	const effectiveBackLabel = $derived(backLabel ?? cfg.backLabel);
	const effectiveSubmitLabel = $derived(submitLabel ?? cfg.submitLabel);
	const effectiveSubmitLoadingLabel = $derived(submitLoadingLabel ?? cfg.submitLoadingLabel);

	let currentPassword = $state('');
	let newPassword = $state('');
	let confirmPassword = $state('');
	let isSubmitting = $state(false);
	let error = $state('');
	let success = $state('');

	let hasError = $derived(error.length > 0);
	let hasSuccess = $derived(success.length > 0);
	const requiresCurrentPassword = $derived(mode === 'change');

	$effect(() =>
		scheduleMessageClear({
			hasError,
			hasSuccess,
			clear: () => {
				error = '';
				success = '';
			},
			delayMs: 5000,
		}),
	);

	async function handleSubmit(event: SubmitEvent) {
		event.preventDefault();
		error = '';
		success = '';

		if (mode === 'reset' && !token) {
			error =
				'Invalid or missing reset token. Please request a new password reset link.';
			return;
		}
		if (requiresCurrentPassword && !currentPassword) {
			error = 'Please enter your current password.';
			return;
		}
		if (!newPassword || !confirmPassword) {
			error = 'Please enter and confirm your new password';
			return;
		}
		if (newPassword !== confirmPassword) {
			error = "Passwords don't match";
			return;
		}

		isSubmitting = true;
		try {
			if (mode === 'reset') {
				logger.info('[reset-password] submit', { tokenPresent: !!token });
				const { error: resetError } = await authClient.resetPassword({
					newPassword,
					token: token as string,
				});
				if (resetError) {
					securityLogger.error('[reset-password] failed', resetError);
					if (resetError.message?.includes('token')) {
						throw new Error(
							'Reset token has expired or is invalid. Please request a new password reset link.',
						);
					}
					if (resetError.message?.includes('user')) {
						throw new Error('User account not found. Please contact support.');
					}
					throw new Error(
						resetError.message ||
							'Failed to reset password. Please try again.',
					);
				}
			} else {
				// change + set both go through changePassword; set uses empty currentPassword
				logger.info(`[${mode}-password] submit`);
				const { error: changeError } = await authClient.changePassword({
					newPassword,
					currentPassword: requiresCurrentPassword ? currentPassword : '',
					revokeOtherSessions: true,
				});
				if (changeError) {
					securityLogger.error(`[${mode}-password] failed`, changeError);
					if (changeError.message?.includes('current password')) {
						throw new Error('Current password is incorrect. Please try again.');
					}
					if (changeError.message?.includes('same')) {
						throw new Error(
							'New password must be different from current password.',
						);
					}
					throw new Error(
						changeError.message ||
							`Failed to ${mode} password. Please try again.`,
					);
				}
			}

			success = effectiveSuccessMessage;
			setTimeout(() => goto(effectiveRedirectTo), successRedirectDelayMs);
		} catch (err) {
			error =
				err instanceof Error
					? err.message
					: 'An unexpected error occurred. Please try again.';
		} finally {
			isSubmitting = false;
		}
	}
</script>

<AuthFormCard title={effectiveTitle} description={effectiveDescription}>
	<AuthFormAlert variant="success" message={success} />
	<AuthFormAlert variant="error" message={error} />

	{#if mode === 'reset' && !token}
		<div class="space-y-4 text-center">
			<div class="rounded-lg bg-yellow-50 p-4 dark:bg-yellow-950">
				<div class="text-sm text-yellow-800 dark:text-yellow-200">
					Please request a new password reset link to continue.
				</div>
			</div>
			<Button variant="default" class="w-full">
				<a href="/auth/forgot-password">Request New Reset Link</a>
			</Button>
		</div>
	{:else}
		<form onsubmit={handleSubmit} class="space-y-4" novalidate>
			{#if requiresCurrentPassword}
				<div class="space-y-2">
					<Label for="current-password">Current Password</Label>
					<PasswordInput
						id="current-password"
						name="currentPassword"
						bind:value={currentPassword}
						disabled={isSubmitting}
						placeholder="Enter your current password"
						autocomplete="current-password"
					/>
				</div>
			{/if}

			<div class="space-y-2">
				<Label for="new-password">New Password</Label>
				<PasswordInput
					id="new-password"
					name="newPassword"
					bind:value={newPassword}
					disabled={isSubmitting}
					placeholder="Enter your new password"
					autocomplete="new-password"
				/>
				<p class="text-muted-foreground text-sm">
					Must be at least 12 characters with uppercase, lowercase, and number.
				</p>
			</div>

			<div class="space-y-2">
				<Label for="confirm-password">Confirm New Password</Label>
				<PasswordInput
					id="confirm-password"
					name="confirmPassword"
					bind:value={confirmPassword}
					disabled={isSubmitting}
					placeholder="Confirm your new password"
					autocomplete="new-password"
				/>
			</div>

			<Button type="submit" class="w-full" disabled={isSubmitting}>
				{#if isSubmitting}
					<Loader class="h-4 w-4 animate-spin" />
					{effectiveSubmitLoadingLabel}
				{:else}
					<Lock class="h-4 w-4" />
					{effectiveSubmitLabel}
				{/if}
			</Button>
		</form>
	{/if}

	<div class="flex items-center justify-center">
		<Button variant="ghost">
			<a href={effectiveBackHref} class="flex items-center gap-2 text-sm">
				<ArrowLeft class="h-4 w-4" />
				{effectiveBackLabel}
			</a>
		</Button>
	</div>
</AuthFormCard>

{#if mode === 'reset'}
	<div class="text-muted-foreground mt-4 text-center text-xs">
		Need help?
		<a href="/support" class="hover:text-foreground underline">Contact Support</a>
	</div>
{:else if mode === 'change'}
	<div class="text-muted-foreground mt-4 text-center text-xs">
		<a href="/auth/forgot-password" class="hover:text-foreground underline">
			Forgot your current password?
		</a>
	</div>
{/if}
