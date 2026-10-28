import { resolveUserImage } from '#lib/modules/auth/server/session-serializer.js';

/**
 * Normalise the authenticated user for the shell.
 *
 * `user.image` is persisted as a bare CMS file id (e.g. `ea5b96ac-…`), not a
 * URL. Every layout must run it through the same resolver the profile page
 * uses, otherwise the raw id reaches `<img src>` and the browser resolves it
 * relative to the current route. Keeping this in one place means a new layout
 * cannot reintroduce that bug.
 */
export function toShellUser<T extends { image?: unknown }>(user: T): T & { image: string | null } {
	return { ...user, image: resolveUserImage(user.image) };
}
