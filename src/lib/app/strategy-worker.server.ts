/** Node composition: explicit process configuration, no SvelteKit or filesystem records. */
import {Pool} from 'pg';
import {collectM02Url} from '#lib/modules/strategy/server/providers/m02-collection.js';
import {createM02Providers} from '#lib/modules/strategy/server/providers/m02.js';
import {createM03Providers} from '#lib/modules/strategy/server/providers/m03.js';
import {createBFProviders} from '#lib/modules/strategy/server/providers/bf.js';
import {createM05Providers} from '#lib/modules/strategy/server/providers/m05.js';
import {createM06Providers} from '#lib/modules/strategy/server/providers/m06.js';
import {createM07Providers} from '#lib/modules/strategy/server/providers/m07.js';
import {createM01Providers} from '#lib/modules/strategy/server/providers/m01.js';
import {z} from 'zod';
import {createStrategyExecution} from './strategy-runtime.server';
import {createM04Providers} from '#lib/modules/strategy/server/providers/m04.js';
import {createTriggerM04Gateway,createTriggerM01Gateway,createTriggerM02Gateway,createTriggerM03Gateway,createTriggerBFGateway,createTriggerM05Gateway,createTriggerM06Gateway,createTriggerM07Gateway} from '#lib/modules/strategy/server/jobs/gateway.js';
import {strategyProviderConfiguration,strategyM01ProviderConfiguration,strategyM02ProviderConfiguration,strategyM03ProviderConfiguration,strategyBFProviderConfiguration,strategyM05ProviderConfiguration,strategyM06ProviderConfiguration,strategyM07ProviderConfiguration,strategyDeliveryConfiguration} from './strategy-configuration.server';
const required=z.object({BETTER_DATABASE_URL:z.url()});
function workerDatabaseUrl(input:Record<string,unknown>) {
 if(input.STRATEGY_ENABLED!==true&&!['true','1'].includes(String(input.STRATEGY_ENABLED)))throw new Error('Strategy worker is not enabled');
 const parsed=required.safeParse(input);if(!parsed.success)throw new Error('Strategy worker database configuration is incomplete');
 if(!['postgres:','postgresql:'].includes(new URL(parsed.data.BETTER_DATABASE_URL).protocol))throw new Error('Strategy worker requires PostgreSQL');
 return parsed.data.BETTER_DATABASE_URL;
}
function workerPool(input:Record<string,unknown>){
 return new Pool({connectionString:workerDatabaseUrl(input),max:5,connectionTimeoutMillis:5000,idleTimeoutMillis:30000});
}
export function createStrategyWorkerRuntime(input:Record<string,unknown>,options:{pool?:Pool}={}) {
 workerDatabaseUrl(input);
 const providers=createM04Providers({...strategyProviderConfiguration(input),
  onDiagnostic:diagnostic=>console.info('Strategy provider',diagnostic)});
 const m01Providers=createM01Providers({...strategyM01ProviderConfiguration(input),onDiagnostic:diagnostic=>console.info('Strategy M01 provider',diagnostic)});
 const m02Config=strategyM02ProviderConfiguration(input);
 const m02Providers=createM02Providers({...m02Config,maxTokens:m02Config.draftMaxTokens,onDiagnostic:diagnostic=>console.info('Strategy M02 provider',diagnostic)});
 const m03Config=strategyM03ProviderConfiguration(input);
 const m03Providers=createM03Providers({...m03Config,maxTokens:m03Config.draftMaxTokens,onDiagnostic:diagnostic=>console.info('Strategy M03 provider',diagnostic)});
 const bfConfig=strategyBFProviderConfiguration(input);
 const bfProviders=createBFProviders({...bfConfig,maxTokens:bfConfig.draftMaxTokens,onDiagnostic:diagnostic=>console.info('Strategy BF provider',diagnostic)});
 const m05Config=strategyM05ProviderConfiguration(input);
 const m05Providers=createM05Providers({...m05Config,maxTokens:m05Config.draftMaxTokens,onDiagnostic:diagnostic=>console.info('Strategy M05 provider',diagnostic)});
 const m06Config=strategyM06ProviderConfiguration(input);
 const m06Providers=createM06Providers({...m06Config,maxTokens:m06Config.draftMaxTokens,onDiagnostic:diagnostic=>console.info('Strategy M06 provider',diagnostic)});
 const m07Config=strategyM07ProviderConfiguration(input);
 const m07Providers=createM07Providers({...m07Config,maxTokens:m07Config.draftMaxTokens,onDiagnostic:diagnostic=>console.info('Strategy M07 provider',diagnostic)});
 const pool=options.pool??workerPool(input);
 return {...createStrategyExecution({pool,providers,m01Providers,m02Collector:collectM02Url,m02Providers:m02Providers.generate,m02Gateway:createTriggerM02Gateway(strategyDeliveryConfiguration(input)),m03Providers:m03Providers.generate,m03Gateway:createTriggerM03Gateway(strategyDeliveryConfiguration(input)),bfProviders:bfProviders.generate,bfGateway:createTriggerBFGateway(strategyDeliveryConfiguration(input)),m05Providers:m05Providers.generate,m05Gateway:createTriggerM05Gateway(strategyDeliveryConfiguration(input)),m06Providers:m06Providers.generate,m06Gateway:createTriggerM06Gateway(strategyDeliveryConfiguration(input)),m07Providers:m07Providers.generate,m07Gateway:createTriggerM07Gateway(strategyDeliveryConfiguration(input)),gateway:createTriggerM04Gateway(strategyDeliveryConfiguration(input)),m01Gateway:createTriggerM01Gateway(strategyDeliveryConfiguration(input))}),close:()=>pool.end()};
}
let runtime:ReturnType<typeof createStrategyWorkerRuntime>|undefined;
export async function getStrategyWorkerRuntime(){return runtime??=createStrategyWorkerRuntime(process.env);}
let recovery:ReturnType<typeof createStrategyExecution> & {close:()=>Promise<void>}|undefined;
/** Committed checkpoints keep recovering when AI or document-reader configuration is unavailable. */
export async function getStrategyRecoveryRuntime(){
 if(!recovery){const pool=workerPool(process.env);recovery={...createStrategyExecution({pool,m02Gateway:createTriggerM02Gateway(strategyDeliveryConfiguration(process.env)),m03Gateway:createTriggerM03Gateway(strategyDeliveryConfiguration(process.env)),bfGateway:createTriggerBFGateway(strategyDeliveryConfiguration(process.env)),m05Gateway:createTriggerM05Gateway(strategyDeliveryConfiguration(process.env)),m06Gateway:createTriggerM06Gateway(strategyDeliveryConfiguration(process.env)),m07Gateway:createTriggerM07Gateway(strategyDeliveryConfiguration(process.env)),gateway:createTriggerM04Gateway(strategyDeliveryConfiguration(process.env)),m01Gateway:createTriggerM01Gateway(strategyDeliveryConfiguration(process.env))}),close:()=>pool.end()};}
 return recovery;
}
export async function closeStrategyWorkerRuntime(){const a=runtime,b=recovery;runtime=undefined;recovery=undefined;await Promise.all([a?.close(),b?.close()]);}
