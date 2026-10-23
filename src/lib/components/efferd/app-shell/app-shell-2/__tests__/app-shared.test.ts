import { describe, expect, it } from 'vitest';
import { getNavGroups, getNavLinks, isItemActive } from '../app-shared';

const user = { id: 'user-1', email: 'person@example.com' };

describe('account navigation', () => {
	it('keeps profile, security, sessions and account privacy as distinct destinations', () => {
		const account = getNavGroups(user).find((group) => group.label === 'Account');
		expect(account?.items.map(({ title, path }) => ({ title, path }))).toEqual([
			{ title: 'Profile', path: '/auth/profile' },
			{ title: 'Sign-in & security', path: '/auth/security' },
			{ title: 'Sessions & devices', path: '/auth/sessions' },
			{ title: 'Security activity', path: '/auth/activity' },
			{ title: 'Account & privacy', path: '/auth/account' }
		]);
	});

	it('provides one billing destination and keeps pricing out of sidebar navigation', () => {
		const billing = getNavGroups(user).find((group) => group.label === 'Billing');
		expect(billing?.items.map(({ title, path }) => ({ title, path }))).toEqual([
			{ title: 'Subscription & billing', path: '/auth/billing' }
		]);
		expect(getNavLinks(user).some((item) => item.path === '/auth/pricing')).toBe(false);
	});

	it.each(['admin', 'user, admin', ['user', 'admin']])(
		'exposes administration for supported admin role representation %j',
		(role) => {
			const admin = getNavGroups({ ...user, role }).find((group) => group.label === 'Administration');
			expect(admin?.items.map((item) => item.title)).toEqual(['Users & access', 'Security activity']);
		}
	);

	it.each([null, undefined, { ...user, role: 'user' }, { ...user, role: 'superadmin' }])(
		'hides administration from unauthorised users %j',
		(account) => {
			expect(getNavGroups(account).some((group) => group.label === 'Administration')).toBe(false);
		}
	);

	it('marks account subpages active without matching unrelated route prefixes', () => {
		const account = { path: '/auth/account', title: 'Account & privacy' };
		expect(isItemActive('/auth/account/delete', account)).toBe(true);
		expect(isItemActive('/auth/accounting', account)).toBe(false);
	});
});
