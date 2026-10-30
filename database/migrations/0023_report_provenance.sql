-- 0023_report_provenance.sql
-- Invariant 5 — a report records which provider and model produced it — and the
-- two columns A9.1 names for the rollback contract.
--
-- Additive only, per A4's transition rule: both new columns are nullable, no
-- existing column is renamed or dropped, and the previous release's SELECT lists
-- do not mention them. A rollback therefore reads these rows exactly as it reads
-- them today.
--
-- Why provenance lives on `output_version` rather than on the engagement: the
-- claim is about the delivered bytes. One engagement may deliver a correction,
-- and a correction written by a different model is a different version of the
-- report, not a different report. Putting the fact on the version keeps it
-- attached to the thing the client holds.

ALTER TABLE "output_version" ADD COLUMN "provider" text;
ALTER TABLE "output_version" ADD COLUMN "model" text;

-- Half a provenance record is worse than none: it invites a query that reads
-- `provider` and silently treats a NULL `model` as unknown when the truth is
-- that nobody recorded it.
ALTER TABLE "output_version" ADD CONSTRAINT "output_version_provenance_paired"
	CHECK (("provider" IS NULL) = ("model" IS NULL));

-- `structured_data` carries the report's sections as structure rather than only
-- as markdown, so the delivered report can be rendered by design instead of
-- `prose`. Nullable and ignored by the previous release, which is the A9.1
-- requirement: markdown stays canonical and this is the optional half.
ALTER TABLE "output_version_section" ADD COLUMN "structured_data" jsonb;
