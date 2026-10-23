import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { page } from 'vitest/browser';

const auth = vi.hoisted(() => ({ linkSocial: vi.fn(), unlinkAccount: vi.fn(), invalidateAll: vi.fn() }));
vi.mock('#lib/auth-client.js', () => ({ authClient: auth }));
vi.mock('$app/navigation', () => ({ invalidateAll: auth.invalidateAll }));
vi.mock('#lib/auth/shared/env/index.js', () => ({ publicEnv: { PUBLIC_AUTH_GOOGLE_ENABLED: true, PUBLIC_AUTH_GITHUB_ENABLED: false } }));
import ConnectedAccounts from '../ConnectedAccounts.svelte';

describe('connected login providers', () => {
	beforeEach(() => vi.clearAllMocks());
	it('keeps the only linked account connected', async () => {
		render(ConnectedAccounts, { accounts: [{ id: 'internal-google', providerId: 'google' }] });
		await expect.element(page.getByRole('button', { name: 'Disconnect' })).toBeDisabled();
		await expect.element(page.getByRole('button', { name: 'Connect GitHub' })).not.toBeInTheDocument();
	});
	it('does not count an empty credential or disabled provider as an alternative', async () => {
		render(ConnectedAccounts, { hasPassword: false, accounts: [{ id: 'internal-google', providerId: 'google' }, { id: 'empty-credential', providerId: 'credential' }, { id: 'disabled-github', providerId: 'github' }] });
		await expect.element(page.getByRole('button', { name: 'Disconnect' }).first()).toBeDisabled();
	});
	it('disconnects using the internal account id and refreshes account settings', async () => {
		auth.unlinkAccount.mockResolvedValue({ data: { status: true }, error: null });
		render(ConnectedAccounts, { hasPassword: true, accounts: [{ id: 'internal-google', providerId: 'google' }, { id: 'internal-password', providerId: 'credential' }] });
		await page.getByRole('button', { name: 'Disconnect' }).click();
		expect(auth.unlinkAccount).toHaveBeenCalledExactlyOnceWith({ accountId: 'internal-google' });
		expect(auth.invalidateAll).toHaveBeenCalledOnce();
	});
	it('surfaces a provider removal failure', async () => {
		auth.unlinkAccount.mockResolvedValue({ error: { message: 'Please sign in again to continue.' } });
		render(ConnectedAccounts, { hasPassword: true, accounts: [{ id: 'internal-google', providerId: 'google' }, { id: 'internal-password', providerId: 'credential' }] });
		await page.getByRole('button', { name: 'Disconnect' }).click();
		await expect.element(page.getByText('Please sign in again to continue.')).toBeVisible();
		expect(auth.invalidateAll).not.toHaveBeenCalled();
	});
	it('starts the provider connection flow with the security return path', async () => {
		auth.linkSocial.mockResolvedValue({ data: {}, error: null });
		render(ConnectedAccounts, { accounts: [{ id: 'internal-password', providerId: 'credential' }] });
		await page.getByRole('button', { name: 'Connect Google' }).click();
		expect(auth.linkSocial).toHaveBeenCalledExactlyOnceWith({ provider: 'google', callbackURL: '/auth/security', errorCallbackURL: '/auth/security' });
	});
});
