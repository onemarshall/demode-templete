-- 0019_purchase_invoice_rail.sql
-- Let a purchase be settled by an invoice instead of a Checkout Session.
--
-- Route B (Stripe Invoicing) produces an invoice id, not a session id. The
-- original column was named for the only rail that existed; rather than store
-- an invoice id in a column called `stripe_session_id`, the two references are
-- separated and exactly one must be present.
--
-- `payment_rail` records which route produced the sale, because a refund, a
-- reconciliation query and an accounts export all need to know.

ALTER TABLE "purchase" ALTER COLUMN "stripe_session_id" DROP NOT NULL;

ALTER TABLE "purchase" ADD COLUMN IF NOT EXISTS "stripe_invoice_id" text;

ALTER TABLE "purchase" ADD COLUMN IF NOT EXISTS "payment_rail" text NOT NULL
	DEFAULT 'checkout'
	CHECK ("payment_rail" IN ('checkout', 'stripe_invoice', 'external_invoice'));

CREATE UNIQUE INDEX IF NOT EXISTS "purchase_invoice_unique"
	ON "purchase" ("stripe_invoice_id")
	WHERE "stripe_invoice_id" IS NOT NULL;

ALTER TABLE "purchase" ADD CONSTRAINT "purchase_reference_present"
	CHECK ("stripe_session_id" IS NOT NULL OR "stripe_invoice_id" IS NOT NULL);

COMMENT ON COLUMN "purchase"."payment_rail" IS
	'checkout = Route A card session; stripe_invoice = Route B; external_invoice = Route C, reconciled by hand.';
