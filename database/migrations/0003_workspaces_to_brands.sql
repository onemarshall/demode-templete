-- 0003_workspaces_to_brands.sql
-- Domain rename: a workspace IS a brand. Organisations (the Better Auth
-- organization/member/invitation tables) are unchanged — they remain the
-- business that owns each brand.

ALTER TABLE "workspace" RENAME TO "brand";
ALTER TABLE "workspace_member" RENAME TO "brand_member";
ALTER TABLE "user_workspace_preference" RENAME TO "user_brand_preference";
ALTER TABLE "invitation_workspace_grant" RENAME TO "invitation_brand_grant";

ALTER TABLE "brand_member" RENAME COLUMN "workspace_id" TO "brand_id";
ALTER TABLE "invitation_brand_grant" RENAME COLUMN "workspace_id" TO "brand_id";
ALTER TABLE "user_brand_preference" RENAME COLUMN "last_workspace_id" TO "last_brand_id";
ALTER TABLE "audit_event" RENAME COLUMN "workspace_id" TO "brand_id";

-- Role CHECKs whitelist the retired 'workspace_admin' value; replace them.
ALTER TABLE "brand_member" DROP CONSTRAINT "workspace_member_role_check";
UPDATE "brand_member" SET "role" = 'brand_admin' WHERE "role" = 'workspace_admin';
ALTER TABLE "brand_member" ADD CONSTRAINT "brand_member_role_check"
	CHECK ("role" IN ('brand_admin', 'editor', 'contributor', 'viewer'));

ALTER TABLE "invitation_brand_grant" DROP CONSTRAINT "invitation_workspace_grant_role_check";
UPDATE "invitation_brand_grant" SET "role" = 'brand_admin' WHERE "role" = 'workspace_admin';
ALTER TABLE "invitation_brand_grant" ADD CONSTRAINT "invitation_brand_grant_role_check"
	CHECK ("role" IN ('brand_admin', 'editor', 'contributor', 'viewer'));

-- Audit history uses the same vocabulary as the code that wrote it.
UPDATE "audit_event" SET "resource_type" = 'brand' WHERE "resource_type" = 'workspace';
UPDATE "audit_event" SET "action" = 'brand.' || substr("action", 11) WHERE "action" LIKE 'workspace.%';

-- Index names (constraint indexes carry the constraint name with them).
ALTER INDEX "workspace_id_organisation_unique" RENAME TO "brand_id_organisation_unique";
ALTER INDEX "workspace_organisation_slug_unique" RENAME TO "brand_organisation_slug_unique";
ALTER INDEX "workspace_organisation_idx" RENAME TO "brand_organisation_idx";
ALTER INDEX "workspace_member_pair_unique" RENAME TO "brand_member_pair_unique";
ALTER INDEX "workspace_member_user_status_idx" RENAME TO "brand_member_user_status_idx";
ALTER INDEX "workspace_member_workspace_idx" RENAME TO "brand_member_brand_idx";
ALTER INDEX "invitation_workspace_grant_pair_unique" RENAME TO "invitation_brand_grant_pair_unique";
ALTER INDEX "invitation_workspace_grant_workspace_idx" RENAME TO "invitation_brand_grant_brand_idx";
ALTER INDEX "audit_event_workspace_created_idx" RENAME TO "audit_event_brand_created_idx";

-- Primary keys (auto-named after the old tables).
ALTER TABLE "brand" RENAME CONSTRAINT "workspace_pkey" TO "brand_pkey";
ALTER TABLE "brand_member" RENAME CONSTRAINT "workspace_member_pkey" TO "brand_member_pkey";
ALTER TABLE "user_brand_preference" RENAME CONSTRAINT "user_workspace_preference_pkey" TO "user_brand_preference_pkey";
ALTER TABLE "invitation_brand_grant" RENAME CONSTRAINT "invitation_workspace_grant_pkey" TO "invitation_brand_grant_pkey";

-- Foreign keys (auto-named after the old tables/columns).
ALTER TABLE "brand" RENAME CONSTRAINT "workspace_organisation_id_fkey" TO "brand_organisation_id_fkey";
ALTER TABLE "brand" RENAME CONSTRAINT "workspace_created_by_fkey" TO "brand_created_by_fkey";
ALTER TABLE "brand_member" RENAME CONSTRAINT "workspace_member_workspace_id_fkey" TO "brand_member_brand_id_fkey";
ALTER TABLE "brand_member" RENAME CONSTRAINT "workspace_member_user_id_fkey" TO "brand_member_user_id_fkey";
ALTER TABLE "brand_member" RENAME CONSTRAINT "workspace_member_granted_by_fkey" TO "brand_member_granted_by_fkey";
ALTER TABLE "user_brand_preference" RENAME CONSTRAINT "user_workspace_preference_user_id_fkey" TO "user_brand_preference_user_id_fkey";
ALTER TABLE "user_brand_preference" RENAME CONSTRAINT "user_workspace_preference_last_organisation_id_fkey" TO "user_brand_preference_last_organisation_id_fkey";
ALTER TABLE "user_brand_preference" RENAME CONSTRAINT "user_workspace_preference_last_workspace_id_fkey" TO "user_brand_preference_last_brand_id_fkey";
ALTER TABLE "invitation_brand_grant" RENAME CONSTRAINT "invitation_workspace_grant_provisioning_id_fkey" TO "invitation_brand_grant_provisioning_id_fkey";
ALTER TABLE "invitation_brand_grant" RENAME CONSTRAINT "invitation_workspace_grant_workspace_id_fkey" TO "invitation_brand_grant_brand_id_fkey";
ALTER TABLE "audit_event" RENAME CONSTRAINT "audit_event_workspace_organisation_fk" TO "audit_event_brand_organisation_fk";

-- Remaining auto-named CHECKs on renamed tables.
ALTER TABLE "brand" RENAME CONSTRAINT "workspace_status_check" TO "brand_status_check";
ALTER TABLE "brand_member" RENAME CONSTRAINT "workspace_member_status_check" TO "brand_member_status_check";
ALTER TABLE "brand_member" RENAME CONSTRAINT "workspace_member_grant_source_check" TO "brand_member_grant_source_check";
