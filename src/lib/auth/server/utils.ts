import type { Cookies } from '@sveltejs/kit';

/**
 * Extract cookies from a Response object and set them on the SvelteKit Cookies object.
 * This is necessary because Better Auth returns a Response with Set-Cookie headers,
 * but when using the API programmatically in SvelteKit actions/remote functions,
 * these headers are not automatically propagated to the SvelteKit response.
 */
export function setAuthCookies(cookies: Cookies, headers: Headers) {
	// Use getSetCookie if available (Node 18+, Bun, modern browsers)
	// Fallback to get('set-cookie') which might comma-separate (problematic for dates)
	const setCookieHeader =
		typeof headers.getSetCookie === 'function' ? headers.getSetCookie() : headers.get('set-cookie');

	if (!setCookieHeader) return;

	const cookieStrings = Array.isArray(setCookieHeader) ? setCookieHeader : [setCookieHeader];

	for (const cookieStr of cookieStrings) {
		if (!cookieStr) continue;

		// Basic parsing of Set-Cookie string
		// Format: Name=Value; Opt1=Val1; Opt2; ...
		const parts = cookieStr.split(';');
		const [nameValue, ...optionsParts] = parts;

		if (!nameValue) continue;

		const nameValueParts = nameValue.split('=');

		if (nameValueParts.length < 2 || !nameValueParts[0]) continue;

		const name = nameValueParts[0].trim();
		// Value might contain '=' so join the rest
		const value = nameValueParts.slice(1).join('=');

		// Use Parameters helper to get the correct options type from SvelteKit's cookies.set
		const options: NonNullable<Parameters<Cookies['set']>[2]> & { path: string } = {
			path: '/', // Default to root
			encode: (v) => v, // Disable SvelteKit's default encoding as the value is already encoded/safe from Better Auth
			httpOnly: false // SvelteKit defaults to true if omitted — we must honour Better Auth's intent.
			// Cookies that need httpOnly (e.g. session) will have the HttpOnly directive in their
			// Set-Cookie string and we set it to true below when we find that directive.
		};

		for (const part of optionsParts) {
			const trimmed = part.trim();
			const [key, ...valParts] = trimmed.split('=');

			if (!key) continue;

			const lowerKey = key.toLowerCase();
			const val = valParts.join('=');

			if (lowerKey === 'path') options.path = val;
			else if (lowerKey === 'httponly') options.httpOnly = true;
			else if (lowerKey === 'secure') options.secure = true;
			else if (lowerKey === 'samesite') {
				const sameSite = val.toLowerCase();
				if (sameSite === 'lax' || sameSite === 'strict' || sameSite === 'none') {
					options.sameSite = sameSite as 'lax' | 'strict' | 'none';
				}
			} else if (lowerKey === 'max-age') {
				const maxAge = parseInt(val, 10);
				if (!isNaN(maxAge)) options.maxAge = maxAge;
			} else if (lowerKey === 'expires') {
				const expires = new Date(val);
				if (!isNaN(expires.getTime())) options.expires = expires;
			} else if (lowerKey === 'domain') {
				options.domain = val;
			}
			// priority is not standard in Set-Cookie header usually but supported by SvelteKit
		}

		// SvelteKit throws if we try to set a cookie with the same name multiple times?
		// No, it handles it.
		cookies.set(name, value, options);
	}
}
