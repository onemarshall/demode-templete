/**
 * Avatar utility functions for resizing and formatting avatar URLs
 */

const DIRECTUS_ASSET_PATTERN = /\/assets\/[a-f0-9-]+/i;

/**
 * Resizes a Directus asset URL to a specific dimension.
 * For Directus URLs, adds image transformation parameters.
 * For external URLs (GitHub, Google), returns as-is.
 */
export function getResizedAvatarUrl(
	url: string | null | undefined,
	size: number = 300
): string | null {
	if (!url) return null;

	// Only transform URLs that look like Directus asset UUIDs
	if (DIRECTUS_ASSET_PATTERN.test(url)) {
		const separator = url.includes('?') ? '&' : '?';
		return `${url}${separator}width=${size}&height=${size}&fit=cover`;
	}

	return url;
}

/**
 * Gets avatar initials from name and email.
 * Used as fallback when avatar image is not available.
 */
export function getAvatarInitials(name?: string | null, email?: string | null): string {
	const trimmedName = name?.trim();

	if (trimmedName) {
		const parts = trimmedName.split(/\s+/).filter(Boolean);
		if (parts.length === 0) return email ? email.substring(0, 2).toUpperCase() : 'U';

		const first = parts[0] ?? '';
		const last = parts[parts.length - 1] ?? '';

		if (parts.length >= 2 && first && last) {
			return (first.charAt(0) + last.charAt(0)).toUpperCase();
		}

		if (first) {
			return first.substring(0, 2).toUpperCase();
		}
	}

	if (email) {
		const local = email.split('@')[0] ?? email;
		return local.substring(0, 2).toUpperCase();
	}

	return 'U';
}
