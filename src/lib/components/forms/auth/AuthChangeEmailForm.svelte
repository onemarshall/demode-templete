<script lang="ts">
	import { goto } from '$app/navigation';
	import { authClient } from '$lib/auth-client';
	import { logger, securityLogger } from '$lib/auth/shared/logger';
	import { scheduleMessageClear } from '$lib/components/forms/auth-forms';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Loader, ArrowLeft } from '@lucide/svelte';
	import AuthFormCard from './AuthFormCard.svelte';
	import AuthFormAlert from './AuthFormAlert.svelte';

	type Props = {
		title?: string;
		description?: string;
		/** Where the verification email's callback should land. */
		callbackURL?: string;
		/** Where to send the user after success. Default: /auth/sign-in. */
		redirectTo?: string;
		successRedirectDelayMs?: number;
		successMessage?: string;
		/** Back-link target. Default: /auth/profile. */
		backHref?: string;
	};

	let {
		title = 'Change Email',
		description = "Update your email address. You'll need to verify the change via your current email.",
		callbackURL = '/auth/verify-email',
		redirectTo = '/auth/sign-in',
		successRedirectDelayMs = 3000,
		successMessage = 'Email change initiated! Please check your current email for a verification link to approve the change.',
		backHref = '/auth/profile',
	}: Props = $props();

	const sessionStore = authClient.useSession();
	let currentEmail = $state('');
	let newEmail = $state('');
	let password = $state('');
	let isSubmitting = $state(false);
	let error = $state('');
	let success = $state('');

	let hasError = $derived(error.length > 0);
	let hasSuccess = $derived(success.length > 0);

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
		if (!newEmail.trim()) {
			error = 'Please enter your new email address';
			return;
		}

		error = '';
		success = '';
		isSubmitting = true;
		try {
			logger.info('[change-email] submit', { newEmail });
			const { error: submitError } = await authClient.changeEmail({
				newEmail: newEmail.trim(),
				callbackURL,
			});
			if (submitError) {
				throw new Error(
					submitError.message || 'Failed to change email. Please try again.',
				);
			}
			success = successMessage;
			setTimeout(() => goto(redirectTo), successRedirectDelayMs);
		} catch (err) {
			error =
				err instanceof Error
					? err.message
					: 'Failed to change email. Please try again.';
			securityLogger.error('[change-email] failed', {
				error: err instanceof Error ? err.message : String(err),
			});
		} finally {
			isSubmitting = false;
		}
	}
</script>

<AuthFormCard {title} {description} bare>
	<div class="mb-2 flex items-center gap-2">
		<Button
			variant="ghost"
			size="sm"
			onclick={() => goto(backHref)}
			class="h-auto p-0"
		>
			<ArrowLeft class="h-4 w-4" />
		</Button>
		<span class="text-muted-foreground text-sm">Back to Profile</span>
	</div>

	{#if $sessionStore?.data?.user?.email}
		<div class="bg-muted rounded-md p-3">
			<p class="text-muted-foreground text-sm">Current email:</p>
			<p class="font-medium">{$sessionStore.data.user.email}</p>
		</div>
	{/if}

	<AuthFormAlert variant="success" message={success} />
	<AuthFormAlert variant="error" message={error} />

	<form onsubmit={handleSubmit} class="space-y-4" novalidate>
		<div class="space-y-2">
			<Label for="current-email">Current Email</Label>
			<Input
				id="current-email"
				name="currentEmail"
				type="email"
				bind:value={currentEmail}
				placeholder="Enter your current email address"
				disabled={isSubmitting}
				autocomplete="email"
			/>
		</div>

		<div class="space-y-2">
			<Label for="new-email">New Email</Label>
			<Input
				id="new-email"
				name="newEmail"
				type="email"
				bind:value={newEmail}
				placeholder="Enter your new email address"
				disabled={isSubmitting}
				autocomplete="email"
				required
			/>
		</div>

		<div class="space-y-2">
			<Label for="confirm-password">Password</Label>
			<Input
				id="confirm-password"
				name="password"
				type="password"
				bind:value={password}
				placeholder="Enter your password to confirm"
				disabled={isSubmitting}
				autocomplete="current-password"
			/>
		</div>

		<Button type="submit" class="w-full" disabled={isSubmitting}>
			{#if isSubmitting}
				<Loader class="h-4 w-4 animate-spin" />
			{/if}
			Change Email
		</Button>
	</form>

	<div class="text-muted-foreground mt-4 space-y-2 text-center text-sm">
		<p>
			A verification email will be sent to your current email address to
			approve the change.
		</p>
	</div>
</AuthFormCard>
