import { publicEnv } from '#lib/platform/config/index.js';

const BYPASS_COOKIE = 'captcha_bypass';
const BYPASS_COOKIE_MAX_AGE = 1800;

/**
 * Resolve the cap.js widget endpoint URL.
 *
 * Cap standalone serves challenges per site key under
 * `{endpoint}/{siteKey}/`, so the widget endpoint is composed from
 * `PUBLIC_CAP_ENDPOINT` (the server base URL) and `PUBLIC_CAP_KEY` (the
 * site key). Returns `''` when either is missing — callers should treat
 * the empty string as "captcha unavailable".
 */
export function computeCapEndpoint(): string {
	const base = publicEnv.PUBLIC_CAP_ENDPOINT;
	const siteKey = publicEnv.PUBLIC_CAP_KEY;
	if (typeof base === 'string' && base && typeof siteKey === 'string' && siteKey) {
		return `${base.replace(/\/+$/, '')}/${siteKey}/`;
	}
	return '';
}

/**
 * Verify a solved captcha token with the server and store the issued
 * bypass token as a cookie.
 *
 * The cookie (not a request header) is the transport because auth
 * submissions go through SvelteKit remote functions, whose calls cannot
 * carry custom headers — but they do forward the browser's cookies.
 */
export async function verifyCaptchaAndStoreBypass(
	token: string
): Promise<{ ok: boolean; error?: string }> {
	try {
		const response = await fetch('/api/auth/security/verify-captcha', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ token })
		});
		const data = (await response.json().catch(() => null)) as
			| { success?: boolean; bypassToken?: string; error?: string }
			| null;
		if (!response.ok || !data?.success || !data.bypassToken) {
			return { ok: false, error: data?.error ?? 'Captcha verification failed. Please try again.' };
		}
		document.cookie = `${BYPASS_COOKIE}=${encodeURIComponent(data.bypassToken)}; path=/; max-age=${BYPASS_COOKIE_MAX_AGE}; secure; samesite=lax`;
		return { ok: true };
	} catch {
		return { ok: false, error: 'Captcha verification failed. Please try again.' };
	}
}
