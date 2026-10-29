/** Derive the M05 upstream from the newest sealed Business Foundation and the confirmed route. */
import { createHash, randomUUID } from "node:crypto";
import type { Pool, PoolClient } from "pg";
import { z } from "zod";
import {
  assertStrategyScope,
  recheckStrategyScope,
  type StrategyScope,
  type AuthorityQuery,
} from "#lib/modules/strategy/server/access.js";
import type { SourceRecord } from "#lib/modules/strategy/server/data/repository.js";
import {
  Assessment as BFAssessment,
  ClientDecision as BFClientDecision,
  FoundationDoc as BFFoundationDoc,
  Manifesto as BFManifesto,
  Session as BFSession,
  BFSource,
} from "#lib/modules/strategy/server/stages/bf/contracts.js";
import { sealPayload, verifyBFSeal } from "#lib/modules/strategy/server/stages/bf/seal.js";
import {
  M05_ROUTE_SLOT,
  M05_SOURCE_SLOT,
  M05RouteRecord,
  chainFingerprint,
  validateM05Source,
  type M05UpstreamTuple,
} from "#lib/modules/strategy/server/stages/m05/source.js";

const text = z.string().trim().min(1);
const owned = (scope: StrategyScope) => [scope.organisationId, scope.brandId, scope.engagementId];
const sha = (value: string) => createHash("sha256").update(value).digest("hex");

const M04Sources = z.object({
  m01: z.object({ sessionId: text, outputs: z.unknown(), handoff: z.unknown() }),
  m02: z.object({ sessionId: text, recon: z.unknown(), sealReceipt: z.unknown() }),
  m03: z.object({
    session: z.object({ sessionId: text }).passthrough(),
    commitments: z.unknown(),
    sealReceipt: z.unknown(),
  }),
});

async function head(db: AuthorityQuery, scope: StrategyScope, slot: string) {
  const result = (await db.query(
    `SELECT v.canonical_payload,v.seal_hash FROM strategy_source_head h
     JOIN strategy_version v ON v.organisation_id=h.organisation_id AND v.brand_id=h.brand_id
       AND v.engagement_id=h.engagement_id AND v.id=h.version_id
     WHERE h.organisation_id=$1 AND h.brand_id=$2 AND h.engagement_id=$3 AND h.slot=$4`,
    [...owned(scope), slot],
  )) as { rows: { canonical_payload: string; seal_hash: string }[] };
  return result.rows[0] ?? null;
}

/** Newest sealed BF whose immutable version and receipt verify. Never fall back to an older seal. */
async function sealedBF(db: AuthorityQuery, scope: StrategyScope) {
  const rows = (await db.query(
    `SELECT s.id AS session_id, r.revision, r.payload_text
     FROM strategy_session s
     JOIN strategy_revision r ON r.organisation_id=s.organisation_id AND r.brand_id=s.brand_id
       AND r.engagement_id=s.engagement_id AND r.session_id=s.id AND r.revision=s.revision
     WHERE s.organisation_id=$1 AND s.brand_id=$2 AND s.engagement_id=$3 AND s.stage='bf'
     ORDER BY r.created_at DESC, s.id DESC`,
    owned(scope),
  )) as { rows: { session_id: string; revision: number; payload_text: string }[] };
  for (const row of rows.rows) {
    let session: ReturnType<typeof BFSession.parse>;
    try {
      session = BFSession.parse(JSON.parse(row.payload_text));
    } catch {
      continue;
    }
    if (session.stage !== "sealed" || !session.seal) continue;
    const version = (await db.query(
      `SELECT canonical_payload,seal_hash,hash_algorithm FROM strategy_version
       WHERE organisation_id=$1 AND brand_id=$2 AND engagement_id=$3 AND id=$4`,
      [...owned(scope), session.seal.versionId],
    )) as { rows: { canonical_payload: string; seal_hash: string; hash_algorithm: string }[] };
    const stored = version.rows[0];
    if (!stored) continue;
    const checked = verifyBFSeal({
      sessionId: row.session_id,
      version: {
        canonicalPayload: stored.canonical_payload,
        sealHash: stored.seal_hash,
        hashAlgorithm: stored.hash_algorithm,
      },
      current: session,
      expectedSourceHash: session.sourceHash,
    });
    if (!checked.valid) continue;
    return { session, rendered: checked.rendered };
  }
  return null;
}

