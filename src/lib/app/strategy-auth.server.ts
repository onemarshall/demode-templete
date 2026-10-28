/** Web activation composes Strategy with real Better Auth. Fixture mode changes
 * model/delivery ports only; it never supplies a principal, permission or source. */
import {createTriggerM04Gateway} from '#lib/modules/strategy/server/jobs/gateway.js';
import {strategyDeliveryConfiguration} from './strategy-configuration.server';
import {dev} from '$app/env';
import {getServerEnv} from '#lib/platform/config/server.server.js';
import {StrategyAccessError} from '#lib/modules/strategy/server/access.js';
import {auth} from './setup.server';
import {createAuthStrategyRuntime} from './strategy-runtime.server';
export {createAuthStrategyRuntime,type AuthStrategyRuntimeOptions} from './strategy-runtime.server';
let initialization:Promise<void>|undefined;
let configured:Awaited<ReturnType<typeof createAuthStrategyRuntime>>|undefined;
export async function initializeAuthStrategy():Promise<void> {
 const env=await getServerEnv();if(!env.STRATEGY_ENABLED)return;
 if(initialization)return initialization;
 initialization=(async()=>{
  if(env.STRATEGY_INTEGRATION_TEST_MODE) {
   if(!dev||process.env.NODE_ENV==='production')throw new Error('Strategy integration mode requires development');
   const database=new URL(env.BETTER_DATABASE_URL??'');
   if(!['127.0.0.1','localhost','[::1]'].includes(database.hostname)||database.pathname!=='/strategy_auth_integration_test')
    throw new Error('Strategy integration mode requires the explicit isolated loopback database');
  }
  const configuration={...env,NODE_ENV:dev?'development':'production'};
  const delivery=strategyDeliveryConfiguration(configuration);
  if(!delivery)throw new Error('Strategy delivery credentials are not configured');
  configured=await createAuthStrategyRuntime({gateway:createTriggerM04Gateway(delivery),directus:{url:env.STRATEGY_DIRECTUS_URL??'',token:env.STRATEGY_DIRECTUS_READER_TOKEN??''},resolvePrincipal:async event=>{
   const session=await auth.api.getSession({headers:event.request.headers});return session?.user?.id??null;
  }});
 })();
 return initialization;
}
export function authStrategyHost() {
 if(!configured)throw new StrategyAccessError();return configured.host;
}
