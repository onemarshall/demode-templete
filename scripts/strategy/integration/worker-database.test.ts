import { expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { Pool } from "pg";
import { StrategyJobs } from "../../../src/lib/modules/strategy/server/data/jobs";
import { createStrategyAccess } from "../../../src/lib/modules/strategy/server/access";
import {
  createStrategyOutboxDispatcher,
  StrategyOutbox,
  type OutboxDelivery,
} from "../../../src/lib/modules/strategy/server/jobs/outbox";
import { StrategyLeaseLost } from "../../../src/lib/modules/strategy/server/data/jobs";
import { createStrategyCheckpointGateway } from "../../../src/lib/modules/strategy/server/jobs/checkpoints";
import { createStrategyRecovery } from "../../../src/lib/modules/strategy/server/jobs/recovery";
import { runAuthStrategyRecoveryV1 } from "../../../src/trigger/strategy-task-handlers";
import { readConnection } from "./local-stack";

const migrations = [
  "0004_strategy_core.sql",
  "0005_strategy_jobs.sql",
  "0006_strategy_directus.sql",
  "0008_strategy_recovery_and_checkpoint_delivery.sql",
];

async function isolatedDatabase() {
  const config = await readConnection();
  const schema = `strategy_worker_${randomUUID().replaceAll("-", "")}`;
  const admin = new Pool({ connectionString: config.databaseUrl });
  await admin.query(`CREATE SCHEMA ${schema}`);
  const pool = new Pool({
    connectionString: config.databaseUrl,
    options: `-c search_path=${schema}`,
    max: 8,
  });
  const client = await pool.connect();
  try {
    for (const migration of migrations) {
      await client.query("BEGIN");
      await client.query(await readFile(`database/migrations/${migration}`, "utf8"));
      await client.query("COMMIT");
    }
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    client.release();
    await pool.end();
    await admin.query(`DROP SCHEMA ${schema} CASCADE`);
    await admin.end();
    throw error;
  }
  client.release();
  return {
    pool,
    async close() {
      await pool.end();
      await admin.query(`DROP SCHEMA ${schema} CASCADE`);
      await admin.end();
    },
  };
}

async function seedJob(pool: Pool, sessionStage = "m04") {
  const suffix = randomUUID();
  const ownership = {
    organisationId: `org-${suffix}`,
    brandId: `brand-${suffix}`,
    engagementId: `eng-${suffix}`,
    sessionId: `session-${suffix}`,
    actorId: `actor-${suffix}`,
  };
  const access = createStrategyAccess(async (request) => ({
    actorId: ownership.actorId,
    organisationId: request.organisationId,
    brandId: request.brandId,
    activeMembership: true,
    activeBrandAssignment: true,
    actions: [request.action],
  }));
  const scope = await access.authorize({
    organisationId: ownership.organisationId,
    brandId: ownership.brandId,
    engagementId: ownership.engagementId,
    action: "generate",
  });
  const client = await pool.connect();
  await client.query("BEGIN");
  try {
    await client.query("INSERT INTO strategy_brand_binding(organisation_id,brand_id) VALUES($1,$2)", [
      ownership.organisationId,
      ownership.brandId,
    ]);
    await client.query(
      "INSERT INTO strategy_engagement(organisation_id,brand_id,id,label,created_by) VALUES($1,$2,$3,$4,$5)",
      [ownership.organisationId, ownership.brandId, ownership.engagementId, "Synthetic", ownership.actorId],
    );
    await client.query(
      "INSERT INTO strategy_session(organisation_id,brand_id,engagement_id,id,stage,revision) VALUES($1,$2,$3,$4,$5,1)",
      [ownership.organisationId, ownership.brandId, ownership.engagementId, ownership.sessionId, sessionStage],
    );
    const payloadText = "{}";
    await client.query(
      "INSERT INTO strategy_revision(organisation_id,brand_id,engagement_id,session_id,revision,command_id,actor_id,action,command_input,payload,payload_text) VALUES($1,$2,$3,$4,1,'initial',$5,'edit','{}',$6::jsonb,$6)",
      [ownership.organisationId, ownership.brandId, ownership.engagementId, ownership.sessionId, ownership.actorId, payloadText],
    );
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }

  const jobs = new StrategyJobs(pool);
  const commandId = `command-${suffix}`;
  const job = await jobs.enqueue(scope, {
    id: `job-${suffix}`,
    sessionId: ownership.sessionId,
    expectedRevision: 1,
    commandId,
    command: { sessionId: ownership.sessionId, expectedRevision: 1, commandId, stage: "context" },
    pins: [],
    methodRelease: "synthetic-method-release",
  });
  // The enqueue transaction wrote its normal job event; tests below add only
  // the checkpoint event they intend to exercise.
  await pool.query("DELETE FROM strategy_outbox WHERE payload->>'jobId'=$1", [job.id]);
  return { jobs, scope, job, ownership };
}

async function insertOutbox(pool: Pool, input: {
  ownership: Awaited<ReturnType<typeof seedJob>>["ownership"];
  kind: string;
  payload: Record<string, unknown>;
}) {
  const inserted = await pool.query(
    "INSERT INTO strategy_outbox(organisation_id,brand_id,engagement_id,session_id,revision,kind,payload) VALUES($1,$2,$3,$4,1,$5,$6::jsonb) RETURNING id",
    [
      input.ownership.organisationId,
      input.ownership.brandId,
      input.ownership.engagementId,
      input.ownership.sessionId,
      input.kind,
      JSON.stringify(input.payload),
    ],
  );
  return String(inserted.rows[0].id);
}

function dispatcher(pool: Pool) {
  return createStrategyOutboxDispatcher({
    outbox: new StrategyOutbox(pool),
    jobs: { dispatch: async () => ({ runId: "synthetic-run" }) },
    checkpoints: createStrategyCheckpointGateway(pool),
  });
}

test("recoverable candidates are reserved atomically across concurrent scans", async () => {
  const db = await isolatedDatabase();
  try {
    const { jobs, job } = await seedJob(db.pool);
    const scans = await Promise.all([jobs.recoverable(50), jobs.recoverable(50)]);
    expect(scans.flat()).toEqual([job.id]);
    expect(scans.filter((ids) => ids.includes(job.id))).toHaveLength(1);
  } finally {
    await db.close();
  }
}, 30_000);

test("the M04 recovery gateway leaves other-stage jobs for their own worker", async () => {
  const db = await isolatedDatabase();
  try {
    const m04 = await seedJob(db.pool, "m04");
    const other = await seedJob(db.pool, "m02");
    const dispatch = async (input: { jobId: string; idempotencyKey: string }) => ({ runId: input.jobId });
    const recovery = createStrategyRecovery({
      jobs: m04.jobs,
      gateway: { dispatch },
    });

    expect(await recovery.dispatchRecoverable()).toBe(1);
    expect(await m04.jobs.recoverable(50)).toEqual([other.job.id]);
  } finally {
    await db.close();
  }
}, 30_000);

test("expired SQL leases are reclaimable and fence out the prior worker", async () => {
  const db = await isolatedDatabase();
  try {
    const { jobs, scope, job } = await seedJob(db.pool);
    const first = await jobs.claim(scope, job.id, 30);
    expect(first).not.toBeNull();
    await db.pool.query("UPDATE strategy_job SET lease_until=clock_timestamp()-interval '1 second' WHERE id=$1", [job.id]);
    expect(await jobs.recoverable()).toEqual([job.id]);
    const second = await jobs.claim(scope, job.id, 30);
    expect(second?.fence).toBe((first?.fence ?? 0) + 1);
    await expect(jobs.heartbeat(scope, { jobId: job.id, fence: first!.fence }, 30)).rejects.toBeInstanceOf(StrategyLeaseLost);
  } finally {
    await db.close();
  }
}, 30_000);

test("committed checkpoint delivery is SQL-idempotent without origin actor policy", async () => {
  const db = await isolatedDatabase();
  try {
    const { ownership, job } = await seedJob(db.pool);
    const eventId = await insertOutbox(db.pool, { ownership, kind: "m04.checkpoint", payload: { jobId: job.id, stage: "context" } });
    const outbox = dispatcher(db.pool);
    expect(await outbox.dispatchOne()).toBe(true);
    const event: OutboxDelivery = {
      id: eventId,
      ...ownership,
      revision: 1,
      kind: "m04.checkpoint",
      payload: { stage: "context" },
      fence: 1,
      epoch: 0,
    };
    const checkpointGateway = createStrategyCheckpointGateway(db.pool);
    await checkpointGateway.deliver({
      organisationId: ownership.organisationId,
      brandId: ownership.brandId,
      engagementId: ownership.engagementId,
      eventKey: `strategy-outbox:${eventId}`,
      sessionId: ownership.sessionId,
      revision: 1,
      epoch: 0,
      stage: "context",
      ordering: "sequential",
    });
    expect((await db.pool.query("SELECT count(*)::int AS count FROM strategy_checkpoint_delivery")).rows[0].count).toBe(1);
    expect((await db.pool.query("SELECT delivered_at FROM strategy_outbox WHERE id=$1", [event.id])).rows[0].delivered_at).not.toBeNull();
    // No current membership, billing or actor resolver participates here: this
    // is already committed checkpoint bookkeeping, independent of paid access.
  } finally {
    await db.close();
  }
}, 30_000);

test("unsupported outbox rows remain pending and do not starve a later checkpoint", async () => {
  const db = await isolatedDatabase();
  try {
    const { ownership, job } = await seedJob(db.pool);
    await insertOutbox(db.pool, { ownership, kind: "unsupported.legacy-event", payload: { jobId: job.id } });
    await insertOutbox(db.pool, { ownership, kind: "m04.checkpoint", payload: { jobId: job.id, stage: "context" } });
    const outbox = dispatcher(db.pool);
    await expect(
      runAuthStrategyRecoveryV1({
        recovery: { dispatchRecoverable: async () => 0 },
        outboxDispatcher: outbox,
      }),
    ).rejects.toThrow(/1 error\(s\)/);
    const rows = await db.pool.query("SELECT kind,delivered_at FROM strategy_outbox ORDER BY id");
    expect(rows.rows[0].kind).toBe("unsupported.legacy-event");
    expect(rows.rows[0].delivered_at).toBeNull();
    expect(rows.rows[1].kind).toBe("m04.checkpoint");
    expect(rows.rows[1].delivered_at).not.toBeNull();
    expect((await db.pool.query("SELECT count(*)::int AS count FROM strategy_checkpoint_delivery")).rows[0].count).toBe(1);
  } finally {
    await db.close();
  }
}, 30_000);
