import { expect, test } from "bun:test";
import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { Pool } from "pg";
import {
  createStrategyAccess,
  grantStrategyPublication,
} from "../../../src/lib/modules/strategy/server/access";
import { StrategyJobs } from "../../../src/lib/modules/strategy/server/data/jobs";
import { StrategyRepository } from "../../../src/lib/modules/strategy/server/data/repository";
import { createStrategyJobRunner } from "../../../src/lib/modules/strategy/server/jobs/runner";
import { createStrategyRecovery } from "../../../src/lib/modules/strategy/server/jobs/recovery";
import { readConnection } from "./local-stack";

const migrations = [
  "0004_strategy_core.sql",
  "0005_strategy_jobs.sql",
  "0006_strategy_directus.sql",
  "0008_strategy_recovery_and_checkpoint_delivery.sql",
];

async function isolatedDatabase() {
  const config = await readConnection();
  const schema = `strategy_m04_recovery_${randomUUID().replaceAll("-", "")}`;
  const admin = new Pool({ connectionString: config.databaseUrl });
  await admin.query(`CREATE SCHEMA ${schema}`);
  const pool = new Pool({
    connectionString: config.databaseUrl,
    options: `-c search_path=${schema}`,
    max: 6,
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
    schema,
    async close() {
      await pool.end();
      await admin.query(`DROP SCHEMA ${schema} CASCADE`);
      await admin.end();
    },
  };
}

function scopeFor(owner: {
  actorId: string;
  organisationId: string;
  brandId: string;
  engagementId: string;
}) {
  return createStrategyAccess(async (request) => ({
    actorId: owner.actorId,
    organisationId: request.organisationId,
    brandId: request.brandId,
    activeMembership: true,
    activeBrandAssignment: true,
    actions: [request.action],
  })).authorize({ ...owner, action: "generate" });
}

async function waitForClaim(child: ReturnType<typeof spawn>) {
  return waitForSignal(child, "CLAIMED_BEFORE_PUBLISH");
}

async function waitForSignal(child: ReturnType<typeof spawn>, signal: string) {
  return new Promise<void>((resolve, reject) => {
    let output = "";
    const timeout = setTimeout(
      () => reject(new Error(`Worker did not emit ${signal}: ${output}`)),
      10_000,
    );
    child.stdout?.on("data", (chunk: Buffer) => {
      output += chunk.toString();
      if (output.includes(signal)) {
        clearTimeout(timeout);
        resolve();
      }
    });
    child.once("error", (error) => {
      clearTimeout(timeout);
      reject(error);
    });
    child.once("exit", (code) => {
      if (!output.includes(signal)) {
        clearTimeout(timeout);
        reject(new Error(`Worker exited before ${signal} (code ${code}): ${output}`));
      }
    });
  });
}

test("M04 interruption before publish recovers once, fences the old attempt, and replays durably", async () => {
  const db = await isolatedDatabase();
  let child: ReturnType<typeof spawn> | undefined;
  try {
    const token = randomUUID();
    const owner = {
      organisationId: `org-${token}`,
      brandId: `brand-${token}`,
      engagementId: `eng-${token}`,
      sessionId: `session-${token}`,
      actorId: `actor-${token}`,
    };
    const scope = await scopeFor(owner);
    await db.pool.query(
      "INSERT INTO strategy_brand_binding(organisation_id,brand_id) VALUES($1,$2)",
      [owner.organisationId, owner.brandId],
    );
    await db.pool.query(
      "INSERT INTO strategy_engagement(organisation_id,brand_id,id,label,created_by) VALUES($1,$2,$3,'Recovery fixture',$4)",
      [owner.organisationId, owner.brandId, owner.engagementId, owner.actorId],
    );
    const fixture = await db.pool.connect();
    try {
      await fixture.query("BEGIN");
      await fixture.query(
        "INSERT INTO strategy_session(organisation_id,brand_id,engagement_id,id,stage,revision) VALUES($1,$2,$3,$4,'m04',1)",
        [owner.organisationId, owner.brandId, owner.engagementId, owner.sessionId],
      );
      await fixture.query(
        "INSERT INTO strategy_revision(organisation_id,brand_id,engagement_id,session_id,revision,command_id,actor_id,action,command_input,payload,payload_text) VALUES($1,$2,$3,$4,1,'initial',$5,'edit','{}','{}'::jsonb,'{}')",
        [owner.organisationId, owner.brandId, owner.engagementId, owner.sessionId, owner.actorId],
      );
      await fixture.query("COMMIT");
    } catch (error) {
      await fixture.query("ROLLBACK");
      throw error;
    } finally {
      fixture.release();
    }

    const jobs = new StrategyJobs(db.pool);
    const jobId = `job-${token}`;
    const commandId = `generate-${token}`;
    await jobs.enqueue(scope, {
      id: jobId,
      sessionId: owner.sessionId,
      expectedRevision: 1,
      commandId,
      command: { sessionId: owner.sessionId, expectedRevision: 1, commandId, stage: "context" },
      pins: [],
      methodRelease: "synthetic-method-release",
    });
    await db.pool.query("DELETE FROM strategy_outbox WHERE payload->>'jobId'=$1", [jobId]);

    const first = await jobs.claim(scope, jobId, 1);
    expect(first).not.toBeNull();
    // Force the child to own the first lease through the normal runner. It is
    // killed at execute entry, after claim and before the fixture simulates a provider.
    await db.pool.query(
      "UPDATE strategy_job SET lease_until=clock_timestamp()-interval '1 second' WHERE id=$1",
      [jobId],
    );
    child = spawn(
      process.execPath,
      ["run", "scripts/strategy/integration/m04-recovery-paused-worker.ts", db.schema, jobId],
      {
        cwd: process.cwd(),
        stdio: ["ignore", "pipe", "pipe"],
      },
    );
    await waitForClaim(child);
    const oldFence = Number(
      (await db.pool.query("SELECT fence FROM strategy_job WHERE id=$1", [jobId])).rows[0].fence,
    );
    child.kill("SIGKILL");
    await new Promise<void>((resolve) => child!.once("exit", () => resolve()));

    await db.pool.query(
      "UPDATE strategy_job SET lease_until=clock_timestamp()-interval '1 second' WHERE id=$1",
      [jobId],
    );
    const repository = new StrategyRepository(db.pool);
    let providerCalls = 0;
    const runner = createStrategyJobRunner({
      jobs,
      authorize: async (job) => scopeFor(job),
      policy: async () => undefined,
      execute: async (attemptScope, job, lease, beforePublish) => {
        providerCalls += 1; // local provider stub; no network or model request
        const generated = { viability: "synthetic-ready", source: "local-provider-stub" };
        await beforePublish();
        await repository.mutateSession(
          attemptScope,
          job.sessionId,
          job.expectedRevision,
          job.commandId,
          async (current, tx) => {
            await tx.assertJobLease(job.id, lease.fence);
            return {
              payload: generated,
              outbox: [{ kind: "m04.checkpoint", payload: { stage: "context", jobId: job.id } }],
            };
          },
          job.command,
        );
        return generated;
      },
    });

    const recovery = createStrategyRecovery({
      jobs,
      gateway: {
        dispatch: async ({ jobId: recoveredId }) => ({ runId: await runner.run(recoveredId) }),
      },
    });
    expect(await recovery.dispatchRecoverable()).toBe(1);
    const newFence = Number(
      (await db.pool.query("SELECT fence FROM strategy_job WHERE id=$1", [jobId])).rows[0].fence,
    );
    expect(newFence).toBeGreaterThan(oldFence);
    expect(providerCalls).toBe(1);

    // A delayed publication attempt using the interrupted worker's fence cannot
    // create a revision, even if that worker later resumes after lease expiry.
    grantStrategyPublication(scope, { jobId, fence: oldFence });
    await expect(
      repository.mutateSession(
        scope,
        owner.sessionId,
        2,
        `stale-${token}`,
        async (_current, tx) => {
          await tx.assertJobLease(jobId, oldFence);
          return { payload: { viability: "stale" } };
        },
        { stale: true },
      ),
    ).rejects.toThrow(/lease lost/i);

    expect(await runner.run(jobId)).toBe("succeeded");
    expect(providerCalls).toBe(1);
    const state = await db.pool.query(
      "SELECT s.revision,j.status,(SELECT count(*)::int FROM strategy_revision r WHERE r.session_id=s.id) AS revisions,(SELECT count(*)::int FROM strategy_outbox o WHERE o.session_id=s.id AND o.kind='m04.checkpoint') AS checkpoints FROM strategy_session s JOIN strategy_job j ON j.session_id=s.id WHERE s.id=$1",
      [owner.sessionId],
    );
    expect(state.rows[0]).toMatchObject({
      revision: 2,
      status: "succeeded",
      revisions: 2,
      checkpoints: 1,
    });
    expect(
      (
        await db.pool.query(
          "SELECT payload_text FROM strategy_revision WHERE session_id=$1 AND revision=2",
          [owner.sessionId],
        )
      ).rows[0].payload_text,
    ).toContain("synthetic-ready");
  } finally {
    if (child && child.exitCode === null) child.kill("SIGKILL");
    await db.close();
  }
}, 45_000);

test("M04 replay after committed publication returns success without a second draft", async () => {
  const db = await isolatedDatabase();
  let child: ReturnType<typeof spawn> | undefined;
  try {
    const token = randomUUID();
    const owner = {
      organisationId: `org-${token}`,
      brandId: `brand-${token}`,
      engagementId: `eng-${token}`,
      sessionId: `session-${token}`,
      actorId: `actor-${token}`,
    };
    const scope = await scopeFor(owner);
    await db.pool.query(
      "INSERT INTO strategy_brand_binding(organisation_id,brand_id) VALUES($1,$2)",
      [owner.organisationId, owner.brandId],
    );
    await db.pool.query(
      "INSERT INTO strategy_engagement(organisation_id,brand_id,id,label,created_by) VALUES($1,$2,$3,'Committed recovery fixture',$4)",
      [owner.organisationId, owner.brandId, owner.engagementId, owner.actorId],
    );
    const fixture = await db.pool.connect();
    try {
      await fixture.query("BEGIN");
      await fixture.query(
        "INSERT INTO strategy_session(organisation_id,brand_id,engagement_id,id,stage,revision) VALUES($1,$2,$3,$4,'m04',1)",
        [owner.organisationId, owner.brandId, owner.engagementId, owner.sessionId],
      );
      await fixture.query(
        "INSERT INTO strategy_revision(organisation_id,brand_id,engagement_id,session_id,revision,command_id,actor_id,action,command_input,payload,payload_text) VALUES($1,$2,$3,$4,1,'initial',$5,'edit','{}','{}'::jsonb,'{}')",
        [owner.organisationId, owner.brandId, owner.engagementId, owner.sessionId, owner.actorId],
      );
      await fixture.query("COMMIT");
    } catch (error) {
      await fixture.query("ROLLBACK");
      throw error;
    } finally {
      fixture.release();
    }

    const jobs = new StrategyJobs(db.pool);
    const jobId = `job-${token}`;
    const commandId = `generate-${token}`;
    await jobs.enqueue(scope, {
      id: jobId,
      sessionId: owner.sessionId,
      expectedRevision: 1,
      commandId,
      command: { sessionId: owner.sessionId, expectedRevision: 1, commandId, stage: "context" },
      pins: [],
      methodRelease: "synthetic-method-release",
    });
    await db.pool.query("DELETE FROM strategy_outbox WHERE payload->>'jobId'=$1", [jobId]);

    child = spawn(
      process.execPath,
      [
        "run",
        "scripts/strategy/integration/m04-recovery-paused-worker.ts",
        db.schema,
        jobId,
        "after-commit",
      ],
      { cwd: process.cwd(), stdio: ["ignore", "pipe", "pipe"] },
    );
    await waitForSignal(child, "COMMITTED_BEFORE_ACK");
    child.kill("SIGKILL");
    await new Promise<void>((resolve) => child!.once("exit", () => resolve()));

    const committed = await db.pool.query(
      "SELECT s.revision,j.status,(SELECT count(*)::int FROM strategy_revision r WHERE r.session_id=s.id) AS revisions,(SELECT count(*)::int FROM strategy_outbox o WHERE o.session_id=s.id AND o.kind='m04.checkpoint') AS checkpoints,(SELECT payload_text FROM strategy_revision r WHERE r.session_id=s.id AND r.revision=2) AS payload_text,(SELECT md5(payload_text) FROM strategy_revision r WHERE r.session_id=s.id AND r.revision=2) AS payload_hash FROM strategy_session s JOIN strategy_job j ON j.session_id=s.id WHERE s.id=$1",
      [owner.sessionId],
    );
    expect(committed.rows[0]).toMatchObject({
      revision: 2,
      status: "succeeded",
      revisions: 2,
      checkpoints: 1,
    });
    expect(committed.rows[0].payload_text).toContain("synthetic-committed");
    const priorRevision = {
      payloadText: committed.rows[0].payload_text,
      hash: committed.rows[0].payload_hash,
    };

    let replayProviderCalls = 0;
    const replayRunner = createStrategyJobRunner({
      jobs,
      authorize: async (job) => scopeFor(job),
      policy: async () => undefined,
      execute: async () => {
        replayProviderCalls += 1;
        return { viability: "unexpected-second-draft" };
      },
    });
    expect(await replayRunner.run(jobId)).toBe("succeeded");
    expect(replayProviderCalls).toBe(0);

    const afterReplay = await db.pool.query(
      "SELECT s.revision,j.status,(SELECT count(*)::int FROM strategy_revision r WHERE r.session_id=s.id) AS revisions,(SELECT count(*)::int FROM strategy_outbox o WHERE o.session_id=s.id AND o.kind='m04.checkpoint') AS checkpoints,(SELECT payload_text FROM strategy_revision r WHERE r.session_id=s.id AND r.revision=2) AS payload_text,(SELECT md5(payload_text) FROM strategy_revision r WHERE r.session_id=s.id AND r.revision=2) AS payload_hash FROM strategy_session s JOIN strategy_job j ON j.session_id=s.id WHERE s.id=$1",
      [owner.sessionId],
    );
    expect(afterReplay.rows[0]).toMatchObject({
      revision: 2,
      status: "succeeded",
      revisions: 2,
      checkpoints: 1,
      payload_text: priorRevision.payloadText,
      payload_hash: priorRevision.hash,
    });
  } finally {
    if (child && child.exitCode === null) child.kill("SIGKILL");
    await db.close();
  }
}, 45_000);
