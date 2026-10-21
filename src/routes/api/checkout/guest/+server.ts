import { json, error } from '@sveltejs/kit';
import { Creem } from 'creem';
import { z } from 'zod';
import { auth } from '$lib/auth/server/config';
import { getDB } from '$lib/auth/server/database/db';
import { getServerEnv, publicEnv } from '$lib/auth/shared/env';
import { logger } from '$lib/auth/shared/logger';
import { getClientIp, getIdentifier } from '$lib/auth/security/core/helpers';
import { slidingWindowCheck } from '$lib/auth/security/features/rate-limit/sliding-window';
import { validateBypassToken } from '$lib/auth/security/endpoints/captcha';
import type { RequestHandler } from './$types';

// Rate limit: per-IP guards against a single source spraying random emails,
// per-email guards against many sources hammering one address.
const IP_LIMIT = 8; // per minute
const IP_WINDOW_SECONDS = 60;
const EMAIL_LIMIT = 3; // per hour
const EMAIL_WINDOW_SECONDS = 60 * 60;

const Body = z.object({
	productId: z.string().min(1),
	email: z.string().email().max(254),
	successUrl: z.string().optional(),
	cancelUrl: z.string().optional(),
	// Bypass token issued by /api/auth captcha/verify after the user solves
	// the cap.js widget on the pricing page. Required when the security
	// plugin is enabled in production.
	captchaBypassToken: z.string().min(10).max(256).optional()
});

function captchaIsRequired(): boolean {
	return process.env.NODE_ENV === 'production' && Boolean(publicEnv.PUBLIC_AUTH_SECURITY_PLUGIN);
}

export const POST: RequestHandler = async ({ request, url }) => {
	const env = await getServerEnv();
	const apiKey = env.CREEM_API_KEY as string | undefined;
	if (!apiKey) throw error(503, 'Creem is not configured');

	const parsed = Body.safeParse(await request.json().catch(() => ({})));
	if (!parsed.success) throw error(400, 'Invalid request body');
	const { productId, email: rawEmail, successUrl, cancelUrl, captchaBypassToken } = parsed.data;

	const email = rawEmail.trim().toLowerCase();
	const ip = getClientIp(request);

	// 1. Rate limit before we touch the database or call Creem.
	const ipLimit = await slidingWindowCheck(`guest-checkout:ip:${ip}`, IP_LIMIT, IP_WINDOW_SECONDS);
	if (ipLimit.limited) {
		logger.warn('[guest-checkout] IP rate limit exceeded', { ip });
		return json(
			{ message: 'Too many checkout attempts. Try again shortly.' },
			{
				status: 429,
				headers: { 'Retry-After': String(ipLimit.retryAfter ?? IP_WINDOW_SECONDS) }
			}
		);
	}

	const emailLimit = await slidingWindowCheck(
		`guest-checkout:email:${email}`,
		EMAIL_LIMIT,
		EMAIL_WINDOW_SECONDS
	);
	if (emailLimit.limited) {
		logger.warn('[guest-checkout] email rate limit exceeded', { email });
		return json(
			{ message: 'Too many checkout attempts for this email. Try again later.' },
			{
				status: 429,
				headers: { 'Retry-After': String(emailLimit.retryAfter ?? EMAIL_WINDOW_SECONDS) }
			}
		);
	}

	// 2. Captcha bypass token: when present, must match the identifier the
	//    verify endpoint stored it against (anon:{ip}:{ua-hash} for guests).
	//    When required by config and missing, refuse.
	if (captchaBypassToken) {
		const identifier = getIdentifier(request);
		const ok = await validateBypassToken(captchaBypassToken, identifier);
		if (!ok) {
			logger.warn('[guest-checkout] invalid captcha bypass token', { ip });
			throw error(403, 'Captcha verification expired. Please retry.');
		}
	} else if (captchaIsRequired()) {
		logger.warn('[guest-checkout] captcha bypass token missing in production', { ip });
		throw error(403, 'Captcha verification required.');
	}

	const userId = await findOrCreateUser(email);

	// 3. Magic-link send is best-effort but no longer fire-and-forget — we
	//    want to log a real error rather than an unhandled rejection.
	let magicLinkSent = true;
	try {
		// signInMagicLink comes from the magic-link plugin, which is enabled
		// via env at runtime. Because plugins are built conditionally,
		// better-auth's endpoint inference can't surface it in auth.api's
		// static type — access it through a minimal typed interface.
		const api = auth.api as typeof auth.api & {
			signInMagicLink(args: {
				body: { email: string; callbackURL?: string };
				headers: Headers;
			}): Promise<unknown>;
		};
		await api.signInMagicLink({
			body: {
				email,
				callbackURL: cancelUrl ?? `${url.origin}/dashboard`
			},
			headers: request.headers
		});
	} catch (e: unknown) {
		magicLinkSent = false;
		logger.warn('[guest-checkout] magic link send failed', {
			error: e instanceof Error ? e.message : String(e)
		});
	}

	const testMode = env.CREEM_TEST_MODE ?? true;
	const creem = new Creem({ apiKey, server: testMode ? 'test' : 'prod' });

	// successUrl must stay same-origin — an absolute external URL would be
	// an open redirect landing users on an attacker site after checkout.
	let resolvedSuccessUrl = `${url.origin}/dashboard?subscription=success`;
	if (successUrl) {
		const candidate = new URL(successUrl, url.origin);
		if (candidate.origin !== url.origin) {
			throw error(400, 'successUrl must be a same-origin URL');
		}
		resolvedSuccessUrl = candidate.toString();
	}

	const checkout = await creem.checkouts.create({
		productId,
		customer: { email },
		successUrl: resolvedSuccessUrl,
		metadata: { referenceId: userId, source: 'guest-checkout' }
	});

	const checkoutUrl =
		(checkout as { checkoutUrl?: string; url?: string }).checkoutUrl ??
		(checkout as { url?: string }).url;
	if (!checkoutUrl) throw error(502, 'No checkout URL returned from Creem');

	return json({ url: checkoutUrl, magicLinkSent });
};

async function findOrCreateUser(email: string): Promise<string> {
	const pool = await getDB();
	const existing = await pool.query<{ id: string }>(
		'SELECT id FROM "user" WHERE email = $1 LIMIT 1',
		[email]
	);
	if (existing.rows[0]) return existing.rows[0].id;

	const randomPassword = crypto.randomUUID() + crypto.randomUUID();
	const result = await auth.api.signUpEmail({
		body: {
			email,
			password: randomPassword,
			name: email.split('@')[0] ?? email
		}
	});
	const user = (result as { user?: { id: string } }).user;
	if (!user?.id) throw error(500, 'Failed to create account');
	return user.id;
}
