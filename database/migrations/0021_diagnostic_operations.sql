-- 0021_diagnostic_operations.sql
-- The operational layer for the Montsel/Langfell diagnostic front end.
--
-- Adds consultant authority, pre-checkout eligibility, execution events,
-- section anchoring for client conversation, and the payment/entitlement links
-- an engagement needs. It does not change the engine's tables or the existing
-- order lifecycle; it composes with them.

-- 1. Consultant authority. A grant is engagement-scoped and never weakens the
-- client brand-role matrix. A Langfell consultant does not become a client
-- brand member.
CREATE TABLE "consultant_grant" (
	"id" text PRIMARY KEY,
	"user_id" text NOT NULL REFERENCES "user" ("id") ON DELETE CASCADE,
	"organisation_id" text NOT NULL,
	"brand_id" text NOT NULL,
	"engagement_id" text NOT NULL,
	"role" text NOT NULL CHECK ("role" IN ('reviewer', 'strategist', 'publisher')),
	"status" text NOT NULL DEFAULT 'active'
		CHECK ("status" IN ('active', 'revoked', 'expired')),
	"granted_by" text REFERENCES "user" ("id") ON DELETE SET NULL,
	"expires_at" timestamptz,
	"created_at" timestamptz NOT NULL DEFAULT now(),
	CONSTRAINT "consultant_grant_user_engagement_unique"
		UNIQUE ("user_id", "engagement_id"),
	CONSTRAINT "consultant_grant_engagement_scope_fk"
		FOREIGN KEY ("engagement_id", "organisation_id", "brand_id")
		REFERENCES "diagnostic_engagement" ("id", "organisation_id", "brand_id")
		ON DELETE CASCADE
);
CREATE INDEX "consultant_grant_user_idx"
	ON "consultant_grant" ("user_id", "status", "expires_at");
CREATE INDEX "consultant_grant_engagement_idx"
	ON "consultant_grant" ("engagement_id", "status");

-- 2. Eligibility. Checked before checkout and again at engagement start.
CREATE TABLE "diagnostic_eligibility" (
	"id" text PRIMARY KEY,
	"user_id" text REFERENCES "user" ("id") ON DELETE SET NULL,
	"organisation_id" text,
	"brand_id" text,
	"product_key" text NOT NULL REFERENCES "product" ("key") ON DELETE RESTRICT,
	"checked_by" text REFERENCES "user" ("id") ON DELETE SET NULL,
	"checked_at" timestamptz NOT NULL DEFAULT now(),
	"sector_intelligence_ref" text,
	"sector_intelligence_version_id" integer,
	"inputs_present" jsonb NOT NULL DEFAULT '{}'::jsonb,
	"result" text NOT NULL CHECK ("result" IN ('eligible', 'ineligible', 'needs_input')),
	"reasons" jsonb NOT NULL DEFAULT '[]'::jsonb,
	CONSTRAINT "diagnostic_eligibility_has_owner"
		CHECK ("user_id" IS NOT NULL OR "brand_id" IS NOT NULL),
	CONSTRAINT "diagnostic_eligibility_brand_organisation_fk"
		FOREIGN KEY ("brand_id", "organisation_id")
		REFERENCES "brand" ("id", "organisation_id") ON DELETE CASCADE
);
CREATE INDEX "diagnostic_eligibility_brand_product_idx"
	ON "diagnostic_eligibility" ("brand_id", "product_key", "checked_at" DESC);

