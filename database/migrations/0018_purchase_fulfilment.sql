-- 0018_purchase_fulfilment.sql
-- Consent, refunds and the entitlement a purchase produced.
--
-- `cancellation_consent_at` records the moment the buyer expressly agreed to
-- immediate supply of digital content. Under the UK Consumer Contracts
-- Regulations 2013 (reg. 37), the 14-day cancellation right is lost only when
-- supply began with the consumer's express consent and their acknowledgement
-- that the right is lost. Recording the timestamp is how we prove which of the
-- two regimes applied; a boolean would not say when.
--
-- `refunded_at` is separate from `status` so a refund keeps the original
-- payment facts. Status says what the money did; this says when we learned it.

ALTER TABLE "purchase" ADD COLUMN IF NOT EXISTS "cancellation_consent_at" timestamptz;
ALTER TABLE "purchase" ADD COLUMN IF NOT EXISTS "refunded_at" timestamptz;
ALTER TABLE "purchase" ADD COLUMN IF NOT EXISTS "entitlement_id" text
	REFERENCES "product_entitlement" ("id") ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS "purchase_refunded_idx"
	ON "purchase" ("refunded_at") WHERE "refunded_at" IS NOT NULL;

COMMENT ON COLUMN "purchase"."cancellation_consent_at" IS
	'When the buyer consented to immediate supply. NULL means the 14-day right was not waived.';
COMMENT ON COLUMN "purchase"."entitlement_id" IS
	'The entitlement this purchase created. NULL for books, which have no product row.';
