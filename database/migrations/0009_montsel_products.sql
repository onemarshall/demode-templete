-- 0009_montsel_products.sql
-- Montsel product access, work state and outputs (UI specification §4 and §8).
--
-- Display metadata, routes and lifecycle for products live in code
-- (src/lib/modules/products/shared/registry.ts). This table is the referential
-- anchor that stops entitlement, work and output rows naming an unknown product.
-- Entitlement is brand-scoped: a brand belongs to exactly one organisation, so
-- the composite foreign keys below also enforce the §5 same-organisation rule.

CREATE TABLE "product" (
	"key" text PRIMARY KEY,
	"family" text NOT NULL CHECK ("family" IN ('diagnostic', 'strategy', 'tool')),
	"pricing_mode" text NOT NULL CHECK ("pricing_mode" IN ('free', 'paid')),
	"lifecycle" text NOT NULL CHECK ("lifecycle" IN ('planned', 'available', 'retired')),
	"created_at" timestamptz NOT NULL DEFAULT now()
);

INSERT INTO "product" ("key", "family", "pricing_mode", "lifecycle") VALUES
	('diagnostic.signal', 'diagnostic', 'paid', 'available'),
	('diagnostic.gap', 'diagnostic', 'paid', 'available'),
	('diagnostic.direction', 'diagnostic', 'paid', 'available'),
	('diagnostic.full', 'diagnostic', 'paid', 'available'),
	('strategy', 'strategy', 'paid', 'available'),
	('tool.visual_contract', 'tool', 'free', 'available'),
	('tool.think_act_decide', 'tool', 'paid', 'planned');

-- Authorised access to a product for one brand. Ownership is never inferred
-- from a URL, a display name or a subscription plan name (§4, §8 invariant 3).
CREATE TABLE "product_entitlement" (
	"id" text PRIMARY KEY,
	"organisation_id" text NOT NULL,
	"brand_id" text NOT NULL,
	"product_key" text NOT NULL REFERENCES "product" ("key") ON DELETE RESTRICT,
	"source" text NOT NULL CHECK ("source" IN ('purchase', 'grant', 'migration')),
	"status" text NOT NULL DEFAULT 'active' CHECK ("status" IN ('active', 'revoked', 'expired')),
	"effective_from" timestamptz NOT NULL DEFAULT now(),
	"effective_to" timestamptz,
	"purchase_reference" text,
	"created_at" timestamptz NOT NULL DEFAULT now(),
	"updated_at" timestamptz NOT NULL DEFAULT now(),
	CONSTRAINT "product_entitlement_brand_organisation_fk"
		FOREIGN KEY ("brand_id", "organisation_id")
		REFERENCES "brand" ("id", "organisation_id") ON DELETE RESTRICT,
	CONSTRAINT "product_entitlement_period_valid"
		CHECK ("effective_to" IS NULL OR "effective_to" > "effective_from")
);
-- One live entitlement per brand and product; historical rows are retained.
CREATE UNIQUE INDEX "product_entitlement_active_unique"
	ON "product_entitlement" ("brand_id", "product_key") WHERE "status" = 'active';
CREATE INDEX "product_entitlement_brand_idx" ON "product_entitlement" ("brand_id", "product_key");

-- A unit of product work. `resume_path` is the only routing authority for
-- Continue; progress values are stored, never inferred by the UI (§8 invariant 6).
CREATE TABLE "work_item" (
	"id" text PRIMARY KEY,
	"organisation_id" text NOT NULL,
	"brand_id" text NOT NULL,
	"product_key" text NOT NULL REFERENCES "product" ("key") ON DELETE RESTRICT,
	"parent_work_item_id" text,
	"created_by" text REFERENCES "user" ("id") ON DELETE SET NULL,
	"title" text,
	"state" text NOT NULL CHECK ("state" IN ('not_started', 'in_progress', 'awaiting_decision', 'completed')),
	"current_step_key" text,
	"current_step_label" text,
	"steps_completed" integer NOT NULL DEFAULT 0 CHECK ("steps_completed" >= 0),
	"steps_total" integer CHECK ("steps_total" IS NULL OR "steps_total" > 0),
	"resume_path" text,
	"started_at" timestamptz,
	"last_activity_at" timestamptz,
	"completed_at" timestamptz,
	"created_at" timestamptz NOT NULL DEFAULT now(),
	"updated_at" timestamptz NOT NULL DEFAULT now(),
	CONSTRAINT "work_item_brand_organisation_fk"
		FOREIGN KEY ("brand_id", "organisation_id")
		REFERENCES "brand" ("id", "organisation_id") ON DELETE RESTRICT,
	CONSTRAINT "work_item_progress_valid"
		CHECK ("steps_total" IS NULL OR "steps_completed" <= "steps_total"),
	CONSTRAINT "work_item_completed_requires_timestamp"
		CHECK ("state" <> 'completed' OR "completed_at" IS NOT NULL),
	-- Composite key supports the same-brand parent and child-output references.
	CONSTRAINT "work_item_id_scope_unique" UNIQUE ("id", "organisation_id", "brand_id")
);
ALTER TABLE "work_item" ADD CONSTRAINT "work_item_parent_same_brand_fk"
	FOREIGN KEY ("parent_work_item_id", "organisation_id", "brand_id")
	REFERENCES "work_item" ("id", "organisation_id", "brand_id") ON DELETE RESTRICT;
