-- 0015_stripe_only.sql
-- Stripe is the only payment rail (owner decision, 29 October 2026).
--
-- 0014 modelled two rails: Dodo for self-service card sales, Stripe for
-- consultancy invoices. That split is retired along with Creem. A column that
-- can hold exactly one value does not record a decision; it invites a branch
-- that will never be taken, and it makes the schema claim an optionality the
-- business does not have.
--
-- The rail is stated once in code. What the engagement keeps is what it
-- actually needs: `stripe_invoice_ref` for a consultancy invoice, and
-- `currency`/`amount_minor` for the price that was agreed.

-- The vacuous consistency check went with the column it compared.
ALTER TABLE "diagnostic_engagement" DROP CONSTRAINT "diagnostic_engagement_consultancy_rail";

-- The trigger must stop naming the column before the column is gone.
CREATE OR REPLACE FUNCTION "prevent_engagement_identity_change"()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
	IF NEW."organisation_id" <> OLD."organisation_id"
	   OR NEW."brand_id" <> OLD."brand_id"
	   OR NEW."product_key" <> OLD."product_key"
	   OR NEW."family" <> OLD."family"
	   OR NEW."delivery_route" <> OLD."delivery_route"
	   OR NEW."report_mode" <> OLD."report_mode" THEN
		RAISE EXCEPTION 'engagement identity and route are fixed at creation';
	END IF;
	NEW."updated_at" := now();
	RETURN NEW;
END;
$$;

ALTER TABLE "diagnostic_engagement" DROP COLUMN "payment_rail";
ALTER TABLE "product" DROP COLUMN "payment_rail";
