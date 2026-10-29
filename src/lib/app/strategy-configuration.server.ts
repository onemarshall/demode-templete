/** Explicit private runtime configuration shared by web and Node composition. */
import {z} from 'zod';
import {resolveM04Model,resolveM01Model,resolveM02Model} from '#lib/modules/strategy/server/model-policy.js';
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
function providerConfiguration(input:Record<string,unknown>,resolver:typeof resolveM04Model):M04ProviderConfig {
 const parsed=providerSchema.safeParse(input);
 if(!parsed.success)throw new Error('Strategy AI provider configuration is incomplete');
 const endpoint=new URL(parsed.data.STRATEGY_PROVIDER_URL);
 const local=['127.0.0.1','localhost','[::1]'].includes(endpoint.hostname);
 if(endpoint.origin!=='https://openrouter.ai'){
  const db=new URL(String(input.BETTER_DATABASE_URL??'postgres://invalid/invalid'));
  if(!local||!(input.STRATEGY_INTEGRATION_TEST_MODE==='1'||input.STRATEGY_INTEGRATION_TEST_MODE===true)||input.NODE_ENV!=='development'||db.hostname!=='127.0.0.1'||db.pathname!=='/strategy_auth_integration_test')throw new Error('Alternate Strategy provider requires its isolated local integration host');
 }
 const model=resolver(Object.fromEntries(Object.entries(input).filter((entry):entry is [string,string]=>typeof entry[1]==='string')));
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

export const strategyProviderConfiguration=(input:Record<string,unknown>)=>providerConfiguration(input,resolveM04Model);
export const strategyM01ProviderConfiguration=(input:Record<string,unknown>)=>providerConfiguration(input,resolveM01Model);
export function strategyM01VoiceConfiguration(input:Record<string,unknown>){
 if(input.STRATEGY_M01_VOICE_ENABLED!==true&&!['true','1'].includes(String(input.STRATEGY_M01_VOICE_ENABLED)))return undefined;
 const apiKey=typeof input.OPENAI_API_KEY==='string'?input.OPENAI_API_KEY.trim():'';
 if(!apiKey)throw new Error('M01 voice credentials are not configured');
 const endpoint=new URL(String(input.STRATEGY_M01_VOICE_URL??'https://api.openai.com/v1/live/sessions'));
 if(endpoint.href!=='https://api.openai.com/v1/live/sessions'){
  const db=new URL(String(input.BETTER_DATABASE_URL??'postgres://invalid/invalid'));
  if(input.NODE_ENV!=='development'||![true,'1'].includes(input.STRATEGY_INTEGRATION_TEST_MODE as boolean|string)||!['127.0.0.1','localhost'].includes(endpoint.hostname)||db.hostname!=='127.0.0.1'||db.port!=='55433'||db.pathname!=='/strategy_auth_integration_test')throw new Error('Alternate M01 voice requires the isolated integration host');
 }
 return {apiKey,endpoint:endpoint.href,model:String(input.STRATEGY_M01_VOICE_MODEL??'gpt-live-1')};
}

export const strategyM02ProviderConfiguration=(input:Record<string,unknown>)=>providerConfiguration(input,resolveM02Model);
