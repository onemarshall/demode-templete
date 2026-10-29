/** Derive M03 inputs from an actual sealed M02 database version. */
import { createHash, randomUUID } from "node:crypto";
import type { Pool, PoolClient } from "pg";
import {
  assertStrategyScope,
  recheckStrategyScope,
  type StrategyScope,
  type AuthorityQuery,
} from "#lib/modules/strategy/server/access.js";
import type { SourceRecord } from "#lib/modules/strategy/server/data/repository.js";
import { M02Record } from "#lib/modules/strategy/server/stages/m02/service.js";
import { RISK_LABEL } from "#lib/modules/strategy/server/stages/m02/gates.js";
import { verifyM02Seal } from "#lib/modules/strategy/server/stages/m02/seal.js";
import { validateM03Source } from "#lib/modules/strategy/server/stages/m03/source.js";

const slot = "m03-m02";
const sha = (value: string) => createHash("sha256").update(value).digest("hex");
const owned = (scope: StrategyScope) => [scope.organisationId, scope.brandId, scope.engagementId];

interface SealedM02 {
  session_id: string;
  payload_text: string;
  revision: number;
}

/** Newest sealed M02 run whose immutable version and snapshots verify. */
async function sealedM02(db: AuthorityQuery, scope: StrategyScope) {
  const result = (await db.query(
    `SELECT s.id AS session_id, r.revision, r.payload_text
     FROM strategy_session s
     JOIN strategy_revision r ON r.organisation_id=s.organisation_id AND r.brand_id=s.brand_id
       AND r.engagement_id=s.engagement_id AND r.session_id=s.id AND r.revision=s.revision
     WHERE s.organisation_id=$1 AND s.brand_id=$2 AND s.engagement_id=$3 AND s.stage='m02'
     ORDER BY r.created_at DESC, s.id DESC`,
    owned(scope),
  )) as { rows: { session_id: string; revision: number; payload_text: string }[] };
  for (const row of result.rows as unknown as SealedM02[]) {
    let record: ReturnType<typeof M02Record.parse>;
    try {
      record = M02Record.parse(JSON.parse(row.payload_text));
    } catch {
      continue;
    }
    if (record.session.stage !== "sealed" || !record.seal) continue;
    const receiptId = (record.seal as { receiptId?: string }).receiptId;
    if (!receiptId) continue;
    const version = (await db.query(
      `SELECT canonical_payload,seal_hash,hash_algorithm FROM strategy_version
       WHERE organisation_id=$1 AND brand_id=$2 AND engagement_id=$3 AND id=$4`,
      [...owned(scope), receiptId],
    )) as { rows: { canonical_payload: string; seal_hash: string; hash_algorithm: string }[] };
    const stored = version.rows[0];
    if (!stored) continue;
    const checked = verifyM02Seal({
      sessionId: row.session_id,
      version: {
        canonicalPayload: stored.canonical_payload,
        sealHash: stored.seal_hash,
        hashAlgorithm: stored.hash_algorithm,
      },
      current: record,
      expectedSource: { versionId: record.sourceVersionId, hash: record.sourceHash },
    });
    if (!checked.valid || !checked.receipt) continue;
    return { sessionId: row.session_id, record, receipt: checked.receipt };
  }
  return null;
}

/** The M01 seal pinned by M02 must still be the current M01 input. */
async function m01LockState(db: AuthorityQuery, scope: StrategyScope, pinned: string) {
  const head = (await db.query(
    `SELECT v.seal_hash FROM strategy_source_head h
     JOIN strategy_version v ON v.organisation_id=h.organisation_id AND v.brand_id=h.brand_id
       AND v.engagement_id=h.engagement_id AND v.id=h.version_id
     WHERE h.organisation_id=$1 AND h.brand_id=$2 AND h.engagement_id=$3 AND h.slot='m01-input'`,
    owned(scope),
  )) as { rows: { seal_hash: string }[] };
  const row = head.rows[0];
  if (!row) return "missing" as const;
  return row.seal_hash === pinned ? ("locked" as const) : ("stale" as const);
}

