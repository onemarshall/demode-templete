-- Bind the transferable Strategy records to the host's existing brand ownership.
-- Existing Better Auth and tenancy migrations remain unchanged.
ALTER TABLE strategy_brand_binding
 ADD CONSTRAINT strategy_brand_binding_auth_brand
 FOREIGN KEY (brand_id, organisation_id) REFERENCES brand(id, organisation_id)
 ON DELETE RESTRICT;
ALTER TABLE strategy_engagement
 ADD CONSTRAINT strategy_engagement_auth_creator
 FOREIGN KEY (created_by) REFERENCES "user"(id) ON DELETE RESTRICT;

-- Separate from brand roles: no brand role silently acquires Strategy actions,
-- and approval additionally requires an explicit engagement approver grant.
CREATE TABLE strategy_access_grant (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 organisation_id text NOT NULL,
 brand_id text NOT NULL,
 engagement_id text NOT NULL,
 user_id text NOT NULL REFERENCES "user"(id) ON DELETE RESTRICT,
 actions text[] NOT NULL DEFAULT '{}',
 is_approver boolean NOT NULL DEFAULT false,
 authority_role text NOT NULL CHECK(length(btrim(authority_role))>0),
 expires_at timestamptz,
 revoked_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now(),
 CHECK (actions <@ ARRAY['read','edit','approve','generate','export','manage']::text[]),
 CHECK (NOT ('approve'=ANY(actions)) OR is_approver),
 FOREIGN KEY(organisation_id,brand_id,engagement_id)
  REFERENCES strategy_engagement(organisation_id,brand_id,id) ON DELETE RESTRICT,
 UNIQUE(organisation_id,brand_id,engagement_id,user_id)
);
CREATE INDEX strategy_access_grant_user ON strategy_access_grant(user_id,brand_id)
 WHERE revoked_at IS NULL;
