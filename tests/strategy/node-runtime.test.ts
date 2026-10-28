import {test} from 'node:test';
import assert from 'node:assert/strict';
import {strategyProviderConfiguration} from '../../src/lib/app/strategy-configuration.server';
import {createStrategyWorkerRuntime,getStrategyRecoveryRuntime,closeStrategyWorkerRuntime} from '../../src/lib/app/strategy-worker.server';
import {getDB,configureDatabase,closeDB} from '../../src/lib/platform/database/db';
const local={NODE_ENV:'development',STRATEGY_ENABLED:'1',STRATEGY_INTEGRATION_TEST_MODE:'1',BETTER_DATABASE_URL:'postgresql://synthetic:synthetic@127.0.0.1:55433/strategy_auth_integration_test',OPENROUTER_API_KEY:'synthetic-private-key',STRATEGY_PROVIDER_URL:'http://127.0.0.1:8134/chat/completions'};
test('Node database configuration is explicit and can recover from an early unconfigured read',async()=>{
 await assert.rejects(getDB(),/configure/);configureDatabase(local.BETTER_DATABASE_URL);const pool=await getDB();assert.ok(pool);await closeDB();
});
test('provider configuration enforces production model and endpoint policy',()=>{
 assert.throws(()=>strategyProviderConfiguration({...local,NODE_ENV:'production'}),/isolated/);
 assert.throws(()=>strategyProviderConfiguration({...local,NODE_ENV:'production',STRATEGY_PROVIDER_URL:'https://openrouter.ai/api/v1/chat/completions',M04_SYNTHESIS_MODEL:'vendor/mini'}),/strong synthesis/);
 assert.throws(()=>strategyProviderConfiguration({...local,STRATEGY_PROVIDER_URL:'https://unrelated.example/api'}),/isolated/);
 assert.equal(strategyProviderConfiguration(local).endpoint,local.STRATEGY_PROVIDER_URL);
});
test('plain Node worker construction fails closed and opens no connections during import/composition',async()=>{
 assert.throws(()=>createStrategyWorkerRuntime({...local,STRATEGY_ENABLED:'false'}),/not enabled/);
 assert.throws(()=>createStrategyWorkerRuntime({...local,OPENROUTER_API_KEY:''}),/configuration/);
 const runtime=createStrategyWorkerRuntime(local);assert.ok(runtime.worker.run);assert.ok(runtime.recovery.dispatchRecoverable);await runtime.close();
});
test('explicit request budgets reach the provider and invalid values fail closed',()=>{
 const configured=strategyProviderConfiguration({...local,STRATEGY_DRAFT_MAX_TOKENS:'4096',STRATEGY_CHAT_MAX_TOKENS:'2048',STRATEGY_REASONING_EFFORT:'none'});
 assert.equal(configured.draftMaxTokens,4096);assert.equal(configured.chatMaxTokens,2048);assert.equal(configured.reasoningEffort,'none');
 assert.equal(strategyProviderConfiguration(local).reasoningEffort,undefined);
 assert.equal(strategyProviderConfiguration(local).timeoutMs,120000);
 assert.equal(strategyProviderConfiguration({...local,STRATEGY_PROVIDER_TIMEOUT_MS:'240000'}).timeoutMs,240000);
 assert.equal(strategyProviderConfiguration({...local,STRATEGY_PROVIDER_TIMEOUT_MS:'900000'}).timeoutMs,900000);
 assert.throws(()=>strategyProviderConfiguration({...local,STRATEGY_PROVIDER_TIMEOUT_MS:'900001'}),/configuration/);
 assert.throws(()=>strategyProviderConfiguration({...local,STRATEGY_DRAFT_MAX_TOKENS:'0'}),/configuration/);
 assert.throws(()=>strategyProviderConfiguration({...local,STRATEGY_REASONING_EFFORT:'unknown'}),/configuration/);
});
test('bookkeeping composition does not require AI credentials or a Directus reader',async()=>{
 const previous={...process.env};
 try{process.env.STRATEGY_ENABLED='1';process.env.BETTER_DATABASE_URL=local.BETTER_DATABASE_URL;delete process.env.OPENROUTER_API_KEY;delete process.env.STRATEGY_DIRECTUS_READER_TOKEN;const runtime=await getStrategyRecoveryRuntime();assert.ok(runtime.outboxDispatcher.dispatchOne);await closeStrategyWorkerRuntime();}
 finally{for(const key of Object.keys(process.env))if(!(key in previous))delete process.env[key];Object.assign(process.env,previous);}
});
