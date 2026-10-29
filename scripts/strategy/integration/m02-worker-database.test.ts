import { expect, test } from "bun:test";
import { createHash, randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { Pool } from "pg";
import { createStrategyAccess, type AccessRequest } from "../../../src/lib/modules/strategy/server/access";
import { StrategyJobs } from "../../../src/lib/modules/strategy/server/data/jobs";
import { StrategyRepository } from "../../../src/lib/modules/strategy/server/data/repository";
import { createStrategyOutboxDispatcher, StrategyOutbox } from "../../../src/lib/modules/strategy/server/jobs/outbox";
import { createM02Service } from "../../../src/lib/modules/strategy/server/stages/m02/service";
import { validateM02Source } from "../../../src/lib/modules/strategy/server/stages/m02/source";
import { methodReleaseManifests } from "../../../src/lib/modules/strategy/server/system.generated";
import { createM02Worker } from "../../../src/lib/modules/strategy/server/jobs/m02-worker";
import { readConnection } from "./local-stack";

const migrations = [
  "0004_strategy_core.sql",
  "0005_strategy_jobs.sql",
  "0006_strategy_directus.sql",
  "0008_strategy_recovery_and_checkpoint_delivery.sql",
];
const sha = (text: string) => createHash("sha256").update(text).digest("hex");
const methodRelease = Object.entries(methodReleaseManifests).find(([, manifest]) =>
  Boolean(manifest.hashes["02-Market-Reality-Check/02-Prompt.md"]),
)?.[0]!;

async function isolatedDatabase() {
  const config = await readConnection();
  const schema = `strategy_m02_worker_${randomUUID().replaceAll("-", "")}`;
  const admin = new Pool({ connectionString: config.databaseUrl });
  await admin.query(`CREATE SCHEMA ${schema}`);
  const pool = new Pool({ connectionString: config.databaseUrl, options: `-c search_path=${schema}`, max: 8 });
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

function syntheticSource() {
  const sessionId = randomUUID();
  const sealedAt = "2026-10-29T12:00:00.000Z";
  const outputs = {
    anchors: [
      { key: "The Broken Thing", sentence: "People rely on informal referrals." },
      { key: "The Hidden Truth", sentence: "Trust grows through demonstrated care." },
      { key: "Market-Deployable Hidden Truth", sentence: "Buyers seek trustworthy support." },
      { key: "The Non-Negotiable", sentence: "Make support visible." },
      { key: "The Hard-Won Teaching", sentence: "Reliability is learned through practice." },
      { key: "The Legacy", sentence: "Leave stronger local services." },
      { key: "Core Belief", sentence: "I believe trust grows through care, therefore make support visible." },
    ],
    claimsBoundaryInputs: {
      canClaim: ["We provide local support."],
      mustQualify: ["Support is reliable."],
      cannotClaim: ["We are the market leader."],
    },
  };
  const canonical = JSON.stringify({ outputs });
  const inputs = {
    sessionId,
    sealedAt,
    coreBelief: outputs.anchors[6]!.sentence,
    brokenThing: outputs.anchors[0]!.sentence,
    hiddenTruth: outputs.anchors[1]!.sentence,
    marketDeployableHiddenTruth: outputs.anchors[2]!.sentence,
    nonNegotiable: outputs.anchors[3]!.sentence,
    hardWonTeaching: outputs.anchors[4]!.sentence,
    legacy: outputs.anchors[5]!.sentence,
    claimsBoundaryInputs: outputs.claimsBoundaryInputs,
  };
  const originVersionId = randomUUID();
  const body = {
    sessionId,
    sealedAt,
    outputsHash: sha(canonical),
    inputs,
    originVersionId,
    originRevision: 3,
    originCanonicalPayload: canonical,
    originApproval: { approved: true },
  };
  const source = { id: randomUUID(), slot: "m02-m01", body, hash: sha(JSON.stringify(body)) };
  return { source, inputs };
}

async function fixture(pool: Pool, hooks: { generate?: (input: { gate: string; state: unknown; methodRelease: string }) => Promise<{ candidate: unknown; model: string; usage?: unknown }>; active?: () => boolean } = {}) {
  const suffix = randomUUID();
  const ownership = {
    organisationId: `org-${suffix}`,
    brandId: `brand-${suffix}`,
    engagementId: `eng-${suffix}`,
    actorId: `actor-${suffix}`,
  };
  const access = createStrategyAccess(async (request: Readonly<AccessRequest>) => ({
    actorId: ownership.actorId,
    organisationId: request.organisationId,
    brandId: request.brandId,
    activeMembership: hooks.active?.() ?? true,
    activeBrandAssignment: hooks.active?.() ?? true,
    actions: [request.action],
  }));
  const scope = async (action: AccessRequest["action"]) => access.authorize({
    ...ownership,
    action,
  });
  const repository = new StrategyRepository(pool);
  const jobs = new StrategyJobs(pool);
  const manage = await scope("manage");
  await repository.createEngagement(manage, { id: ownership.engagementId, label: "Synthetic M02 worker fixture" });
  const { source } = syntheticSource();
  await repository.setSource(manage, source);

  const edit = await scope("edit");
  const service = createM02Service({ repository, methodRelease, validateSource: async (_scope, record) => { validateM02Source(record); } });
  const created = await service.create(edit, { action: "create", commandId: `create-${suffix}` });
  const sessionId = created.id;
  const sourceRef = await repository.getSource(await scope("read"), "m02-m01");
  if (!sourceRef) throw new Error("Synthetic M01 wrapper was not stored");
  const generate = await scope("generate");
  const commandId = `draft-${suffix}`;
  const command = {
    action: "draft", module: "m02", stage: "m02", gate: "setup",
    sessionId, expectedRevision: 1, commandId,
  };
  const job = await jobs.enqueue(generate, {
    id: `job-${suffix}`,
    sessionId,
    expectedRevision: 1,
    commandId,
    command,
    pins: [{ slot: sourceRef.slot, versionId: sourceRef.id, hash: sourceRef.hash }],
    methodRelease,
  });
  const calls: unknown[] = [];
  const worker = createM02Worker({
    jobs,
    repository,
    authorize: async (persisted) => access.authorize({
      organisationId: persisted.organisationId,
      brandId: persisted.brandId,
      engagementId: persisted.engagementId,
      action: "generate",
    }),
    policy: async () => {},
    validateSource: async (_scope, record) => { validateM02Source(record); },
    generate: async (input) => {
      calls.push(input);
      return hooks.generate ? hooks.generate(input) : {
        candidate: { competitors: [{ name: "Synthetic participant" }], cohort: "Independent repair shops", geography: "North West England" },
        model: "synthetic-test-model",
      };
    },
  });
  return { access, scope, repository, jobs, worker, job, sessionId, calls, pool };
}

test("M02 enqueue, fenced worker draft and job success commit atomically; duplicate delivery is idempotent", async () => {
  const db = await isolatedDatabase();
  try {
    const state = await fixture(db.pool);
    expect(state.job.status).toBe("pending");
    const dispatches: { jobId: string; idempotencyKey: string }[] = [];
    const outbox = new StrategyOutbox(db.pool);
    const gateway = { dispatch: async (input: { jobId: string; idempotencyKey: string }) => {
      dispatches.push(input);
      return { runId: "synthetic-trigger-run" };
    } };
    const dispatcher = createStrategyOutboxDispatcher({
      outbox,
      jobs: gateway,
      checkpoints: { deliver: async () => {}, reset: async () => {} },
    });
    await expect(dispatcher.dispatchOne()).resolves.toBe(true);
    await outbox.dispatchCommittedJob(state.job.id, gateway);
    expect(dispatches).toHaveLength(1);
    expect(dispatches[0]).toMatchObject({ jobId: state.job.id, idempotencyKey: expect.stringMatching(/^strategy-outbox:/) });
    expect((await db.pool.query("SELECT provider_run_id FROM strategy_job WHERE id=$1", [state.job.id])).rows[0].provider_run_id).toBe("synthetic-trigger-run");
    await expect(state.worker.run(state.job.id)).resolves.toBe("succeeded");
    const record = await state.repository.getSession<Record<string, unknown>>(await state.scope("read"), state.sessionId);
    const job = await state.jobs.load(state.job.id);
    expect(record?.revision).toBe(2);
    expect((record?.payload as { drafts: Record<string, unknown> }).drafts.setup).toBeTruthy();
    expect(job?.status).toBe("succeeded");
    expect(job?.result).toMatchObject({ revision: 2, id: state.sessionId });
    expect((await state.pool.query("SELECT count(*)::int AS count FROM strategy_revision WHERE session_id=$1", [state.sessionId])).rows[0].count).toBe(2);
    await expect(state.worker.run(state.job.id)).resolves.toBe("succeeded");
    expect(state.calls).toHaveLength(1);
    expect((await state.repository.getSession(await state.scope("read"), state.sessionId))?.revision).toBe(2);
  } finally {
    await db.close();
  }
}, 30_000);

test("authority revoked while the provider runs prevents the M02 draft publication", async () => {
  const db = await isolatedDatabase();
  try {
    let active = true;
    let state: Awaited<ReturnType<typeof fixture>>;
    state = await fixture(db.pool, {
      active: () => active,
      generate: async () => {
        active = false;
        return { candidate: { competitors: [{ name: "Synthetic participant" }], cohort: "Independent repair shops", geography: "North West England" }, model: "synthetic-test-model" };
      },
    });
    await expect(state.worker.run(state.job.id)).rejects.toThrow("Strategy access denied");
    // Check storage through an already-issued maintenance scope while authority is still revoked.
    const managerAccess = createStrategyAccess(async (request) => ({ actorId: state.job.actorId, organisationId: request.organisationId, brandId: request.brandId, activeMembership: true, activeBrandAssignment: true, actions: [request.action] }));
    const maintenance = await managerAccess.authorize({ organisationId: state.job.organisationId, brandId: state.job.brandId, engagementId: state.job.engagementId, action: "read" });
    const stored = await state.repository.getSession<Record<string, unknown>>(maintenance, state.sessionId);
    expect(stored?.revision).toBe(1);
    expect((stored?.payload as { drafts: Record<string, unknown> }).drafts.setup).toBeUndefined();
    expect((await state.jobs.load(state.job.id))?.status).toBe("running");
    expect(state.calls).toHaveLength(1);
  } finally {
    await db.close();
  }
}, 30_000);

test("an expired SQL lease fences out provider output before session publication", async () => {
  const db = await isolatedDatabase();
  try {
    let jobId = "";
    const state = await fixture(db.pool, {
      generate: async () => {
        await db.pool.query("UPDATE strategy_job SET lease_until=clock_timestamp()-interval '1 second' WHERE id=$1", [jobId]);
        return { candidate: { competitors: [{ name: "Synthetic participant" }], cohort: "Independent repair shops", geography: "North West England" }, model: "synthetic-test-model" };
      },
    });
    jobId = state.job.id;
    await expect(state.worker.run(state.job.id)).rejects.toThrow("Strategy job lease lost");
    const access = await state.scope("read");
    const stored = await state.repository.getSession<Record<string, unknown>>(access, state.sessionId);
    expect(stored?.revision).toBe(1);
    expect((stored?.payload as { drafts: Record<string, unknown> }).drafts.setup).toBeUndefined();
    expect((await state.jobs.load(state.job.id))?.status).toBe("running");
    expect(state.calls).toHaveLength(1);
  } finally {
    await db.close();
  }
}, 30_000);
