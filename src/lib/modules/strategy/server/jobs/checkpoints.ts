import type { Pool } from "pg";
import type { StrategyCheckpointGateway } from "./gateway";

/** SQL-backed idempotent checkpoint delivery ledger. Trigger run metadata is
 * observability only; strategy_checkpoint_mirror + this table are durable state.
 */
export function createStrategyCheckpointGateway(pool: Pool): StrategyCheckpointGateway {
  async function record(input: {
    organisationId: string;
    brandId: string;
    engagementId: string;
    eventKey: string;
    sessionId: string;
    revision: number;
    epoch: number;
    eventKind: "checkpoint" | "reset";
    stage: string;
    ordering: "sequential" | "independent";
  }): Promise<void> {
    if (!input.eventKey || !input.sessionId || !input.stage) {
      throw new Error("Checkpoint event binding is incomplete");
    }
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const owner = [input.organisationId, input.brandId, input.engagementId, input.sessionId];
      const session = await client.query(
        "SELECT revision FROM strategy_session WHERE organisation_id=$1 AND brand_id=$2 AND engagement_id=$3 AND id=$4 FOR UPDATE",
        owner,
      );
      if (!session.rows[0] || input.revision > session.rows[0].revision) {
        throw new Error("Checkpoint does not bind to a committed strategy session revision");
      }
      const mirror = await client.query(
        "SELECT epoch FROM strategy_checkpoint_mirror WHERE organisation_id=$1 AND brand_id=$2 AND engagement_id=$3 AND session_id=$4 FOR UPDATE",
        owner,
      );
      if (!mirror.rows[0] || mirror.rows[0].epoch !== input.epoch) {
        throw new Error("Checkpoint epoch is no longer current");
      }
      const inserted = await client.query(
        `INSERT INTO strategy_checkpoint_delivery
          (event_key,organisation_id,brand_id,engagement_id,session_id,revision,epoch,event_kind,stage,ordering)
         VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) ON CONFLICT(event_key) DO NOTHING RETURNING event_key`,
        [
          input.eventKey,
          ...owner,
          input.revision,
          input.epoch,
          input.eventKind,
          input.stage,
          input.ordering,
        ],
      );
      if (!inserted.rowCount) {
        const prior = await client.query(
          "SELECT organisation_id,brand_id,engagement_id,session_id,revision,epoch,event_kind,stage,ordering FROM strategy_checkpoint_delivery WHERE event_key=$1",
          [input.eventKey],
        );
        const row = prior.rows[0];
        const values = [
          row?.organisation_id,
          row?.brand_id,
          row?.engagement_id,
          row?.session_id,
          row?.revision,
          row?.epoch,
          row?.event_kind,
          row?.stage,
          row?.ordering,
        ];
        const expected = [
          input.organisationId,
          input.brandId,
          input.engagementId,
          input.sessionId,
          input.revision,
          input.epoch,
          input.eventKind,
          input.stage,
          input.ordering,
        ];
        if (!row || values.some((value, index) => value !== expected[index])) {
          throw new Error("Checkpoint event key reused with different content");
        }
      }
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  return {
    deliver: (input) =>
      record({ ...input, eventKind: "checkpoint", stage: input.stage, ordering: input.ordering ?? "sequential" }),
    reset: (input) =>
      record({
        ...input,
        eventKind: "reset",
        stage: input.restartFrom,
        ordering: "sequential",
      }),
  };
}
