/** Build a new local integration database; never reads the host application's live env. */
import {readConnection,integrationState} from './local-stack';
import {mkdir,readFile,writeFile,chmod,rm} from 'node:fs/promises';
import {randomUUID,randomBytes} from 'node:crypto';
import {resolve} from 'node:path';
import {spawnSync} from 'node:child_process';
const config=await readConnection();
const appUrl='http://127.0.0.1:5188';
const environment={NODE_ENV:'development',BETTER_DATABASE_URL:config.databaseUrl,BETTER_AUTH_SECRET:randomBytes(32).toString('hex'),PUBLIC_SITE_URL:appUrl,PUBLIC_BETTER_AUTH_URL:appUrl,PUBLIC_AUTH_CALLBACK_URL:appUrl,PUBLIC_APP_NAME:'Strategy integration',EMAIL_PROVIDER:'mock',EMAIL_FROM:'noreply@example.com',CMS_PROVIDER:'directus',PUBLIC_CMS_URL:config.directusUrl,DIRECTUS_URL:config.directusUrl,DIRECTUS_ADMIN_TOKEN:config.adminToken,AUTH_ORGANIZATION_PLUGIN:'true',PUBLIC_AUTH_ADMIN_PLUGIN:'true',PUBLIC_CREEM_ENABLED:'false',CAPTCHA:'false',AUTH_SECURITY_PLUGIN:'false',AUTH_GEO_INTELLIGENCE_PLUGIN:'false',ENABLE_SECURITY_ANALYSIS:'false',OPENROUTER_API_KEY:'local-provider-test',STRATEGY_PROVIDER_URL:'http://127.0.0.1:8134/chat/completions',STRATEGY_PROVIDER_TIMEOUT_MS:'10000',TRIGGER_SECRET_KEY:'tr_dev_synthetic_local',TRIGGER_API_URL:'http://127.0.0.1:8135',AUTH_PASSKEYS_PLUGIN:'false',PUBLIC_AUTH_PASSKEYS_PLUGIN:'false',AUTH_2FA_PLUGIN:'false',PUBLIC_AUTH_2FA_PLUGIN:'false',AUTH_MAGIC_LINK_PLUGIN:'false',AUTH_EMAIL_OTP_PLUGIN:'false',AUTH_OAUTH_PROXY_PLUGIN:'false',STRATEGY_ENABLED:'1',STRATEGY_INTEGRATION_TEST_MODE:'1',STRATEGY_DIRECTUS_URL:config.directusUrl,STRATEGY_DIRECTUS_READER_TOKEN:config.readerToken,APP_LOGGER_DISABLED:'true',REDIS_URL:'',SECURITY_STORAGE:'postgres',PG_KV_STORE:'true',WRANGLER_LOG_PATH:resolve(integrationState,'wrangler.log')};
Object.assign(process.env,environment);
const {default:auth}=await import('../../../scripts/auth-cli');
auth.options.advanced={...auth.options.advanced,database:{...auth.options.advanced?.database,validateSchema:false}};
const {getMigrations}=await import('better-auth/db/migration');
const migrations=await getMigrations(auth.options);
if(migrations.unsafeChanges.length||migrations.schemaProblems.length)throw new Error('Unexpected Auth migration differences in disposable database');
await migrations.runMigrations();
await (auth.options.database as import('pg').Pool).end();
const migrated=spawnSync(process.execPath,[resolve('scripts/database/migrate.ts')],{cwd:process.cwd(),env:environment,encoding:'utf8'});
await writeFile(resolve(integrationState,'migration.log'),migrated.stdout+'\n'+migrated.stderr,{mode:0o600});
if(migrated.status!==0)throw new Error('Application migrations failed; see private migration log');
const grantId=randomUUID(),engagementId=randomUUID(),folder=`test-m04-auth-${randomUUID().slice(0,8)}`;
const legacyRoot=process.env.STRATEGY_LEGACY_FIXTURE_ROOT;
if(!legacyRoot)throw new Error('STRATEGY_LEGACY_FIXTURE_ROOT must identify the retained test fixture source');
const before=process.cwd();let source,candidates;const actor={name:'Synthetic test owner',role:'test fixture owner',authorityRef:grantId};
try {
 process.chdir(legacyRoot);
 const {createSyntheticM04Chain}=await import(resolve(legacyRoot,'src/lib/server/m04-synthetic-chain-fixture.ts'));
 const {createM04,hashM04}=await import(resolve(legacyRoot,'src/lib/modules/strategy/server/stages/m04/session.ts'));
 const {pilotPayload}=await import(resolve(legacyRoot,'src/lib/server/m04-pilot-fixture.ts'));
 const generated=await createSyntheticM04Chain(folder,actor);source=generated.check;
 const session=createM04(source,actor);candidates={};
 for(const stage of ['context','conviction-cost','market-readiness','human-load','financial-grounding','awareness-and-weighing','recommendation']) {
  const candidate=pilotPayload(stage,session);
  if(stage==='context'){candidate.decisionOwner=actor.name;candidate.authorityRef=grantId;candidate.ownerRole=actor.role;}
  candidates[stage]=candidate;
  const keys={'conviction-cost':'convictionCost','market-readiness':'marketReadiness','human-load':'humanLoad','financial-grounding':'financialGrounding','awareness-and-weighing':'awareness'};
  session.data[keys[stage]??stage]=candidate;
 }
 await writeFile(resolve(before,integrationState,'fixture.json'),JSON.stringify({syntheticFolder:folder,sourceHash:hashM04(source.chain),candidates}),{mode:0o600});
} finally {process.chdir(before);await rm(resolve(legacyRoot,'04-Brand-Operating-Systems',folder),{recursive:true,force:true});}
await writeFile(resolve(integrationState,'source.json'),JSON.stringify(source),{mode:0o600});
await writeFile(resolve(integrationState,'runtime-env.json'),JSON.stringify(environment),{mode:0o600});
await writeFile(resolve(integrationState,'test.json'),JSON.stringify({grantId,engagementId,actor,folder,appUrl,email:`strategy-e2e-${randomUUID().slice(0,8)}@example.com`,password:`Synthetic.test.${randomBytes(16).toString('hex')}`}),{mode:0o600});
console.log('Isolated Auth and Strategy migrations applied; synthetic source and private runtime configuration prepared.');
