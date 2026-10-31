-- 0024_requested_sector_ref.sql
-- The sector a customer asked for, kept even when it is refused.
--
-- `sector_intelligence_ref` names the approved sector a check will use, so it is
-- null whenever the request is refused. That made a refusal indistinguishable
-- from a customer who named no sector at all, and it discarded the only signal
-- that says which sector to research next.
--
-- Additive and nullable, per A4's transition rule: the previous release's SELECT
-- lists do not mention it, so a rollback reads these rows exactly as it does now.

ALTER TABLE "diagnostic_eligibility" ADD COLUMN "requested_sector_ref" text;

-- Demand is counted per sector, over a window, by refusal. This is the index that
-- answers "which uncovered sectors are people asking for".
CREATE INDEX "diagnostic_eligibility_requested_sector_idx"
	ON "diagnostic_eligibility" ("requested_sector_ref", "checked_at" DESC)
	WHERE "requested_sector_ref" IS NOT NULL;
