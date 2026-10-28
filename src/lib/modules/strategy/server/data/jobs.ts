import { createHash } from "node:crypto";
import type { Pool, PoolClient } from "pg";
import { assertStrategyScope, recheckStrategyScope, type StrategyScope } from "../access";
import { StrategyConflict, StrategyNotFound } from "./repository";
export interface JobPin {
  slot: string;
  versionId: string;
  hash: string;
}
export interface EnqueueJob {
  id: string;
  sessionId: string;
  expectedRevision: number;
  commandId: string;
  command: Record<string, unknown>;
  pins: JobPin[];
  methodRelease: string;
}
export interface DurableJob extends EnqueueJob {
  organisationId: string;
  brandId: string;
  engagementId: string;
  actorId: string;
  action: "generate";
  status: "pending" | "running" | "succeeded" | "failed" | "cancelled";
  fence: number;
  attempts: number;
  leaseUntil: Date | null;
  result: unknown;
}
export interface JobLease {
  jobId: string;
  fence: number;
}
const owned = (s: StrategyScope) => [s.organisationId, s.brandId, s.engagementId];
const where = "organisation_id=$1 AND brand_id=$2 AND engagement_id=$3";
const m04DraftStages = new Set([
  "context",
  "conviction-cost",
  "market-readiness",
  "human-load",
  "financial-grounding",
  "awareness-and-weighing",
  "recommendation",
]);
function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return `{${Object.keys(record)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonicalJson(record[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value) ?? "null";
}
interface JobRow {
  id: string;
  organisation_id: string;
  brand_id: string;
  engagement_id: string;
  session_id: string;
  input_revision: number;
  command_id: string;
  command_text: string;
  pins_text: string;
  method_release: string;
  actor_id: string;
  action: "generate";
  status: DurableJob["status"];
  fence: number;
  attempts: number;
  lease_until: Date | null;
  result_text: string | null;
}
function mapJob(row: JobRow): DurableJob {
  return {
    id: row.id,
    organisationId: row.organisation_id,
    brandId: row.brand_id,
    engagementId: row.engagement_id,
    sessionId: row.session_id,
    expectedRevision: row.input_revision,
    commandId: row.command_id,
    command: JSON.parse(row.command_text),
    pins: JSON.parse(row.pins_text),
    methodRelease: row.method_release,
    actorId: row.actor_id,
    action: row.action,
    status: row.status,
    fence: row.fence,
    attempts: row.attempts,
    leaseUntil: row.lease_until,
    result: row.result_text === null ? null : JSON.parse(row.result_text),
  };
}
export class StrategyLeaseLost extends Error {
  constructor() {
    super("Strategy job lease lost");
  }
}
/** Worker-only load is not a user read API. Every execution obtains a fresh host scope. */
export class StrategyJobs {
  constructor(private readonly pool: Pool) {}
  private async transaction<T>(
    scope: StrategyScope,
    work: (db: PoolClient) => Promise<T>,
  ): Promise<T> {
    assertStrategyScope(scope, ["generate", "manage"]);
    const db = await this.pool.connect();
    try {
      await db.query("BEGIN");
      await recheckStrategyScope(scope, db);
      const exists = await db.query(
        "SELECT id FROM strategy_engagement WHERE organisation_id=$1 AND brand_id=$2 AND id=$3 FOR UPDATE",
        owned(scope),
      );
      if (!exists.rowCount) throw new StrategyNotFound();
      const result = await work(db);
      await recheckStrategyScope(scope, db);
      await db.query("COMMIT");
      return result;
    } catch (error) {
      await db.query("ROLLBACK");
      throw error;
    } finally {
      db.release();
    }
  }
  async load(jobId: string): Promise<DurableJob | null> {
    const { rows } = await this.pool.query("SELECT * FROM strategy_job WHERE id=$1", [jobId]);
    return rows[0] ? mapJob(rows[0]) : null;
  }
  async get(scope: StrategyScope, jobId: string): Promise<DurableJob | null> {
    assertStrategyScope(scope, ["generate"]);
    return this.transaction(scope, async (db) => {
      const { rows } = await db.query(
        `SELECT * FROM strategy_job WHERE ${where} AND id=$4 AND actor_id=$5`,
        [...owned(scope), jobId, scope.actorId],
      );
      return rows[0] ? mapJob(rows[0]) : null;
    });
  }
  async enqueue(scope: StrategyScope, input: EnqueueJob): Promise<DurableJob> {
    assertStrategyScope(scope, ["generate"]);
    if (!input.commandId.trim() || !input.methodRelease.trim())
      throw new Error("Job command and method release required");
    if (
      input.command.sessionId !== input.sessionId ||
      input.command.expectedRevision !== input.expectedRevision ||
      input.command.commandId !== input.commandId ||
      "jobLease" in input.command
    )
      throw new Error("Job command binding mismatch");
    const commandText = JSON.stringify(input.command),
      pinsText = JSON.stringify(input.pins);
    const digest = createHash("sha256")
      .update(
        JSON.stringify({
          commandText,
          pinsText,
          methodRelease: input.methodRelease,
          inputRevision: input.expectedRevision,
        }),
      )
      .digest("hex");
    return this.transaction(scope, async (db) => {
      const prior = await db.query(
        `SELECT * FROM strategy_job WHERE ${where} AND session_id=$4 AND command_id=$5`,
        [...owned(scope), input.sessionId, input.commandId],
      );
      if (prior.rows[0]) {
        if (prior.rows[0].command_digest !== digest || prior.rows[0].actor_id !== scope.actorId)
          throw new Error("Idempotency key reused for different job");
        return mapJob(prior.rows[0]);
      }
      const current = await db.query(
        `SELECT revision,stage FROM strategy_session WHERE ${where} AND id=$4 FOR UPDATE`,
        [...owned(scope), input.sessionId],
      );
      if (!current.rows[0]) throw new StrategyNotFound();
      if (current.rows[0].revision !== input.expectedRevision)
        throw new StrategyConflict(current.rows[0].revision);
      await this.assertPins(db, scope, input.pins);
      const stage = input.command.stage;
      if (
        current.rows[0].stage === "m04" &&
        typeof stage === "string" &&
        m04DraftStages.has(stage)
      ) {
        const active = await db.query(
          `SELECT * FROM strategy_job
           WHERE ${where} AND session_id=$4 AND input_revision=$5
             AND status IN ('pending','running') AND command_text::jsonb->>'stage'=$6
           ORDER BY created_at LIMIT 1`,
          [...owned(scope), input.sessionId, input.expectedRevision, stage],
        );
        if (active.rows[0]) {
          const existing = active.rows[0];
          const existingCommand = JSON.parse(existing.command_text) as Record<string, unknown>;
          delete existingCommand.commandId;
          const requestedCommand = { ...input.command };
          delete requestedCommand.commandId;
          if (
            existing.actor_id !== scope.actorId ||
            canonicalJson(existingCommand) !== canonicalJson(requestedCommand) ||
            canonicalJson(JSON.parse(existing.pins_text)) !== canonicalJson(input.pins) ||
            existing.method_release !== input.methodRelease
          )
            throw new Error("A draft is already in progress for this stage");
          return mapJob(existing);
        }
      }
      const { rows } = await db.query(
        `INSERT INTO strategy_job(id,organisation_id,brand_id,engagement_id,session_id,input_revision,actor_id,action,command_id,command_text,command_digest,pins_text,method_release) VALUES($1,$2,$3,$4,$5,$6,$7,'generate',$8,$9,$10,$11,$12) RETURNING *`,
        [
          input.id,
          ...owned(scope),
          input.sessionId,
          input.expectedRevision,
          scope.actorId,
          input.commandId,
          commandText,
          digest,
          pinsText,
          input.methodRelease,
        ],
      );
      await db.query(
        "INSERT INTO strategy_outbox(organisation_id,brand_id,engagement_id,session_id,revision,kind,payload) VALUES($1,$2,$3,$4,$5,$6,$7::jsonb)",
        [
          ...owned(scope),
          input.sessionId,
          input.expectedRevision,
          "strategy.job.enqueue",
          JSON.stringify({ jobId: input.id }),
        ],
      );
      return mapJob(rows[0]);
    });
  }
  private async assertPins(db: PoolClient, scope: StrategyScope, pins: JobPin[]) {
    for (const pin of pins) {
      const { rows } = await db.query(
        `SELECT h.version_id,v.seal_hash FROM strategy_source_head h JOIN strategy_version v ON v.organisation_id=h.organisation_id AND v.brand_id=h.brand_id AND v.engagement_id=h.engagement_id AND v.id=h.version_id WHERE h.organisation_id=$1 AND h.brand_id=$2 AND h.engagement_id=$3 AND h.slot=$4`,
        [...owned(scope), pin.slot],
      );
      if (!rows[0] || rows[0].version_id !== pin.versionId || rows[0].seal_hash !== pin.hash)
        throw new Error("Strategy job source changed");
    }
  }
  async claim(
    scope: StrategyScope,
    id: string,
    leaseSeconds = 120,
  ): Promise<{ job: DurableJob; fence: number } | null> {
    if (!Number.isInteger(leaseSeconds) || leaseSeconds < 1 || leaseSeconds > 3600)
      throw new Error("Invalid lease duration");
    return this.transaction(scope, async (db) => {
      const { rows } = await db.query(
        `SELECT * FROM strategy_job WHERE ${where} AND id=$4 FOR UPDATE`,
        [...owned(scope), id],
      );
      if (!rows[0]) throw new StrategyNotFound();
      const job = mapJob(rows[0]);
      if (job.actorId !== scope.actorId) throw new Error("Job principal mismatch");
      if (["succeeded", "failed", "cancelled"].includes(job.status)) return null;
      await this.assertPins(db, scope, job.pins);
      const claimed = await db.query(
        `UPDATE strategy_job SET status='running',fence=fence+1,attempts=attempts+1,lease_until=now()+$5*interval '1 second',updated_at=now() WHERE ${where} AND id=$4 AND available_at<=now() AND (status='pending' OR (status='running' AND lease_until<=clock_timestamp())) RETURNING *`,
        [...owned(scope), id, leaseSeconds],
      );
      return claimed.rows[0]
        ? { job: mapJob(claimed.rows[0]), fence: claimed.rows[0].fence }
        : null;
    });
  }
  async heartbeat(scope: StrategyScope, lease: JobLease, leaseSeconds = 120): Promise<void> {
    await this.transaction(scope, async (db) => {
      const result = await db.query(
        `UPDATE strategy_job SET lease_until=now()+$6*interval '1 second' WHERE ${where} AND id=$4 AND fence=$5 AND actor_id=$7 AND status='running' AND lease_until>clock_timestamp()`,
        [...owned(scope), lease.jobId, lease.fence, leaseSeconds, scope.actorId],
      );
      if (!result.rowCount) throw new StrategyLeaseLost();
    });
  }
  async complete(scope: StrategyScope, lease: JobLease, result: unknown): Promise<void> {
    await this.transaction(scope, async (db) => {
      const updated = await db.query(
        `UPDATE strategy_job SET status='succeeded',result_text=$6,lease_until=NULL,updated_at=now() WHERE ${where} AND id=$4 AND fence=$5 AND actor_id=$7 AND status='running' AND lease_until>clock_timestamp()`,
        [...owned(scope), lease.jobId, lease.fence, JSON.stringify(result ?? null), scope.actorId],
      );
      if (!updated.rowCount) {
        const prior = await db.query(
          `SELECT id FROM strategy_job WHERE ${where} AND id=$4 AND fence=$5 AND actor_id=$6 AND status='succeeded'`,
          [...owned(scope), lease.jobId, lease.fence, scope.actorId],
        );
        if (!prior.rowCount) throw new StrategyLeaseLost();
      }
    });
  }
  async fail(
    scope: StrategyScope,
    lease: JobLease,
    error: string,
    retrySeconds: number | null = 30,
  ): Promise<void> {
    await this.transaction(scope, async (db) => {
      const result = await db.query(
        `UPDATE strategy_job SET status=$6,last_error=$7,available_at=now()+$8*interval '1 second',lease_until=NULL,updated_at=now() WHERE ${where} AND id=$4 AND fence=$5 AND actor_id=$9 AND status='running' AND lease_until>clock_timestamp()`,
        [
          ...owned(scope),
          lease.jobId,
          lease.fence,
          retrySeconds === null ? "failed" : "pending",
          error.slice(0, 500),
          retrySeconds ?? 0,
          scope.actorId,
        ],
      );
      if (!result.rowCount) throw new StrategyLeaseLost();
    });
  }
  async cancel(scope: StrategyScope, id: string): Promise<void> {
    await this.transaction(scope, async (db) => {
      await db.query(
        `UPDATE strategy_job SET status='cancelled',fence=fence+1,lease_until=NULL,updated_at=now() WHERE ${where} AND id=$4 AND status IN ('pending','running') AND (actor_id=$5 OR $6='manage')`,
        [...owned(scope), id, scope.actorId, scope.action],
      );
    });
  }
  /** Signature/replay-window verification belongs to the gateway before this method. */
  async recordCallback(scope: StrategyScope, lease: JobLease, eventId: string): Promise<boolean> {
    return this.transaction(scope, async (db) => {
      const prior = await db.query(
        `SELECT c.fence FROM strategy_job_callback c JOIN strategy_job j ON j.id=c.job_id WHERE j.organisation_id=$1 AND j.brand_id=$2 AND j.engagement_id=$3 AND j.actor_id=$4 AND j.id=$5 AND c.event_id=$6`,
        [...owned(scope), scope.actorId, lease.jobId, eventId],
      );
      if (prior.rows[0]) {
        if (prior.rows[0].fence !== lease.fence)
          throw new Error("Callback event reused with different fence");
        return false;
      }
      const job = await db.query(
        `SELECT id FROM strategy_job WHERE ${where} AND id=$4 AND fence=$5 AND actor_id=$6 AND status='running' AND lease_until>clock_timestamp()`,
        [...owned(scope), lease.jobId, lease.fence, scope.actorId],
      );
      if (!job.rowCount) throw new StrategyLeaseLost();
      const { rowCount } = await db.query(
        "INSERT INTO strategy_job_callback(job_id,event_id,fence) VALUES($1,$2,$3) ON CONFLICT DO NOTHING",
        [lease.jobId, eventId, lease.fence],
      );
      return !!rowCount;
    });
  }
  /** Recovery candidates contain IDs only and require reauthorisation when run. */
  async recoverable(limit = 50, stage?: string): Promise<string[]> {
    const { rows } = await this.pool.query(
      `WITH candidates AS (
        SELECT j.id,j.organisation_id,j.brand_id,j.engagement_id FROM strategy_job j
        WHERE ((j.status='pending' AND j.available_at<=now()) OR (j.status='running' AND j.lease_until<=clock_timestamp()))
          AND j.recovery_dispatch_after<=clock_timestamp()
          AND ($2::text IS NULL OR EXISTS (
            SELECT 1 FROM strategy_session s
            WHERE s.organisation_id=j.organisation_id AND s.brand_id=j.brand_id
              AND s.engagement_id=j.engagement_id AND s.id=j.session_id AND s.stage=$2
          ))
        ORDER BY j.created_at FOR UPDATE OF j SKIP LOCKED LIMIT $1
      )
      UPDATE strategy_job j SET recovery_dispatch_after=clock_timestamp()+interval '2 minutes'
      FROM candidates c WHERE j.id=c.id AND j.organisation_id=c.organisation_id
        AND j.brand_id=c.brand_id AND j.engagement_id=c.engagement_id RETURNING j.id`,
      [Math.max(1, Math.min(200, limit)), stage ?? null],
    );
    return rows.map((r) => r.id);
  }
}
