import { test, expect } from "bun:test";
import { createHash, randomUUID } from "node:crypto";
import {
  createStrategyAccess,
  type StrategyAction,
  type StrategyScope,
} from "../../src/lib/modules/strategy/server/access";
import { StrategyRepository } from "../../src/lib/modules/strategy/server/data/repository";
import { Session as M04Session } from "../../src/lib/modules/strategy/server/stages/m04/contracts";
import { hashM04 } from "../../src/lib/modules/strategy/server/stages/m04/session";
import { createBFUpstream } from "../../src/lib/app/strategy-bf-source.server";
import { createStrategyTestDatabase } from "./db";

const sha = (value: string) => createHash("sha256").update(value).digest("hex");
const now = "2026-10-29T12:00:00.000Z";

function m04Fixture(options: {
  decisionState?: string;
  capability?: string;
  sourceHash?: string;
} = {}) {
  const sessionId = randomUUID();
  const versionId = randomUUID();
  const sourceHash = options.sourceHash ?? sha("m04-source");
  const routeAuthorization = {
    decision_state: options.decisionState ?? "authorised",
    authorised_capability: options.capability ?? "full-standard",
    generation_permission: "brand-strategy",
    expiry: "2027-10-29T12:00:00.000Z",
  };
  const sources = {
    entry: {
      receipt: {
        decisionOwner: { name: "Synthetic Owner", authorityBasis: "synthetic-authority-1" },
        route: { route: "full" },
      },
      route: { route: "full" },
    },
    m01: { sessionId: "11111111-1111-4111-8111-111111111111", outputs: { coreBelief: "Synthetic belief" } },
    m02: { sessionId: "22222222-2222-4222-8222-222222222222", recon: { market: "UK repair" } },
    m03: { session: { sessionId: "33333333-3333-4333-8333-333333333333" } },
  };
  const data = {
    context: { businessForm: "Service business", currentOffer: "Repairs", buyer: "Ops leads", user: "Technicians", trigger: "A failed repair", delivery: "On site" },
    recommendation: { customerReceives: "A repair that holds", practicalOutcome: "Fewer repeat failures", distinction: "Inspectable proof" },
  };
  const canonical = JSON.stringify({
    envelope: { module_id: "04", status: "locked" },
    data,
    presented: null,
    sourceHash,
    sources,
    confirmations: {},
    routeAuthorization,
    calculations: {},
  });
  const session = M04Session.parse({
    module: "04",
    sessionId,
    folder: "synthetic-brand",
    revision: 1,
    createdAt: now,
    updatedAt: now,
    stage: "sealed",
    status: "sealed",
    route: "full",
    equivalentEvidence: "",
    sourceHash,
    sources,
    confirmations: {},
    presented: null,
    data,
    drafts: {},
    history: [],
    routeAuthorization,
    seal: { versionId, hash: hashM04(JSON.parse(canonical)), at: now, path: `database:${versionId}` },
  });
  return { session, versionId, canonical, sealHash: hashM04(JSON.parse(canonical)) };
}

async function installM04(
  pool: import("pg").Pool,
  repository: StrategyRepository,
  scope: () => Promise<StrategyScope>,
  options: { decisionState?: string; capability?: string; tamper?: boolean } = {},
) {
  const fixture = m04Fixture(options);
  await repository.createSession(await scope(), {
    id: fixture.session.sessionId,
    stage: "m04",
    payload: fixture.session,
  });
  await pool.query(
    `INSERT INTO strategy_version(organisation_id,brand_id,engagement_id,id,session_id,revision,canonical_payload,seal_hash,hash_algorithm)
     VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
    [
      "org",
      "brand",
      "engagement",
      fixture.versionId,
      fixture.session.sessionId,
      1,
      fixture.canonical,
      options.tamper ? sha("not the seal") : sha(fixture.canonical),
      "sha256-json-stringify-v1",
    ],
  );
  return fixture;
}

async function harness() {
  const db = await createStrategyTestDatabase();
  const repository = new StrategyRepository(db.pool);
  const access = createStrategyAccess(async (request) => ({
    actorId: "synthetic-operator",
    organisationId: request.organisationId,
    brandId: request.brandId,
    activeMembership: true,
    activeBrandAssignment: true,
    actions: ["read", "edit", "approve", "generate", "export", "manage"] as const,
    approvalEngagementId: request.engagementId,
  }));
  const scope = (action: StrategyAction = "manage") =>
    access.authorize({ organisationId: "org", brandId: "brand", engagementId: "engagement", action });
  await repository.createEngagement(await scope(), { id: "engagement", label: "Synthetic BF source" });
  return { db, repository, scope };
}

test("BF derives its upstream from the newest sealed M04 version and pins it", async () => {
  const { db, repository, scope } = await harness();
  try {
    const fixture = await installM04(db.pool, repository, scope);
    const upstream = createBFUpstream(db.pool);
    await upstream.connect(await scope("edit"));

    const head = await repository.getSource(await scope("read"), "bf-m04");
    expect(head).toBeTruthy();
    const body = head!.body as {
      folder: string;
      entry: { receipt: { decisionOwner: { name: string; authorityBasis: string } } };
      m04: { sessionId: string; sealVersionId: string; sealHash: string; routeAuthorization: Record<string, unknown> };
    };
    expect(body.folder).toBe("brand");
    expect(body.entry.receipt.decisionOwner).toEqual({
      name: "Synthetic Owner",
      authorityBasis: "synthetic-authority-1",
    });
    expect(body.m04.sessionId).toBe(fixture.session.sessionId);
    expect(body.m04.sealVersionId).toBe(fixture.versionId);
    expect(body.m04.sealHash).toBe(fixture.sealHash);
    expect(body.m04.routeAuthorization["authorised_capability"]).toBe("full-standard");

    await upstream.validate(await scope("read"), head!);
  } finally {
    await db.close();
  }
});

test("BF refuses an M04 whose version no longer matches its seal", async () => {
  const { db, repository, scope } = await harness();
  try {
    await installM04(db.pool, repository, scope, { tamper: true });
    await expect(createBFUpstream(db.pool).connect(await scope("edit"))).rejects.toThrow(
      "No sealed viability check exists yet",
    );
  } finally {
    await db.close();
  }
});

test("BF refuses a sealed M04 whose route no longer permits foundation preparation", async () => {
  const { db, repository, scope } = await harness();
  try {
    await installM04(db.pool, repository, scope, { decisionState: "waiting" });
    await expect(createBFUpstream(db.pool).connect(await scope("edit"))).rejects.toThrow(
      "does not permit foundation preparation",
    );
  } finally {
    await db.close();
  }
});

test("BF validation rejects a source that no longer matches the derived chain", async () => {
  const { db, repository, scope } = await harness();
  try {
    await installM04(db.pool, repository, scope);
    const upstream = createBFUpstream(db.pool);
    await upstream.connect(await scope("edit"));
    const head = await repository.getSource(await scope("read"), "bf-m04");
    const body = head!.body as { m04: Record<string, unknown> };
    const altered = {
      id: head!.id,
      slot: "bf-m04",
      body: { ...body, m04: { ...body.m04, sealHash: sha("another seal") } },
      hash: sha("another hash"),
    };
    await expect(upstream.validate(await scope("read"), altered as never)).rejects.toThrow(
      "Upstream authority changed",
    );
  } finally {
    await db.close();
  }
});
