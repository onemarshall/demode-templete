<!-- src/lib/components/profile/security/TwoFactorManager/components/VerificationCodeForm.svelte -->
<script lang="ts">
	import * as Form from '#lib/components/ui/form/index.js';
	import { Button } from '#lib/components/ui/button/index.js';
	import { Input } from '#lib/components/ui/input/index.js';
	import { superForm } from 'sveltekit-superforms';
	import { zod4Client } from 'sveltekit-superforms/adapters';
	import { twoFactorVerificationSchema } from '#lib/components/forms/schema.js';
	import { Loader } from '@lucide/svelte';

	interface Props {
		isLoading?: boolean;
		onVerify: (code: string) => Promise<void>;
		onBack?: () => void;
		showBackButton?: boolean;
		buttonText?: string;
		description?: string;
	}

	let {
		isLoading = false,
		onVerify,
		onBack,
		showBackButton = false,
		buttonText = 'Verify & Enable',
		description = 'Enter the 6-digit code from your authenticator app'
	}: Props = $props();

	// ✅ SUPERFORMS: Verification code form
	const verificationForm = superForm(
		{ code: '' },
		{
			validators: zod4Client(twoFactorVerificationSchema),
			SPA: true,
			invalidateAll: false,
			onSubmit: async ({ formData, cancel }) => {
				cancel();
				const code = formData.get('code') as string;
				await onVerify(code);
			}
		}
	);

	const { form: verificationFormData, enhance: verificationEnhance } = verificationForm;

	// Auto-focus and format the input
	function handleInput(event: Event) {
		const target = event.target as HTMLInputElement;
		// Remove non-numeric characters
		target.value = target.value.replace(/\D/g, '');
		$verificationFormData.code = target.value;
	}

	// Auto-submit when 6 digits are entered
	$effect(() => {
		if ($verificationFormData.code.length === 6) {
			// Small delay to ensure the user sees the complete code
			setTimeout(() => {
				const form = document.querySelector('form[data-verification-form]') as HTMLFormElement;
				if (form && !isLoading) {
					form.requestSubmit();
				}
			}, 100);
		}
	});
</script>

<form use:verificationEnhance data-verification-form class="space-y-4">
	<Form.Field form={verificationForm} name="code">
		<Form.Control>
			{#snippet children({ props })}
				<Form.Label>Verification Code</Form.Label>
				<Input
					{...props}
					bind:value={$verificationFormData.code}
					oninput={handleInput}
					placeholder="000000"
					maxlength={6}
					inputmode="numeric"
					pattern="[0-9]*"
					autocomplete="one-time-code"
					class="text-center font-mono text-lg tracking-widest"
					disabled={isLoading}
				/>
			{/snippet}
		</Form.Control>
		<Form.Description>
			{description}
		</Form.Description>
		<Form.FieldErrors />
	</Form.Field>

	<div class="flex gap-2">
		{#if showBackButton && onBack}
			<Button variant="outline" onclick={onBack} disabled={isLoading}>Back1</Button>
		{/if}
		<Button
			type="submit"
			class="flex-1"
			disabled={isLoading || $verificationFormData.code.length !== 6}
		>
			{#if isLoading}
				<Loader class="h-4 w-4 animate-spin" />
				Verifying...
			{:else}
				{buttonText}
			{/if}
		</Button>
	</div>
</form>
