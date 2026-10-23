/**
 * User Configuration Options
 *
 * User-related authentication configuration.
 */

import type { User as BetterAuthBaseUser } from 'better-auth';
import { publicEnv } from '#lib/auth/shared/env/index.js';
import { assertCanDeleteAccount } from '../deletion-policy';
const env = publicEnv;

import { sendTemplateEmail, type DeleteAccountEmailData } from '../email';

type EmailHookArgs = { user: BetterAuthBaseUser; url: string; token: string };
type ChangeEmailHookArgs = {
	user: BetterAuthBaseUser;
	newEmail: string;
	url: string;
	token: string;
};

export const getUserOptions = () => ({
	additionalFields: {
		provider: {
			type: 'string',
			required: true,
			defaultValue: 'email',
			input: false // Don't allow client to set this
		},
		lastLoginMethod: { type: 'string' as const }
	},
	changeEmail: {
		enabled: true,
		sendChangeEmailConfirmation: async ({ user, newEmail, url }: ChangeEmailHookArgs) => {
			const appName =
				typeof env.PUBLIC_APP_NAME === 'string' && env.PUBLIC_APP_NAME.length > 0
					? env.PUBLIC_APP_NAME
					: 'App';

			const payload = {
				email: user.email, // Send to current email for confirmation
				newEmail,
				url,
				name: typeof user.name === 'string' ? user.name : undefined,
				appName
			};

			await sendTemplateEmail('change-email', payload, appName);
		}
	},
	deleteUser: {
		enabled: true,
		async sendDeleteAccountVerification({ user, url }: EmailHookArgs) {
			// Better Auth calls beforeDelete only when deletion is confirmed, not
			// when the verification email is requested. Enforce the policy at both steps.
			await assertCanDeleteAccount(user);
			const appName =
				typeof env.PUBLIC_APP_NAME === 'string' && env.PUBLIC_APP_NAME.length > 0
					? env.PUBLIC_APP_NAME
					: 'App';

			const payload: DeleteAccountEmailData = {
				email: user.email,
				url,
				name: typeof user.name === 'string' ? user.name : undefined,
				appName
			};

			await sendTemplateEmail('delete-account', payload, appName);
		},
		beforeDelete: async (user: BetterAuthBaseUser) => {
			await assertCanDeleteAccount(user);
		}
	}
});
