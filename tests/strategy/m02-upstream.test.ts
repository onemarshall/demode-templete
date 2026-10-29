import { expect, test } from 'vitest';
import { randomUUID } from 'node:crypto';
import { createStrategyTestDatabase } from './db';
import { createStrategyAccess, type StrategyAction } from '../../src/lib/modules/strategy/server/access';
import { StrategyRepository } from '../../src/lib/modules/strategy/server/data/repository';
import { createM01Service } from '../../src/lib/modules/strategy/server/stages/m01/service';
import { sourceHash } from '../../src/lib/modules/strategy/server/stages/m01/session';
import { createM02Service, M02_SOURCE_SLOT } from '../../src/lib/modules/strategy/server/stages/m02/service';
import { createM02Upstream } from '../../src/lib/app/strategy-m02-source.server';
import { m01Source, m01Plan, m01Outputs, m01SetTwo, m01ReviewAnswers, m01SourceAuthority } from './fixtures/m01';

test('M02 consumes actual approved M01 SQL output and rejects source changes without rewriting history', async () => {
 const db=await createStrategyTestDatabase();
 try {
  let revoked=false;
  const access=createStrategyAccess(async request=>revoked?null:({actorId:'synthetic-upstream-reviewer',organisationId:request.organisationId,brandId:request.brandId,activeMembership:true,activeBrandAssignment:true,actions:['read','edit','generate','approve','manage','export'],approvalEngagementId:request.engagementId}));
  const scope=(action:StrategyAction)=>access.authorize({organisationId:'synthetic-upstream-org',brandId:'synthetic-upstream-brand',engagementId:'synthetic-upstream-engagement',action});
  const repo=new StrategyRepository(db.pool), upstream=createM02Upstream(db.pool);
  await repo.createEngagement(await scope('manage'),{id:'synthetic-upstream-engagement',label:'Synthetic M01 to M02 chain'});
  await expect(upstream.connect(await scope('edit'))).rejects.toThrow('Seal Founder Conviction');
  const input=structuredClone(m01Source);
  await repo.setSource(await scope('manage'),{id:randomUUID(),slot:'m01-input',body:input,hash:sourceHash(input)});
  let modelResponse:unknown=m01Plan();
  const m01=createM01Service({repository:repo,validateSourceAuthority:async()=>{},model:{name:'synthetic-only',call:async()=>modelResponse,chat:async()=>''}});
  let record=await m01.create(await scope('edit'),{commandId:randomUUID()});
  const command=()=>({sessionId:record.id,expectedRevision:record.revision,commandId:randomUUID()});
  record=await m01.prepare(await scope('generate'),command());
  record=await m01.appendEvents(await scope('edit'),{...command(),events:[
   {type:'session.input_transcript.delta',delta:'Synthetic answer one.'},
   {type:'session.output_transcript.delta',delta:'Synthetic question one.'},
   {type:'session.input_transcript.delta',delta:'Synthetic answer two.'},
   {type:'session.output_transcript.delta',delta:'Synthetic question two.'},
  ]});
  const fixture=m01Outputs();modelResponse={...fixture.outputs,factsAnchor:fixture.factsAnchor.items,publicRecordReadiness:fixture.publicRecordReadiness};
  record=await m01.synthesise(await scope('generate'),command());
  for(const part of ['factsAnchor','evidenceMatrix','languageBank','manifesto','anchors'])record=await m01.confirm(await scope('approve'),{...command(),part});
  record=await m01.seal(await scope('approve'),{...command(),derived:m01SetTwo(),reviewAnswers:m01ReviewAnswers(),source:m01SourceAuthority,notes:'Synthetic software test only; not client approval.'});
  await upstream.connect(await scope('edit'));
  const source=(await repo.getSource(await scope('read'),M02_SOURCE_SLOT))!;
  expect((source.body as any).originVersionId).toBe(record.payload.seal!.versionId);
  expect((source.body as any).originCanonicalPayload).toBe(JSON.stringify(record.payload.outputs));
  await upstream.connect(await scope('edit'));
  expect((await repo.getSource(await scope('read'),M02_SOURCE_SLOT))!.id).toBe(source.id);
  const m02=createM02Service({repository:repo,validateSource:upstream.validate});
  const created=await m02.create(await scope('edit'),{action:'create',commandId:randomUUID()});
  expect(created.payload.recon.m01Inputs.coreBelief).toBe(record.payload.outputs!.outputs.anchors.find(a=>a.key==='Core Belief')!.sentence);
  expect((await m02.load(await scope('read'),created.id)).upstreamCurrent).toBe(true);
  const tampered=structuredClone(source);(tampered.body as any).inputs.coreBelief='Invented belief';
  await expect(upstream.validate(await scope('read'),tampered)).rejects.toThrow(/hash/);
  const historical=(await repo.getVersion(await scope('read'),record.payload.seal!.versionId))!;
  const changed=structuredClone(input);changed.parts[0].text+=' Source changed.';
  await repo.setSource(await scope('manage'),{id:randomUUID(),slot:'m01-input',body:changed,hash:sourceHash(changed)});
  await expect(upstream.validate(await scope('read'),source)).rejects.toThrow(/authority changed/);
  expect((await m02.load(await scope('read'),created.id)).upstreamCurrent).toBe(false);
  await expect(m02.confirm(await scope('approve'),{action:'confirm-setup',sessionId:created.id,expectedRevision:created.revision,commandId:randomUUID(),research:{competitors:[{name:'Synthetic competitor'}],cohort:'Synthetic cohort',geography:'Synthetic geography'}})).rejects.toThrow(/authority changed/);
  expect(await repo.getVersion(await scope('read'),record.payload.seal!.versionId)).toEqual(historical);
  const existingScope=await scope('edit');revoked=true;
  await expect(upstream.connect(existingScope)).rejects.toThrow('access denied');
 }finally{await db.close()}
},30_000);
