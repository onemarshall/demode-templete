//src/routes/api/auth/[...all]/+server.ts
import { auth } from '$lib/auth';
import { toSvelteKitHandler } from 'better-auth/svelte-kit';
import type { RequestEvent } from '@sveltejs/kit';
import { isAuthDebugMode } from '$lib/auth/shared/env';
import { logger } from '$lib/auth/shared/logger';

 function getSafeRequestLog(headers: Headers) {
	return {
		contentType: headers.get('content-type'),
		origin: headers.get('origin'),
		referer: headers.get('referer'),
		userAgent: headers.get('user-agent')
	};
 }

 function getSafeResponseLog(headers: Headers) {
	return {
		contentType: headers.get('content-type'),
		cacheControl: headers.get('cache-control'),
		hasSetCookie: headers.has('set-cookie')
	};
 }

const baseHandler = toSvelteKitHandler(auth);

const handler = async (event: RequestEvent) => {
	const pathname = event.url.pathname;
	const method = event.request.method;
	const authDebugMode = isAuthDebugMode();

	if (authDebugMode) {
		logger.debug(`\n=== HANDLER CALLED: ${method} ${pathname} ===`);
	}

	if (pathname.includes('/passkey/')) {
		if (authDebugMode) {
			logger.debug(`\n[PASSKEY] ${method} ${pathname}`);
			logger.debug(`[PASSKEY] Content-Type: ${event.request.headers.get('content-type')}`);
		}
	} else if (pathname.includes('sign-in') && pathname.includes('email')) {
		if (authDebugMode) {
			logger.debug(`\n[SIGN-IN] ${method} ${pathname}`);
			logger.debug(`[SIGN-IN] Content-Type: ${event.request.headers.get('content-type')}`);
			logger.debug(`[SIGN-IN] Request metadata:`, getSafeRequestLog(event.request.headers));
		}
	} else if (authDebugMode) {
		logger.debug(`[Auth] ${method} ${pathname}`);
	}

	try {
		const response = await baseHandler(event);

		if (pathname.includes('/passkey/')) {
			if (authDebugMode) {
				logger.debug(`[PASSKEY] Response Status: ${response.status}`);
				logger.debug(`[PASSKEY] Response metadata:`, getSafeResponseLog(response.headers));
			}
			if (response.status >= 400) {
				logger.warn(`[PASSKEY] Request failed`, {
					status: response.status,
					...getSafeResponseLog(response.headers)
				});
			}
		} else if (pathname.includes('sign-in') && pathname.includes('email')) {
			if (authDebugMode) {
				logger.debug(`[SIGN-IN] Response Status: ${response.status}`);
				logger.debug(`[SIGN-IN] Response metadata:`, getSafeResponseLog(response.headers));
			}
			if (response.status >= 400) {
				logger.warn(`[SIGN-IN] Request failed`, {
					status: response.status,
					...getSafeResponseLog(response.headers)
				});
			}
		}

		return response;
	} catch (err) {
		if (pathname.includes('/passkey/')) {
			logger.error(`[PASSKEY] ERROR:`, err instanceof Error ? err.message : String(err));
		} else if (pathname.includes('sign-in') && pathname.includes('email')) {
			logger.error(`[SIGN-IN] ERROR:`, err instanceof Error ? err.message : String(err));
		}
		throw err;
	}
};

export { handler as GET, handler as POST };
