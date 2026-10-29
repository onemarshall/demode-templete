-- App-owned, auditable human attribution for M01 conviction sources.
CREATE TABLE strategy_m01_source_attribution (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 organisation_id text NOT NULL, brand_id text NOT NULL, engagement_id text NOT NULL,
 source_version_id text NOT NULL, source_hash text NOT NULL,
 source_type text NOT NULL CHECK(source_type IN ('single founder / owner','co-founders or leadership team','practitioner for a client')),
 source_name text NOT NULL CHECK(length(btrim(source_name))>0),
 material_used text NOT NULL,
 evidence_refs jsonb NOT NULL CHECK(jsonb_typeof(evidence_refs)='array'),
 attestation_statement text NOT NULL CHECK(length(btrim(attestation_statement))>0),
 attested_by text NOT NULL REFERENCES "user"(id) ON DELETE RESTRICT,
 created_at timestamptz NOT NULL DEFAULT now(),
 FOREIGN KEY(organisation_id,brand_id,engagement_id) REFERENCES strategy_engagement(organisation_id,brand_id,id) ON DELETE RESTRICT,
 FOREIGN KEY(organisation_id,brand_id,engagement_id,source_version_id) REFERENCES strategy_version(organisation_id,brand_id,engagement_id,id) ON DELETE RESTRICT,
 UNIQUE(organisation_id,brand_id,engagement_id,id),
 UNIQUE(organisation_id,brand_id,engagement_id,id,attested_by)
);
CREATE TABLE strategy_m01_source_attribution_revocation (
 organisation_id text NOT NULL, brand_id text NOT NULL, engagement_id text NOT NULL,
 attribution_id uuid NOT NULL, revoked_by text NOT NULL REFERENCES "user"(id) ON DELETE RESTRICT,
 reason text NOT NULL CHECK(length(btrim(reason))>0), revoked_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(organisation_id,brand_id,engagement_id,attribution_id),
 FOREIGN KEY(organisation_id,brand_id,engagement_id,attribution_id)
  REFERENCES strategy_m01_source_attribution(organisation_id,brand_id,engagement_id,id) ON DELETE RESTRICT
);
CREATE TABLE strategy_m01_source_attribution_use (
 organisation_id text NOT NULL, brand_id text NOT NULL, engagement_id text NOT NULL,
 session_id text NOT NULL, revision integer NOT NULL, attribution_id uuid NOT NULL,
 actor_id text NOT NULL REFERENCES "user"(id) ON DELETE RESTRICT, created_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(organisation_id,brand_id,engagement_id,session_id,revision),
 FOREIGN KEY(organisation_id,brand_id,engagement_id,session_id,revision)
  REFERENCES strategy_revision(organisation_id,brand_id,engagement_id,session_id,revision) DEFERRABLE INITIALLY DEFERRED,
 FOREIGN KEY(organisation_id,brand_id,engagement_id,attribution_id)
  REFERENCES strategy_m01_source_attribution(organisation_id,brand_id,engagement_id,id) ON DELETE RESTRICT
);
CREATE INDEX strategy_m01_source_attribution_scope ON strategy_m01_source_attribution(organisation_id,brand_id,engagement_id,created_at);
CREATE OR REPLACE FUNCTION strategy_m01_attribution_immutable() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'M01 source attribution history is immutable'; END; $$;
CREATE TRIGGER strategy_m01_source_attribution_immutable BEFORE UPDATE OR DELETE ON strategy_m01_source_attribution
 FOR EACH ROW EXECUTE FUNCTION strategy_m01_attribution_immutable();
CREATE TRIGGER strategy_m01_source_attribution_revocation_immutable BEFORE UPDATE OR DELETE ON strategy_m01_source_attribution_revocation
 FOR EACH ROW EXECUTE FUNCTION strategy_m01_attribution_immutable();
CREATE TRIGGER strategy_m01_source_attribution_use_immutable BEFORE UPDATE OR DELETE ON strategy_m01_source_attribution_use
 FOR EACH ROW EXECUTE FUNCTION strategy_m01_attribution_immutable();
