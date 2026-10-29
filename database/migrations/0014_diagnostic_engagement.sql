-- 0014_diagnostic_engagement.sql
-- The engagement: one commissioned piece of Diagnostic work (plan Workstream 1).
--
-- An engagement is the unit that binds a product variant, a delivery route, a
-- payment rail, the intake the customer supplied and the engine run that will
-- answer it. It exists before payment because a consultancy enquiry is not yet
-- a sale, and it survives delivery because the report has to stay attributable.
--
-- Route and rail are copied from the product at creation and then frozen. The
-- plan's rule is that a route switch never retroactively changes delivered
-- work; a trigger, not a convention, enforces that.
--
-- `product.delivery_route` and `payment_rail` stay nullable: `product` also
-- holds Strategy and the tools, which have no delivery route at all.

ALTER TABLE "product" ADD COLUMN "delivery_route" text
	CHECK ("delivery_route" IN ('montsel_self_service', 'langfell_consultancy'));
ALTER TABLE "product" ADD COLUMN "payment_rail" text
	CHECK ("payment_rail" IN ('dodo', 'stripe'));

-- The four current Diagnostic keys are the self-service family. Consultancy
-- variants arrive as their own product keys, so no existing key changes route.
UPDATE "product"
SET "delivery_route" = 'montsel_self_service', "payment_rail" = 'dodo'
WHERE "family" = 'diagnostic';

-- Maps an Auth brand to the engine's brand. No foreign key: the engine keeps
-- its own ids and must stay rebuildable from its own records.
CREATE TABLE "brand_engine_ref" (
	"brand_id" text PRIMARY KEY,
	"organisation_id" text NOT NULL,
	"engine_brand_id" integer NOT NULL,
	"engine_brand_slug" text NOT NULL,
	"created_by" text REFERENCES "user" ("id") ON DELETE SET NULL,
	"created_at" timestamptz NOT NULL DEFAULT now(),
	CONSTRAINT "brand_engine_ref_brand_organisation_fk"
		FOREIGN KEY ("brand_id", "organisation_id")
		REFERENCES "brand" ("id", "organisation_id") ON DELETE CASCADE
);

