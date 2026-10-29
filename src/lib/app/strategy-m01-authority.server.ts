import type { Pool, PoolClient } from 'pg';
import { createHash, randomUUID } from 'node:crypto';
import { assertStrategyScope, recheckStrategyScope, type StrategyScope, type AuthorityQuery } from '#lib/modules/strategy/server/access.js';
import type { M01Input } from '#lib/modules/strategy/server/stages/m01/session.js';
import type { MutationContext } from '#lib/modules/strategy/server/data/repository.js';

export type M01SourceType = 'single founder / owner' | 'co-founders or leadership team' | 'practitioner for a client';
export interface M01AttributionInput {
 type: M01SourceType; name: string; materialUsed: string; evidenceRefs: string[]; statement: string;
}
export interface M01Attribution {
 id: string; sourceVersionId: string; sourceHash: string; type: M01SourceType; name: string;
 materialUsed: string; evidenceRefs: string[]; statement: string; attestedBy: string; createdAt: string;
 revokedAt: string | null; revokedBy: string | null; revocationReason: string | null;
}
export class M01SourceAuthorityError extends Error {
 readonly code = 'M01_SOURCE_AUTHORITY_DENIED';
 constructor() { super('M01 source authority could not be verified'); this.name = 'M01SourceAuthorityError'; }
}
const fail = (): never => { throw new M01SourceAuthorityError(); };
const types = new Set<string>(['single founder / owner','co-founders or leadership team','practitioner for a client']);
const hash = (value: unknown) => createHash('sha256').update(JSON.stringify(value)).digest('hex');
type Row = { id:string; source_version_id:string; source_hash:string; source_type:M01SourceType; source_name:string; material_used:string; evidence_refs:string[]; attestation_statement:string; attested_by:string; created_at:Date|string; revoked_at:Date|string|null; revoked_by:string|null; reason:string|null };
const mapRow = (r:Row):M01Attribution => ({id:r.id,sourceVersionId:r.source_version_id,sourceHash:r.source_hash,type:r.source_type,name:r.source_name,materialUsed:r.material_used,evidenceRefs:r.evidence_refs,statement:r.attestation_statement,attestedBy:r.attested_by,createdAt:new Date(r.created_at).toISOString(),revokedAt:r.revoked_at?new Date(r.revoked_at).toISOString():null,revokedBy:r.revoked_by,revocationReason:r.reason});
const own = (s:StrategyScope) => [s.organisationId,s.brandId,s.engagementId];
const queryRows = async <T>(db:AuthorityQuery,sql:string,values:unknown[]=[]):Promise<T[]> => {
 const result = await db.query(sql,values) as {rows?:unknown};
 return Array.isArray(result?.rows) ? result.rows as T[] : [];
};
async function explicitDualGrant(scope:StrategyScope, db:AuthorityQuery) {
 const rows=await queryRows<{id:string}>(db,`SELECT id FROM strategy_access_grant
  WHERE organisation_id=$1 AND brand_id=$2 AND engagement_id=$3 AND user_id=$4
   AND revoked_at IS NULL AND (expires_at IS NULL OR expires_at>now())
   AND 'manage'=ANY(actions) AND 'approve'=ANY(actions) AND is_approver
  FOR SHARE`,[...own(scope),scope.actorId]);
 if(!rows.length)fail();
}
async function manageAndApprove(scope:StrategyScope,db:AuthorityQuery) {
 assertStrategyScope(scope,['manage']); await recheckStrategyScope(scope,db); await explicitDualGrant(scope,db);
}

