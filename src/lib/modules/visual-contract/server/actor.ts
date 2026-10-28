/**
 * Visual Contract — who is allowed to touch a draft.
 *
 * The public route tree can only ever construct a `guest` actor; the
 * authenticated tree can only ever construct a `brand` actor. Because every
 * repository call requires an actor and narrows on it, a public link cannot
 * reach a brand draft even if a draft id leaks.
 *
 * This type is the whole access model. Keep it closed: do not add a third
 * variant without updating every query in repository.ts.
 */

import { dev } from '$app/env';
import type { Cookies } from '@sveltejs/kit';

export type DraftActor =
	| { kind: 'brand'; userId: string; organisationId: string; brandId: string }
	| { kind: 'guest'; tokenHash: string };

export const GUEST_COOKIE = 'vc_guest';
export const GUEST_COOKIE_PATH = '/visual-contract';
/**
 * How long an unclaimed contract lives. Both the draft and the public page use
 * this, so the promise made on the finished screen is the promise kept.
 * Claiming the contract clears both expiries.
 */
export const GUEST_DRAFT_TTL_DAYS = 7;
export const GUEST_CONTRACT_TTL_DAYS = 7;

export function isBrandActor(actor: DraftActor): actor is Extract<DraftActor, { kind: 'brand' }> {
	return actor.kind === 'brand';
}

/** 32 random bytes, base64url. Unguessable and URL-safe. */
export function createGuestToken(): string {
	const bytes = new Uint8Array(32);
	crypto.getRandomValues(bytes);
	let binary = '';
	for (const byte of bytes) binary += String.fromCharCode(byte);
	return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/** SHA-256 hex. Only the hash is stored, so a database read cannot mint a capability. */
export async function hashGuestToken(token: string): Promise<string> {
	const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token));
	return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

export function guestExpiry(now = new Date()): Date {
	return new Date(now.getTime() + GUEST_DRAFT_TTL_DAYS * 24 * 60 * 60 * 1000);
}

export function contractExpiry(now = new Date()): Date {
	return new Date(now.getTime() + GUEST_CONTRACT_TTL_DAYS * 24 * 60 * 60 * 1000);
}

export function setGuestCookie(cookies: Cookies, token: string, expires: Date): void {
	cookies.set(GUEST_COOKIE, token, {
		path: GUEST_COOKIE_PATH,
		httpOnly: true,
		sameSite: 'lax',
		secure: !dev,
		expires
	});
}

export function clearGuestCookie(cookies: Cookies): void {
	cookies.delete(GUEST_COOKIE, { path: GUEST_COOKIE_PATH });
}

export function readGuestCookie(cookies: Cookies): string | undefined {
	return cookies.get(GUEST_COOKIE) || undefined;
}
