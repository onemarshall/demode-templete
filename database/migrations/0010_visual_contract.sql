-- 0010_visual_contract.sql
-- Visual Contract Solo V1 — drafts and immutable generated versions.
--
-- Two access shapes share one workflow (implementation spec §3, §8):
--   * a brand draft  — owned by a signed-in user inside an authorised brand
--   * a guest draft  — owned by an unguessable edit token held in a cookie
--
-- The public contract page is keyed by `public_id` and confers view access only.
-- It is never an edit capability, and it never carries the guest token.
--
-- Guest contracts deliberately have no `output` row. `output` requires a
-- brand and organisation, so a guest contract cannot appear in a brand's
-- Documents unless a separate, explicit attach action creates one later.

CREATE TABLE "visual_contract_draft" (
	"id" text PRIMARY KEY,
	"owner_user_id" text REFERENCES "user" ("id") ON DELETE SET NULL,
	"organisation_id" text,
	"brand_id" text,
	-- SHA-256 of the guest edit token. The token itself is never stored.
	"guest_edit_token_hash" text,
	"guest_expires_at" timestamptz,
	"project_context" jsonb NOT NULL DEFAULT '{}'::jsonb,
	"choices" jsonb NOT NULL DEFAULT '{}'::jsonb,
	"current_step" text NOT NULL DEFAULT 'context'
		CHECK ("current_step" IN ('context', 'choose', 'confirm', 'review', 'generated')),
	"status" text NOT NULL DEFAULT 'draft'
		CHECK ("status" IN ('draft', 'confirmed', 'generated')),
	-- Set when the draft has produced its first version. Repeated generation
	-- submissions return this version instead of creating a duplicate.
	"generated_version_id" text,
	"created_at" timestamptz NOT NULL DEFAULT now(),
	"updated_at" timestamptz NOT NULL DEFAULT now(),
	CONSTRAINT "visual_contract_draft_brand_organisation_pair"
		CHECK (("brand_id" IS NULL) = ("organisation_id" IS NULL)),
	CONSTRAINT "visual_contract_draft_brand_organisation_fk"
		FOREIGN KEY ("brand_id", "organisation_id")
		REFERENCES "brand" ("id", "organisation_id") ON DELETE RESTRICT,
	-- A draft is owned by a person or by a guest token, never by neither.
	CONSTRAINT "visual_contract_draft_has_owner"
		CHECK ("owner_user_id" IS NOT NULL OR "guest_edit_token_hash" IS NOT NULL),
	-- A guest draft must expire; an owned draft needs no guest capability.
	CONSTRAINT "visual_contract_draft_guest_expiry"
		CHECK ("guest_edit_token_hash" IS NULL OR "guest_expires_at" IS NOT NULL)
);

CREATE INDEX "visual_contract_draft_owner_idx"
	ON "visual_contract_draft" ("owner_user_id", "updated_at" DESC)
	WHERE "owner_user_id" IS NOT NULL;
CREATE INDEX "visual_contract_draft_brand_idx"
	ON "visual_contract_draft" ("brand_id", "updated_at" DESC)
	WHERE "brand_id" IS NOT NULL;
CREATE INDEX "visual_contract_draft_guest_idx"
	ON "visual_contract_draft" ("guest_edit_token_hash")
	WHERE "guest_edit_token_hash" IS NOT NULL;
-- Supports retention sweeps for abandoned guest drafts.
CREATE INDEX "visual_contract_draft_guest_expiry_idx"
	ON "visual_contract_draft" ("guest_expires_at")
	WHERE "guest_expires_at" IS NOT NULL;

CREATE TABLE "visual_contract_version" (
	"id" text PRIMARY KEY,
	"draft_id" text NOT NULL REFERENCES "visual_contract_draft" ("id") ON DELETE CASCADE,
	-- Unguessable identifier used in the public URL. View access only.
	"public_id" text NOT NULL,
	"version_number" integer NOT NULL CHECK ("version_number" >= 1),
	-- Immutable snapshot: the page must not change under a shared link.
	"choices" jsonb NOT NULL,
	"project_context" jsonb NOT NULL,
	"content_version" integer NOT NULL,
	"rendered" jsonb NOT NULL,
	"confirmed_at" timestamptz NOT NULL,
	"created_by_user_id" text REFERENCES "user" ("id") ON DELETE SET NULL,
	"organisation_id" text,
	"brand_id" text,
	-- Set only when a brand output row was created for this version.
	"output_id" text REFERENCES "output" ("id") ON DELETE SET NULL,
	"created_at" timestamptz NOT NULL DEFAULT now(),
	CONSTRAINT "visual_contract_version_public_id_unique" UNIQUE ("public_id"),
	CONSTRAINT "visual_contract_version_draft_number_unique"
		UNIQUE ("draft_id", "version_number"),
	CONSTRAINT "visual_contract_version_brand_organisation_pair"
		CHECK (("brand_id" IS NULL) = ("organisation_id" IS NULL)),
	CONSTRAINT "visual_contract_version_brand_organisation_fk"
		FOREIGN KEY ("brand_id", "organisation_id")
		REFERENCES "brand" ("id", "organisation_id") ON DELETE RESTRICT
);

CREATE INDEX "visual_contract_version_draft_idx"
	ON "visual_contract_version" ("draft_id", "version_number" DESC);

ALTER TABLE "visual_contract_draft"
	ADD CONSTRAINT "visual_contract_draft_generated_version_fk"
	FOREIGN KEY ("generated_version_id")
	REFERENCES "visual_contract_version" ("id") ON DELETE SET NULL;

-- Tracks optional email delivery. Present so the table exists before the
-- Designer Send action is enabled; no code path writes to it in Solo V1.
CREATE TABLE "visual_contract_delivery" (
	"id" text PRIMARY KEY,
	"version_id" text NOT NULL REFERENCES "visual_contract_version" ("id") ON DELETE CASCADE,
	"delivery_type" text NOT NULL CHECK ("delivery_type" IN ('self', 'designer')),
	"recipient_email" text NOT NULL,
	"recipient_name" text,
	"sender_email" text,
	"sender_name" text,
	"state" text NOT NULL DEFAULT 'pending'
		CHECK ("state" IN ('pending', 'sent', 'failed')),
	"consent_marketing" boolean NOT NULL DEFAULT false,
	"created_at" timestamptz NOT NULL DEFAULT now(),
	"sent_at" timestamptz
);

CREATE INDEX "visual_contract_delivery_version_idx"
	ON "visual_contract_delivery" ("version_id");
