-- 0020_order_lifecycle.sql
-- The order state machine, billing capture and a financial audit trail.
--
-- `purchase` was a receipt: a row appeared once money had moved. An invoice
-- rail needs the order to exist *before* payment, because the invoice has to
-- reference something and the buyer needs a page to look at while funds clear.
-- So the row now spans draft -> awaiting_payment -> paid -> activated.
--
-- Status meanings:
--   draft            created, not yet presented to the buyer
--   awaiting_payment invoice or session issued, money not confirmed
--   paid             funds confirmed, entitlement not yet granted
--   activated        entitlement granted; this is the only state that implies access
--   partially_paid   underpaid; held for review rather than guessed at
--   requires_review  overpaid or unmatched; a human must decide
--   failed / cancelled / expired / refunded

ALTER TABLE "purchase" DROP CONSTRAINT IF EXISTS "purchase_status_check";

UPDATE "purchase" SET "status" = 'activated' WHERE "status" = 'paid';

ALTER TABLE "purchase" ADD CONSTRAINT "purchase_status_check"
	CHECK ("status" IN ('draft', 'awaiting_payment', 'paid', 'activated',
	                    'partially_paid', 'requires_review', 'failed',
	                    'cancelled', 'expired', 'refunded'));

-- An order exists before it has a Stripe reference, so the earlier rule that
-- required one is too strict while the order is still being assembled.
ALTER TABLE "purchase" DROP CONSTRAINT IF EXISTS "purchase_reference_present";
ALTER TABLE "purchase" ADD CONSTRAINT "purchase_reference_present"
	CHECK ("stripe_session_id" IS NOT NULL
	    OR "stripe_invoice_id" IS NOT NULL
	    OR "status" IN ('draft', 'awaiting_payment', 'cancelled', 'expired'));

ALTER TABLE "purchase" ADD COLUMN IF NOT EXISTS "billing" jsonb;
ALTER TABLE "purchase" ADD COLUMN IF NOT EXISTS "country" text;
ALTER TABLE "purchase" ADD COLUMN IF NOT EXISTS "tax_id" text;
ALTER TABLE "purchase" ADD COLUMN IF NOT EXISTS "invoice_number" text;
ALTER TABLE "purchase" ADD COLUMN IF NOT EXISTS "hosted_invoice_url" text;
ALTER TABLE "purchase" ADD COLUMN IF NOT EXISTS "due_at" timestamptz;
ALTER TABLE "purchase" ADD COLUMN IF NOT EXISTS "amount_paid_minor" integer NOT NULL DEFAULT 0;
ALTER TABLE "purchase" ADD COLUMN IF NOT EXISTS "activated_at" timestamptz;

CREATE INDEX IF NOT EXISTS "purchase_status_idx" ON "purchase" ("status");

COMMENT ON COLUMN "purchase"."amount_paid_minor" IS
	'Sum confirmed by Stripe. Compared with amount_minor to detect under/overpayment.';
COMMENT ON COLUMN "purchase"."billing" IS
	'Company, address, email and country as supplied at invoice request.';

-- Financial and access-control audit. Separate from `audit_event`, which is
-- organisation-scoped and a guest purchase may have no organisation yet.
CREATE TABLE IF NOT EXISTS "purchase_event" (
	"id" text PRIMARY KEY,
	"purchase_id" text NOT NULL REFERENCES "purchase" ("id") ON DELETE CASCADE,
	"event_type" text NOT NULL,
	"detail" jsonb,
	"created_at" timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "purchase_event_purchase_idx"
	ON "purchase_event" ("purchase_id", "created_at");

COMMENT ON TABLE "purchase_event" IS
	'Append-only record of every state change and access grant for a purchase.';
