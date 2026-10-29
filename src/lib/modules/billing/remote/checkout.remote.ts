import { command, getRequestEvent } from "$app/server";
import { error } from "@sveltejs/kit";
import Stripe from "stripe";
import { z } from "zod";
import { auth } from "#lib/modules/auth/server/config.js";
import { getDB } from "#lib/platform/database/db.js";
import { publicEnv } from "#lib/platform/config/index.js";
import { getServerEnv } from '#lib/platform/config/server.server.js';
import { priceIdForPlan } from "#lib/app/stripe-plans.server.js";
import { getVatConfig } from "#lib/app/vat.server.js";
import { logger } from "#lib/platform/logger.js";
import { getClientIp, getIdentifier } from "#lib/modules/auth/security/core/helpers.js";
import { slidingWindowCheck } from "#lib/modules/auth/security/features/rate-limit/sliding-window.js";
import { validateBypassToken } from "#lib/modules/auth/security/endpoints/captcha.js";

// Rate limit: per-IP guards against a single source spraying random emails,
// per-email guards against many sources hammering one address.
const IP_LIMIT = 8; // per minute
const IP_WINDOW_SECONDS = 60;
const EMAIL_LIMIT = 3; // per hour
const EMAIL_WINDOW_SECONDS = 60 * 60;

const checkoutSchema = z.object({
  productId: z.string().min(1),
  // Required only when the caller is not signed in. Signed-in buyers already
  // have an email on the user row.
  email: z.string().email().max(254).optional(),
  successUrl: z.string().optional(),
  cancelUrl: z.string().optional(),
  // Required. Under the UK Consumer Contracts Regulations 2013 (reg. 37) the
  // 14-day cancellation right for digital content is lost only if supply began
  // with the buyer's express consent and acknowledgement. Without this the
  // buyer keeps the right, so we refuse rather than assume it away.
  cancellationConsent: z.boolean(),
  // Bypass token issued by /api/auth captcha/verify after the user solves
  // the cap.js widget on the pricing page. Required when the security
  // plugin is enabled in production.
  captchaBypassToken: z.string().min(10).max(256).optional(),
});

function captchaIsRequired(): boolean {
  return process.env.NODE_ENV === "production" && Boolean(publicEnv.PUBLIC_AUTH_SECURITY_PLUGIN);
}

/**
 * Start a one-time purchase.
 *
 * Every catalogue product is a single payment, so the session is created in
 * `payment` mode. Nothing here creates a subscription: the Better Auth Stripe
 * plugin owns subscriptions and is not used for this catalogue.
 */
