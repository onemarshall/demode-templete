/**
 * Where to send someone after they sign in or verify their email.
 *
 * A sign-in link can carry `?redirectTo=`, but that is lost the moment the
 * person has to verify an email or take a detour. A short-lived cookie keeps
 * the intent across those hops without putting a destination in a URL that a
 * third party controls.
 *
 * The value is always a same-origin path; `safeRedirect` rejects anything else.
 */
import type { Cookies } from '@sveltejs/kit';
import { safeRedirect, DEFAULT_AUTH_REDIRECT } from './redirect.js';

export const RETURN_TO_COOKIE = 'auth_return_to';
/** Long enough to verify an email, short enough not to hijack a later sign-in. */
export const RETURN_TO_MAX_AGE_SECONDS = 60 * 60;

export function setReturnTo(cookies: Cookies, path: string): void {
	cookies.set(RETURN_TO_COOKIE, safeRedirect(path, DEFAULT_AUTH_REDIRECT), {
		path: '/',
		httpOnly: true,
		sameSite: 'lax',
		maxAge: RETURN_TO_MAX_AGE_SECONDS
	});
}

export function readReturnTo(cookies: Cookies): string {
	return safeRedirect(cookies.get(RETURN_TO_COOKIE), DEFAULT_AUTH_REDIRECT);
}

export function clearReturnTo(cookies: Cookies): void {
	cookies.delete(RETURN_TO_COOKIE, { path: '/' });
}
