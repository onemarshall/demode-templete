/** Derive the Commercial Direction upstream from the newest sealed Visual Identity. */
import { createHash, randomUUID } from "node:crypto";
import type { Pool, PoolClient } from "pg";
import {
  assertStrategyScope,
  recheckStrategyScope,
  type StrategyScope,
  type AuthorityQuery,
} from "#lib/modules/strategy/server/access.js";
import type { SourceRecord } from "#lib/modules/strategy/server/data/repository.js";
import { Session as M10Session } from "#lib/modules/strategy/server/stages/m10/contracts.js";
import { verifyM10Seal } from "#lib/modules/strategy/server/stages/m10/seal.js";
import {
  CD_SOURCE_SLOT,
  chainFingerprint,
  validateCDSource,
  type CDUpstreamTuple,
} from "#lib/modules/strategy/server/stages/cd/source.js";

const owned = (scope: StrategyScope) => [scope.organisationId, scope.brandId, scope.engagementId];
const sha = (value: string) => createHash("sha256").update(value).digest("hex");

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

async function sealedM10(db: AuthorityQuery, scope: StrategyScope) {
  const rows = (await db.query(
    `SELECT s.id AS session_id, r.revision, r.payload_text
     FROM strategy_session s
     JOIN strategy_revision r ON r.organisation_id=s.organisation_id AND r.brand_id=s.brand_id
       AND r.engagement_id=s.engagement_id AND r.session_id=s.id AND r.revision=s.revision
     WHERE s.organisation_id=$1 AND s.brand_id=$2 AND s.engagement_id=$3 AND s.stage='m10'
     ORDER BY r.created_at DESC, s.id DESC`,
    owned(scope),
  )) as { rows: { session_id: string; revision: number; payload_text: string }[] };
  for (const row of rows.rows) {
    let session: ReturnType<typeof M10Session.parse>;
    try {
      session = M10Session.parse(JSON.parse(row.payload_text));
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
    const checked = verifyM10Seal({
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

async function origin(db: AuthorityQuery, scope: StrategyScope) {
  const session = await sealedM10(db, scope);
  if (!session)
    throw new Error("No sealed Visual Identity exists. Commercial Direction sits after the M05–M10 strategy work.");

  const tuple: CDUpstreamTuple = {
    m10: {
      sessionId: session.sessionId,
      seal: { versionId: session.seal!.versionId, hash: session.seal!.hash, at: session.seal!.at },
      capability: session.capability,
      data: session.data,
      sources: session.sources,
    },
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
        approvedBy: { name: "sealed visual identity", role: "client approval", authorityRef: session.sessionId },
        approvedAt: session.seal!.at,
      },
    },
    ...tuple,
  };
  const canonical = JSON.stringify(body);
  const hash = sha(canonical);
  validateCDSource({ id: session.seal!.versionId, slot: CD_SOURCE_SLOT, body, hash });
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

export function createCDUpstream(pool: Pool) {
  return {
    async connect(scope: StrategyScope) {
      assertStrategyScope(scope, ["edit"]);
      return locked(pool, scope, async (db) => {
        const derived = await origin(db, scope);
        const prior = await head(db, scope, CD_SOURCE_SLOT);
        if (prior?.canonical_payload === derived.canonical && prior.seal_hash === derived.hash) return;
        const id = randomUUID();
        await db.query(
          `INSERT INTO strategy_version(organisation_id,brand_id,engagement_id,id,canonical_payload,seal_hash,hash_algorithm)
           VALUES($1,$2,$3,$4,$5,$6,$7)`,
          [...owned(scope), id, derived.canonical, derived.hash, "cd-sealed-m10-source-json-sha256"],
        );
        await db.query(
          `INSERT INTO strategy_source_head(organisation_id,brand_id,engagement_id,slot,version_id)
           VALUES($1,$2,$3,$4,$5)
           ON CONFLICT(organisation_id,brand_id,engagement_id,slot) DO UPDATE SET version_id=EXCLUDED.version_id`,
          [...owned(scope), CD_SOURCE_SLOT, id],
        );
      });
    },
    async validate(scope: StrategyScope, source: SourceRecord, transaction?: AuthorityQuery) {
      validateCDSource(source);
      const verify = async (db: AuthorityQuery) => {
        const latest = await origin(db, scope);
        if (latest.hash !== source.hash || latest.canonical !== JSON.stringify(source.body))
          throw new Error("Upstream authority changed. Create a new commercial direction session.");
      };
      if (transaction) await verify(transaction);
      else await locked(pool, scope, verify);
    },
  };
}
