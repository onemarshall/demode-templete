<!-- src/routes/auth/account-recovery/+page.svelte -->
<script lang="ts">
	import * as Card from '#lib/components/ui/card/index.js';
	import * as Form from '#lib/components/ui/form/index.js';
	import { Button } from '#lib/components/ui/button/index.js';
	import { Input } from '#lib/components/ui/input/index.js';
	import { AuthFormAlert } from '#lib/components/forms/auth/index.js';
	import { Shield, Mail, ArrowLeft, Loader2 } from '@lucide/svelte';
	import { goto } from '$app/navigation';
	import { authClient } from '#lib/auth/auth-client.js';
	import { emailSchema } from '#lib/components/forms/schema.js';
	import { createSpaForm, handleSubmitFlow, scheduleMessageClear } from '#lib/components/forms/auth-forms.js';

	// State
	let isSubmitting = $state(false);
	let successMessage = $state('');
	let errorMessage = $state('');
	let hasError = $derived(errorMessage.length > 0);
	let hasSuccess = $derived(successMessage.length > 0);

	const form = createSpaForm<{ email: string }>({
		defaults: { email: '' },
		schema: emailSchema,
		onSubmit: async (formData) => {
			await handleSubmit(formData.get('email') as string);
		}
	});

	const { form: formData, enhance: formEnhance } = form;

	async function handleSubmit(email: string) {
		if (!email?.trim()) {
			errorMessage = 'Please enter your email address';
			return;
		}

		await handleSubmitFlow({
			run: async () => {
				await authClient.requestPasswordReset({
					email: email.trim(),
					redirectTo: '/auth/reset-password'
				});
			},
			setLoading: (v: boolean) => (isSubmitting = v),
			setError: (v: string) => (errorMessage = v),
			setSuccess: (v: string) => (successMessage = v),
			successMessage:
				'If an account exists with this email, you will receive a password reset link shortly.',
			redirect: undefined
		});
	}

	// Auto-clear messages after 10 seconds
	$effect(() =>
		scheduleMessageClear({
			hasError,
			hasSuccess,
			clear: () => {
				successMessage = '';
				errorMessage = '';
			},
			delayMs: 10000
		})
	);
</script>

<div
	class="min-h-screen bg-linear-to-br from-slate-50 to-slate-100 px-4 py-12 dark:from-slate-950 dark:to-slate-900"
>
	<div class="mx-auto max-w-md">
		<!-- Header -->
		<div class="mb-8 space-y-4">
			<Button variant="ghost" size="sm" onclick={() => goto('/auth/sign-in')} class="mb-2">
				<ArrowLeft class="mr-2 h-4 w-4" />
				Back to Sign In
			</Button>
			<div class="flex items-center gap-3">
				<Shield class="h-8 w-8 text-blue-600 dark:text-blue-400" />
				<h1 class="text-3xl font-bold text-slate-900 dark:text-white">Account Recovery</h1>
			</div>
			<p class="text-slate-600 dark:text-slate-400">
				Enter your email address and we'll send you a link to reset your password.
			</p>
		</div>

		<!-- Recovery Form -->
		<Card.Root>
			<Card.Header>
				<Card.Title class="flex items-center gap-2">
					<Mail class="h-5 w-5" />
					Reset Password
				</Card.Title>
				<Card.Description>We'll send a secure link to your email address</Card.Description>
			</Card.Header>
			<Card.Content>
				<AuthFormAlert variant="success" message={successMessage} />
				<AuthFormAlert variant="error" message={errorMessage} />

				<form use:formEnhance class="space-y-4">
					<Form.Field {form} name="email">
						<Form.Control>
							{#snippet children({ props })}
								{@const { id, ...restProps } = props}
								<Form.Label for={id}>Email Address</Form.Label>
								<Input
									type="email"
									{id}
									{...restProps}
									bind:value={$formData.email}
									placeholder="you@example.com"
									disabled={isSubmitting}
									required
								/>
							{/snippet}
						</Form.Control>
						<Form.FieldErrors />
					</Form.Field>

					<Button type="submit" disabled={isSubmitting} class="w-full">
						{#if isSubmitting}
							<Loader2 class="mr-2 h-4 w-4 animate-spin" />
							Sending...
						{:else}
							Send Reset Link
						{/if}
					</Button>
				</form>
			</Card.Content>
		</Card.Root>

		<!-- Help Section -->
		<Card.Root class="mt-6">
			<Card.Header>
				<Card.Title class="text-base">Need More Help?</Card.Title>
			</Card.Header>
			<Card.Content class="space-y-3 text-sm text-slate-600 dark:text-slate-400">
				<p>
					<strong>Can't access your email?</strong><br />
					Contact support for manual account recovery assistance.
				</p>
				<p>
					<strong>Have 2FA enabled?</strong><br />
					After resetting your password, you'll need to verify with your authenticator app or backup codes.
				</p>
				<p>
					<strong>Using a social login?</strong><br />
					If you signed up with Google, GitHub, etc., sign in through that provider instead.
				</p>
			</Card.Content>
		</Card.Root>

		<!-- Security Info -->
		<div class="mt-6 rounded-lg bg-slate-100 p-4 dark:bg-slate-800">
			<h3 class="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
				<Shield class="h-4 w-4" />
				Security Notice
			</h3>
			<ul class="space-y-1 text-xs text-slate-600 dark:text-slate-400">
				<li>• Reset links expire after 1 hour</li>
				<li>• Links can only be used once</li>
				<li>• All active sessions will be signed out</li>
			</ul>
		</div>
	</div>
</div>
