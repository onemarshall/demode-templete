/** Derive M02 inputs from an actual approved M01 database version. */
import { createHash, randomUUID } from 'node:crypto';
import { isDeepStrictEqual } from 'node:util';
import type { Pool, PoolClient } from 'pg';
import { assertStrategyScope, recheckStrategyScope, type StrategyScope, type AuthorityQuery } from '#lib/modules/strategy/server/access.js';
import type { SourceRecord } from '#lib/modules/strategy/server/data/repository.js';
import { OutputsSchema, type M01Session } from '#lib/modules/strategy/server/stages/m01/session.js';
import { HandoffRecord, outputsHash } from '#lib/modules/strategy/server/stages/m01/handoff.js';
import { validateM02Source } from '#lib/modules/strategy/server/stages/m02/source.js';

const slot = 'm02-m01';
const sha = (value: string) => createHash('sha256').update(value).digest('hex');
const owned = (scope: StrategyScope) => [scope.organisationId, scope.brandId, scope.engagementId];
interface Origin {
 id: string; session_id: string; revision: number; canonical_payload: string;
 seal_hash: string; hash_algorithm: string; declaration: unknown; payload_text: string;
}

async function origin(db: AuthorityQuery, scope: StrategyScope) {
 const result = await db.query(`SELECT v.id,v.session_id,v.revision,v.canonical_payload,v.seal_hash,v.hash_algorithm,a.declaration,r.payload_text
  FROM strategy_version v
  JOIN strategy_approval a ON a.organisation_id=v.organisation_id AND a.brand_id=v.brand_id AND a.engagement_id=v.engagement_id AND a.version_id=v.id
  JOIN strategy_session s ON s.organisation_id=v.organisation_id AND s.brand_id=v.brand_id AND s.engagement_id=v.engagement_id AND s.id=v.session_id
  JOIN strategy_revision r ON r.organisation_id=s.organisation_id AND r.brand_id=s.brand_id AND r.engagement_id=s.engagement_id AND r.session_id=s.id AND r.revision=s.revision
  WHERE v.organisation_id=$1 AND v.brand_id=$2 AND v.engagement_id=$3 AND s.stage='m01'
  ORDER BY v.created_at DESC,v.id DESC LIMIT 1`, owned(scope)) as {rows: Origin[]};
 const row=result.rows[0];
 if(!row)throw new Error('Seal Founder Conviction before starting Market Reality.');
 const sealed=JSON.parse(row.canonical_payload);
 OutputsSchema.parse(sealed); // Validate without reserialising historical bytes.
 const handoff=HandoffRecord.parse(row.declaration);
 const current=JSON.parse(row.payload_text) as M01Session;
 if(row.hash_algorithm!=='m01-outputs-json-sha256'||sha(row.canonical_payload)!==row.seal_hash||outputsHash(sealed)!==row.seal_hash||handoff.outputsHash!==row.seal_hash||current.seal?.versionId!==row.id||current.seal.hash!==row.seal_hash||JSON.stringify(current.outputs)!==row.canonical_payload||!isDeepStrictEqual(current.handoff,row.declaration))
  throw new Error('The approved Founder Conviction source does not match its immutable seal.');
 const pins=await db.query(`SELECT ref.version_id,ref.expected_hash,h.version_id AS current_id,v.seal_hash AS current_hash
  FROM strategy_source_ref ref
  JOIN strategy_source_head h ON h.organisation_id=ref.organisation_id AND h.brand_id=ref.brand_id AND h.engagement_id=ref.engagement_id AND h.slot=ref.slot
  JOIN strategy_version v ON v.organisation_id=h.organisation_id AND v.brand_id=h.brand_id AND v.engagement_id=h.engagement_id AND v.id=h.version_id
  WHERE ref.organisation_id=$1 AND ref.brand_id=$2 AND ref.engagement_id=$3 AND ref.session_id=$4 AND ref.revision=$5 AND ref.slot='m01-input'`,[...owned(scope),row.session_id,row.revision]) as {rows:{version_id:string;expected_hash:string;current_id:string;current_hash:string}[]};
 const pin=pins.rows[0];
 if(!pin||pin.version_id!==pin.current_id||pin.expected_hash!==pin.current_hash)
  throw new Error('Founder Conviction intake authority changed. Seal a current successor before continuing.');
 const anchor=(key:string)=>sealed.outputs.anchors.find((a:{key:string;sentence:string})=>a.key===key)?.sentence??'';
 const body={sessionId:row.session_id,sealedAt:handoff.sealedAt,outputsHash:row.seal_hash,
  inputs:{sessionId:row.session_id,sealedAt:handoff.sealedAt,coreBelief:anchor('Core Belief'),brokenThing:anchor('The Broken Thing'),hiddenTruth:anchor('The Hidden Truth'),marketDeployableHiddenTruth:anchor('Market-Deployable Hidden Truth'),nonNegotiable:anchor('The Non-Negotiable'),hardWonTeaching:anchor('The Hard-Won Teaching'),legacy:anchor('The Legacy'),claimsBoundaryInputs:sealed.outputs.claimsBoundaryInputs},
  originVersionId:row.id,originRevision:row.revision,originCanonicalPayload:row.canonical_payload,originApproval:row.declaration};
 const canonical=JSON.stringify(body),hash=sha(canonical);
 validateM02Source({id:row.id,slot,body,hash});
 return {body,canonical,hash};
}

