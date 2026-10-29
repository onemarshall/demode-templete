-- 0016_purchase.sql
-- One-time purchase record for Montsel software and books.
--
-- The Better Auth Stripe plugin owns subscriptions and a `subscription` table.
-- Nothing in the catalogue is recurring, so that table is not the record of a
-- sale. A purchase is: one Stripe Checkout Session paid once, attributable to
-- one user, naming one plan.
--
-- `product_key` is nullable because books and practical products have no row in
-- `product`, which anchors the software families only. A book sale is still a
-- real sale; it just has nothing to reference.
--
-- Idempotency: Stripe may deliver `checkout.session.completed` more than once.
-- The unique session id makes replay a no-op rather than a second sale.

CREATE TABLE "purchase" (
	"id" text PRIMARY KEY,
	"user_id" text REFERENCES "user" ("id") ON DELETE SET NULL,
	"plan_id" text NOT NULL,
	"product_key" text REFERENCES "product" ("key") ON DELETE RESTRICT,
	"stripe_session_id" text NOT NULL,
	"stripe_payment_intent" text,
	"stripe_customer_id" text,
	"amount_minor" integer NOT NULL CHECK ("amount_minor" >= 0),
	"currency" text NOT NULL CHECK ("currency" ~ '^[A-Z]{3}$'),
	"status" text NOT NULL DEFAULT 'paid'
		CHECK ("status" IN ('paid', 'refunded', 'failed')),
	"livemode" boolean NOT NULL DEFAULT false,
	"created_at" timestamptz NOT NULL DEFAULT now(),
	"updated_at" timestamptz NOT NULL DEFAULT now(),
	CONSTRAINT "purchase_session_unique" UNIQUE ("stripe_session_id")
);

CREATE INDEX "purchase_user_idx" ON "purchase" ("user_id", "created_at" DESC);
CREATE INDEX "purchase_plan_idx" ON "purchase" ("plan_id");

COMMENT ON TABLE "purchase" IS
	'One paid Stripe Checkout Session. Fulfilment reads this, not the Stripe API.';
COMMENT ON COLUMN "purchase"."livemode" IS
	'False for test-mode purchases. Reporting must filter on this before counting revenue.';
