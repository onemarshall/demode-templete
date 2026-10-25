import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { page } from 'vitest/browser';

const billing = vi.hoisted(() => ({ createPortal: vi.fn() }));
vi.mock('#lib/modules/auth/client/client.js', () => ({ authClient: {
	useSession: () => ({ subscribe(run: (value: unknown) => void) {
		run({ data: { user: { id: 'test-user' } }, isPending: false });
		return () => {};
	} }),
	creem: billing
} }));

import SubscriptionStatus from '../SubscriptionStatus.svelte';

const initial = { status: 'active', product: { name: 'Pro', price: 2900, currency: 'usd' } };

describe('subscription Manage spinner', () => {
	beforeEach(() => vi.clearAllMocks());

	it('starts only on click and stays busy while navigation begins', async () => {
		let resolve!: (value: { error: null }) => void;
		billing.createPortal.mockReturnValue(new Promise((done) => { resolve = done; }));
		render(SubscriptionStatus, { initial });
		const manage = page.getByRole('button', { name: /Manage/ });
		await expect.element(manage).toBeEnabled();
		await expect.element(manage.getByRole('status')).not.toBeInTheDocument();

		await manage.click();
		await expect.element(manage).toBeDisabled();
		await expect.element(manage.getByRole('status')).toBeVisible();
		expect(billing.createPortal).toHaveBeenCalledExactlyOnceWith({ redirect: true });

		resolve({ error: null });
		await expect.element(manage).toHaveAttribute('aria-busy', 'true');
	});

	it('shows the error if the portal request fails', async () => {
		billing.createPortal.mockRejectedValue(new Error('Portal could not be opened'));
		render(SubscriptionStatus, { initial });
		await page.getByRole('button', { name: 'Manage', exact: true }).click();
		await expect.element(page.getByText('Portal could not be opened')).toBeVisible();
	});
});
