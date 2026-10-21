<script lang="ts">
	import { Button } from '$lib/components/ui/button/index.js';
	import * as Card from '$lib/components/ui/card/index.js';
	import * as Form from '$lib/components/ui/form';
	import { Label } from '$lib/components/ui/label/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { passwordSchema, type PasswordSchema } from '$lib/components/forms/schema';
	import { cn } from '$lib/utils.ts';
	import { superForm } from 'sveltekit-superforms';
	import { zod4Client } from 'sveltekit-superforms/adapters';
	import { PasswordInput } from '$lib/components/ui/password-input';
	import type { SuperValidated } from 'sveltekit-superforms';
	import type { HTMLAttributes } from 'svelte/elements';

	// Component props interface
	interface Props extends HTMLAttributes<HTMLDivElement> {
		data: {
			form: SuperValidated<PasswordSchema>;
		};
		class?: string;
	}

	// Get props with Svelte 5 runes
	let { data, class: className = '', ...restProps }: Props = $props();

	// Initialize superForm with proper typing (reactive to data prop)
	const form = $derived(
		superForm(data.form, {
			validators: zod4Client(passwordSchema),
			dataType: 'json'
		})
	);

	// Destructure form API reactively
	const formData = $derived(form.form);
	const errors = $derived(form.errors);
	const enhance = $derived(form.enhance);
	const submitting = $derived(form.submitting);
	const message = $derived(form.message);
</script>

{#if $message}
	<p class="rounded-md border border-green-200 bg-green-50 p-3 text-sm text-green-700">
		{$message}
	</p>
	<a href="/auth/sign-in" class="underline underline-offset-4"> Sign in </a>
{:else}
	<form method="POST" use:enhance class="flex flex-col gap-2">
		<div class="grid gap-6">
			{#if $errors?._errors}
				<p
					class="bg-destructive/15 text-destructive border-destructive/20 rounded-md border p-3 text-sm"
				>
					{$errors._errors.join(', ')}
				</p>
			{/if}

			<!-- Password Field -->
			<Form.Field {form} name="password">
				<Form.Control>
					{#snippet children({ props })}
						<div class="flex items-center justify-between">
							<Form.Label>Password</Form.Label>
						</div>
						<PasswordInput bind:value={$formData.password} {...props} />
					{/snippet}
				</Form.Control>
				<Form.FieldErrors />
			</Form.Field>

			<Form.Button disabled={$submitting} class="w-full">
				{$submitting ? 'Deleting account...' : 'Delete account'}
			</Form.Button>
		</div>
	</form>
{/if}
