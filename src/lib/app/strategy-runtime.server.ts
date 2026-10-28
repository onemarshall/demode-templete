/** Shared Strategy services: explicit host authority and runtime dependencies. */
import type {Pool} from 'pg';
import {z} from 'zod';
import {getDB} from '#lib/platform/database/db.js';
import {StrategyRepository} from '#lib/modules/strategy/server/data/repository.js';
import {StrategyJobs} from '#lib/modules/strategy/server/data/jobs.js';
import {createM04Worker} from '#lib/modules/strategy/server/jobs/worker.js';
import {createTriggerM04Gateway} from '#lib/modules/strategy/server/jobs/gateway.js';
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
   const service=createM04Service({repository,actor:policy.actor,method,
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
 const gateway=options.gateway??createTriggerM04Gateway();
 const outbox=new StrategyOutbox(pool);
 const outboxDispatcher=createStrategyOutboxDispatcher({outbox,jobs:gateway,checkpoints:createStrategyCheckpointGateway(pool)});
 const recovery=createStrategyRecovery({jobs,gateway});
 return {worker,repository,jobs,outbox,outboxDispatcher,recovery,policy,gateway,authorizeWorker:policy.authorizeWorker};
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
 return {...execution,host};
}
