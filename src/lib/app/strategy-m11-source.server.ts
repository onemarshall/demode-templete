/** Derive the M11 upstream from the newest sealed Commercial Direction. */
import { createHash, randomUUID } from "node:crypto";
import type { Pool, PoolClient } from "pg";
import {
  assertStrategyScope,
  recheckStrategyScope,
  type StrategyScope,
  type AuthorityQuery,
} from "#lib/modules/strategy/server/access.js";
import type { SourceRecord } from "#lib/modules/strategy/server/data/repository.js";
import { Session as CDSession } from "#lib/modules/strategy/server/stages/cd/contracts.js";
import { verifyCDSeal } from "#lib/modules/strategy/server/stages/cd/seal.js";
import {
  M11_SOURCE_SLOT,
  chainFingerprint,
  validateM11Source,
  type M11UpstreamTuple,
} from "#lib/modules/strategy/server/stages/m11/source.js";

const owned = (scope: StrategyScope) => [scope.organisationId, scope.brandId, scope.engagementId];
const sha = (value: string) => createHash("sha256").update(value).digest("hex");

type ChainShape = {
  m10?: { sessionId: string; seal: { versionId: string; hash: string }; sources?: { m10?: { sessionId: string; seal: { versionId: string; hash: string } } } };
};

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

async function sealedCD(db: AuthorityQuery, scope: StrategyScope) {
  const rows = (await db.query(
    `SELECT s.id AS session_id, r.revision, r.payload_text
     FROM strategy_session s
     JOIN strategy_revision r ON r.organisation_id=s.organisation_id AND r.brand_id=s.brand_id
       AND r.engagement_id=s.engagement_id AND r.session_id=s.id AND r.revision=s.revision
     WHERE s.organisation_id=$1 AND s.brand_id=$2 AND s.engagement_id=$3 AND s.stage='cd'
     ORDER BY r.created_at DESC, s.id DESC`,
    owned(scope),
  )) as { rows: { session_id: string; revision: number; payload_text: string }[] };
  for (const row of rows.rows) {
    let session: ReturnType<typeof CDSession.parse>;
    try {
      session = CDSession.parse(JSON.parse(row.payload_text));
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
    const checked = verifyCDSeal({
      sessionId: row.session_id,
      version: { canonicalPayload: stored.canonical_payload, sealHash: stored.seal_hash, hashAlgorithm: stored.hash_algorithm },
      current: session,
      expectedSourceHash: session.sourceHash,
    });
    if (!checked.valid) continue;
    return session;
  }
  return null;
}

async function handoffOf(db: AuthorityQuery, scope: StrategyScope, sessionId: string, versionId: string) {
  const row = (await db.query(
    `SELECT content FROM strategy_document
     WHERE organisation_id=$1 AND brand_id=$2 AND engagement_id=$3 AND session_id=$4 AND version_id=$5 AND kind='handoff'`,
    [...owned(scope), sessionId, versionId],
  )) as { rows: { content: string }[] };
  if (!row.rows[0]) throw new Error("The sealed Commercial Direction has no handoff document.");
  return JSON.parse(row.rows[0].content);
}

async function origin(db: AuthorityQuery, scope: StrategyScope) {
  const session = await sealedCD(db, scope);
  if (!session)
    throw new Error("No sealed Commercial Direction exists. Execution Planning runs on an accepted direction.");
  const handoff = await handoffOf(db, scope, session.sessionId, session.seal!.versionId);

  const chain = session.sources as ChainShape;
  const m10 = chain?.m10;
  const m09 = m10?.sources?.m10;
  if (!m10?.sessionId || !m09?.sessionId)
    throw new Error("The sealed direction does not pin the digital and visual surfaces.");

  const tuple: M11UpstreamTuple = {
    cd: {
      sessionId: session.sessionId,
      seal: { versionId: session.seal!.versionId, hash: session.seal!.hash, at: session.seal!.at },
      data: session.data,
      handoff,
      sources: session.sources,
    },
    m10: { sessionId: m10.sessionId, seal: { versionId: m10.seal.versionId, hash: m10.seal.hash } },
    m09: { sessionId: m09.sessionId, seal: { versionId: m09.seal.versionId, hash: m09.seal.hash } },
  };
  const fingerprint = chainFingerprint(tuple);
  const receiptId = `${fingerprint.slice(0, 8)}-${fingerprint.slice(8, 12)}-4${fingerprint.slice(13, 16)}-8${fingerprint.slice(17, 20)}-${fingerprint.slice(20, 32)}`;
  const body = {
    folder: scope.brandId,
    entry: {
      receipt: {
        version: 1 as const,
        receiptId,
        chainFingerprint: fingerprint,
        approvedBy: { name: "sealed commercial direction", role: "client decision", authorityRef: session.sessionId },
        approvedAt: session.seal!.at,
      },
    },
    ...tuple,
  };
  const canonical = JSON.stringify(body);
  const hash = sha(canonical);
  validateM11Source({ id: session.seal!.versionId, slot: M11_SOURCE_SLOT, body, hash });
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

export function createM11Upstream(pool: Pool) {
  return {
    async connect(scope: StrategyScope) {
      assertStrategyScope(scope, ["edit"]);
      return locked(pool, scope, async (db) => {
        const derived = await origin(db, scope);
        const prior = await head(db, scope, M11_SOURCE_SLOT);
        if (prior?.canonical_payload === derived.canonical && prior.seal_hash === derived.hash) return;
        const id = randomUUID();
        await db.query(
          `INSERT INTO strategy_version(organisation_id,brand_id,engagement_id,id,canonical_payload,seal_hash,hash_algorithm)
           VALUES($1,$2,$3,$4,$5,$6,$7)`,
          [...owned(scope), id, derived.canonical, derived.hash, "m11-sealed-cd-source-json-sha256"],
        );
        await db.query(
          `INSERT INTO strategy_source_head(organisation_id,brand_id,engagement_id,slot,version_id)
           VALUES($1,$2,$3,$4,$5)
           ON CONFLICT(organisation_id,brand_id,engagement_id,slot) DO UPDATE SET version_id=EXCLUDED.version_id`,
          [...owned(scope), M11_SOURCE_SLOT, id],
        );
      });
    },
    async validate(scope: StrategyScope, source: SourceRecord, transaction?: AuthorityQuery) {
      validateM11Source(source);
      const verify = async (db: AuthorityQuery) => {
        const latest = await origin(db, scope);
        if (latest.hash !== source.hash || latest.canonical !== JSON.stringify(source.body))
          throw new Error("Upstream authority changed. Create a new commercial cycle session.");
      };
      if (transaction) await verify(transaction);
      else await locked(pool, scope, verify);
    },
  };
}
