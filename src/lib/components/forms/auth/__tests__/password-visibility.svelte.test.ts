import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { page } from 'vitest/browser';
import AuthPasswordField from '../AuthPasswordField.svelte';

describe('auth password visibility', () => {
	it.each([
		{ name: 'password', placeholder: 'Enter your password' },
		{ name: 'password', placeholder: 'Create a password' },
		{ name: 'passwordConfirm', placeholder: 'Confirm your password' }
	])('shows and hides $placeholder while retaining its value', async ({ name, placeholder }) => {
		render(AuthPasswordField, {
			placeholder,
			// Remote form fields supply type="password" through their spread props.
			inputProps: { name, type: 'password' }
		});

		const input = page.getByPlaceholder(placeholder);
		await input.fill('TestPassword123!');
		await expect.element(input).toHaveAttribute('type', 'password');

		await page.getByRole('button', { name: 'Show password' }).click();
		await expect.element(input).toHaveAttribute('type', 'text');
		await expect.element(input).toHaveValue('TestPassword123!');

		await page.getByRole('button', { name: 'Hide password' }).click();
		await expect.element(input).toHaveAttribute('type', 'password');
		await expect.element(input).toHaveValue('TestPassword123!');
	});
});
