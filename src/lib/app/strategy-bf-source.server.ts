/** Derive the BF upstream from an actual sealed M04 database version. */
import { createHash, randomUUID } from "node:crypto";
import type { Pool, PoolClient } from "pg";
import {
  assertStrategyScope,
  recheckStrategyScope,
  type StrategyScope,
  type AuthorityQuery,
} from "#lib/modules/strategy/server/access.js";
import type { SourceRecord } from "#lib/modules/strategy/server/data/repository.js";
import { Session as M04SessionSchema } from "#lib/modules/strategy/server/stages/m04/contracts.js";
import { hashM04 } from "#lib/modules/strategy/server/stages/m04/session.js";
import { BFSource } from "#lib/modules/strategy/server/stages/bf/contracts.js";
import { validateBFSource } from "#lib/modules/strategy/server/stages/bf/source.js";

const slot = "bf-m04";
const sha = (value: string) => createHash("sha256").update(value).digest("hex");
const owned = (scope: StrategyScope) => [scope.organisationId, scope.brandId, scope.engagementId];

async function sealedM04(db: AuthorityQuery, scope: StrategyScope) {
  const result = (await db.query(
    `SELECT s.id AS session_id, r.revision, r.payload_text
     FROM strategy_session s
     JOIN strategy_revision r ON r.organisation_id=s.organisation_id AND r.brand_id=s.brand_id
       AND r.engagement_id=s.engagement_id AND r.session_id=s.id AND r.revision=s.revision
     WHERE s.organisation_id=$1 AND s.brand_id=$2 AND s.engagement_id=$3 AND s.stage='m04'
     ORDER BY r.created_at DESC, s.id DESC`,
    owned(scope),
  )) as { rows: { session_id: string; revision: number; payload_text: string }[] };
  for (const row of result.rows) {
    let session: ReturnType<typeof M04SessionSchema.parse>;
    try {
      session = M04SessionSchema.parse(JSON.parse(row.payload_text));
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
    let raw: Record<string, unknown>;
    try {
      raw = JSON.parse(stored.canonical_payload) as Record<string, unknown>;
    } catch {
      continue;
    }
    // The canonical payload must hash to the recorded seal, and its source pin must be the session's.
    if (hashM04(raw) !== session.seal.hash || sha(stored.canonical_payload) !== stored.seal_hash)
      continue;
    if (raw.sourceHash !== session.sourceHash) continue;
    if (hashM04(raw.routeAuthorization) !== hashM04(session.routeAuthorization)) continue;
    return { session, row };
  }
  return null;
}

async function origin(db: AuthorityQuery, scope: StrategyScope) {
  const found = await sealedM04(db, scope);
  if (!found)
    throw new Error(
      "No sealed viability check exists yet. The Business Foundation needs the settled economic position before it can record where the business stands.",
    );
  const { session } = found;
  const routeAuthorization = (session.routeAuthorization ?? {}) as Record<string, unknown>;
  const capability = String(routeAuthorization["authorised_capability"] ?? "none");
  const decisionState = String(routeAuthorization["decision_state"] ?? "");
  if (decisionState !== "authorised" || !/^hypothesis-only$|^full-standard$|^reduced-/.test(capability))
    throw new Error(
      `The viability check's route authorisation does not permit foundation preparation (capability: ${capability}).`,
    );
  const entryReceipt = (session.sources as { entry?: { receipt?: unknown } })?.entry?.receipt;
  if (!entryReceipt)
    throw new Error("The sealed viability record carries no engagement authority receipt.");
  const body = {
    folder: scope.brandId,
    entry: { receipt: entryReceipt },
    m04: {
      sessionId: session.sessionId,
      sealVersionId: session.seal!.versionId,
      sealHash: session.seal!.hash,
      sealedAt: session.seal!.at,
      routeAuthorization,
      sources: session.sources,
      data: session.data,
    },
  };
  const canonical = JSON.stringify(body);
  const hash = sha(canonical);
  validateBFSource({ id: session.seal!.versionId, slot, body, hash });
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

export function createBFUpstream(pool: Pool) {
  return {
    async connect(scope: StrategyScope) {
      assertStrategyScope(scope, ["edit"]);
      return locked(pool, scope, async (db) => {
        const derived = await origin(db, scope);
        const existing = (await db.query(
          `SELECT v.id,v.canonical_payload,v.seal_hash FROM strategy_source_head h
           JOIN strategy_version v ON v.organisation_id=h.organisation_id AND v.brand_id=h.brand_id
             AND v.engagement_id=h.engagement_id AND v.id=h.version_id
           WHERE h.organisation_id=$1 AND h.brand_id=$2 AND h.engagement_id=$3 AND h.slot=$4`,
          [...owned(scope), slot],
        )) as { rows: { id: string; canonical_payload: string; seal_hash: string }[] };
        const prior = existing.rows[0];
        if (prior?.canonical_payload === derived.canonical && prior.seal_hash === derived.hash) return;
        const id = randomUUID();
        await db.query(
          `INSERT INTO strategy_version(organisation_id,brand_id,engagement_id,id,canonical_payload,seal_hash,hash_algorithm)
           VALUES($1,$2,$3,$4,$5,$6,$7)`,
          [...owned(scope), id, derived.canonical, derived.hash, "bf-sealed-m04-source-json-sha256"],
        );
        await db.query(
          `INSERT INTO strategy_source_head(organisation_id,brand_id,engagement_id,slot,version_id)
           VALUES($1,$2,$3,$4,$5)
           ON CONFLICT(organisation_id,brand_id,engagement_id,slot) DO UPDATE SET version_id=EXCLUDED.version_id`,
          [...owned(scope), slot, id],
        );
      });
    },
    async validate(scope: StrategyScope, source: SourceRecord, transaction?: AuthorityQuery) {
      validateBFSource(source);
      const verify = async (db: AuthorityQuery) => {
        const latest = await origin(db, scope);
        if (latest.hash !== source.hash || latest.canonical !== JSON.stringify(source.body))
          throw new Error("Upstream authority changed. Create a new checked foundation session.");
      };
      if (transaction) await verify(transaction);
      else await locked(pool, scope, verify);
    },
  };
}

export { BFSource };
