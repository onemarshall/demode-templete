-- 0011_visual_contract_claim.sql
-- Guest contracts expire; claimed ones do not.
--
-- A guest contract page lives for GUEST_CONTRACT_TTL_DAYS (7). Claiming it —
-- signing in and explicitly saving it — clears the expiry, attaches it to the
-- account, and (optionally) to one of the account's brands.
--
-- No backfill: existing rows keep whatever life they already had. Shortening an
-- expiry someone was already promised would remove access mid-flow, and the
-- only rows in scope are pre-launch test data.

ALTER TABLE "visual_contract_version"
	ADD COLUMN "expires_at" timestamptz;

COMMENT ON COLUMN "visual_contract_version"."expires_at" IS
	'When the public page stops resolving. NULL means permanent: claimed contracts and brand contracts never expire.';

-- Supports retention sweeps and the "expiring soon" view.
CREATE INDEX "visual_contract_version_expiry_idx"
	ON "visual_contract_version" ("expires_at")
	WHERE "expires_at" IS NOT NULL;

-- A claimed draft is owned by a person, so its guest capability is removed.
-- The constraint already allows this: owner_user_id is then non-null.
ALTER TABLE "visual_contract_draft"
	ADD COLUMN "claimed_at" timestamptz;
