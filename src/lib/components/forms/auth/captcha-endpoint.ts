import { publicEnv } from '$lib/auth/shared/env';

/**
 * Resolve the cap.js widget endpoint URL.
 *
 * Uses the explicit `PUBLIC_CAP_ENDPOINT` when set. Returns `''` when no
 * captcha is configured — callers should treat the empty string as
 * "captcha unavailable".
 *
 * Previously duplicated verbatim in every auth page that mounts the
 * captcha widget.
 */
export function computeCapEndpoint(): string {
	const explicit = publicEnv.PUBLIC_CAP_ENDPOINT;
	if (typeof explicit === 'string' && explicit) return explicit;

	return '';
}
