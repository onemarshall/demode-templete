/** Node composition: explicit process configuration, no SvelteKit or filesystem records. */
import {Pool} from 'pg';
import {z} from 'zod';
import {createStrategyExecution} from './strategy-runtime.server';
import {createM04Providers} from '#lib/modules/strategy/server/providers/m04.js';
import {createTriggerM04Gateway} from '#lib/modules/strategy/server/jobs/gateway.js';
import {strategyProviderConfiguration,strategyDeliveryConfiguration} from './strategy-configuration.server';
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
 const pool=options.pool??workerPool(input);
 return {...createStrategyExecution({pool,providers,gateway:createTriggerM04Gateway(strategyDeliveryConfiguration(input))}),close:()=>pool.end()};
}
let runtime:ReturnType<typeof createStrategyWorkerRuntime>|undefined;
export async function getStrategyWorkerRuntime(){return runtime??=createStrategyWorkerRuntime(process.env);}
let recovery:ReturnType<typeof createStrategyExecution> & {close:()=>Promise<void>}|undefined;
/** Committed checkpoints keep recovering when AI or document-reader configuration is unavailable. */
export async function getStrategyRecoveryRuntime(){
 if(!recovery){const pool=workerPool(process.env);recovery={...createStrategyExecution({pool,gateway:createTriggerM04Gateway(strategyDeliveryConfiguration(process.env))}),close:()=>pool.end()};}
 return recovery;
}
export async function closeStrategyWorkerRuntime(){const a=runtime,b=recovery;runtime=undefined;recovery=undefined;await Promise.all([a?.close(),b?.close()]);}
