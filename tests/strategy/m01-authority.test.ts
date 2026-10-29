import { describe, expect, it, vi } from 'vitest';
import { createM01SourceAuthority, M01SourceAuthorityError } from '../../src/lib/app/strategy-m01-authority.server';
import { createStrategyAccess } from '../../src/lib/modules/strategy/server/access';

const input={eligible:true,folder:'client-x',engagement:'engagement-x',entry:{},parts:[{file:'brief.pdf',text:'source material'}]};
function setup(grants=true) {
 const rows:any[]=[];
 const query=vi.fn(async (sql:string,values:unknown[]=[])=>{
  if(sql.includes('FROM strategy_access_grant'))return {rows:grants?[{id:'grant-1'}]:[]};
  if(sql.includes('FROM strategy_source_head'))return {rows:[{id:'source-v1',canonical_payload:JSON.stringify(input),seal_hash:'trusted-source-hash'}]};
  if(sql.includes('FROM strategy_m01_source_attribution a'))return {rows:rows};
  if(sql.startsWith('INSERT INTO strategy_m01_source_attribution(')){rows.push({id:values[3],source_version_id:values[4],source_hash:values[5],source_type:values[6],source_name:values[7],material_used:values[8],evidence_refs:JSON.parse(values[9] as string),attestation_statement:values[10],attested_by:values[11],created_at:new Date(),revoked_at:null,revoked_by:null,reason:null});return {rows:[]};}
  if(sql.startsWith('INSERT INTO strategy_m01_source_attribution_revocation')){return {rows:[]};}
  return {rows:[],rowCount:1};
 });
 const client={query,release:vi.fn()}; const pool={query,connect:vi.fn(async()=>client)} as any;
 const access=createStrategyAccess(async request=>({actorId:'actor-1',organisationId:request.organisationId,brandId:request.brandId,activeMembership:true,activeBrandAssignment:true,actions:['manage','approve','read'],approvalEngagementId:'engagement-x'}));
 return {service:createM01SourceAuthority(pool),scope:()=>access.authorize({organisationId:'org-1',brandId:'brand-1',engagementId:'engagement-x',action:'manage'}),query,rows};
}
describe('M01 source attribution authority',()=>{
 it('pins a human attestation to current trusted source and requires explicit manage plus approver grant',async()=>{
  const h=setup(); const scope=await h.scope();
  const item=await h.service.attest(scope,{type:'single founder / owner',name:'A. Founder',materialUsed:'brief.pdf',evidenceRefs:['brief.pdf'],statement:'I gave this conviction and used the cited brief.'});
  expect(item.sourceVersionId).toBe('source-v1'); expect(item.sourceHash).toBe('trusted-source-hash'); expect(item.attestedBy).toBe('actor-1');
  expect(h.query.mock.calls.some(([sql])=>String(sql).includes("'manage'=ANY(actions) AND 'approve'=ANY(actions) AND is_approver"))).toBe(true);
 });
 it('rejects invented file references and missing explicit dual grants',async()=>{
  const h=setup(false),scope=await h.scope();
  await expect(h.service.attest(scope,{type:'practitioner for a client',name:'Consultant',materialUsed:'brief.pdf',evidenceRefs:['brief.pdf'],statement:'I attest.'})).rejects.toBeInstanceOf(M01SourceAuthorityError);
  const allowed=setup(true),scope2=await allowed.scope();
  await expect(allowed.service.attest(scope2,{type:'practitioner for a client',name:'Consultant',materialUsed:'brief.pdf',evidenceRefs:['invented.docx'],statement:'I attest.'})).rejects.toBeInstanceOf(M01SourceAuthorityError);
 });
 it('does not treat a founder-like label as proof: sealing requires an attribution id and pinned exact identity',async()=>{
  const h=setup(),scope=await h.scope();
  const att=await h.service.attest(scope,{type:'single founder / owner',name:'Founder',materialUsed:'brief.pdf',evidenceRefs:['brief.pdf'],statement:'I attest to this source.'});
  const tx={query:vi.fn(async(sql:string)=>sql.includes('FROM strategy_source_head')?{rows:[{id:'source-v1',canonical_payload:JSON.stringify(input),seal_hash:'trusted-source-hash'}]}:sql.includes('FROM strategy_m01_source_attribution a')?{rows:[h.rows[0]]}:{rows:[]}),getSource:async()=>({id:'source-v1',slot:'m01-input',body:input,hash:'trusted-source-hash'}),assertJobLease:async()=>{}} as any;
  await expect(h.service.validate(scope,{type:att.type,name:att.name,materialUsed:att.materialUsed},input,tx,{attributionId:att.id,sessionId:'session-1',revision:4})).rejects.toBeInstanceOf(M01SourceAuthorityError);
  expect(tx.query.mock.calls.some(([sql]:[string])=>sql.startsWith('INSERT INTO strategy_m01_source_attribution_use'))).toBe(false);
 });
});
