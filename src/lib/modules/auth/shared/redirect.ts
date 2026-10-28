/**
 * Redirect targets that arrive from a query string.
 *
 * Only same-origin absolute paths are allowed. A protocol-relative value
 * (`//evil.example`) and an absolute URL (`https://…`) are both rejected, so a
 * crafted `redirectTo` cannot turn a sign-in link into an open redirect.
 */
export const DEFAULT_AUTH_REDIRECT = '/auth/dashboard';

export function safeRedirect(value: string | null | undefined, fallback = DEFAULT_AUTH_REDIRECT): string {
	if (typeof value !== 'string' || value.length === 0) return fallback;
	if (!value.startsWith('/')) return fallback;
	if (value.startsWith('//')) return fallback;
	if (value.includes('://')) return fallback;
	return value;
}
