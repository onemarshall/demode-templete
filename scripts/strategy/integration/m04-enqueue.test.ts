import { expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { Pool } from "pg";
import { createStrategyAccess } from "../../../src/lib/modules/strategy/server/access";
import { StrategyJobs } from "../../../src/lib/modules/strategy/server/data/jobs";
import { readConnection } from "./local-stack";

const migrations = [
  "0004_strategy_core.sql",
  "0005_strategy_jobs.sql",
  "0006_strategy_directus.sql",
  "0008_strategy_recovery_and_checkpoint_delivery.sql",
];

async function isolatedDatabase() {
  const config = await readConnection();
  const schema = `strategy_m04_enqueue_${randomUUID().replaceAll("-", "")}`;
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

function authorize(owner: {
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

test("concurrent M04 draft enqueues deduplicate same-stage inputs without cross-actor leaks", async () => {
  const db = await isolatedDatabase();
  try {
    const token = randomUUID();
    const owner = {
      organisationId: `org-${token}`,
      brandId: `brand-${token}`,
      engagementId: `eng-${token}`,
      sessionId: `session-${token}`,
      actorId: `actor-${token}`,
    };
    const scope = await authorize(owner);
    const jobs = new StrategyJobs(db.pool);
    await db.pool.query(
      "INSERT INTO strategy_brand_binding(organisation_id,brand_id) VALUES($1,$2)",
      [owner.organisationId, owner.brandId],
    );
    await db.pool.query(
      "INSERT INTO strategy_engagement(organisation_id,brand_id,id,label,created_by) VALUES($1,$2,$3,'Enqueue fixture',$4)",
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

    const enqueue = async (
      commandId: string,
      stage: string,
      actor = owner.actorId,
      purpose = "synthetic draft",
    ) =>
      jobs.enqueue(
        actor === owner.actorId ? scope : await authorize({ ...owner, actorId: actor }),
        {
          id: `job-${commandId}`,
          sessionId: owner.sessionId,
          expectedRevision: 1,
          commandId,
          command: {
            sessionId: owner.sessionId,
            expectedRevision: 1,
            commandId,
            stage,
            purpose,
          },
          pins: [],
          methodRelease: "synthetic-method-release",
        },
      );

    const [first, concurrent] = await Promise.all([
      enqueue(`draft-a-${token}`, "context"),
      enqueue(`draft-b-${token}`, "context"),
    ]);
    expect(first.id).toBe(concurrent.id);
    expect(first.commandId).toBe(concurrent.commandId);
    expect(
      (
        await db.pool.query("SELECT count(*)::int AS count FROM strategy_job WHERE session_id=$1", [
          owner.sessionId,
        ])
      ).rows[0].count,
    ).toBe(1);
    expect(
      (
        await db.pool.query(
          "SELECT count(*)::int AS count FROM strategy_outbox WHERE session_id=$1",
          [owner.sessionId],
        )
      ).rows[0].count,
    ).toBe(1);

    const otherStage = await enqueue(`draft-recommendation-${token}`, "recommendation");
    expect(otherStage.id).not.toBe(first.id);
    await expect(
      enqueue(`draft-different-input-${token}`, "context", owner.actorId, "different inputs"),
    ).rejects.toThrow("A draft is already in progress for this stage");
    await expect(
      enqueue(`draft-other-actor-${token}`, "context", `other-${token}`),
    ).rejects.toThrow("A draft is already in progress for this stage");
    expect(
      (
        await db.pool.query("SELECT count(*)::int AS count FROM strategy_job WHERE session_id=$1", [
          owner.sessionId,
        ])
      ).rows[0].count,
    ).toBe(2);

    await db.pool.query("UPDATE strategy_job SET status='failed',lease_until=NULL WHERE id=$1", [
      first.id,
    ]);
    const retry = await enqueue(`draft-retry-${token}`, "context");
    expect(retry.id).not.toBe(first.id);
    expect(retry.status).toBe("pending");
    expect(
      (
        await db.pool.query(
          "SELECT count(*)::int AS count FROM strategy_outbox WHERE session_id=$1",
          [owner.sessionId],
        )
      ).rows[0].count,
    ).toBe(3);
  } finally {
    await db.close();
  }
}, 30_000);
