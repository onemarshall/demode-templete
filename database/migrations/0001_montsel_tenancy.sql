-- 0001_montsel_tenancy.sql
-- Montsel Phase 1 tenancy core (spec §5). Plugin tables (organization, member,
-- invitation) are created by the Better Auth CLI migration and are referenced,
-- never altered, here. Composite unique keys support the §5 invariants.

-- Brand workspace: one per brand, owned by exactly one organisation.
CREATE TABLE "workspace" (
	"id" text PRIMARY KEY,
	"organisation_id" text NOT NULL REFERENCES "organization" ("id") ON DELETE RESTRICT,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"created_by" text REFERENCES "user" ("id") ON DELETE SET NULL,
	"status" text NOT NULL DEFAULT 'active' CHECK ("status" IN ('active', 'archived')),
	"created_at" timestamptz NOT NULL DEFAULT now(),
	"updated_at" timestamptz NOT NULL DEFAULT now(),
	-- Supports the composite FK from audit_event (same-organisation invariant).
	CONSTRAINT "workspace_id_organisation_unique" UNIQUE ("id", "organisation_id")
);
CREATE UNIQUE INDEX "workspace_organisation_slug_unique" ON "workspace" ("organisation_id", "slug");
CREATE INDEX "workspace_organisation_idx" ON "workspace" ("organisation_id");

-- Authoritative personal-organisation classification and billing owner.
-- Metadata is display-only. A transferred owner is updated by the lifecycle
-- service; deleting an identity preserves the organisation with no owner.
CREATE TABLE "personal_organisation_owner" (
	"organisation_id" text PRIMARY KEY REFERENCES "organization" ("id") ON DELETE RESTRICT,
	"owner_user_id" text UNIQUE REFERENCES "user" ("id") ON DELETE SET NULL,
	"created_at" timestamptz NOT NULL DEFAULT now()
);

-- Explicit workspace assignment. Only active, unexpired rows grant access;
-- denial never depends on cleanup (§5 validate-both).
CREATE TABLE "workspace_member" (
	"id" text PRIMARY KEY,
	"workspace_id" text NOT NULL REFERENCES "workspace" ("id") ON DELETE RESTRICT,
	"user_id" text NOT NULL REFERENCES "user" ("id") ON DELETE CASCADE,
	"role" text NOT NULL CHECK ("role" IN ('workspace_admin', 'editor', 'contributor', 'viewer')),
	"status" text NOT NULL DEFAULT 'pending_provisioning'
		CHECK ("status" IN ('pending_provisioning', 'active', 'revoked', 'expired')),
	"expires_at" timestamptz,
	"grant_source" text NOT NULL CHECK ("grant_source" IN ('invitation', 'administrative', 'managed', 'backfill')),
	"granted_by" text REFERENCES "user" ("id") ON DELETE SET NULL,
	"provisioning_id" text,
	"created_at" timestamptz NOT NULL DEFAULT now(),
	"updated_at" timestamptz NOT NULL DEFAULT now()
);
-- One row per workspace/user pair; re-grants update the existing row (§D.2).
CREATE UNIQUE INDEX "workspace_member_pair_unique" ON "workspace_member" ("workspace_id", "user_id");
CREATE INDEX "workspace_member_user_status_idx" ON "workspace_member" ("user_id", "status");
CREATE INDEX "workspace_member_workspace_idx" ON "workspace_member" ("workspace_id");

-- Landing-page preference only; never an authority for access (§5, §8).
CREATE TABLE "user_workspace_preference" (
	"user_id" text PRIMARY KEY REFERENCES "user" ("id") ON DELETE CASCADE,
	"last_organisation_id" text REFERENCES "organization" ("id") ON DELETE SET NULL,
	"last_workspace_id" text REFERENCES "workspace" ("id") ON DELETE SET NULL,
	"updated_at" timestamptz NOT NULL DEFAULT now()
);

-- Durable provisioning lifecycle (§7.1, Appendix D.1). Created before delivery.
CREATE TABLE "invitation_provisioning" (
	"id" text PRIMARY KEY,
	"invitation_id" text NOT NULL,
	"organisation_id" text NOT NULL REFERENCES "organization" ("id") ON DELETE RESTRICT,
	"recipient_email" text NOT NULL,
	"recipient_user_id" text REFERENCES "user" ("id") ON DELETE SET NULL,
	"state" text NOT NULL DEFAULT 'pending_acceptance'
		CHECK ("state" IN (
			'pending_acceptance', 'provisioning', 'retry_pending',
			'active', 'cancelled', 'expired', 'permanently_failed'
		)),
	"idempotency_key" text NOT NULL,
	"attempts" integer NOT NULL DEFAULT 0,
	"max_attempts" integer NOT NULL DEFAULT 5,
	"next_retry_at" timestamptz,
	"last_error" text,
	"created_by" text REFERENCES "user" ("id") ON DELETE SET NULL,
	"created_at" timestamptz NOT NULL DEFAULT now(),
	"updated_at" timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX "invitation_provisioning_idempotency_unique" ON "invitation_provisioning" ("idempotency_key");
CREATE INDEX "invitation_provisioning_invitation_idx" ON "invitation_provisioning" ("invitation_id");
CREATE INDEX "invitation_provisioning_state_idx" ON "invitation_provisioning" ("organisation_id", "state");

-- Intended workspace assignments authorised by the inviter; revalidated
-- before activation (§7). Rows here grant nothing until D.1 activation.
CREATE TABLE "invitation_workspace_grant" (
	"id" text PRIMARY KEY,
	"provisioning_id" text NOT NULL REFERENCES "invitation_provisioning" ("id") ON DELETE CASCADE,
	"workspace_id" text NOT NULL REFERENCES "workspace" ("id") ON DELETE RESTRICT,
	"role" text NOT NULL CHECK ("role" IN ('workspace_admin', 'editor', 'contributor', 'viewer')),
	"created_at" timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX "invitation_workspace_grant_pair_unique" ON "invitation_workspace_grant" ("provisioning_id", "workspace_id");
CREATE INDEX "invitation_workspace_grant_workspace_idx" ON "invitation_workspace_grant" ("workspace_id");

-- Organisation and workspace audit events (§12). No credentials or tokens.
CREATE TABLE "audit_event" (
	"id" text PRIMARY KEY,
	"organisation_id" text NOT NULL REFERENCES "organization" ("id") ON DELETE RESTRICT,
	"workspace_id" text,
	"actor_user_id" text REFERENCES "user" ("id") ON DELETE SET NULL,
	"actor_type" text NOT NULL DEFAULT 'user' CHECK ("actor_type" IN ('user', 'system', 'service')),
	"action" text NOT NULL,
	"resource_type" text NOT NULL,
	"resource_id" text,
	"outcome" text NOT NULL DEFAULT 'success' CHECK ("outcome" IN ('success', 'denied', 'error')),
	"metadata" jsonb NOT NULL DEFAULT '{}'::jsonb,
	"created_at" timestamptz NOT NULL DEFAULT now(),
	-- A workspace event must reference a workspace in the same organisation (§5).
	CONSTRAINT "audit_event_workspace_organisation_fk"
		FOREIGN KEY ("workspace_id", "organisation_id")
		REFERENCES "workspace" ("id", "organisation_id")
		ON DELETE RESTRICT
);
CREATE INDEX "audit_event_organisation_created_idx" ON "audit_event" ("organisation_id", "created_at" DESC);
CREATE INDEX "audit_event_workspace_created_idx" ON "audit_event" ("workspace_id", "created_at" DESC);
