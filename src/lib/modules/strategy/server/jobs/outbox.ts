import type { Pool } from "pg";
import type { StrategyJobGateway, StrategyCheckpointGateway } from "./gateway";
export interface OutboxDelivery {
  id: string;
  organisationId: string;
  brandId: string;
  engagementId: string;
  sessionId: string;
  revision: number;
  kind: string;
  payload: Record<string, unknown>;
  fence: number;
  epoch: number;
}
/** Service-identity boundary. Never expose these unscoped recovery methods to users.
 * It recovers already committed decisions even after the original user loses access.
 */
export class StrategyOutbox {
  constructor(private readonly pool: Pool) {}
  /** Fast web delivery uses the same durable event key as scheduled replay. */
  async dispatchCommittedJob(jobId: string, gateway: StrategyJobGateway): Promise<void> {
    const {rows} = await this.pool.query(
      "SELECT * FROM strategy_outbox WHERE kind='strategy.job.enqueue' AND payload->>'jobId'=$1 ORDER BY id LIMIT 1",
      [jobId],
    );
    const row=rows[0];
    if(!row)throw new Error("Durable job event unavailable");
    await this.dispatchJob({id:String(row.id),organisationId:row.organisation_id,brandId:row.brand_id,
      engagementId:row.engagement_id,sessionId:row.session_id,revision:row.revision,kind:row.kind,
      payload:row.payload,fence:row.delivery_fence,epoch:row.epoch},gateway);
    // A normal claimed outbox pass acknowledges this already-bound delivery.
  }
  async claim(leaseSeconds = 60): Promise<OutboxDelivery | null> {
    const { rows } = await this.pool.query(
      `WITH candidate AS (SELECT id FROM strategy_outbox WHERE delivered_at IS NULL AND available_at<=now() AND (lease_until IS NULL OR lease_until<=clock_timestamp()) ORDER BY id FOR UPDATE SKIP LOCKED LIMIT 1) UPDATE strategy_outbox o SET lease_until=clock_timestamp()+$1*interval '1 second',delivery_fence=delivery_fence+1,attempts=attempts+1 FROM candidate c WHERE o.id=c.id RETURNING o.*`,
      [leaseSeconds],
    );
    const row = rows[0];
    return row
      ? {
          id: String(row.id),
          organisationId: row.organisation_id,
          brandId: row.brand_id,
          engagementId: row.engagement_id,
          sessionId: row.session_id,
          revision: row.revision,
          kind: row.kind,
          payload: row.payload,
          fence: row.delivery_fence,
          epoch: row.epoch,
        }
      : null;
  }
  async acknowledge(event: OutboxDelivery): Promise<void> {
    const result = await this.pool.query(
      "UPDATE strategy_outbox SET delivered_at=now(),lease_until=NULL WHERE id=$1 AND delivery_fence=$2 AND delivered_at IS NULL AND lease_until>clock_timestamp()",
      [event.id, event.fence],
    );
    if (!result.rowCount) {
      const prior = await this.pool.query(
        "SELECT id FROM strategy_outbox WHERE id=$1 AND delivery_fence=$2 AND delivered_at IS NOT NULL",
        [event.id, event.fence],
      );
      if (!prior.rowCount) throw new Error("Outbox lease lost");
    }
  }
  async retry(event: OutboxDelivery, seconds = 30): Promise<void> {
    await this.pool.query(
      "UPDATE strategy_outbox SET available_at=now()+$3*interval '1 second',lease_until=NULL WHERE id=$1 AND delivery_fence=$2 AND delivered_at IS NULL",
      [event.id, event.fence, seconds],
    );
  }
  async dispatchJob(event: OutboxDelivery, gateway: StrategyJobGateway): Promise<void> {
    const binding = [
      event.organisationId,
      event.brandId,
      event.engagementId,
      String(event.payload.jobId),
    ];
    const job = await this.pool.query(
      "SELECT provider_run_id FROM strategy_job WHERE organisation_id=$1 AND brand_id=$2 AND engagement_id=$3 AND id=$4",
      binding,
    );
    if (!job.rows[0]) throw new Error("Outbox job binding unavailable");
    // The provider run was durably bound before acknowledgement failed. The
    // caller can safely acknowledge this replay; SQL job recovery handles a
    // run that completed/lost delivery without completing the durable job.
    if (job.rows[0].provider_run_id) return;
    const delivered = await gateway.dispatch({
      jobId: String(event.payload.jobId),
      // Stable until a Trigger run ID is persisted. If the process crashes in
      // between, replay retrieves the same run; later lost runs are recovered
      // through SQL jobs with a fresh delivery key.
      idempotencyKey: `strategy-outbox:${event.id}`,
    });
    const persisted = await this.pool.query(
      "UPDATE strategy_job SET provider_run_id=$5 WHERE organisation_id=$1 AND brand_id=$2 AND engagement_id=$3 AND id=$4 AND (provider_run_id IS NULL OR provider_run_id=$5)",
      [...binding, delivered.runId],
    );
    if (!persisted.rowCount)
      throw new Error("Conflicting provider run binding requires reconciliation");
  }
  /** Deduplicated persistent mirror epoch; subsequent delivery uses stable event key. */
  async mirror(event: OutboxDelivery): Promise<{ epoch: number; stale: boolean }> {
    const db = await this.pool.connect();
    try {
      await db.query("BEGIN");
      const owned = [event.organisationId, event.brandId, event.engagementId, event.sessionId];
      await db.query(
        "INSERT INTO strategy_checkpoint_mirror(organisation_id,brand_id,engagement_id,session_id) VALUES($1,$2,$3,$4) ON CONFLICT DO NOTHING",
        owned,
      );
      const { rows } = await db.query(
        "SELECT epoch,checkpoint,last_revision FROM strategy_checkpoint_mirror WHERE organisation_id=$1 AND brand_id=$2 AND engagement_id=$3 AND session_id=$4 FOR UPDATE",
        owned,
      );
      const current = rows[0];
      // Revision is a monotonic source of epoch for reset events. Retrying cannot
      // increment it again; an older delivery cannot undo a later reset.
      const epoch =
        event.kind === "m04.revise" || event.kind.endsWith(".successor")
          ? Math.max(current.epoch, event.revision)
          : current.epoch;
      // M01 votes are independent: delayed delivery of an earlier gate must not
      // disappear merely because a different gate was delivered first.
      const stale =
        event.revision <
        (event.kind === "m01.checkpoint" ? epoch : Math.max(epoch, current.last_revision));
      if (!stale)
        await db.query(
          "UPDATE strategy_checkpoint_mirror SET epoch=$5,checkpoint=$6,last_revision=$7,updated_at=now() WHERE organisation_id=$1 AND brand_id=$2 AND engagement_id=$3 AND session_id=$4",
          [
            ...owned,
            epoch,
            String(event.payload.stage ?? event.payload.restartFrom ?? ""),
            Math.max(event.revision, current.last_revision),
          ],
        );
      await db.query("COMMIT");
      return { epoch, stale };
    } catch (error) {
      await db.query("ROLLBACK");
      throw error;
    } finally {
      db.release();
    }
  }
}
export function createStrategyOutboxDispatcher(ports: {
  outbox: StrategyOutbox;
  jobs: StrategyJobGateway;
  checkpoints: StrategyCheckpointGateway;
}) {
  return {
    async dispatchOne(): Promise<boolean> {
      const event = await ports.outbox.claim();
      if (!event) return false;
      try {
        const eventKey = `strategy-outbox:${event.id}`;
        if (event.kind === "strategy.job.enqueue")
          await ports.outbox.dispatchJob(event, ports.jobs);
        else if (
          [
            "m04.checkpoint",
            "m04.revise",
            "m01.checkpoint",
            "m01.successor",
            "m04.successor",
          ].includes(event.kind)
        ) {
          const isSuccessor = event.kind.endsWith(".successor");
          const restartFrom = isSuccessor
            ? event.kind === "m01.successor"
              ? "plan"
              : "context"
            : String(event.payload.restartFrom ?? event.payload.stage);
          const mirror = await ports.outbox.mirror(
            isSuccessor ? { ...event, payload: { ...event.payload, restartFrom } } : event,
          );
          if (!mirror.stale) {
            if (event.kind === "m04.revise" || isSuccessor)
              await ports.checkpoints.reset({
                organisationId: event.organisationId,
                brandId: event.brandId,
                engagementId: event.engagementId,
                eventKey,
                sessionId: event.sessionId,
                restartFrom,
                revision: event.revision,
                epoch: mirror.epoch,
              });
            else
              await ports.checkpoints.deliver({
                organisationId: event.organisationId,
                brandId: event.brandId,
                engagementId: event.engagementId,
                eventKey,
                sessionId: event.sessionId,
                stage: String(event.payload.stage),
                revision: event.revision,
                epoch: mirror.epoch,
                ordering: event.kind === "m01.checkpoint" ? "independent" : "sequential",
              });
          }
        } else throw new Error("Outbox event handler unavailable");
        await ports.outbox.acknowledge(event);
        return true;
      } catch (error) {
        await ports.outbox.retry(event);
        throw error;
      }
    },
  };
}