export const createCheckout = command(checkoutSchema, async (data) => {
  const { request, url } = getRequestEvent();
  const env = await getServerEnv();
  if (!publicEnv.PUBLIC_STRIPE_ENABLED) error(503, "Billing is not enabled");
  const secretKey = env.STRIPE_SECRET_KEY as string | undefined;
  if (!secretKey) error(503, "Stripe is not configured");

  const { productId, email: rawEmail, successUrl, cancelUrl, cancellationConsent, captchaBypassToken } = data;

  if (!cancellationConsent) {
    error(
      400,
      "Confirm that you want immediate access and understand that you lose the 14-day cancellation right.",
    );
  }

  const priceId = priceIdForPlan(env, productId);
  if (!priceId) error(400, "Unknown or unpriced product");

  const session = await auth.api.getSession({ headers: request.headers });
  const signedInUserId = session?.user?.id;

  if (!signedInUserId && !rawEmail) error(400, "An email address is required");

  const email = (rawEmail ?? session?.user?.email ?? "").trim().toLowerCase();
  const ip = getClientIp(request);

  // 1. Rate limit before we touch the database or call Stripe.
  const ipLimit = await slidingWindowCheck(`checkout:ip:${ip}`, IP_LIMIT, IP_WINDOW_SECONDS);
  if (ipLimit.limited) {
    logger.warn("[checkout] IP rate limit exceeded", { ip });
    error(429, "Too many checkout attempts. Try again shortly.");
  }

  if (!signedInUserId) {
    const emailLimit = await slidingWindowCheck(
      `checkout:email:${email}`,
      EMAIL_LIMIT,
      EMAIL_WINDOW_SECONDS,
    );
    if (emailLimit.limited) {
      logger.warn("[checkout] email rate limit exceeded", { email });
      error(429, "Too many checkout attempts for this email. Try again later.");
    }
  }

  // 2. Captcha bypass token: when present, must match the identifier the
  //    verify endpoint stored it against (anon:{ip}:{ua-hash} for guests).
  //    When required by config and missing, refuse.
  if (captchaBypassToken) {
    const identifier = getIdentifier(request);
    const ok = await validateBypassToken(captchaBypassToken, identifier);
    if (!ok) {
      logger.warn("[checkout] invalid captcha bypass token", { ip });
      error(403, "Captcha verification expired. Please retry.");
    }
  } else if (!signedInUserId && captchaIsRequired()) {
    logger.warn("[checkout] captcha bypass token missing in production", { ip });
    error(403, "Captcha verification required.");
  }

  const userId = signedInUserId ?? (await findOrCreateUser(email));

  // 3. Magic-link send is best-effort but no longer fire-and-forget — we
  //    want to log a real error rather than an unhandled rejection.
  let magicLinkSent = true;
  if (!signedInUserId) {
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
        body: { email, callbackURL: cancelUrl ?? `${url.origin}/dashboard` },
        headers: request.headers,
      });
    } catch (e: unknown) {
      magicLinkSent = false;
      logger.warn("[checkout] magic link send failed", {
        error: e instanceof Error ? e.message : String(e),
      });
    }
  }

  const stripe = new Stripe(secretKey);

  // successUrl must stay same-origin — an absolute external URL would be
  // an open redirect landing users on an attacker site after checkout.
  let resolvedSuccessUrl = `${url.origin}/auth/purchase/success?session_id={CHECKOUT_SESSION_ID}`;
  if (successUrl) {
    const candidate = new URL(successUrl, url.origin);
    if (candidate.origin !== url.origin) {
      error(400, "successUrl must be a same-origin URL");
    }
    resolvedSuccessUrl = candidate.toString();
  }

  let resolvedCancelUrl = `${url.origin}/auth/pricing?checkout=canceled`;
  if (cancelUrl) {
    const candidate = new URL(cancelUrl, url.origin);
    if (candidate.origin !== url.origin) {
      error(400, "cancelUrl must be a same-origin URL");
    }
    resolvedCancelUrl = candidate.toString();
  }

  // The purchase is attributable to the user row, so the customer must exist
  // before checkout starts.
  const customerId = await ensureStripeCustomer(stripe, userId, email);

  const vat = getVatConfig(env);
  const consentAt = new Date().toISOString();
  const metadata = {
    referenceId: userId,
    plan: productId,
    cancellationConsentAt: consentAt,
  };

  const checkoutSession = await stripe.checkout.sessions.create({
    mode: "payment",
    customer: customerId,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: resolvedSuccessUrl,
    cancel_url: resolvedCancelUrl,
    client_reference_id: userId,
    metadata,
    // The purchase record is written from the webhook, which reads this
    // metadata. Payment intent metadata keeps it reachable from the charge.
    payment_intent_data: { metadata },
    // Stripe Tax is only meaningful once the prices carry a tax_behavior and
    // a registration exists; getVatConfig keeps it off until then.
    automatic_tax: { enabled: vat.automaticTax },
  });

  const checkoutUrl = checkoutSession.url;
  if (!checkoutUrl) error(502, "No checkout URL returned from Stripe");

  return { url: checkoutUrl, magicLinkSent };
});

async function ensureStripeCustomer(stripe: Stripe, userId: string, email: string): Promise<string> {
  const pool = await getDB();
  const existing = await pool.query<{ stripeCustomerId: string | null }>(
    'SELECT "stripeCustomerId" FROM "user" WHERE id = $1 LIMIT 1',
    [userId],
  );
  const customerId = existing.rows[0]?.stripeCustomerId;
  if (customerId) return customerId;

  const customer = await stripe.customers.create({
    email,
    metadata: { referenceId: userId },
  });
  await pool.query('UPDATE "user" SET "stripeCustomerId" = $1 WHERE id = $2', [
    customer.id,
    userId,
  ]);
  return customer.id;
}

async function findOrCreateUser(email: string): Promise<string> {
  const pool = await getDB();
  const existing = await pool.query<{ id: string }>('SELECT id FROM "user" WHERE email = $1 LIMIT 1', [
    email,
  ]);
  if (existing.rows[0]) return existing.rows[0].id;

  const randomPassword = crypto.randomUUID() + crypto.randomUUID();
  const result = await auth.api.signUpEmail({
    body: {
      email,
      password: randomPassword,
      name: email.split("@")[0] ?? email,
    },
  });
  const user = (result as { user?: { id: string } }).user;
  if (!user?.id) error(500, "Failed to create account");
  return user.id;
}
