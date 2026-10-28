ALTER TABLE strategy_job
  ADD COLUMN IF NOT EXISTS recovery_dispatch_after timestamptz NOT NULL DEFAULT '-infinity';

CREATE TABLE IF NOT EXISTS strategy_checkpoint_delivery (
  event_key text PRIMARY KEY,
  organisation_id text NOT NULL,
  brand_id text NOT NULL,
  engagement_id text NOT NULL,
  session_id text NOT NULL,
  revision integer NOT NULL,
  epoch integer NOT NULL,
  event_kind text NOT NULL CHECK (event_kind IN ('checkpoint', 'reset')),
  stage text NOT NULL,
  ordering text NOT NULL CHECK (ordering IN ('sequential', 'independent')),
  delivered_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (organisation_id, brand_id, engagement_id, session_id)
    REFERENCES strategy_session(organisation_id, brand_id, engagement_id, id)
);

CREATE INDEX IF NOT EXISTS strategy_checkpoint_delivery_owner
  ON strategy_checkpoint_delivery(organisation_id, brand_id, engagement_id, session_id, revision);
