-- 0013_output_version.sql
-- Stored report bytes for an output (plan Workstream 1).
--
-- `output` holds metadata only: title, format, capabilities. Until now nothing
-- held the delivered text, so `documents/[documentId]/download` refused with
-- "No file is attached to this output." A report is a deliverable a client can
-- dispute, so the bytes live beside their own SHA-256 and are immutable once
-- written. A correction is a new version, never an edit.
--
-- `engine_publication_ref` names the engine's publication for lineage only. It
-- is text with no foreign key: the engine stays rebuildable and its ledger is
-- not a dependency of this database.

-- The composite key the same-brand foreign key below needs, mirroring
-- `work_item_id_scope_unique` in 0009. `output` is already applied, so this is
-- the additive half of that pattern.
ALTER TABLE "output" ADD CONSTRAINT "output_id_scope_unique"
	UNIQUE ("id", "organisation_id", "brand_id");

CREATE TABLE "output_version" (
	"id" text PRIMARY KEY,
	"organisation_id" text NOT NULL,
	"brand_id" text NOT NULL,
	"output_id" text NOT NULL,
	"version_number" integer NOT NULL CHECK ("version_number" >= 1),
	"content_markdown" text NOT NULL CHECK (length("content_markdown") > 0),
	"content_hash" text NOT NULL CHECK ("content_hash" ~ '^[a-f0-9]{64}$'),
	"engine_publication_ref" text,
	"created_at" timestamptz NOT NULL DEFAULT now(),
	CONSTRAINT "output_version_brand_organisation_fk"
		FOREIGN KEY ("brand_id", "organisation_id")
		REFERENCES "brand" ("id", "organisation_id") ON DELETE RESTRICT,
	CONSTRAINT "output_version_output_same_brand_fk"
		FOREIGN KEY ("output_id", "organisation_id", "brand_id")
		REFERENCES "output" ("id", "organisation_id", "brand_id") ON DELETE RESTRICT
);
CREATE UNIQUE INDEX "output_version_number_unique"
	ON "output_version" ("output_id", "version_number");
-- One row per delivered byte sequence: the same report cannot be stored twice,
-- so an import that silently re-wrote different content is refused by the index.
CREATE UNIQUE INDEX "output_version_content_hash_unique"
	ON "output_version" ("content_hash");
CREATE INDEX "output_version_brand_created_idx"
	ON "output_version" ("brand_id", "created_at" DESC);

-- Delivered bytes and their hash are written once. Editing either would break
-- the receipt the client holds, so the row is append-only like the engine's
-- publication ledger.
CREATE OR REPLACE FUNCTION "prevent_output_version_mutation"()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
	RAISE EXCEPTION 'output_version rows are immutable; write a new version';
END;
$$;

CREATE TRIGGER "output_version_append_only"
	BEFORE UPDATE OR DELETE ON "output_version"
	FOR EACH ROW EXECUTE FUNCTION "prevent_output_version_mutation"();
