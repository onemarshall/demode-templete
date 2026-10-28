/** Provider failure and revoked-authority tests through actual task-handler processes. */
import {readFile,writeFile,rm} from 'node:fs/promises';import {resolve} from 'node:path';import {randomUUID} from 'node:crypto';import {Pool} from 'pg';import {request} from '@playwright/test';import {spawnSync} from 'node:child_process';import {readConnection,integrationState} from './local-stack';
const config=await readConnection();const read=async(n:string)=>JSON.parse(await readFile(resolve(integrationState,n),'utf8'));const fixture=await read('test.json'),target=await read('browser-target.json');const pool=new Pool({connectionString:config.databaseUrl});
const api=await request.newContext({baseURL:fixture.appUrl,storageState:await read('browser-state.json'),extraHTTPHeaders:{origin:fixture.appUrl,accept:'application/json'}});
const controls=process.env.STRATEGY_TEST_CONTROL_DIR??integrationState;let count=0;const check=(v:unknown,label:string)=>{if(!v)throw new Error(label);count++};
const toggle=async(n:string,on:boolean)=>on?writeFile(resolve(controls,n),JSON.stringify({enabled:true}),{mode:0o600}):rm(resolve(controls,n),{force:true});
const post=async(data:unknown)=>{const r=await api.post(target.base,{data});check(r.ok(),`Command rejected ${r.status()}`);return r.json()};
try{
 await pool.query('UPDATE strategy_access_grant SET revoked_at=NULL WHERE id=$1',[fixture.grantId]);
 let session=await post({action:'create',commandId:randomUUID()});await toggle('provider-failure.json',true);
 let job=await post({action:'draft',sessionId:session.id,expectedRevision:session.revision,commandId:randomUUID(),stage:'context'});
 let state;for(let i=0;i<80;i++){state=(await pool.query('SELECT status FROM strategy_job WHERE id=$1',[job.jobId])).rows[0]?.status;if(state==='failed')break;await new Promise(r=>setTimeout(r,500));}check(state==='failed','Provider failure was recorded');
 let record=await api.get(`${target.base}?sessionId=${session.id}`);let loaded=await record.json();check(loaded.session.revision===session.revision&&JSON.stringify(loaded.session.drafts)===JSON.stringify(session.payload.drafts),'Provider failure cannot publish a draft');await toggle('provider-failure.json',false);
 session=await post({action:'create',commandId:randomUUID()});await toggle('pause-delivery.json',true);
 job=await post({action:'draft',sessionId:session.id,expectedRevision:session.revision,commandId:randomUUID(),stage:'context'});await pool.query('UPDATE strategy_access_grant SET revoked_at=now() WHERE id=$1',[fixture.grantId]);
 const before=JSON.parse(await readFile(resolve(controls,'http-contract-metrics.json'),'utf8')).providerRequests;
 const env=await read('runtime-env.json');const result=spawnSync('node',[resolve(controls,'worker.mjs'),job.jobId],{cwd:process.cwd(),env:{...process.env,...env},encoding:'utf8'});check(result.status!==0,'Task handler rejects a revoked initiating principal');
 const after=JSON.parse(await readFile(resolve(controls,'http-contract-metrics.json'),'utf8')).providerRequests;check(before===after,'Revoked principal cannot make a provider call');
 check((await pool.query('SELECT status FROM strategy_job WHERE id=$1',[job.jobId])).rows[0].status==='pending','Rejected execution cannot claim the job');
 await writeFile(resolve(integrationState,'worker-faults-result.json'),JSON.stringify({passed:true,assertions:count,at:new Date().toISOString()},null,2),{mode:0o600});console.log(`PASS: ${count} provider failure and revoked task-authority assertions.`);
}finally{await toggle('provider-failure.json',false);await toggle('pause-delivery.json',false);await pool.query('UPDATE strategy_access_grant SET revoked_at=now() WHERE id=$1',[fixture.grantId]);await api.dispose();await pool.end()}
