// src/routes/api/test-email/+server.ts
import { json } from '@sveltejs/kit';
import { z } from 'zod';
import { auth } from '#lib/auth.js';
import { isAdminUser, type UserWithRoles } from '#lib/auth/shared/roles.js';
import { sendTemplateEmail } from '#lib/auth/server/email/index.js';
import { securityLogger } from '#lib/auth/shared/logger.js';

const bodySchema = z.object({
	type: z.enum(['verification', 'delete', 'resetPassword', 'welcome', 'notification']),
	email: z.string().email().max(254),
	name: z.string().max(200).optional()
});

/**
 * Test email endpoint — admin only. Without an auth check this route is an
 * open relay: anyone could spam arbitrary addresses through our provider.
 */
export const POST = async ({ request }: { request: Request }) => {
	const session = await auth.api.getSession({ headers: request.headers });
	const user = session?.user as UserWithRoles | undefined;
	if (!user || !isAdminUser(user)) {
		return json({ error: 'Admin access required' }, { status: 403 });
	}

	const parsed = bodySchema.safeParse(await request.json().catch(() => null));
	if (!parsed.success) {
		return json({ error: 'Invalid request body' }, { status: 400 });
	}

	try {
		const { type, email, name } = parsed.data;
		const nameValue = typeof name === 'string' ? name : undefined;

		switch (type) {
			case 'verification':
				await sendTemplateEmail('verification', {
					email,
					url: 'https://yourdomain.com/verify?token=example',
					name: nameValue,
					appName: 'Your App'
				});
				break;
			case 'delete':
				await sendTemplateEmail('delete-account', {
					email,
					url: 'https://yourdomain.com/verify?token=example',
					name: nameValue,
					appName: 'Your App'
				});
				break;
			case 'resetPassword':
				await sendTemplateEmail('password-reset', {
					email,
					url: 'https://yourdomain.com/verify?token=example',
					name: nameValue,
					appName: 'Your App'
				});
				break;
			case 'welcome':
				await sendTemplateEmail('welcome', {
					email,
					name: nameValue ?? 'there',
					appName: 'Your App'
				});
				break;
			case 'notification':
				await sendTemplateEmail('notification', {
					email,
					name: nameValue,
					title: 'Test Notification',
					message: 'This is a test notification email.',
					actionUrl: 'https://yourdomain.com/dashboard',
					actionText: 'Go to Dashboard',
					appName: 'Your App'
				});
				break;

			default:
				return json({ error: 'Invalid email type' }, { status: 400 });
		}

		return json({ success: true });
	} catch (error) {
		securityLogger.error('Email sending failed:', error);
		return json({ error: 'Failed to send email' }, { status: 500 });
	}
};
