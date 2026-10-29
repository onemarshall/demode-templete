/** Shared Strategy services: explicit host authority and runtime dependencies. */
import type {Pool} from 'pg';
import {z} from 'zod';
import {createM02Worker} from '#lib/modules/strategy/server/jobs/m02-worker.js';
import type {M02ServicePorts} from '#lib/modules/strategy/server/stages/m02/service.js';
import {createM02Host} from './strategy-m02-host.server';
import {createM02Upstream} from './strategy-m02-source.server';
import {createM01Worker} from '#lib/modules/strategy/server/jobs/m01-worker.js';
import type {M01Ports} from '#lib/modules/strategy/server/stages/m01/service.js';
import {createM01Host,type M01VoicePort} from './strategy-m01-host.server';
import {createM01SourceAuthority} from './strategy-m01-authority.server';
import {getDB} from '#lib/platform/database/db.js';
import {StrategyRepository} from '#lib/modules/strategy/server/data/repository.js';
import {StrategyJobs} from '#lib/modules/strategy/server/data/jobs.js';
import {createM04Worker} from '#lib/modules/strategy/server/jobs/worker.js';
import {createTriggerM04Gateway,createTriggerM01Gateway,createTriggerM02Gateway} from '#lib/modules/strategy/server/jobs/gateway.js';
import {createM04Service,type M04ServicePorts} from '#lib/modules/strategy/server/stages/m04/service.js';
import {loadStrategyMethod} from '#lib/modules/strategy/server/resources.js';
import {DirectusStrategyDocumentReader} from '#lib/modules/strategy/server/data/directus-documents.js';
import {createStrategyHost,type StrategyHostPorts,type StrategyEvent} from './strategy-host.server';
import {createStrategyPolicy} from './strategy-policy.server';
import {createStrategyOutboxDispatcher,StrategyOutbox} from '#lib/modules/strategy/server/jobs/outbox.js';
import {createStrategyRecovery} from '#lib/modules/strategy/server/jobs/recovery.js';
import {createStrategyCheckpointGateway} from '#lib/modules/strategy/server/jobs/checkpoints.js';
import type {StrategyJobGateway} from '#lib/modules/strategy/server/jobs/gateway.js';
export interface AuthStrategyRuntimeOptions {
 pool?:Pool;
 directus?:{url:string;token:string};
 providers?:Pick<M04ServicePorts,'generate'|'chat'>;
 m01Providers?:M01Ports['model'];
 m02Providers?:M02ServicePorts['generate'];
 m02Collector?:M02ServicePorts['collect'];
 m02Gateway?:StrategyJobGateway;
 voice?:M01VoicePort;
 m01Gateway?:StrategyJobGateway;
 documentReader?:StrategyHostPorts['documentReader'];
 gateway?:StrategyJobGateway;
 dispatchJob?:(jobId:string)=>Promise<void>;
 resolvePrincipal?:(event:StrategyEvent)=>Promise<string|null>;
}
const method=async()=>loadStrategyMethod('04-Viability-Check/04-Prompt.md');
/** Workers and bookkeeping do not load SvelteKit, Directus or web authentication. */
export function createStrategyExecution(options:AuthStrategyRuntimeOptions & {pool:Pool}) {
 const {pool}=options;
 const repository=new StrategyRepository(pool),jobs=new StrategyJobs(pool),policy=createStrategyPolicy(pool,options.resolvePrincipal);
 const providers=options.providers??{};
 const worker=createM04Worker({jobs,authorize:policy.authorizeWorker,
  policy:async job=>{if(!(job.command.action==='chat'?providers.chat:providers.generate))throw new Error('Strategy generation provider is not configured');await policy.workerPolicy(job);},
  execute:async(scope,job,lease,beforePublish)=>{
   let checked=false;const publish=async()=>{await beforePublish();checked=true;};
   const service=createM04Service({repository,actor:policy.actor,methodRelease:job.methodRelease,method:async()=>loadStrategyMethod('04-Viability-Check/04-Prompt.md',job.methodRelease),
    ...(providers.generate?{generate:async(request:Parameters<NonNullable<M04ServicePorts['generate']>>[0])=>{const result=await providers.generate!(request);await publish();return result;}}:{}),
    ...(providers.chat?{chat:async(request:Parameters<NonNullable<M04ServicePorts['chat']>>[0])=>{const result=await providers.chat!(request);await publish();return result;}}:{})});
   if(job.command.action==='chat'){
    const result=await service.chat(scope,{sessionId:job.sessionId,expectedRevision:job.expectedRevision,commandId:job.commandId,
     stage:z.enum(['context','conviction-cost','market-readiness','human-load','financial-grounding','awareness-and-weighing']).parse(job.command.stage),
     message:z.string().max(16000).nullable().parse(job.command.message),jobLease:lease});
    if(!checked)await publish(); // A repeated "begin" may return the saved conversation without another model call.
    return result;
   }
   if(job.command.action!==undefined&&job.command.action!=='draft')throw new Error('Unsupported Strategy generation command');
   return service.draft(scope,{sessionId:job.sessionId,expectedRevision:job.expectedRevision,commandId:job.commandId,
    stage:z.enum(['context','conviction-cost','market-readiness','human-load','financial-grounding','awareness-and-weighing','recommendation']).parse(job.command.stage),jobLease:lease});
  }
 });
 const m01Worker=createM01Worker({jobs,repository,model:options.m01Providers,authorize:policy.authorizeWorker,policy:async job=>{if(!options.m01Providers)throw new Error('M01 provider is not configured');await policy.workerPolicy(job)}});
 const m02Upstream=createM02Upstream(pool);
 const m02Worker=createM02Worker({jobs,repository,collect:options.m02Collector,generate:options.m02Providers,validateSource:m02Upstream.validate,authorize:policy.authorizeWorker,policy:async job=>{if(job.command.action==='draft'&&!options.m02Providers)throw new Error('M02 provider is not configured');await policy.workerPolicy(job)}});
 const m02Gateway=options.m02Gateway??createTriggerM02Gateway();
 const m04Gateway=options.gateway??createTriggerM04Gateway(),m01Gateway=options.m01Gateway??createTriggerM01Gateway();
 const gateway:StrategyJobGateway={async dispatch(input){const stage=await jobs.moduleForJob(input.jobId);if(stage==='m04')return m04Gateway.dispatch(input);if(stage==='m01')return m01Gateway.dispatch(input);if(stage==='m02')return m02Gateway.dispatch(input);throw new Error('Strategy job module is unavailable')}};
 const outbox=new StrategyOutbox(pool);
 const outboxDispatcher=createStrategyOutboxDispatcher({outbox,jobs:gateway,checkpoints:createStrategyCheckpointGateway(pool)});
 const recoveries=['m04','m01','m02'].map(stage=>createStrategyRecovery({jobs,gateway,stage}));
 const recovery={async dispatchRecoverable(){let total=0;const errors:unknown[]=[];for(const entry of recoveries){try{total+=await entry.dispatchRecoverable()}catch(error){errors.push(error)}}if(errors.length)throw new AggregateError(errors,'Strategy recovery incomplete');return total}};
 return {worker:{async run(id:string){if(await jobs.moduleForJob(id)!=='m04')throw new Error('Job belongs to a different Strategy worker');return worker.run(id)}},m01Worker,m02Worker,m02Upstream,repository,jobs,outbox,outboxDispatcher,recovery,policy,gateway,authorizeWorker:policy.authorizeWorker};
}
/** Web-only surface layered over the same execution and persistence services. */
export async function createAuthStrategyRuntime(options:AuthStrategyRuntimeOptions={}) {
 const pool=options.pool??await getDB();
 const execution=createStrategyExecution({...options,pool});
 let documentReader=options.documentReader;
 if(!documentReader) {
  if(!options.directus?.url||!options.directus.token)throw new Error('Strategy requires its explicit Directus URL and read-only reader token');
  documentReader=new DirectusStrategyDocumentReader(options.directus);
 }
 const {repository,jobs,policy,gateway}=execution;
 const host=createStrategyHost({repository,jobs,documentReader,
  target:policy.target,authority:policy.authority,actor:(_event,scope)=>policy.actor(scope),method,...options.providers,
  generationPolicy:(_event,scope)=>policy.generationPolicy(scope),
  dispatchJob:options.dispatchJob??(async jobId=>{await execution.outbox.dispatchCommittedJob(jobId,gateway);})
 });
 const m01Host=createM01Host({repository,jobs,documentReader,target:policy.target,authority:policy.authority,
  sourceAuthority:createM01SourceAuthority(pool),voice:options.voice,generationPolicy:(_event,scope)=>policy.generationPolicy(scope),
  dispatchJob:options.dispatchJob??(async jobId=>{await execution.outbox.dispatchCommittedJob(jobId,gateway);})});
 const m02Host=createM02Host({repository,jobs,documentReader,upstream:execution.m02Upstream,
  target:policy.target,authority:policy.authority,
  generationPolicy:(_event,scope)=>policy.generationPolicy(scope),
  dispatchJob:options.dispatchJob??(async jobId=>{await execution.outbox.dispatchCommittedJob(jobId,gateway);})});
 return {...execution,host,m01Host,m02Host};
}
