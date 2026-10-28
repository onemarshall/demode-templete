-- Standalone host binding. Auth integration adds ownership FKs to existing host tables.
CREATE TABLE IF NOT EXISTS strategy_brand_binding (
 organisation_id text NOT NULL, brand_id text NOT NULL, PRIMARY KEY(organisation_id,brand_id)
);
CREATE TABLE IF NOT EXISTS strategy_engagement (
 organisation_id text NOT NULL, brand_id text NOT NULL, id text NOT NULL, label text NOT NULL,
 created_by text NOT NULL, created_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(organisation_id,brand_id,id), FOREIGN KEY(organisation_id,brand_id) REFERENCES strategy_brand_binding
);
CREATE TABLE IF NOT EXISTS strategy_session (
 organisation_id text NOT NULL, brand_id text NOT NULL, engagement_id text NOT NULL, id text NOT NULL,
 stage text NOT NULL, revision integer NOT NULL CHECK(revision>=1),
 PRIMARY KEY(organisation_id,brand_id,engagement_id,id),
 FOREIGN KEY(organisation_id,brand_id,engagement_id) REFERENCES strategy_engagement
);
CREATE TABLE IF NOT EXISTS strategy_revision (
 organisation_id text NOT NULL, brand_id text NOT NULL, engagement_id text NOT NULL, session_id text NOT NULL,
 revision integer NOT NULL, command_id text NOT NULL, actor_id text NOT NULL, action text NOT NULL, command_input text NOT NULL, payload jsonb NOT NULL, payload_text text NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(organisation_id,brand_id,engagement_id,session_id,revision),
 UNIQUE(organisation_id,brand_id,engagement_id,session_id,command_id),
 FOREIGN KEY(organisation_id,brand_id,engagement_id,session_id) REFERENCES strategy_session
);
DO $$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conname='strategy_session_current_revision' AND conrelid='strategy_session'::regclass) THEN
  ALTER TABLE strategy_session ADD CONSTRAINT strategy_session_current_revision
   FOREIGN KEY(organisation_id,brand_id,engagement_id,id,revision)
   REFERENCES strategy_revision(organisation_id,brand_id,engagement_id,session_id,revision)
   DEFERRABLE INITIALLY DEFERRED;
 END IF;
END $$;
CREATE TABLE IF NOT EXISTS strategy_version (
 organisation_id text NOT NULL, brand_id text NOT NULL, engagement_id text NOT NULL, id text NOT NULL,
 session_id text, revision integer, canonical_payload text NOT NULL, seal_hash text NOT NULL, hash_algorithm text NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(organisation_id,brand_id,engagement_id,id),
 CHECK((session_id IS NULL) = (revision IS NULL)),
 FOREIGN KEY(organisation_id,brand_id,engagement_id) REFERENCES strategy_engagement,
 FOREIGN KEY(organisation_id,brand_id,engagement_id,session_id,revision) REFERENCES strategy_revision
);
CREATE TABLE IF NOT EXISTS strategy_source_head (
 organisation_id text NOT NULL, brand_id text NOT NULL, engagement_id text NOT NULL, slot text NOT NULL,
 version_id text NOT NULL,
 PRIMARY KEY(organisation_id,brand_id,engagement_id,slot),
 FOREIGN KEY(organisation_id,brand_id,engagement_id,version_id) REFERENCES strategy_version
);
CREATE TABLE IF NOT EXISTS strategy_source_ref (
 organisation_id text NOT NULL, brand_id text NOT NULL, engagement_id text NOT NULL, session_id text NOT NULL,
 revision integer NOT NULL, slot text NOT NULL, version_id text NOT NULL, expected_hash text NOT NULL,
 PRIMARY KEY(organisation_id,brand_id,engagement_id,session_id,revision,slot),
 FOREIGN KEY(organisation_id,brand_id,engagement_id,session_id,revision) REFERENCES strategy_revision,
 FOREIGN KEY(organisation_id,brand_id,engagement_id,version_id) REFERENCES strategy_version
);
CREATE TABLE IF NOT EXISTS strategy_document (
 organisation_id text NOT NULL, brand_id text NOT NULL, engagement_id text NOT NULL, id text NOT NULL,
 version_id text NOT NULL, kind text NOT NULL, content text NOT NULL, hash text NOT NULL,
 PRIMARY KEY(organisation_id,brand_id,engagement_id,id),
 FOREIGN KEY(organisation_id,brand_id,engagement_id,version_id) REFERENCES strategy_version
);
CREATE TABLE IF NOT EXISTS strategy_approval (
 organisation_id text NOT NULL, brand_id text NOT NULL, engagement_id text NOT NULL, version_id text NOT NULL,
 actor_id text NOT NULL, declaration jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(organisation_id,brand_id,engagement_id,version_id),
 FOREIGN KEY(organisation_id,brand_id,engagement_id,version_id) REFERENCES strategy_version
);
CREATE TABLE IF NOT EXISTS strategy_outbox (
 id bigserial PRIMARY KEY, organisation_id text NOT NULL, brand_id text NOT NULL, engagement_id text NOT NULL,
 session_id text NOT NULL, revision integer NOT NULL, kind text NOT NULL, payload jsonb NOT NULL,
 attempts integer NOT NULL DEFAULT 0, available_at timestamptz NOT NULL DEFAULT now(),
 lease_until timestamptz, delivered_at timestamptz,
 FOREIGN KEY(organisation_id,brand_id,engagement_id,session_id,revision) REFERENCES strategy_revision
);
CREATE TABLE IF NOT EXISTS strategy_fork_command (
 organisation_id text NOT NULL, brand_id text NOT NULL, engagement_id text NOT NULL,
 parent_id text NOT NULL, command_id text NOT NULL, successor_id text NOT NULL,
 actor_id text NOT NULL, action text NOT NULL, command_input text NOT NULL, created_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(organisation_id,brand_id,engagement_id,parent_id,command_id),
 FOREIGN KEY(organisation_id,brand_id,engagement_id,parent_id) REFERENCES strategy_session,
 FOREIGN KEY(organisation_id,brand_id,engagement_id,successor_id) REFERENCES strategy_session
);
CREATE INDEX IF NOT EXISTS strategy_outbox_pending ON strategy_outbox(available_at) WHERE delivered_at IS NULL;
CREATE OR REPLACE FUNCTION strategy_reject_history_change() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'Strategy historical records are immutable'; END; $$;
DO $$ DECLARE t text; BEGIN
 FOREACH t IN ARRAY ARRAY['strategy_revision','strategy_version','strategy_source_ref','strategy_document','strategy_approval','strategy_fork_command'] LOOP
  IF NOT EXISTS(SELECT 1 FROM pg_trigger WHERE tgname=t||'_immutable' AND tgrelid=t::regclass) THEN
   EXECUTE format('CREATE TRIGGER %I BEFORE UPDATE OR DELETE ON %I FOR EACH ROW EXECUTE FUNCTION strategy_reject_history_change()',t||'_immutable',t);
  END IF;
 END LOOP;
END $$;
