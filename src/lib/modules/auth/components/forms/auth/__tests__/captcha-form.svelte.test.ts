import { describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { page } from 'vitest/browser';
import { createAttachmentKey } from 'svelte/attachments';
import type { RemoteFormEnhanceInstance } from '$app/server';
import CapWidgetStub from '$test/mocks/CapWidgetAdapter.svelte';

vi.mock('../../shared/CapWidgetAdapter.svelte', () => ({ default: CapWidgetStub }));
vi.mock('../../../../client/client.js', () => ({ authClient: {} }));
vi.mock('#lib/platform/config/index.js', () => ({ publicEnv: {
	PUBLIC_CAP_ENDPOINT: 'https://captcha.test', PUBLIC_CAP_KEY: 'test-site'
} }));

import AuthForm from '../AuthForm.svelte';

describe('CAPTCHA with remote auth forms', () => {
	it.each(['sign-in', 'sign-up'] as const)('keeps widget fields outside the %s form and retains credentials on a challenge', async (mode) => {
		const field = (name: string) => ({ as: (type: string) => ({ name, type }), issues: () => [] });
		const submit = vi.fn(async () => true);
		const action = {
			element: null as HTMLFormElement | null,
			pending: 0,
			result: { captchaRequired: true },
			fields: {
				email: field('email'), password: field('password'),
				name: field('name'), passwordConfirm: field('passwordConfirm')
			},
			submit,
			enhance(callback: (form: RemoteFormEnhanceInstance) => Promise<void>) {
				return {
					[createAttachmentKey()]: (form: HTMLFormElement) => {
						action.element = form;
						const onSubmit = (event: SubmitEvent) => {
							event.preventDefault();
							void callback(action as unknown as RemoteFormEnhanceInstance);
						};
						form.addEventListener('submit', onSubmit);
						return () => form.removeEventListener('submit', onSubmit);
					}
				};
			}
		};
		render(AuthForm, { mode, formAction: action, showSocial: false, showPasskey: false });

		// Reproduce the hidden input that the real Cap custom element injects.
		const hidden = document.createElement('input');
		hidden.type = 'hidden'; hidden.name = 'cap-token'; hidden.value = 'test:solved:token';
		document.querySelector('[data-testid="cap-widget"]')!.appendChild(hidden);

		await page.getByPlaceholder('Enter your email').fill('person@example.com');
		const password = page.getByPlaceholder(mode === 'sign-in' ? 'Enter your password' : 'Create a password');
		await password.fill('TestPassword123!');
		if (mode === 'sign-up') {
			await page.getByPlaceholder('Enter your full name').fill('Test Person');
			await page.getByPlaceholder('Confirm your password').fill('TestPassword123!');
		}

		await page.getByRole('button', { name: mode === 'sign-in' ? 'Sign In' : 'Create Account', exact: true }).click();
		await expect.poll(() => submit.mock.calls.length).toBe(1);
		expect(hidden.form).toBeNull();
		expect(new FormData(action.element!).has('cap-token')).toBe(false);
		await expect.element(password).toHaveValue('TestPassword123!');
		await expect.element(page.getByPlaceholder('Enter your email')).toHaveValue('person@example.com');
	});
});