async function origin(db: AuthorityQuery, scope: StrategyScope) {
  const found = await sealedM02(db, scope);
  if (!found) throw new Error("Seal Market Reality with Outcome A before starting Business Commitments.");
  const { record, receipt, sessionId } = found;
  const recon = record.recon;
  const outcome = recon.synthesis.outcome;
  if (outcome !== "provisional_a" && outcome !== "validated_a")
    throw new Error("The sealed Market Reality run did not return Outcome A.");
  if (recon.contrarianTrap.flags.length)
    throw new Error(
      "The sealed Market Reality run flagged a potential contrarian trap — return to Founder Conviction.",
    );
  const lockState = await m01LockState(db, scope, receipt.upstream.m01.outputsHash);
  if (lockState !== "locked")
    throw new Error("The Founder Conviction version pinned by Market Reality is no longer current.");

  const body = {
    m02SessionId: sessionId,
    m02SealedAt: receipt.sealedAt,
    m02Outcome: outcome,
    m02RelianceScope: recon.state.relianceScope,
    m02Seal: {
      receiptId: receipt.receiptId,
      sealHash: receipt.sealHash,
      reconHash: receipt.hashes.recon,
      artifactsHash: receipt.hashes.artifacts,
      collectionHash: receipt.hashes.collection,
    },
    m01: {
      sessionId: receipt.upstream.m01.sessionId,
      sealedAt: receipt.upstream.m01.sealedAt,
      outputsHash: receipt.upstream.m01.outputsHash,
      lockState,
    },
    m01Inputs: recon.m01Inputs,
    m02Findings: {
      descriptiveDefault: recon.gate1.descriptiveDefault,
      cohort: recon.gate1.cohort,
      concentration: recon.gate1.concentration,
      decodes: recon.gate1.decodes.map((decode) => ({
        competitor: decode.competitor,
        beliefs: decode.beliefs.map((belief) => ({
          belief: belief.belief,
          confidence: belief.confidence,
          vulnerability: belief.vulnerability,
        })),
      })),
      vulnerabilityEvidence: recon.gate2.vulnerabilityEvidence,
      defendersCase: recon.gate2.defendersCase,
      rebuttal: recon.gate2.rebuttal,
      painProfile: recon.gate3.painProfile,
      priceRange: recon.gate4.priceRange,
      willingnessEvidence: recon.gate4.evidence,
      implication: recon.gate6.a.implication,
      traceSentence: recon.gate6.b.traceSentence,
      synthesisStatement: recon.synthesis.statement,
    },
    carriedForward: {
      contrarianFlags: [],
      terrainDiagnosis: recon.terrain.diagnosis,
      terrainTrajectory: recon.terrain.trajectory,
      terrainTam: recon.terrain.tam,
      terrainTailwind: recon.terrain.tailwind,
      secondVoice: recon.secondVoice,
      foundersProblem: recon.secondVoice.foundersProblem,
      acknowledgedRisks: recon.gate5.risks.map((risk) => ({
        pattern: risk.pattern,
        label: RISK_LABEL[risk.pattern],
        state: risk.state,
        severity: risk.severity,
        routing: risk.mitigationRouting,
        acknowledgmentLine: risk.acknowledgment.line,
        declined: risk.acknowledgment.declined,
        dispute: risk.acknowledgment.dispute,
        landedIn: risk.mitigationRouting === "m03" ? null : "carried-forward",
      })),
    },
  };
  const canonical = JSON.stringify(body);
  const hash = sha(canonical);
  validateM03Source({ id: receipt.receiptId, slot, body, hash });
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

export function createM03Upstream(pool: Pool) {
  return {
    /** An edit-capable user may select only a server-verified sealed M02 predecessor. */
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
          [...owned(scope), id, derived.canonical, derived.hash, "m03-sealed-m02-source-json-sha256"],
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
      validateM03Source(source);
      const verify = async (db: AuthorityQuery) => {
        const latest = await origin(db, scope);
        if (latest.hash !== source.hash || latest.canonical !== JSON.stringify(source.body))
          throw new Error(
            "Market Reality source changed. Create a current Business Commitments successor.",
          );
      };
      if (transaction) await verify(transaction);
      else await locked(pool, scope, verify);
    },
  };
}
