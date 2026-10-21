<!-- Profile information form for name and email -->
<script lang="ts">
	import { superForm } from 'sveltekit-superforms';
	import { zod4Client } from 'sveltekit-superforms/adapters';
	import { profileSchema } from '$lib/components/forms/schema';
	import * as Form from '$lib/components/ui/form';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { authClient } from '$lib/auth-client';
	import { invalidateAll } from '$app/navigation';
	import type { SuperValidated } from 'sveltekit-superforms';
	import type { ProfileSchema } from '$lib/components/forms/schema';

	interface Props {
		form: SuperValidated<ProfileSchema>;
		isUpdating?: boolean;
	}

	let { form: formData, isUpdating = false }: Props = $props();

	/**
	 * Superform instance for profile form handling
	 * Manages form state, validation, and submission
	 */
	const form = $derived(
		superForm(formData, {
			validators: zod4Client(profileSchema),
			SPA: true,
			onSubmit: async ({ formData, cancel }) => {
				cancel();
				isUpdating = true;
				try {
					await authClient.updateUser({
						name: formData.get('name') as string,
						image: formData.get('image') as string
					});

					// Update form store to match the new values
					$formStore.name = formData.get('name') as string;
					$formStore.image = (formData.get('image') as string) || '';
				} finally {
					isUpdating = false;
				}
			}
		})
	);

	const formStore = $derived(form.form);
	const enhance = $derived(form.enhance);
</script>

<form method="POST" use:enhance class="space-y-4">
	<Form.Field {form} name="name">
		<Form.Control>
			{#snippet children({ props })}
				<Form.Label>Full Name</Form.Label>
				<Input
					{...props}
					type="text"
					bind:value={$formStore.name}
					placeholder="Enter your full name"
					disabled={isUpdating}
				/>
			{/snippet}
		</Form.Control>
		<Form.FieldErrors />
	</Form.Field>

	<Form.Field {form} name="email">
		<Form.Control>
			{#snippet children({ props })}
				<Form.Label>Email Address</Form.Label>
				<Input
					{...props}
					type="email"
					placeholder="Enter your email"
					bind:value={$formStore.email}
					disabled={isUpdating}
				/>
			{/snippet}
		</Form.Control>
		<Form.FieldErrors />
	</Form.Field>

	<Form.Field {form} name="image">
		<Form.Control>
			{#snippet children({ props })}
				<Input {...props} type="hidden" bind:value={$formStore.image} />
			{/snippet}
		</Form.Control>
		<Form.FieldErrors />
	</Form.Field>

	<Button type="submit" disabled={isUpdating} class="w-full">
		{#if isUpdating}
			<span class="mr-2">Updating...</span>
		{:else}
			Save Changes
		{/if}
	</Button>
</form>
