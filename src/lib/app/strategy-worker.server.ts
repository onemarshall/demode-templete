/** Node composition: explicit process configuration, no SvelteKit or filesystem records. */
import {Pool} from 'pg';
import {collectM02Url} from '#lib/modules/strategy/server/providers/m02-collection.js';
import {createM02Providers} from '#lib/modules/strategy/server/providers/m02.js';
import {createM03Providers} from '#lib/modules/strategy/server/providers/m03.js';
import {createBFProviders} from '#lib/modules/strategy/server/providers/bf.js';
import {createM05Providers} from '#lib/modules/strategy/server/providers/m05.js';
import {createM06Providers} from '#lib/modules/strategy/server/providers/m06.js';
import {createM07Providers} from '#lib/modules/strategy/server/providers/m07.js';
import {createM08Providers} from '#lib/modules/strategy/server/providers/m08.js';
import {createM09Providers} from '#lib/modules/strategy/server/providers/m09.js';
import {createM10Providers} from '#lib/modules/strategy/server/providers/m10.js';
import {createCDProviders} from '#lib/modules/strategy/server/providers/cd.js';
import {createM11Providers} from '#lib/modules/strategy/server/providers/m11.js';
import {createM12Providers} from '#lib/modules/strategy/server/providers/m12.js';
import {createM01Providers} from '#lib/modules/strategy/server/providers/m01.js';
import {z} from 'zod';
import {createStrategyExecution} from './strategy-runtime.server';
import {createM04Providers} from '#lib/modules/strategy/server/providers/m04.js';
import {createTriggerM04Gateway,createTriggerM01Gateway,createTriggerM02Gateway,createTriggerM03Gateway,createTriggerBFGateway,createTriggerM05Gateway,createTriggerM06Gateway,createTriggerM07Gateway,createTriggerM08Gateway,createTriggerM09Gateway,createTriggerM10Gateway,createTriggerCDGateway,createTriggerM11Gateway,createTriggerM12Gateway} from '#lib/modules/strategy/server/jobs/gateway.js';
import {strategyProviderConfiguration,strategyM01ProviderConfiguration,strategyM02ProviderConfiguration,strategyM03ProviderConfiguration,strategyBFProviderConfiguration,strategyM05ProviderConfiguration,strategyM06ProviderConfiguration,strategyM07ProviderConfiguration,strategyM08ProviderConfiguration,strategyM09ProviderConfiguration,strategyM10ProviderConfiguration,strategyCDProviderConfiguration,strategyM11ProviderConfiguration,strategyM12ProviderConfiguration,strategyDeliveryConfiguration} from './strategy-configuration.server';
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
 const m08Config=strategyM08ProviderConfiguration(input);
 const m08Providers=createM08Providers({...m08Config,maxTokens:m08Config.draftMaxTokens,onDiagnostic:diagnostic=>console.info('Strategy M08 provider',diagnostic)});
 const m09Config=strategyM09ProviderConfiguration(input);
 const m09Providers=createM09Providers({...m09Config,maxTokens:m09Config.draftMaxTokens,onDiagnostic:diagnostic=>console.info('Strategy M09 provider',diagnostic)});
 const m10Config=strategyM10ProviderConfiguration(input);
 const m10Providers=createM10Providers({...m10Config,maxTokens:m10Config.draftMaxTokens,onDiagnostic:diagnostic=>console.info('Strategy M10 provider',diagnostic)});
 const cdConfig=strategyCDProviderConfiguration(input);
 const cdProviders=createCDProviders({...cdConfig,maxTokens:cdConfig.draftMaxTokens,onDiagnostic:diagnostic=>console.info('Strategy CD provider',diagnostic)});
 const m11Config=strategyM11ProviderConfiguration(input);
 const m11Providers=createM11Providers({...m11Config,maxTokens:m11Config.draftMaxTokens,onDiagnostic:diagnostic=>console.info('Strategy M11 provider',diagnostic)});
 const m12Config=strategyM12ProviderConfiguration(input);
 const m12Providers=createM12Providers({...m12Config,maxTokens:m12Config.draftMaxTokens,onDiagnostic:diagnostic=>console.info('Strategy M12 provider',diagnostic)});
 const pool=options.pool??workerPool(input);
 return {...createStrategyExecution({pool,providers,m01Providers,m02Collector:collectM02Url,m02Providers:m02Providers.generate,m02Gateway:createTriggerM02Gateway(strategyDeliveryConfiguration(input)),m03Providers:m03Providers.generate,m03Gateway:createTriggerM03Gateway(strategyDeliveryConfiguration(input)),bfProviders:bfProviders.generate,bfGateway:createTriggerBFGateway(strategyDeliveryConfiguration(input)),m05Providers:m05Providers.generate,m05Gateway:createTriggerM05Gateway(strategyDeliveryConfiguration(input)),m06Providers:m06Providers.generate,m06Gateway:createTriggerM06Gateway(strategyDeliveryConfiguration(input)),m07Providers:m07Providers.generate,m07Gateway:createTriggerM07Gateway(strategyDeliveryConfiguration(input)),m08Providers:m08Providers.generate,m08Gateway:createTriggerM08Gateway(strategyDeliveryConfiguration(input)),m09Providers:m09Providers.generate,m09Gateway:createTriggerM09Gateway(strategyDeliveryConfiguration(input)),m10Providers:m10Providers.generate,m10Gateway:createTriggerM10Gateway(strategyDeliveryConfiguration(input)),cdProviders:cdProviders.generate,cdGateway:createTriggerCDGateway(strategyDeliveryConfiguration(input)),m11Providers:m11Providers.generate,m11Gateway:createTriggerM11Gateway(strategyDeliveryConfiguration(input)),m12Providers:m12Providers.generate,m12Gateway:createTriggerM12Gateway(strategyDeliveryConfiguration(input)),gateway:createTriggerM04Gateway(strategyDeliveryConfiguration(input)),m01Gateway:createTriggerM01Gateway(strategyDeliveryConfiguration(input))}),close:()=>pool.end()};
}
let runtime:ReturnType<typeof createStrategyWorkerRuntime>|undefined;
export async function getStrategyWorkerRuntime(){return runtime??=createStrategyWorkerRuntime(process.env);}
let recovery:ReturnType<typeof createStrategyExecution> & {close:()=>Promise<void>}|undefined;
/** Committed checkpoints keep recovering when AI or document-reader configuration is unavailable. */
export async function getStrategyRecoveryRuntime(){
 if(!recovery){const pool=workerPool(process.env);recovery={...createStrategyExecution({pool,m02Gateway:createTriggerM02Gateway(strategyDeliveryConfiguration(process.env)),m03Gateway:createTriggerM03Gateway(strategyDeliveryConfiguration(process.env)),bfGateway:createTriggerBFGateway(strategyDeliveryConfiguration(process.env)),m05Gateway:createTriggerM05Gateway(strategyDeliveryConfiguration(process.env)),m06Gateway:createTriggerM06Gateway(strategyDeliveryConfiguration(process.env)),m07Gateway:createTriggerM07Gateway(strategyDeliveryConfiguration(process.env)),m08Gateway:createTriggerM08Gateway(strategyDeliveryConfiguration(process.env)),m09Gateway:createTriggerM09Gateway(strategyDeliveryConfiguration(process.env)),m10Gateway:createTriggerM10Gateway(strategyDeliveryConfiguration(process.env)),cdGateway:createTriggerCDGateway(strategyDeliveryConfiguration(process.env)),m11Gateway:createTriggerM11Gateway(strategyDeliveryConfiguration(process.env)),m12Gateway:createTriggerM12Gateway(strategyDeliveryConfiguration(process.env)),gateway:createTriggerM04Gateway(strategyDeliveryConfiguration(process.env)),m01Gateway:createTriggerM01Gateway(strategyDeliveryConfiguration(process.env))}),close:()=>pool.end()};}
 return recovery;
}
export async function closeStrategyWorkerRuntime(){const a=runtime,b=recovery;runtime=undefined;recovery=undefined;await Promise.all([a?.close(),b?.close()]);}
