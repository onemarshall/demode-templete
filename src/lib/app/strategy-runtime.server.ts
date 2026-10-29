/** Shared Strategy services: explicit host authority and runtime dependencies. */
import type {Pool} from 'pg';
import {z} from 'zod';
import {createM02Worker} from '#lib/modules/strategy/server/jobs/m02-worker.js';
import type {M02ServicePorts} from '#lib/modules/strategy/server/stages/m02/service.js';
import {createM02Host} from './strategy-m02-host.server';
import {createM02Upstream} from './strategy-m02-source.server';
import {createM03Worker} from '#lib/modules/strategy/server/jobs/m03-worker.js';
import type {M03ServicePorts} from '#lib/modules/strategy/server/stages/m03/service.js';
import {createM03Host} from './strategy-m03-host.server';
import {createM03Upstream} from './strategy-m03-source.server';
import {createBFWorker} from '#lib/modules/strategy/server/jobs/bf-worker.js';
import type {BFServicePorts} from '#lib/modules/strategy/server/stages/bf/service.js';
import {createBFHost} from './strategy-bf-host.server';
import {createBFUpstream} from './strategy-bf-source.server';
import {createM05Worker} from '#lib/modules/strategy/server/jobs/m05-worker.js';
import type {M05ServicePorts} from '#lib/modules/strategy/server/stages/m05/service.js';
import {createM05Host} from './strategy-m05-host.server';
import {createM05Upstream} from './strategy-m05-source.server';
import {createM05RouteAuthority} from './strategy-m05-route.server';
import {createM06Worker} from '#lib/modules/strategy/server/jobs/m06-worker.js';
import type {M06ServicePorts} from '#lib/modules/strategy/server/stages/m06/service.js';
import {createM06Host} from './strategy-m06-host.server';
import {createM06Upstream} from './strategy-m06-source.server';
import {createM06RouteAuthority} from './strategy-m06-route.server';
import {createM01Worker} from '#lib/modules/strategy/server/jobs/m01-worker.js';
import type {M01Ports} from '#lib/modules/strategy/server/stages/m01/service.js';
import {createM01Host,type M01VoicePort} from './strategy-m01-host.server';
import {createM01SourceAuthority} from './strategy-m01-authority.server';
import {getDB} from '#lib/platform/database/db.js';
import {StrategyRepository} from '#lib/modules/strategy/server/data/repository.js';
import {StrategyJobs} from '#lib/modules/strategy/server/data/jobs.js';
import {createM04Worker} from '#lib/modules/strategy/server/jobs/worker.js';
import {createTriggerM04Gateway,createTriggerM01Gateway,createTriggerM02Gateway,createTriggerM03Gateway,createTriggerBFGateway,createTriggerM05Gateway,createTriggerM06Gateway} from '#lib/modules/strategy/server/jobs/gateway.js';
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
 m03Providers?:M03ServicePorts['generate'];
 m03Gateway?:StrategyJobGateway;
 bfProviders?:BFServicePorts['generate'];
 bfGateway?:StrategyJobGateway;
 m05Providers?:M05ServicePorts['generate'];
 m05Gateway?:StrategyJobGateway;
 m06Providers?:M06ServicePorts['generate'];
 m06Gateway?:StrategyJobGateway;
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
 const m03Upstream=createM03Upstream(pool);
 const m03Worker=createM03Worker({jobs,repository,generate:options.m03Providers,validateSource:m03Upstream.validate,authorize:policy.authorizeWorker,policy:async job=>{if(!options.m03Providers)throw new Error('M03 provider is not configured');await policy.workerPolicy(job)}});
 const m03Gateway=options.m03Gateway??createTriggerM03Gateway();
 const bfUpstream=createBFUpstream(pool);
 const bfWorker=createBFWorker({jobs,repository,generate:options.bfProviders,validateSource:bfUpstream.validate,authorize:policy.authorizeWorker,policy:async job=>{if(!options.bfProviders)throw new Error('BF provider is not configured');await policy.workerPolicy(job)}});
 const bfGateway=options.bfGateway??createTriggerBFGateway();
 const m05Upstream=createM05Upstream(pool);
 const m05Route=createM05RouteAuthority(pool);
 const m05Worker=createM05Worker({jobs,repository,generate:options.m05Providers,validateSource:m05Upstream.validate,authorize:policy.authorizeWorker,policy:async job=>{if(!options.m05Providers)throw new Error('M05 provider is not configured');await policy.workerPolicy(job)}});
 const m05Gateway=options.m05Gateway??createTriggerM05Gateway();
 const m06Upstream=createM06Upstream(pool);
 const m06Route=createM06RouteAuthority(pool);
 const m06Worker=createM06Worker({jobs,repository,generate:options.m06Providers,validateSource:m06Upstream.validate,authorize:policy.authorizeWorker,policy:async job=>{if(!options.m06Providers)throw new Error('M06 provider is not configured');await policy.workerPolicy(job)}});
 const m06Gateway=options.m06Gateway??createTriggerM06Gateway();
 const m04Gateway=options.gateway??createTriggerM04Gateway(),m01Gateway=options.m01Gateway??createTriggerM01Gateway();
 const gateway:StrategyJobGateway={async dispatch(input){const stage=await jobs.moduleForJob(input.jobId);if(stage==='m04')return m04Gateway.dispatch(input);if(stage==='m01')return m01Gateway.dispatch(input);if(stage==='m02')return m02Gateway.dispatch(input);if(stage==='m03')return m03Gateway.dispatch(input);if(stage==='bf')return bfGateway.dispatch(input);if(stage==='m05')return m05Gateway.dispatch(input);if(stage==='m06')return m06Gateway.dispatch(input);throw new Error('Strategy job module is unavailable')}};
 const outbox=new StrategyOutbox(pool);
 const outboxDispatcher=createStrategyOutboxDispatcher({outbox,jobs:gateway,checkpoints:createStrategyCheckpointGateway(pool)});
 const recoveries=['m04','m01','m02','m03','bf','m05','m06'].map(stage=>createStrategyRecovery({jobs,gateway,stage}));
 const recovery={async dispatchRecoverable(){let total=0;const errors:unknown[]=[];for(const entry of recoveries){try{total+=await entry.dispatchRecoverable()}catch(error){errors.push(error)}}if(errors.length)throw new AggregateError(errors,'Strategy recovery incomplete');return total}};
 return {worker:{async run(id:string){if(await jobs.moduleForJob(id)!=='m04')throw new Error('Job belongs to a different Strategy worker');return worker.run(id)}},m01Worker,m02Worker,m02Upstream,m03Worker,m03Upstream,bfWorker,bfUpstream,m05Worker,m05Upstream,m05Route,m06Worker,m06Upstream,m06Route,repository,jobs,outbox,outboxDispatcher,recovery,policy,gateway,authorizeWorker:policy.authorizeWorker};
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
 const m03Host=createM03Host({repository,jobs,documentReader,upstream:execution.m03Upstream,
  target:policy.target,authority:policy.authority,
  generationPolicy:(_event,scope)=>policy.generationPolicy(scope),
  dispatchJob:options.dispatchJob??(async jobId=>{await execution.outbox.dispatchCommittedJob(jobId,gateway);})});
 const bfHost=createBFHost({repository,jobs,documentReader,upstream:execution.bfUpstream,
  target:policy.target,authority:policy.authority,
  generationPolicy:(_event,scope)=>policy.generationPolicy(scope),
  dispatchJob:options.dispatchJob??(async jobId=>{await execution.outbox.dispatchCommittedJob(jobId,gateway);})});
 const m05Host=createM05Host({repository,jobs,documentReader,upstream:execution.m05Upstream,route:execution.m05Route,
  target:policy.target,authority:policy.authority,
  generationPolicy:(_event,scope)=>policy.generationPolicy(scope),
  dispatchJob:options.dispatchJob??(async jobId=>{await execution.outbox.dispatchCommittedJob(jobId,gateway);})});
 const m06Host=createM06Host({repository,jobs,documentReader,upstream:execution.m06Upstream,route:execution.m06Route,
  target:policy.target,authority:policy.authority,
  generationPolicy:(_event,scope)=>policy.generationPolicy(scope),
  dispatchJob:options.dispatchJob??(async jobId=>{await execution.outbox.dispatchCommittedJob(jobId,gateway);})});
 return {...execution,host,m01Host,m02Host,m03Host,bfHost,m05Host,m06Host};
}