CREATE INDEX "work_item_brand_product_idx" ON "work_item" ("brand_id", "product_key", "last_activity_at" DESC);
CREATE INDEX "work_item_parent_idx" ON "work_item" ("parent_work_item_id");

-- A completed output. Capabilities describe what the output can actually do:
-- a shareable web page is not a downloadable file (§8 invariant 5).
CREATE TABLE "output" (
	"id" text PRIMARY KEY,
	"organisation_id" text NOT NULL,
	"brand_id" text NOT NULL,
	"product_key" text NOT NULL REFERENCES "product" ("key") ON DELETE RESTRICT,
	"work_item_id" text,
	"title" text NOT NULL,
	"format" text NOT NULL CHECK ("format" IN ('web_page', 'report', 'document')),
	"share_slug" text,
	"can_view" boolean NOT NULL DEFAULT true,
	"can_share" boolean NOT NULL DEFAULT false,
	"can_download" boolean NOT NULL DEFAULT false,
	"created_at" timestamptz NOT NULL DEFAULT now(),
	"updated_at" timestamptz NOT NULL DEFAULT now(),
	CONSTRAINT "output_brand_organisation_fk"
		FOREIGN KEY ("brand_id", "organisation_id")
		REFERENCES "brand" ("id", "organisation_id") ON DELETE RESTRICT,
	CONSTRAINT "output_work_item_same_brand_fk"
		FOREIGN KEY ("work_item_id", "organisation_id", "brand_id")
		REFERENCES "work_item" ("id", "organisation_id", "brand_id") ON DELETE RESTRICT,
	CONSTRAINT "output_share_requires_slug"
		CHECK (NOT "can_share" OR "share_slug" IS NOT NULL),
	CONSTRAINT "output_download_requires_file_format"
		CHECK (NOT "can_download" OR "format" IN ('report', 'document'))
);
CREATE UNIQUE INDEX "output_share_slug_unique"
	ON "output" ("share_slug") WHERE "share_slug" IS NOT NULL;
CREATE INDEX "output_brand_created_idx" ON "output" ("brand_id", "created_at" DESC);
CREATE INDEX "output_work_item_idx" ON "output" ("work_item_id");

-- A decision the workflow requires. Viewing or completing a stage is not an
-- approval (§5.3); only a recorded decision is.
CREATE TABLE "approval" (
	"id" text PRIMARY KEY,
	"organisation_id" text NOT NULL,
	"brand_id" text NOT NULL,
	"work_item_id" text NOT NULL,
	"step_key" text NOT NULL,
	"state" text NOT NULL CHECK ("state" IN ('requested', 'approved', 'rejected')),
	"requested_at" timestamptz NOT NULL DEFAULT now(),
	"decided_at" timestamptz,
	"decided_by" text REFERENCES "user" ("id") ON DELETE SET NULL,
	"created_at" timestamptz NOT NULL DEFAULT now(),
	CONSTRAINT "approval_brand_organisation_fk"
		FOREIGN KEY ("brand_id", "organisation_id")
		REFERENCES "brand" ("id", "organisation_id") ON DELETE RESTRICT,
	CONSTRAINT "approval_work_item_same_brand_fk"
		FOREIGN KEY ("work_item_id", "organisation_id", "brand_id")
		REFERENCES "work_item" ("id", "organisation_id", "brand_id") ON DELETE CASCADE,
	CONSTRAINT "approval_decision_consistency"
		CHECK (
			("state" = 'requested' AND "decided_at" IS NULL AND "decided_by" IS NULL)
			OR ("state" IN ('approved', 'rejected') AND "decided_at" IS NOT NULL)
		)
);
CREATE UNIQUE INDEX "approval_pending_unique"
	ON "approval" ("work_item_id", "step_key") WHERE "state" = 'requested';
CREATE INDEX "approval_brand_state_idx" ON "approval" ("brand_id", "state");
