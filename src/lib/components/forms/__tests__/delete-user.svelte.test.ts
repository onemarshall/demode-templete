import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { page } from 'vitest/browser';
const mocks = vi.hoisted(() => ({ deleteUser: vi.fn() }));
vi.mock('#lib/auth/auth-client.js', () => ({ authClient: { deleteUser: mocks.deleteUser } }));
import DeleteUserForm from '../DeleteUserForm.svelte';
const eligible = { user: { id: 'user', email: 'user@example.com' }, hasPassword: true, deletionEligibility: { allowed: true, reason: null, message: null } };

describe('account deletion confirmation', () => {
	beforeEach(() => vi.clearAllMocks());
	it('keeps the password unchanged and displays returned errors instead of success', async () => {
		mocks.deleteUser.mockResolvedValue({ error: { message: 'Invalid password' }, data: null });
		render(DeleteUserForm, { data: eligible });
		await page.getByRole('button', { name: 'Review account deletion', exact: true }).click();
		await page.getByLabelText('Current password', { exact: true }).fill(' secret with spaces ');
		await page.getByRole('button', { name: 'Send confirmation email' }).click();
		await expect.element(page.getByText('Invalid password', { exact: true })).toBeVisible();
		expect(mocks.deleteUser).toHaveBeenCalledExactlyOnceWith({ password: ' secret with spaces ', callbackURL: '/auth/goodbye' });
		await expect.element(page.getByText(/Your deletion request was accepted/)).not.toBeInTheDocument();
	});
	it('lets passwordless users request verification and stays on the confirmation state', async () => {
		mocks.deleteUser.mockResolvedValue({ error: null, data: { success: true, message: 'Verification email sent' } });
		render(DeleteUserForm, { data: { ...eligible, hasPassword: false } });
		await page.getByRole('button', { name: 'Review account deletion', exact: true }).click();
		await expect.element(page.getByLabelText('Current password', { exact: true })).not.toBeInTheDocument();
		await page.getByRole('button', { name: 'Send confirmation email' }).click();
		await expect.element(page.getByText(/Your deletion request was accepted/)).toBeVisible();
		await expect.element(page.getByRole('button', { name: 'Close', exact: true })).toBeVisible();
		expect(mocks.deleteUser).toHaveBeenCalledExactlyOnceWith({ callbackURL: '/auth/goodbye' });
	});
	it('blocks deletion with a subscription and points to billing', async () => {
		render(DeleteUserForm, { data: { ...eligible, deletionEligibility: { allowed: false, reason: 'subscription', message: 'Cancel your subscription first.' } } });
		await expect.element(page.getByRole('button', { name: 'Review account deletion' })).toBeDisabled();
		await expect.element(page.getByRole('link', { name: 'Review subscription & billing' })).toHaveAttribute('href', '/auth/billing');
		expect(mocks.deleteUser).not.toHaveBeenCalled();
	});
});
