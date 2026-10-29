import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { page } from 'vitest/browser';

const billing = vi.hoisted(() => ({ billingPortal: vi.fn(), list: vi.fn() }));
vi.mock('#lib/modules/auth/client/client.js', () => ({ authClient: {
	useSession: () => ({ subscribe(run: (value: unknown) => void) {
		run({ data: { user: { id: 'test-user' } }, isPending: false });
		return () => {};
	} }),
	subscription: { billingPortal: billing.billingPortal, list: billing.list }
} }));

import SubscriptionStatus from '../SubscriptionStatus.svelte';

const initial = { status: 'active', product: { name: 'Signal', price: 39500, currency: 'gbp' } };

describe('subscription Manage spinner', () => {
	beforeEach(() => vi.clearAllMocks());

	it('starts only on click and stays busy while navigation begins', async () => {
		let resolve!: (value: { error: null }) => void;
		billing.billingPortal.mockReturnValue(new Promise((done) => { resolve = done; }));
		render(SubscriptionStatus, { initial });
		const manage = page.getByRole('button', { name: /Manage/ });
		await expect.element(manage).toBeEnabled();
		await expect.element(manage.getByRole('status')).not.toBeInTheDocument();

		await manage.click();
		await expect.element(manage).toBeDisabled();
		await expect.element(manage.getByRole('status')).toBeVisible();
		expect(billing.billingPortal).toHaveBeenCalledOnce();

		resolve({ error: null });
		await expect.element(manage).toHaveAttribute('aria-busy', 'true');
	});

	it('shows the error if the portal request fails', async () => {
		billing.billingPortal.mockRejectedValue(new Error('Portal could not be opened'));
		render(SubscriptionStatus, { initial });
		await page.getByRole('button', { name: 'Manage', exact: true }).click();
		await expect.element(page.getByText('Portal could not be opened')).toBeVisible();
	});
});
