<script lang="ts">
	import { signInSchema } from '#lib/components/forms/schema.js';
	import { authClient } from '#lib/auth-client.js';
	import { goto } from '$app/navigation';
	import { createSpaForm, handleSubmitFlow, scheduleMessageClear } from '#lib/components/forms/auth-forms.js';
	import * as Card from '#lib/components/ui/card/index.js';
	import * as Form from '#lib/components/ui/form/index.js';
	import { Button } from '#lib/components/ui/button/index.js';
	import { Input } from '#lib/components/ui/input/index.js';
	import { PasswordInput } from '#lib/components/ui/password-input/index.js';
	import { Alert, AlertDescription } from '#lib/components/ui/alert/index.js';
	import { Loader, ArrowLeft, Mail } from '@lucide/svelte';
	import { logger, securityLogger } from '#lib/auth/shared/logger.js';

	let { data } = $props();
	let isLoading = $state(false);
	let error = $state('');
	let success = $state('');

	let hasError = $derived(error.length > 0);
	let hasSuccess = $derived(success.length > 0);

	// Form Setup using helper
	const form = createSpaForm<{ email: string }>({
		defaults: { email: '' },
		schema: signInSchema,
		onSubmit: async (formData) => {
			await handleSubmit(formData.get('email') as string);
		}
	});

	const { form: formData, enhance: formEnhance } = form;

	// Form function
	async function handleSubmit(email: string) {
		if (!email) {
			error = 'Please enter your email address';
			return;
		}
		await handleSubmitFlow({
			run: async () => {
				logger.info('Request started', { email });
				const { error: submitError } = await authClient.requestPasswordReset({
					email,
					redirectTo: `${window.location.origin}/auth/reset-password`
				});
				if (submitError) {
					throw new Error(submitError.message || 'Failed to send reset email');
				}
			},
			setLoading: (v: boolean) => (isLoading = v),
			setError: (v: string) => (error = v),
			setSuccess: (v: string) => (success = v),
			successMessage: "If an account with that email exists, we've sent you a password reset link.",
			redirect: { goto, href: '/auth/sign-in', delayMs: 3000 }
		});
	}

	// Auto-clear messages
	$effect(() =>
		scheduleMessageClear({
			hasError,
			hasSuccess,
			clear: () => {
				error = '';
				success = '';
			},
			delayMs: 5000
		})
	);
</script>

<div class="flex flex-1 flex-col items-center justify-center px-6 py-12">
	<Card.Root class="w/full mx-auto max-w-md">
		<Card.Header class="text-center">
			<Card.Title class="text-2xl">Forgot Password</Card.Title>
			<Card.Description>
				Enter your email address and we'll send you a link to reset your password
			</Card.Description>
		</Card.Header>
		<Card.Content class="space-y-4">
			{#if hasSuccess}
				<Alert variant="success">
					<Mail class="h-4 w-4" />
					<AlertDescription>{success}</AlertDescription>
				</Alert>
			{/if}

			{#if hasError}
				<Alert variant="destructive">
					<AlertDescription>{error}</AlertDescription>
				</Alert>
			{/if}

			<form use:formEnhance class="space-y-4">
				<Form.Field {form} name="email">
					<Form.Control>
						{#snippet children({ props })}
							<Form.Label>Email Address</Form.Label>
							<Input
								{...props}
								type="email"
								bind:value={$formData.email}
								placeholder="Enter your email address"
								disabled={isLoading}
							/>
						{/snippet}
					</Form.Control>
					<Form.Description>
						We'll send a password reset link to this email address.
					</Form.Description>
					<Form.FieldErrors />
				</Form.Field>

				<Button type="submit" class="w-full" disabled={isLoading}>
					{#if isLoading}
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
					<a href="/auth/sign-in" class="flex items-center gap-2 text-sm">
						<ArrowLeft class="h-4 w-4" />
						Back to Sign In
					</a>
				</Button>
			</div>
		</Card.Content>
	</Card.Root>

	<div class="text-muted-foreground mt-4 text-center text-xs">
		Remember your password?{' '}
		<a href="/auth/sign-in" class="hover:text-foreground underline">Sign in here</a>
	</div>
</div>
