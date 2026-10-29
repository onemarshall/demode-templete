/** The confirmed M08 module route, pinned as immutable versions under a moving head. */
import { createHash, randomUUID } from "node:crypto";
import type { Pool, PoolClient } from "pg";
import { z } from "zod";
import {
  assertStrategyScope,
  recheckStrategyScope,
  type StrategyScope,
} from "#lib/modules/strategy/server/access.js";
import { M08_ROUTE_SLOT, M08RouteRecord } from "#lib/modules/strategy/server/stages/m08/source.js";

const owned = (scope: StrategyScope) => [scope.organisationId, scope.brandId, scope.engagementId];
const sha = (value: string) => createHash("sha256").update(value).digest("hex");
const ConfirmRoute = z
  .object({ route: z.enum(["full", "constrained", "light"]), reason: z.string().trim().min(1).max(4000) })
  .strict();

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

export function createM08RouteAuthority(pool: Pool) {
  return {
    async confirm(scope: StrategyScope, input: unknown) {
      assertStrategyScope(scope, ["edit"]);
      const parsed = ConfirmRoute.parse(input);
      const body = M08RouteRecord.parse({
        version: 1,
        module: "08",
        route: parsed.route,
        reason: parsed.reason,
        confirmedBy: scope.actorId,
        confirmedAt: new Date().toISOString(),
      });
      const canonical = JSON.stringify(body);
      const hash = sha(canonical);
      await locked(pool, scope, async (db) => {
        const existing = (await db.query(
          `SELECT v.canonical_payload FROM strategy_source_head h
           JOIN strategy_version v ON v.organisation_id=h.organisation_id AND v.brand_id=h.brand_id
             AND v.engagement_id=h.engagement_id AND v.id=h.version_id
           WHERE h.organisation_id=$1 AND h.brand_id=$2 AND h.engagement_id=$3 AND h.slot=$4`,
          [...owned(scope), M08_ROUTE_SLOT],
        )) as { rows: { canonical_payload: string }[] };
        if (existing.rows[0]?.canonical_payload === canonical) return;
        const id = randomUUID();
        await db.query(
          `INSERT INTO strategy_version(organisation_id,brand_id,engagement_id,id,canonical_payload,seal_hash,hash_algorithm)
           VALUES($1,$2,$3,$4,$5,$6,$7)`,
          [...owned(scope), id, canonical, hash, "m08-route-json-sha256"],
        );
        await db.query(
          `INSERT INTO strategy_source_head(organisation_id,brand_id,engagement_id,slot,version_id)
           VALUES($1,$2,$3,$4,$5)
           ON CONFLICT(organisation_id,brand_id,engagement_id,slot) DO UPDATE SET version_id=EXCLUDED.version_id`,
          [...owned(scope), M08_ROUTE_SLOT, id],
        );
      });
      return body;
    },
  };
}
