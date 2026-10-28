/**
 * Active brand resolution for brand-in-session routes (`/app/...`).
 *
 * The active brand is a routing convenience, never an authority. Every request
 * re-validates the candidate through `requireBrandAccess`, so a stale cookie or
 * a revoked assignment cannot expose another brand's work (§6, §8 invariant 7).
 *
 * Resolution order: the active-brand cookie, then the saved landing preference,
 * then the user's first assigned brand. With no authorised brand at all the
 * user is sent to organisation/brand setup rather than shown an empty shell.
 */

import { redirect } from '@sveltejs/kit';
import { dev } from '$app/env';
import type { Cookies, RequestEvent } from '@sveltejs/kit';
import { requireTenancySession } from '#lib/modules/tenancy/server/request.js';
import {
	requireBrandAccess,
	type OperationContext
} from '#lib/modules/tenancy/server/context.js';
import { isBrandAccessError } from '#lib/modules/tenancy/server/errors.js';
import {
	getBrandPreference,
	listSwitcherContext,
	setBrandPreference
} from '#lib/modules/tenancy/server/resolution.js';
import type { RouteResolution, SwitcherOrganisation } from '#lib/modules/tenancy/shared/types.js';
import { ACTIVE_BRAND_COOKIE } from '#lib/modules/tenancy/shared/types.js';

export { ACTIVE_BRAND_COOKIE };

type SessionEvent = Pick<RequestEvent, 'request' | 'url' | 'cookies'>;

export interface ActiveBrand {
	session: Awaited<ReturnType<typeof requireTenancySession>>;
	ctx: OperationContext;
	organisations: SwitcherOrganisation[];
}

export function setActiveBrandCookie(cookies: Cookies, brandId: string): void {
	cookies.set(ACTIVE_BRAND_COOKIE, brandId, {
		path: '/',
		httpOnly: true,
		sameSite: 'lax',
		secure: !dev,
		maxAge: 60 * 60 * 24 * 365
	});
}

/** Candidate brand IDs in resolution order, de-duplicated. */
async function candidateBrands(
	userId: string,
	cookieBrandId: string | undefined,
): Promise<{ candidates: string[]; organisations: SwitcherOrganisation[] }> {
	const [preference, organisations] = await Promise.all([
		getBrandPreference(userId),
		listSwitcherContext(userId)
	]);
	const ordered = [
		cookieBrandId,
		preference.lastBrandId ?? undefined,
		...organisations.flatMap((organisation) => organisation.brands.map((brand) => brand.brandId))
	];
	return { candidates: [...new Set(ordered.filter((id): id is string => Boolean(id)))], organisations };
}

export async function resolveActiveBrand(event: SessionEvent): Promise<ActiveBrand> {
	const session = await requireTenancySession(event);
	const cookieBrandId = event.cookies.get(ACTIVE_BRAND_COOKIE);
	const { candidates, organisations } = await candidateBrands(session.user.id, cookieBrandId);

	for (const brandId of candidates) {
		try {
			const ctx = await requireBrandAccess(session.user.id, brandId, 'brand:read');
			if (cookieBrandId !== ctx.brandId) {
				setActiveBrandCookie(event.cookies, ctx.brandId);
				void setBrandPreference(session.user.id, ctx.organisationId, ctx.brandId).catch(() => {
					// Preference is a landing hint only; a write failure must not block the page.
				});
			}
			return { session, ctx, organisations };
		} catch (cause) {
			if (!isBrandAccessError(cause)) throw cause;
		}
	}

	redirect(303, `/organisations?next=${encodeURIComponent(event.url.pathname)}`);
}

/**
 * Switch the active brand after re-validating the user's access to it.
 * Returns the newly authorised context; the caller sets the cookie and redirects.
 */
export async function activateBrand(
	event: SessionEvent,
	brandId: string,
): Promise<OperationContext> {
	const session = await requireTenancySession(event);
	const ctx = await requireBrandAccess(session.user.id, brandId, 'brand:read');
	setActiveBrandCookie(event.cookies, ctx.brandId);
	await setBrandPreference(session.user.id, ctx.organisationId, ctx.brandId).catch(() => {
		// Preference is a landing hint only.
	});
	return ctx;
}

/** Route metadata for the shell header. */
export function routeOf(ctx: OperationContext, organisations: SwitcherOrganisation[]): RouteResolution {
	const organisation = organisations.find((entry) => entry.organisationId === ctx.organisationId);
	const brand = organisation?.brands.find((entry) => entry.brandId === ctx.brandId);
	return {
		organisation: {
			id: ctx.organisationId,
			name: organisation?.organisationName ?? '',
			slug: organisation?.organisationSlug ?? ''
		},
		brand: {
			id: ctx.brandId,
			name: brand?.brandName ?? '',
			slug: ctx.brandSlug
		}
	};
}
