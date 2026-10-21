// src/routes/auth/(app)/trusted-devices/+page.server.ts
import { fail, redirect } from '@sveltejs/kit';
import { auth } from '#lib/auth.js';
import { logger } from '#lib/auth/shared/logger.js';
import type { Actions, PageServerLoad } from './$types';

const TRUST_COOKIE_NAME = 'better-auth.trust-device';

/**
 * Parse user agent for device info
 */
function parseUserAgent(userAgent: string) {
	const ua = userAgent.toLowerCase();

	let osName = 'Unknown';
	let browserName = 'Unknown';

	// Detect OS
	if (ua.includes('windows')) osName = 'Windows';
	else if (ua.includes('mac')) osName = 'macOS';
	else if (ua.includes('linux')) osName = 'Linux';
	else if (ua.includes('iphone') || ua.includes('ipad')) osName = 'iOS';
	else if (ua.includes('android')) osName = 'Android';

	// Detect Browser
	if (ua.includes('edg/')) browserName = 'Edge';
	else if (ua.includes('chrome') && !ua.includes('chromium')) browserName = 'Chrome';
	else if (ua.includes('firefox')) browserName = 'Firefox';
	else if (ua.includes('safari')) browserName = 'Safari';

	return { osName, browserName };
}

/**
 * Check if trusted device cookie exists
 */
function hasTrustedDeviceCookie(cookieHeader: string | null): boolean {
	if (!cookieHeader) return false;
	return cookieHeader.includes(TRUST_COOKIE_NAME);
}

export const load: PageServerLoad = async ({ request, getClientAddress, depends }) => {
	try {
		const session = await auth.api.getSession({ headers: request.headers });

		if (!session?.user) {
			throw redirect(302, '/auth/sign-in');
		}

		depends('auth:trustedDevices');

		const userAgent = request.headers.get('user-agent') || '';
		const cookieHeader = request.headers.get('cookie');
		const { osName, browserName } = parseUserAgent(userAgent);

		// Check if current device is trusted (cookie exists)
		const isCurrentDeviceTrusted = hasTrustedDeviceCookie(cookieHeader);

		// Check if user has 2FA enabled
		const twoFactorEnabled =
			'twoFactorEnabled' in session.user ? Boolean(session.user.twoFactorEnabled) : false;

		return {
			currentDevice: {
				ip: getClientAddress(),
				userAgent: userAgent.slice(0, 100),
				osName,
				browserName
			},
			isCurrentDeviceTrusted,
			twoFactorEnabled
		};
	} catch (error) {
		if (error && typeof error === 'object' && 'status' in error) {
			throw error;
		}
		logger.error('Trusted devices page load error', { error });
		throw redirect(302, '/auth/sign-in');
	}
};

export const actions: Actions = {
	/**
	 * Revoke trust for the current device
	 * This deletes the trust cookie so 2FA will be required on next sign-in
	 */
	revokeCurrentDevice: async ({ request, cookies }) => {
		try {
			const session = await auth.api.getSession({ headers: request.headers });

			if (!session?.user) {
				return fail(401, { error: 'Unauthorized' });
			}

			// Delete the trusted device cookie
			cookies.delete(TRUST_COOKIE_NAME, { path: '/' });

			logger.info('Device trust revoked', { userId: session.user.id });

			return { success: true };
		} catch (error) {
			logger.error('Failed to revoke device trust', { error });
			return fail(500, { error: 'Failed to revoke device trust' });
		}
	},

	/**
	 * Revoke trust for all devices
	 * This requires signing out all sessions since trusted device tokens
	 * are stored in cookies on each device
	 */
	revokeAllDevices: async ({ request, cookies }) => {
		try {
			const session = await auth.api.getSession({ headers: request.headers });

			if (!session?.user) {
				return fail(401, { error: 'Unauthorized' });
			}

			// Delete trust cookie for current device
			cookies.delete(TRUST_COOKIE_NAME, { path: '/' });

			// Revoke all other sessions - this forces re-authentication
			// which means they'll need to complete 2FA again
			try {
				await auth.api.revokeOtherSessions({ headers: request.headers });
			} catch (revokeError) {
				logger.warn('Failed to revoke other sessions', { error: revokeError });
				// Continue anyway - at least current device is revoked
			}

			logger.info('All device trusts revoked', { userId: session.user.id });

			return { success: true };
		} catch (error) {
			logger.error('Failed to revoke all device trusts', { error });
			return fail(500, { error: 'Failed to revoke all device trusts' });
		}
	}
};
