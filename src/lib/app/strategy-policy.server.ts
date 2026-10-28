/** Auth-owned Strategy authority. Profile synchronisation and display roles are
 * never substituted for current membership, assignment or explicit grants. */
import type { Pool } from 'pg';
import type { DatabaseReader } from '#lib/platform/database/db.js';
import { requireBrandAccess } from '#lib/modules/tenancy/server/context.js';
import { isBrandAccessError } from '#lib/modules/tenancy/server/errors.js';
import { findCurrentUserIdentity } from '#lib/modules/tenancy/server/better-auth-adapter.js';
import { resolveRouteBrand } from '#lib/modules/tenancy/server/resolution.js';
import {
 StrategyAccessError, createStrategyAccess,
 type AccessRequest, type StrategyAuthority, type StrategyScope, type StrategyAction
} from '#lib/modules/strategy/server/access.js';
import type { DurableJob } from '#lib/modules/strategy/server/data/jobs.js';
import type { Actor } from '#lib/modules/strategy/server/stages/m04/contracts.js';
import type { StrategyEvent } from './strategy-host.server';

interface StrategyGrant {
 id:string; actions:StrategyAction[]; is_approver:boolean; authority_role:string;
}
const actions:readonly StrategyAction[]=['read','edit','approve','generate','export','manage'];

export function createStrategyPolicy(pool:Pool, resolvePrincipal?: (event:StrategyEvent)=>Promise<string|null>) {
 async function grant(userId:string,request:Readonly<AccessRequest>,transaction?:DatabaseReader):Promise<StrategyGrant|null> {
  const db=transaction??pool;
  const result=await db.query(`SELECT g.id,g.actions,g.is_approver,g.authority_role
   FROM strategy_access_grant g JOIN strategy_engagement e
    ON e.organisation_id=g.organisation_id AND e.brand_id=g.brand_id AND e.id=g.engagement_id
   WHERE g.organisation_id=$1 AND g.brand_id=$2 AND g.engagement_id=$3 AND g.user_id=$4
    AND g.revoked_at IS NULL AND (g.expires_at IS NULL OR g.expires_at>now())
   ${transaction?'FOR SHARE OF g,e':''}`,[request.organisationId,request.brandId,request.engagementId,userId]) as {rows:StrategyGrant[]};
  return result.rows[0]??null;
 }
 async function authorityForUser(userId:string,request:Readonly<AccessRequest>,transaction?:DatabaseReader):Promise<StrategyAuthority|null> {
  try {
   const db=transaction??pool;
   const user=await findCurrentUserIdentity(userId,db,{lock:!!transaction});
   if(!user)return null;
   const ctx=await requireBrandAccess(userId,request.brandId,'brand:read',{
    transaction:db,lockAuthority:!!transaction,requireEntitlement:request.action==='generate'
   });
   if(ctx.organisationId!==request.organisationId)return null;
   const row=await grant(userId,request,transaction);
   if(!row||!Array.isArray(row.actions)||row.actions.some(action=>!actions.includes(action)))return null;
   return {actorId:user.id,organisationId:ctx.organisationId,brandId:ctx.brandId,
    activeMembership:true,activeBrandAssignment:true,actions:row.actions,
    approvalEngagementId:row.is_approver&&row.actions.includes('approve')?request.engagementId:undefined};
  } catch(cause) {if(isBrandAccessError(cause))return null;throw cause;}
 }
 async function principal(event:StrategyEvent):Promise<string> {
  // Resolve the actual cookie on every entry point, including reads and exports.
  const userId=await resolvePrincipal?.(event);
  if(!userId)throw new StrategyAccessError();
  return userId;
 }
 return {
  authorityForUser,
  async target(event:StrategyEvent) {
   const userId=await principal(event);
   const organisationSlug=event.params.organisationSlug,brandSlug=event.params.brandSlug,engagementId=event.params.engagementId;
   if(!organisationSlug||!brandSlug||!engagementId)throw new StrategyAccessError();
   const route=await resolveRouteBrand(organisationSlug,brandSlug);
   if(!route)throw new StrategyAccessError();
   const request={organisationId:route.organisation.id,brandId:route.brand.id,engagementId,action:'read'} as const;
   const authority=await authorityForUser(userId,request);
   if(!authority?.actions.includes('read'))throw new StrategyAccessError();
   return {organisationId:request.organisationId,brandId:request.brandId,engagementId};
  },
  async authority(event:StrategyEvent,request:Readonly<AccessRequest>,transaction?:DatabaseReader) {
   return authorityForUser(await principal(event),request,transaction);
  },
  async actor(scope:StrategyScope):Promise<Actor> {
   const authority=await authorityForUser(scope.actorId,scope);
   const user=await findCurrentUserIdentity(scope.actorId,pool);
   const row=await grant(scope.actorId,scope);
   if(!authority?.actions.includes(scope.action)||!user||!row)throw new StrategyAccessError();
   return {name:user.name,role:row.authority_role,authorityRef:row.id};
  },
  async generationPolicy(scope:StrategyScope) {
   if(scope.action!=='generate')throw new StrategyAccessError();
   const current=await authorityForUser(scope.actorId,scope);
   if(!current?.actions.includes('generate'))throw new StrategyAccessError();
  },
  async authorizeWorker(job:DurableJob) {
   return createStrategyAccess((request,transaction)=>authorityForUser(job.actorId,request,transaction)).authorize({
    organisationId:job.organisationId,brandId:job.brandId,engagementId:job.engagementId,action:'generate'
   });
  },
  async workerPolicy(job:DurableJob) {
   const request={organisationId:job.organisationId,brandId:job.brandId,engagementId:job.engagementId,action:'generate'} as const;
   const current=await authorityForUser(job.actorId,request);
   if(!current?.actions.includes('generate'))throw new StrategyAccessError();
  }
 };
}