async function origin(db: AuthorityQuery, scope: StrategyScope) {
  const found = await sealedBF(db, scope);
  if (!found)
    throw new Error(
      "No sealed Business Foundation exists. Brand Strategy can only run on an approved, sealed Foundation.",
    );
  const { session } = found;
  const gate = session.gate;
  if (!gate || gate.downstreamGateState !== "open" || gate.m05Permission !== "granted")
    throw new Error(
      `The sealed Foundation's downstream gate is ${gate?.downstreamGateState ?? "missing"} — M05 generation permission is ${gate?.m05Permission ?? "none"}.`,
    );
  const approval = BFClientDecision.safeParse(session.data.approval);
  if (!approval.success || approval.data.response !== "approve")
    throw new Error("The sealed Foundation does not carry a recorded client approval.");
  const assessment = BFAssessment.safeParse(session.data.assessment);
  const manifesto = BFManifesto.safeParse(session.data.manifesto);
  const document = BFFoundationDoc.safeParse(session.data.document);
  const sources = BFSource.safeParse(session.sources);
  if (!assessment.success || !manifesto.success || !document.success || !sources.success)
    throw new Error(
      "The sealed Foundation's assessment, manifesto, document or pinned source chain cannot be read.",
    );
  const m04Sources = M04Sources.parse(sources.data.m04.sources);

  const routeRow = await head(db, scope, M05_ROUTE_SLOT);
  if (!routeRow) throw new Error("Confirm the M05 module route before starting brand strategy.");
  const route = M05RouteRecord.parse(JSON.parse(routeRow.canonical_payload));

  const tuple: M05UpstreamTuple = {
    bf: {
      sessionId: session.sessionId,
      seal: { versionId: session.seal!.versionId, hash: session.seal!.hash, at: session.seal!.at },
      gate: {
        downstreamGateState: gate.downstreamGateState,
        m05Permission: gate.m05Permission,
        reasons: gate.reasons,
      },
      approval: session.data.approval,
      assessment: session.data.assessment,
      manifesto: session.data.manifesto,
      document: session.data.document,
      handoff: {
        versionId: session.seal!.versionId,
        hash: session.seal!.hash,
        approvalState: "approved",
        downstream: {
          gate: gate.downstreamGateState,
          m05Permission: gate.m05Permission,
          reasons: gate.reasons,
          foundationRef: {
            runId: session.sessionId,
            versionId: session.seal!.versionId,
            hash: session.seal!.hash,
          },
        },
      },
      sources: session.sources,
    },
    m04: {
      sessionId: sources.data.m04.sessionId,
      sealVersionId: sources.data.m04.sealVersionId,
      sealHash: sources.data.m04.sealHash,
      routeAuthorization: sources.data.m04.routeAuthorization,
      data: sources.data.m04.data,
    },
    m03: {
      sessionId: m04Sources.m03.session.sessionId,
      commitments: m04Sources.m03.commitments,
      sealReceipt: m04Sources.m03.sealReceipt,
    },
    m02: {
      sessionId: m04Sources.m02.sessionId,
      recon: m04Sources.m02.recon,
      sealReceipt: m04Sources.m02.sealReceipt,
    },
    m01: {
      sessionId: m04Sources.m01.sessionId,
      outputs: m04Sources.m01.outputs,
      handoff: m04Sources.m01.handoff,
    },
  };

  // The receipt must be deterministic: validation re-derives this body and compares exact bytes.
  const fingerprint = chainFingerprint(tuple);
  // Formatted as a v4-shaped UUID so it satisfies the receipt schema while staying deterministic.
  const receiptId = `${fingerprint.slice(0, 8)}-${fingerprint.slice(8, 12)}-4${fingerprint.slice(13, 16)}-8${fingerprint.slice(17, 20)}-${fingerprint.slice(20, 32)}`;
  const body = {
    folder: scope.brandId,
    route,
    entry: {
      receipt: {
        version: 1 as const,
        receiptId,
        chainFingerprint: fingerprint,
        approvedBy: approval.data.approver,
        approvedAt: session.seal!.at,
      },
    },
    ...tuple,
  };
  const canonical = JSON.stringify(body);
  const hash = sha(canonical);
  validateM05Source({ id: session.seal!.versionId, slot: M05_SOURCE_SLOT, body, hash });
  return { body, canonical, hash };
}

async function locked<T>(pool: Pool, scope: StrategyScope, work: (db: PoolClient) => Promise<T>) {
  assertStrategyScope(scope);
  const db = await pool.connect();
  try {
    await db.query("BEGIN");
    await recheckStrategyScope(scope, db);
    const lock = await db.query(
      "SELECT id FROM strategy_engagement WHERE organisation_id=$1 AND brand_id=$2 AND id=$3 FOR UPDATE",
      owned(scope),
    );
    if (!lock.rowCount) throw new Error("Strategy engagement not found");
    const value = await work(db);
    await recheckStrategyScope(scope, db);
    await db.query("COMMIT");
    return value;
  } catch (error) {
    await db.query("ROLLBACK");
    throw error;
  } finally {
    db.release();
  }
}

export function createM05Upstream(pool: Pool) {
  return {
    async connect(scope: StrategyScope) {
      assertStrategyScope(scope, ["edit"]);
      return locked(pool, scope, async (db) => {
        const derived = await origin(db, scope);
        const prior = await head(db, scope, M05_SOURCE_SLOT);
        if (prior?.canonical_payload === derived.canonical && prior.seal_hash === derived.hash) return;
        const id = randomUUID();
        await db.query(
          `INSERT INTO strategy_version(organisation_id,brand_id,engagement_id,id,canonical_payload,seal_hash,hash_algorithm)
           VALUES($1,$2,$3,$4,$5,$6,$7)`,
          [...owned(scope), id, derived.canonical, derived.hash, "m05-sealed-bf-source-json-sha256"],
        );
        await db.query(
          `INSERT INTO strategy_source_head(organisation_id,brand_id,engagement_id,slot,version_id)
           VALUES($1,$2,$3,$4,$5)
           ON CONFLICT(organisation_id,brand_id,engagement_id,slot) DO UPDATE SET version_id=EXCLUDED.version_id`,
          [...owned(scope), M05_SOURCE_SLOT, id],
        );
      });
    },
    async validate(scope: StrategyScope, source: SourceRecord, transaction?: AuthorityQuery) {
      validateM05Source(source);
      const verify = async (db: AuthorityQuery) => {
        const latest = await origin(db, scope);
        if (latest.hash !== source.hash || latest.canonical !== JSON.stringify(source.body))
          throw new Error("Upstream authority changed. Create a new brand strategy session.");
      };
      if (transaction) await verify(transaction);
      else await locked(pool, scope, verify);
    },
  };
}