async function locked<T>(pool:Pool,scope:StrategyScope,work:(db:PoolClient)=>Promise<T>) {
 assertStrategyScope(scope);const db=await pool.connect();
 try{await db.query('BEGIN');await recheckStrategyScope(scope,db);
  const lock=await db.query('SELECT id FROM strategy_engagement WHERE organisation_id=$1 AND brand_id=$2 AND id=$3 FOR UPDATE',owned(scope));
  if(!lock.rowCount)throw new Error('Strategy engagement not found');
  const value=await work(db);await recheckStrategyScope(scope,db);await db.query('COMMIT');return value;
 }catch(error){await db.query('ROLLBACK');throw error}finally{db.release()}
}

export function createM02Upstream(pool:Pool) {
 return {
  /** An edit-capable user may select only a server-verified approved predecessor. */
  async connect(scope:StrategyScope) {
   assertStrategyScope(scope,['edit']);
   return locked(pool,scope,async db=>{
    const derived=await origin(db,scope);
    const existing=await db.query(`SELECT v.id,v.canonical_payload,v.seal_hash FROM strategy_source_head h JOIN strategy_version v ON v.organisation_id=h.organisation_id AND v.brand_id=h.brand_id AND v.engagement_id=h.engagement_id AND v.id=h.version_id WHERE h.organisation_id=$1 AND h.brand_id=$2 AND h.engagement_id=$3 AND h.slot=$4`,[...owned(scope),slot]);
    const prior=existing.rows[0];
    if(prior?.canonical_payload===derived.canonical&&prior.seal_hash===derived.hash)return;
    const id=randomUUID();
    await db.query('INSERT INTO strategy_version(organisation_id,brand_id,engagement_id,id,canonical_payload,seal_hash,hash_algorithm) VALUES($1,$2,$3,$4,$5,$6,$7)',[...owned(scope),id,derived.canonical,derived.hash,'m02-approved-m01-source-json-sha256']);
    await db.query('INSERT INTO strategy_source_head(organisation_id,brand_id,engagement_id,slot,version_id) VALUES($1,$2,$3,$4,$5) ON CONFLICT(organisation_id,brand_id,engagement_id,slot) DO UPDATE SET version_id=EXCLUDED.version_id',[...owned(scope),slot,id]);
   });
  },
  async validate(scope:StrategyScope,source:SourceRecord,transaction?:AuthorityQuery) {
   validateM02Source(source);
   const verify=async(db:AuthorityQuery)=>{const latest=await origin(db,scope);if(latest.hash!==source.hash||latest.canonical!==JSON.stringify(source.body))throw new Error('Founder Conviction source changed. Create a current Market Reality successor.');};
   if(transaction)await verify(transaction);else await locked(pool,scope,verify);
  },
 };
}
