CREATE TABLE IF NOT EXISTS strategy_job (
 id text PRIMARY KEY, organisation_id text NOT NULL, brand_id text NOT NULL, engagement_id text NOT NULL,
 session_id text NOT NULL, input_revision integer NOT NULL, actor_id text NOT NULL,
 action text NOT NULL CHECK(action='generate'), command_id text NOT NULL, command_text text NOT NULL,
 command_digest text NOT NULL, pins_text text NOT NULL, method_release text NOT NULL,
 status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','running','succeeded','failed','cancelled')),
 fence integer NOT NULL DEFAULT 0, attempts integer NOT NULL DEFAULT 0,
 lease_until timestamptz, available_at timestamptz NOT NULL DEFAULT now(),
 result_text text, last_error text, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(organisation_id,brand_id,engagement_id,session_id,command_id),
 FOREIGN KEY(organisation_id,brand_id,engagement_id,session_id,input_revision) REFERENCES strategy_revision
);
CREATE INDEX IF NOT EXISTS strategy_job_recovery ON strategy_job(status,available_at,lease_until);
ALTER TABLE strategy_outbox ADD COLUMN IF NOT EXISTS delivery_fence integer NOT NULL DEFAULT 0;
ALTER TABLE strategy_outbox ADD COLUMN IF NOT EXISTS epoch integer NOT NULL DEFAULT 0;
CREATE TABLE IF NOT EXISTS strategy_job_callback (
 job_id text NOT NULL REFERENCES strategy_job, event_id text NOT NULL, fence integer NOT NULL,
 received_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(job_id,event_id)
);
CREATE TABLE IF NOT EXISTS strategy_checkpoint_mirror (
 organisation_id text NOT NULL, brand_id text NOT NULL, engagement_id text NOT NULL,
 session_id text NOT NULL, epoch integer NOT NULL DEFAULT 0, checkpoint text,
 updated_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(organisation_id,brand_id,engagement_id,session_id),
 FOREIGN KEY(organisation_id,brand_id,engagement_id,session_id) REFERENCES strategy_session
);
CREATE OR REPLACE FUNCTION strategy_guard_job_binding() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF ROW(NEW.organisation_id,NEW.brand_id,NEW.engagement_id,NEW.session_id,NEW.input_revision,NEW.actor_id,NEW.action,NEW.command_id,NEW.command_text,NEW.command_digest,NEW.pins_text,NEW.method_release)
 IS DISTINCT FROM ROW(OLD.organisation_id,OLD.brand_id,OLD.engagement_id,OLD.session_id,OLD.input_revision,OLD.actor_id,OLD.action,OLD.command_id,OLD.command_text,OLD.command_digest,OLD.pins_text,OLD.method_release)
 THEN RAISE EXCEPTION 'Strategy job binding is immutable'; END IF;
 RETURN NEW;
END $$;
DO $$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM pg_trigger WHERE tgname='strategy_job_binding_immutable' AND tgrelid='strategy_job'::regclass) THEN
 CREATE TRIGGER strategy_job_binding_immutable BEFORE UPDATE ON strategy_job FOR EACH ROW EXECUTE FUNCTION strategy_guard_job_binding();
 END IF;
END $$;
CREATE TABLE IF NOT EXISTS strategy_create_command (
 organisation_id text NOT NULL, brand_id text NOT NULL, engagement_id text NOT NULL,
 command_id text NOT NULL, actor_id text NOT NULL, action text NOT NULL, command_input text NOT NULL,
 session_id text NOT NULL, created_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(organisation_id,brand_id,engagement_id,command_id),
 FOREIGN KEY(organisation_id,brand_id,engagement_id,session_id) REFERENCES strategy_session
);
DO $$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM pg_trigger WHERE tgname='strategy_create_command_immutable' AND tgrelid='strategy_create_command'::regclass) THEN
 CREATE TRIGGER strategy_create_command_immutable BEFORE UPDATE OR DELETE ON strategy_create_command FOR EACH ROW EXECUTE FUNCTION strategy_reject_history_change();
 END IF;
END $$;
ALTER TABLE strategy_job ADD COLUMN IF NOT EXISTS provider_run_id text;
CREATE UNIQUE INDEX IF NOT EXISTS strategy_job_provider_run ON strategy_job(provider_run_id) WHERE provider_run_id IS NOT NULL;
ALTER TABLE strategy_checkpoint_mirror ADD COLUMN IF NOT EXISTS last_revision integer NOT NULL DEFAULT 0;