CREATE TABLE "diagnostic_engagement" (
	"id" text PRIMARY KEY,
	"organisation_id" text NOT NULL,
	"brand_id" text NOT NULL,
	"work_item_id" text NOT NULL,
	"product_key" text NOT NULL REFERENCES "product" ("key") ON DELETE RESTRICT,
	"family" text NOT NULL CHECK ("family" IN ('signal', 'gap', 'direction', 'full')),
	-- Mirrors the engine's `report_depth`. Signal self-service is `automated`;
	-- a consultancy engagement carries the human-review depth it was sold at.
	"depth" text NOT NULL CHECK ("depth" IN ('automated', 'reviewed', 'strategic', 'handoff')),
	"delivery_route" text NOT NULL
		CHECK ("delivery_route" IN ('montsel_self_service', 'langfell_consultancy')),
	"payment_rail" text NOT NULL CHECK ("payment_rail" IN ('dodo', 'stripe')),
	-- The product plane only. A prospecting or outreach run can never be
	-- recorded here, which is the plan's plane-separation rule in schema form.
	"report_mode" text NOT NULL DEFAULT 'website_order'
		CHECK ("report_mode" = 'website_order'),
	"status" text NOT NULL DEFAULT 'enquired'
		CHECK ("status" IN ('enquired', 'scoped', 'quoted', 'invoiced', 'paid',
		                    'in_delivery', 'delivered', 'declined', 'withdrawn')),
	-- The declared intake. The engine receives an engagement reference, not a
	-- caller-supplied path, so the app is the only place this is recorded.
	"intake" jsonb NOT NULL,
	"data_classification" text NOT NULL DEFAULT 'client_confidential'
		CHECK ("data_classification" IN ('public', 'client_confidential', 'internal')),
	"capture_provider" text,
	"assigned_strategist" text,
	"engine_run_ref" text,
	"parent_engagement_id" text,
	"commissioned_decision" text,
	"decision_owner" text,
	"intended_reader" text,
	"decision_timing" text,
	"currency" text CHECK ("currency" IS NULL OR "currency" ~ '^[A-Z]{3}$'),
	"amount_minor" integer CHECK ("amount_minor" IS NULL OR "amount_minor" >= 0),
	"stripe_invoice_ref" text,
	"consultant_minutes" integer CHECK ("consultant_minutes" IS NULL OR "consultant_minutes" >= 0),
	"requested_by" text REFERENCES "user" ("id") ON DELETE SET NULL,
	"created_at" timestamptz NOT NULL DEFAULT now(),
	"updated_at" timestamptz NOT NULL DEFAULT now(),
	CONSTRAINT "diagnostic_engagement_brand_organisation_fk"
		FOREIGN KEY ("brand_id", "organisation_id")
		REFERENCES "brand" ("id", "organisation_id") ON DELETE RESTRICT,
	CONSTRAINT "diagnostic_engagement_work_item_same_brand_fk"
		FOREIGN KEY ("work_item_id", "organisation_id", "brand_id")
		REFERENCES "work_item" ("id", "organisation_id", "brand_id") ON DELETE RESTRICT,
	CONSTRAINT "diagnostic_engagement_parent_same_brand_fk"
		FOREIGN KEY ("parent_engagement_id", "organisation_id", "brand_id")
		REFERENCES "diagnostic_engagement" ("id", "organisation_id", "brand_id") ON DELETE RESTRICT,
	CONSTRAINT "diagnostic_engagement_id_scope_unique"
		UNIQUE ("id", "organisation_id", "brand_id"),
	-- A consultancy engagement is only sold with a named strategist for the
	-- variants that need judgement.
	CONSTRAINT "diagnostic_engagement_strategist_required"
		CHECK ("family" NOT IN ('direction', 'full')
		       OR "delivery_route" <> 'langfell_consultancy'
		       OR "status" IN ('enquired', 'scoped', 'declined', 'withdrawn')
		       OR "assigned_strategist" IS NOT NULL),
	-- A quoted engagement carries the price that was agreed, so a later
	-- price-matrix change cannot rewrite what the client accepted.
	CONSTRAINT "diagnostic_engagement_price_complete"
		CHECK (("currency" IS NULL) = ("amount_minor" IS NULL)),
	CONSTRAINT "diagnostic_engagement_consultancy_rail"
		CHECK (("delivery_route" = 'langfell_consultancy') = ("payment_rail" = 'stripe')),
	CONSTRAINT "diagnostic_engagement_self_service_depth"
		CHECK ("delivery_route" <> 'montsel_self_service' OR "depth" = 'automated')
);
-- One engine run per engagement. The engine's ledger is the other half of this
-- pair, so a duplicate reference means the two planes disagree.
CREATE UNIQUE INDEX "diagnostic_engagement_engine_run_unique"
	ON "diagnostic_engagement" ("engine_run_ref") WHERE "engine_run_ref" IS NOT NULL;
-- One engagement per work item: re-entering the intake resumes the existing
-- engagement instead of commissioning a second one for the same work.
CREATE UNIQUE INDEX "diagnostic_engagement_work_item_unique"
	ON "diagnostic_engagement" ("work_item_id");
CREATE INDEX "diagnostic_engagement_brand_status_idx"
	ON "diagnostic_engagement" ("brand_id", "status", "created_at" DESC);
CREATE INDEX "diagnostic_engagement_parent_idx"
	ON "diagnostic_engagement" ("parent_engagement_id");

-- Identity and route are fixed at creation. Status, delivery fields and price
-- move; what the engagement *is* does not.
CREATE OR REPLACE FUNCTION "prevent_engagement_identity_change"()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
	IF NEW."organisation_id" <> OLD."organisation_id"
	   OR NEW."brand_id" <> OLD."brand_id"
	   OR NEW."product_key" <> OLD."product_key"
	   OR NEW."family" <> OLD."family"
	   OR NEW."delivery_route" <> OLD."delivery_route"
	   OR NEW."payment_rail" <> OLD."payment_rail"
	   OR NEW."report_mode" <> OLD."report_mode" THEN
		RAISE EXCEPTION 'engagement identity, route and rail are fixed at creation';
	END IF;
	NEW."updated_at" := now();
	RETURN NEW;
END;
$$;

CREATE TRIGGER "diagnostic_engagement_identity_fixed"
	BEFORE UPDATE ON "diagnostic_engagement"
	FOR EACH ROW EXECUTE FUNCTION "prevent_engagement_identity_change"();