export function createM01SourceAuthority(pool:Pool) {
 async function currentInput(scope:StrategyScope,db:AuthorityQuery) {
  const rows=await queryRows<{id:string;canonical_payload:string;seal_hash:string}>(db,`SELECT v.id,v.canonical_payload,v.seal_hash
   FROM strategy_source_head h JOIN strategy_version v ON v.organisation_id=h.organisation_id AND v.brand_id=h.brand_id AND v.engagement_id=h.engagement_id AND v.id=h.version_id
   WHERE h.organisation_id=$1 AND h.brand_id=$2 AND h.engagement_id=$3 AND h.slot='m01-input'
   FOR SHARE OF h,v`,own(scope));
  if(!rows[0])fail();
  try { const input=JSON.parse(rows[0].canonical_payload) as M01Input; if(!input?.eligible||!Array.isArray(input.parts))fail(); return {id:rows[0].id,hash:rows[0].seal_hash,input}; } catch { return fail(); }
 }
 async function transaction<T>(scope:StrategyScope,work:(db:PoolClient)=>Promise<T>) {
  assertStrategyScope(scope); const db=await pool.connect();
  try { await db.query('BEGIN'); await recheckStrategyScope(scope,db);
   await db.query('SELECT id FROM strategy_engagement WHERE organisation_id=$1 AND brand_id=$2 AND id=$3 FOR UPDATE',own(scope));
   const result=await work(db); await recheckStrategyScope(scope,db); await db.query('COMMIT'); return result;
  } catch { await db.query('ROLLBACK'); throw new M01SourceAuthorityError(); } finally { db.release(); }
 }
 return {
  async list(scope:StrategyScope):Promise<M01Attribution[]> {
   assertStrategyScope(scope,['read','manage','approve']); await recheckStrategyScope(scope);
   const rows=await queryRows<Row>(pool,`SELECT a.*,r.revoked_at,r.revoked_by,r.reason FROM strategy_m01_source_attribution a
    LEFT JOIN strategy_m01_source_attribution_revocation r ON r.organisation_id=a.organisation_id AND r.brand_id=a.brand_id AND r.engagement_id=a.engagement_id AND r.attribution_id=a.id
    WHERE a.organisation_id=$1 AND a.brand_id=$2 AND a.engagement_id=$3 ORDER BY a.created_at,a.id`,own(scope));
   return rows.map(mapRow);
  },
  async get(scope:StrategyScope,id:string):Promise<M01Attribution|null> {
   assertStrategyScope(scope,['read','manage','approve']); await recheckStrategyScope(scope);
   const rows=await queryRows<Row>(pool,`SELECT a.*,r.revoked_at,r.revoked_by,r.reason FROM strategy_m01_source_attribution a
    LEFT JOIN strategy_m01_source_attribution_revocation r ON r.organisation_id=a.organisation_id AND r.brand_id=a.brand_id AND r.engagement_id=a.engagement_id AND r.attribution_id=a.id
    WHERE a.organisation_id=$1 AND a.brand_id=$2 AND a.engagement_id=$3 AND a.id=$4`,[...own(scope),id]);
   return rows[0]?mapRow(rows[0]):null;
  },
  async attest(scope:StrategyScope,input:M01AttributionInput):Promise<M01Attribution> {
   if(!types.has(input.type)||!input.name.trim()||!input.materialUsed.trim()||!input.statement.trim()||!Array.isArray(input.evidenceRefs)||!input.evidenceRefs.length)fail();
   return transaction(scope,async db=>{ await manageAndApprove(scope,db);
    const head=await currentInput(scope,db), known=new Set(head.input.parts.map(p=>p.file));
    const refs=[...new Set(input.evidenceRefs)]; if(refs.length!==input.evidenceRefs.length||refs.some(x=>!known.has(x)))fail();
    const id=randomUUID();
    await db.query(`INSERT INTO strategy_m01_source_attribution(organisation_id,brand_id,engagement_id,id,source_version_id,source_hash,source_type,source_name,material_used,evidence_refs,attestation_statement,attested_by)
     VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10::jsonb,$11,$12)`,[...own(scope),id,head.id,head.hash,input.type,input.name.trim(),input.materialUsed.trim(),JSON.stringify(refs),input.statement.trim(),scope.actorId]);
    await manageAndApprove(scope,db); return {id,sourceVersionId:head.id,sourceHash:head.hash,type:input.type,name:input.name.trim(),materialUsed:input.materialUsed.trim(),evidenceRefs:refs,statement:input.statement.trim(),attestedBy:scope.actorId,createdAt:new Date().toISOString(),revokedAt:null,revokedBy:null,revocationReason:null};
   });
  },
  async revoke(scope:StrategyScope,id:string,reason='Attribution withdrawn or corrected'):Promise<void> {
   if(!reason.trim())fail();
   await transaction(scope,async db=>{await manageAndApprove(scope,db);
    const rows=await queryRows<{id:string}>(db,`SELECT id FROM strategy_m01_source_attribution WHERE organisation_id=$1 AND brand_id=$2 AND engagement_id=$3 AND id=$4 FOR UPDATE`,[...own(scope),id]);
    if(!rows.length)fail();
    await db.query(`INSERT INTO strategy_m01_source_attribution_revocation(organisation_id,brand_id,engagement_id,attribution_id,revoked_by,reason)
     VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT DO NOTHING`,[...own(scope),id,scope.actorId,reason.trim()]);
    await manageAndApprove(scope,db);
   });
  },
  async validate(scope:StrategyScope,source:{type:string;name:string;materialUsed:string},input:M01Input,tx:MutationContext,context:{attributionId:string;sessionId:string;revision:number}):Promise<void> {
   try {
    assertStrategyScope(scope,['approve']); await recheckStrategyScope(scope,tx);
    const head=await currentInput(scope,tx);
    const live=await tx.getSource('m01-input');
    if(!live||live.id!==head.id||live.hash!==head.hash||hash(input)!==hash(head.input)||hash(input)!==hash(live.body))fail();
    const rows=await queryRows<Row>(tx,`SELECT a.*,r.revoked_at,r.revoked_by,r.reason FROM strategy_m01_source_attribution a
     LEFT JOIN strategy_m01_source_attribution_revocation r ON r.organisation_id=a.organisation_id AND r.brand_id=a.brand_id AND r.engagement_id=a.engagement_id AND r.attribution_id=a.id
     WHERE a.organisation_id=$1 AND a.brand_id=$2 AND a.engagement_id=$3 AND a.id=$4 FOR UPDATE OF a`,[...own(scope),context.attributionId]);
    const a=rows[0]; if(!a||a.revoked_at||a.source_version_id!==head.id||a.source_hash!==head.hash||a.source_type!==source.type||a.source_name!==source.name.trim()||a.material_used!==source.materialUsed.trim())fail();
    const revoked=await queryRows<{attribution_id:string}>(tx,`SELECT attribution_id FROM strategy_m01_source_attribution_revocation
     WHERE organisation_id=$1 AND brand_id=$2 AND engagement_id=$3 AND attribution_id=$4 FOR UPDATE`,[...own(scope),context.attributionId]);
    if(revoked.length)fail();
    const files=new Set(input.parts.map(p=>p.file)); if(!Array.isArray(a.evidence_refs)||a.evidence_refs.length===0||a.evidence_refs.some(ref=>!files.has(ref)))fail();
    await tx.query(`INSERT INTO strategy_m01_source_attribution_use(organisation_id,brand_id,engagement_id,session_id,revision,attribution_id,actor_id)
     VALUES($1,$2,$3,$4,$5,$6,$7)`,[...own(scope),context.sessionId,context.revision,context.attributionId,scope.actorId]);
    await recheckStrategyScope(scope,tx);
   } catch { fail(); }
  }
 };
}
