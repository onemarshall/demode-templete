/** Derive the M06 upstream from the newest sealed Brand Strategy and the confirmed route. */
import { createHash, randomUUID } from "node:crypto";
import type { Pool, PoolClient } from "pg";
import {
  assertStrategyScope,
  recheckStrategyScope,
  type StrategyScope,
  type AuthorityQuery,
} from "#lib/modules/strategy/server/access.js";
import type { SourceRecord } from "#lib/modules/strategy/server/data/repository.js";
import { Session as M05Session } from "#lib/modules/strategy/server/stages/m05/contracts.js";
import { verifyM05Seal } from "#lib/modules/strategy/server/stages/m05/seal.js";
import {
  M06_ROUTE_SLOT,
  M06_SOURCE_SLOT,
  M06RouteRecord,
  chainFingerprint,
  validateM06Source,
  type M06UpstreamTuple,
} from "#lib/modules/strategy/server/stages/m06/source.js";

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

async function sealedM05(db: AuthorityQuery, scope: StrategyScope) {
  const rows = (await db.query(
    `SELECT s.id AS session_id, r.revision, r.payload_text
     FROM strategy_session s
     JOIN strategy_revision r ON r.organisation_id=s.organisation_id AND r.brand_id=s.brand_id
       AND r.engagement_id=s.engagement_id AND r.session_id=s.id AND r.revision=s.revision
     WHERE s.organisation_id=$1 AND s.brand_id=$2 AND s.engagement_id=$3 AND s.stage='m05'
     ORDER BY r.created_at DESC, s.id DESC`,
    owned(scope),
  )) as { rows: { session_id: string; revision: number; payload_text: string }[] };
  for (const row of rows.rows) {
    let session: ReturnType<typeof M05Session.parse>;
    try {
      session = M05Session.parse(JSON.parse(row.payload_text));
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
    const checked = verifyM05Seal({
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
    return session;
  }
  return null;
}

async function origin(db: AuthorityQuery, scope: StrategyScope) {
  const session = await sealedM05(db, scope);
  if (!session)
    throw new Error("No sealed Brand Strategy exists. Marketing Strategy can only run on an accepted, sealed strategy.");
  const sources = session.sources as { bf?: { sessionId?: string; seal?: unknown; gate?: unknown } } | null;
  const bf = sources?.bf as
    | { sessionId?: string; seal?: { versionId?: string; hash?: string; at?: string }; gate?: unknown }
    | undefined;
  if (!bf?.sessionId || !bf.seal || !bf.gate)
    throw new Error("The sealed Brand Strategy does not carry its Foundation lineage.");

  const routeRow = await head(db, scope, M06_ROUTE_SLOT);
  if (!routeRow) throw new Error("Confirm the M06 module route before starting marketing strategy.");
  const route = M06RouteRecord.parse(JSON.parse(routeRow.canonical_payload));

  const tuple: M06UpstreamTuple = {
    m05: {
      sessionId: session.sessionId,
      seal: { versionId: session.seal!.versionId, hash: session.seal!.hash, at: session.seal!.at },
      capability: session.capability,
      data: session.data,
      sources: session.sources,
    },
    bf: {
      sessionId: bf.sessionId,
      seal: { versionId: String(bf.seal.versionId), hash: String(bf.seal.hash), at: String(bf.seal.at) },
      gate: bf.gate as never,
    },
  };
  const fingerprint = chainFingerprint(tuple);
  const receiptId = `${fingerprint.slice(0, 8)}-${fingerprint.slice(8, 12)}-4${fingerprint.slice(13, 16)}-8${fingerprint.slice(17, 20)}-${fingerprint.slice(20, 32)}`;
  const body = {
    folder: scope.brandId,
    route,
    entry: {
      receipt: {
        version: 1 as const,
        receiptId,
        chainFingerprint: fingerprint,
        approvedBy: { name: "sealed brand strategy", role: "client approval", authorityRef: session.sessionId },
        approvedAt: session.seal!.at,
      },
    },
    ...tuple,
  };
  const canonical = JSON.stringify(body);
  const hash = sha(canonical);
  validateM06Source({ id: session.seal!.versionId, slot: M06_SOURCE_SLOT, body, hash });
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

export function createM06Upstream(pool: Pool) {
  return {
    async connect(scope: StrategyScope) {
      assertStrategyScope(scope, ["edit"]);
      return locked(pool, scope, async (db) => {
        const derived = await origin(db, scope);
        const prior = await head(db, scope, M06_SOURCE_SLOT);
        if (prior?.canonical_payload === derived.canonical && prior.seal_hash === derived.hash) return;
        const id = randomUUID();
        await db.query(
          `INSERT INTO strategy_version(organisation_id,brand_id,engagement_id,id,canonical_payload,seal_hash,hash_algorithm)
           VALUES($1,$2,$3,$4,$5,$6,$7)`,
          [...owned(scope), id, derived.canonical, derived.hash, "m06-sealed-m05-source-json-sha256"],
        );
        await db.query(
          `INSERT INTO strategy_source_head(organisation_id,brand_id,engagement_id,slot,version_id)
           VALUES($1,$2,$3,$4,$5)
           ON CONFLICT(organisation_id,brand_id,engagement_id,slot) DO UPDATE SET version_id=EXCLUDED.version_id`,
          [...owned(scope), M06_SOURCE_SLOT, id],
        );
      });
    },
    async validate(scope: StrategyScope, source: SourceRecord, transaction?: AuthorityQuery) {
      validateM06Source(source);
      const verify = async (db: AuthorityQuery) => {
        const latest = await origin(db, scope);
        if (latest.hash !== source.hash || latest.canonical !== JSON.stringify(source.body))
          throw new Error("Upstream authority changed. Create a new marketing strategy session.");
      };
      if (transaction) await verify(transaction);
      else await locked(pool, scope, verify);
    },
  };
}
