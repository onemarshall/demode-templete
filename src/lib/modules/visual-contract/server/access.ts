/**
 * Visual Contract — actor resolution for the two route trees.
 *
 * This is the only place the two shells diverge. Each function can produce one
 * variant of `DraftActor` and no other, which is what keeps the public tree
 * unable to touch brand data.
 */

import { error } from '@sveltejs/kit';
import type { RequestEvent } from '@sveltejs/kit';
import { resolveActiveBrand } from '#lib/modules/products/server/brand-context.js';
import { hashGuestToken, readGuestCookie, type DraftActor } from './actor.js';

/** The authenticated tree. Redirects to sign-in or brand setup via resolveActiveBrand. */
export async function brandActor(event: RequestEvent): Promise<Extract<DraftActor, { kind: 'brand' }>> {
	const { session, ctx } = await resolveActiveBrand(event);
	return {
		kind: 'brand',
		userId: session.user.id,
		organisationId: ctx.organisationId,
		brandId: ctx.brandId
	};
}

/**
 * The public tree. Authority comes from the httpOnly cookie only, so a draft id
 * in the URL is never enough on its own.
 */
export async function guestActor(event: RequestEvent): Promise<DraftActor> {
	const token = readGuestCookie(event.cookies);
	if (!token) error(404, 'This draft is not available in this browser.');
	return { kind: 'guest', tokenHash: await hashGuestToken(token) };
}

/** Guest actor when a cookie exists, otherwise null. Used where absence is not an error. */
export async function optionalGuestActor(event: RequestEvent): Promise<DraftActor | null> {
	const token = readGuestCookie(event.cookies);
	if (!token) return null;
	return { kind: 'guest', tokenHash: await hashGuestToken(token) };
}
