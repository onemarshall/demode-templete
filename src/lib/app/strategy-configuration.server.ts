/** Explicit private runtime configuration shared by web and Node composition. */
import {z} from 'zod';
import {resolveM04Model} from '#lib/modules/strategy/server/model-policy.js';
import type {M04ProviderConfig} from '#lib/modules/strategy/server/providers/m04.js';
const providerSchema=z.object({
 OPENROUTER_API_KEY:z.string().trim().min(1),
 STRATEGY_PROVIDER_URL:z.url().default('https://openrouter.ai/api/v1/chat/completions'),
 STRATEGY_PROVIDER_TIMEOUT_MS:z.coerce.number().int().min(1000).max(900000).default(120000),
 STRATEGY_DRAFT_MAX_TOKENS:z.coerce.number().int().min(1000).max(18000).optional(),
 STRATEGY_CHAT_MAX_TOKENS:z.coerce.number().int().min(1000).max(12000).optional(),
 STRATEGY_REASONING_EFFORT:z.enum(['none','minimal','low','medium','high']).optional(),
});
/** Alternate endpoints are permitted only for an explicitly guarded local test. */
export function strategyProviderConfiguration(input:Record<string,unknown>):M04ProviderConfig {
 const parsed=providerSchema.safeParse(input);
 if(!parsed.success)throw new Error('Strategy AI provider configuration is incomplete');
 const endpoint=new URL(parsed.data.STRATEGY_PROVIDER_URL);
 const local=['127.0.0.1','localhost','[::1]'].includes(endpoint.hostname);
 if(endpoint.origin!=='https://openrouter.ai'){
  const db=new URL(String(input.BETTER_DATABASE_URL??'postgres://invalid/invalid'));
  if(!local||!(input.STRATEGY_INTEGRATION_TEST_MODE==='1'||input.STRATEGY_INTEGRATION_TEST_MODE===true)||input.NODE_ENV!=='development'||db.hostname!=='127.0.0.1'||db.pathname!=='/strategy_auth_integration_test')throw new Error('Alternate Strategy provider requires its isolated local integration host');
 }
 const model=resolveM04Model(Object.fromEntries(Object.entries(input).filter((entry):entry is [string,string]=>typeof entry[1]==='string')));
 return {apiKey:parsed.data.OPENROUTER_API_KEY,endpoint:endpoint.href,model,timeoutMs:parsed.data.STRATEGY_PROVIDER_TIMEOUT_MS,
  draftMaxTokens:parsed.data.STRATEGY_DRAFT_MAX_TOKENS,chatMaxTokens:parsed.data.STRATEGY_CHAT_MAX_TOKENS,
  reasoningEffort:parsed.data.STRATEGY_REASONING_EFFORT};
}

/** SDK credentials are explicit for web bindings; no global SDK state is changed. */
export function strategyDeliveryConfiguration(input:Record<string,unknown>) {
 const key=typeof input.TRIGGER_SECRET_KEY==='string'?input.TRIGGER_SECRET_KEY.trim():'';
 if(!key)return undefined;
 const api=typeof input.TRIGGER_API_URL==='string'&&input.TRIGGER_API_URL?input.TRIGGER_API_URL:undefined;
 if(api){const url=new URL(api);if(url.username||url.password||!['https:','http:'].includes(url.protocol))throw new Error('Invalid Trigger API configuration');
  if(url.protocol!=='https:'&&!(input.NODE_ENV==='development'&&['127.0.0.1','localhost'].includes(url.hostname)))throw new Error('Trigger API requires HTTPS outside local development');}
 const branch=typeof input.TRIGGER_DEV_BRANCH==='string'&&input.TRIGGER_DEV_BRANCH!=='default'?input.TRIGGER_DEV_BRANCH:undefined;
 return {accessToken:key,baseURL:api,branch};
}