-- 3. Execution events. Append-only, separate from the financial audit.
CREATE TABLE "diagnostic_run_event" (
	"id" text PRIMARY KEY,
	"engagement_id" text NOT NULL
		REFERENCES "diagnostic_engagement" ("id") ON DELETE CASCADE,
	"engine_run_id" text,
	"status" text NOT NULL,
	"stage" text,
	"message" text,
	"occurred_at" timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX "diagnostic_run_event_engagement_idx"
	ON "diagnostic_run_event" ("engagement_id", "occurred_at");

-- 4. Section manifest for a delivered version, so a client comment can anchor
-- to a stable section rather than a character offset in rendered HTML.
CREATE TABLE "output_version_section" (
	"id" text PRIMARY KEY,
	"output_version_id" text NOT NULL
		REFERENCES "output_version" ("id") ON DELETE CASCADE,
	"section_key" text NOT NULL,
	"heading" text NOT NULL,
	"section_order" integer NOT NULL CHECK ("section_order" >= 0),
	"content_hash" text,
	CONSTRAINT "output_version_section_unique"
		UNIQUE ("output_version_id", "section_key")
);
CREATE INDEX "output_version_section_version_idx"
	ON "output_version_section" ("output_version_id", "section_order");

-- 5. Client conversation. A thread never edits a report version; a correction
-- or revision is a new version with its own hash.
CREATE TABLE "report_comment_thread" (
	"id" text PRIMARY KEY,
	"organisation_id" text NOT NULL,
	"brand_id" text NOT NULL,
	"output_id" text NOT NULL REFERENCES "output" ("id") ON DELETE CASCADE,
	"output_version_id" text NOT NULL
		REFERENCES "output_version" ("id") ON DELETE CASCADE,
	"section_key" text,
	"anchor_quote" text,
	"anchor_offset" integer CHECK ("anchor_offset" IS NULL OR "anchor_offset" >= 0),
	"raised_by" text REFERENCES "user" ("id") ON DELETE SET NULL,
	"visibility" text NOT NULL DEFAULT 'client'
		CHECK ("visibility" IN ('client', 'internal')),
	"kind" text NOT NULL
		CHECK ("kind" IN ('question', 'revision_request', 'correction', 'explanation')),
	"status" text NOT NULL DEFAULT 'open'
		CHECK ("status" IN ('open', 'answered', 'resolved', 'closed')),
	"created_at" timestamptz NOT NULL DEFAULT now(),
	"updated_at" timestamptz NOT NULL DEFAULT now(),
	CONSTRAINT "report_comment_thread_brand_organisation_fk"
		FOREIGN KEY ("brand_id", "organisation_id")
		REFERENCES "brand" ("id", "organisation_id") ON DELETE CASCADE
);
CREATE INDEX "report_comment_thread_version_idx"
	ON "report_comment_thread" ("output_version_id", "status", "created_at" DESC);
CREATE INDEX "report_comment_thread_brand_idx"
	ON "report_comment_thread" ("brand_id", "visibility", "status");

CREATE TABLE "report_comment_message" (
	"id" text PRIMARY KEY,
	"thread_id" text NOT NULL
		REFERENCES "report_comment_thread" ("id") ON DELETE CASCADE,
	"author_id" text REFERENCES "user" ("id") ON DELETE SET NULL,
	"author_role" text NOT NULL
		CHECK ("author_role" IN ('client', 'consultant', 'support')),
	"body" text NOT NULL,
	"created_at" timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX "report_comment_message_thread_idx"
	ON "report_comment_message" ("thread_id", "created_at");

-- 6. Engagement operations. The existing commercial states stay; the new states
-- are the execution and quality states the plan requires.
ALTER TABLE "diagnostic_engagement" DROP CONSTRAINT IF EXISTS "diagnostic_engagement_status_check";--> statement-breakpoint
ALTER TABLE "diagnostic_engagement" ADD CONSTRAINT "diagnostic_engagement_status_check"
	CHECK ("status" IN ('enquired', 'scoped', 'quoted', 'invoiced', 'paid',
	                    'in_delivery', 'delivered', 'declined', 'withdrawn',
	                    'awaiting_input', 'quality_hold', 'retrying', 'failed', 'ready'));--> statement-breakpoint

ALTER TABLE "diagnostic_engagement" ADD COLUMN IF NOT EXISTS "purchase_id" text
	REFERENCES "purchase" ("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "diagnostic_engagement" ADD COLUMN IF NOT EXISTS "entitlement_id" text
	REFERENCES "product_entitlement" ("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "diagnostic_engagement" ADD COLUMN IF NOT EXISTS "engine_job_id" text;--> statement-breakpoint
ALTER TABLE "diagnostic_engagement" ADD COLUMN IF NOT EXISTS "engine_session_id" integer;--> statement-breakpoint
ALTER TABLE "diagnostic_engagement" ADD COLUMN IF NOT EXISTS "engine_decision_record_version_id" integer;--> statement-breakpoint
ALTER TABLE "diagnostic_engagement" ADD COLUMN IF NOT EXISTS "sector_intelligence_ref" text;--> statement-breakpoint
ALTER TABLE "diagnostic_engagement" ADD COLUMN IF NOT EXISTS "sector_intelligence_version_id" integer;--> statement-breakpoint
ALTER TABLE "diagnostic_engagement" ADD COLUMN IF NOT EXISTS "quality_receipt" jsonb;--> statement-breakpoint
ALTER TABLE "diagnostic_engagement" ADD COLUMN IF NOT EXISTS "retry_count" integer NOT NULL DEFAULT 0;--> statement-breakpoint
ALTER TABLE "diagnostic_engagement" ADD COLUMN IF NOT EXISTS "next_retry_at" timestamptz;--> statement-breakpoint
ALTER TABLE "diagnostic_engagement" ADD COLUMN IF NOT EXISTS "failure_code" text;--> statement-breakpoint
ALTER TABLE "diagnostic_engagement" ADD COLUMN IF NOT EXISTS "failure_detail" text;--> statement-breakpoint
ALTER TABLE "diagnostic_engagement" ADD COLUMN IF NOT EXISTS "delivered_at" timestamptz;--> statement-breakpoint
ALTER TABLE "diagnostic_engagement" ADD COLUMN IF NOT EXISTS "scope_approved_at" timestamptz;--> statement-breakpoint
ALTER TABLE "diagnostic_engagement" ADD COLUMN IF NOT EXISTS "scope_approved_by" text
	REFERENCES "user" ("id") ON DELETE SET NULL;--> statement-breakpoint

CREATE INDEX "diagnostic_engagement_engine_job_idx"
	ON "diagnostic_engagement" ("engine_job_id")
	WHERE "engine_job_id" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "diagnostic_engagement_purchase_idx"
	ON "diagnostic_engagement" ("purchase_id")
	WHERE "purchase_id" IS NOT NULL;

-- 7. External-invoice reconciliation. Activation still requires the existing
-- `purchase.status = 'activated'`; these columns record who verified the funds
-- and against what reference.
ALTER TABLE "purchase" ADD COLUMN IF NOT EXISTS "external_payment_reference" text;--> statement-breakpoint
ALTER TABLE "purchase" ADD COLUMN IF NOT EXISTS "reconciled_by" text
	REFERENCES "user" ("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "purchase" ADD COLUMN IF NOT EXISTS "reconciled_at" timestamptz;
