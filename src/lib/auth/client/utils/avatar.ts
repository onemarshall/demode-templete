// Deprecated: relocated to $lib/components/profile/utils/avatar
export { getResizedAvatarUrl, getAvatarInitials } from '#lib/components/profile/utils/avatar.js';

/**
 * Checks if a URL is a Directus asset URL
 *
 * @param url - The URL to check
 * @returns true if the URL is a Directus asset
 */
export function isDirectusAsset(url: string | null | undefined): boolean {
	if (!url) return false;
	return url.includes('/assets/');
}

/**
 * Extracts the file ID from a Directus asset URL
 *
 * @param url - The Directus asset URL
 * @returns The file ID or null if not a valid Directus URL
 *
 * @example
 * getDirectusFileId('http://localhost:8051/assets/abc123?width=300')
 * // Returns: 'abc123'
 */
export function getDirectusFileId(url: string | null | undefined): string | null {
	if (!url || !isDirectusAsset(url)) return null;

	const parts = url.split('/assets/');
	const fileIdWithQuery = parts[1];
	if (!fileIdWithQuery) return null;

	const fileId = fileIdWithQuery.split('?')[0];
	return fileId || null;
}
