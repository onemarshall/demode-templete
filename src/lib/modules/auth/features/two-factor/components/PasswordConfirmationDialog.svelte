<!-- src/lib/modules/auth/features/profile/components/security/TwoFactorManager/components/PasswordConfirmationDialog.svelte -->
<script lang="ts">
	import * as Dialog from '#lib/components/ui/dialog/index.js';
	import * as Form from '#lib/components/ui/form/index.js';
	import { Button } from '#lib/components/ui/button/index.js';
	import { PasswordInput } from '#lib/components/ui/password-input/index.js';
	import { superForm } from 'sveltekit-superforms';
	import { zod4Client } from 'sveltekit-superforms/adapters';
	import { passwordSchema } from '../../../components/forms/schema.js';
	import { Loader } from '@lucide/svelte';

	interface Props {
		open: boolean;
		title: string;
		description: string;
		isLoading?: boolean;
		buttonText?: string;
		buttonVariant?: 'default' | 'destructive';
		onConfirm: (password: string) => Promise<void>;
		onCancel: () => void;
	}

	let {
		open,
		title,
		description,
		isLoading = false,
		buttonText = 'Continue',
		buttonVariant = 'default',
		onConfirm,
		onCancel
	}: Props = $props();

	const passwordForm = superForm(
		{ password: '' },
		{
			validators: zod4Client(passwordSchema),
			SPA: true,
			invalidateAll: false,
			onSubmit: async ({ formData, cancel }) => {
				cancel();
				await onConfirm(formData.get('password') as string);
			}
		}
	);

	const { form: formData, enhance } = passwordForm;
</script>

<Dialog.Root {open} onOpenChange={(open) => !open && onCancel()}>
	<Dialog.Content class="sm:max-w-md">
		<Dialog.Header>
			<Dialog.Title>{title}</Dialog.Title>
			<Dialog.Description>{description}</Dialog.Description>
		</Dialog.Header>

		<form use:enhance class="space-y-4">
			<Form.Field form={passwordForm} name="password">
				<Form.Control>
					{#snippet children({ props })}
						<Form.Label>Password</Form.Label>
						<PasswordInput
							bind:value={$formData.password}
							{...props}
							placeholder="Enter your password"
						/>
					{/snippet}
				</Form.Control>
				<Form.FieldErrors />
			</Form.Field>

			<div class="flex gap-2">
				<Button variant="outline" onclick={onCancel} disabled={isLoading}>Cancel</Button>
				<Button type="submit" variant={buttonVariant} class="flex-1" disabled={isLoading}>
					{#if isLoading}
						<Loader class="h-4 w-4 animate-spin" />
						Processing...
					{:else}
						{buttonText}
					{/if}
				</Button>
			</div>
		</form>
	</Dialog.Content>
</Dialog.Root>
