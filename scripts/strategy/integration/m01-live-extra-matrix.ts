/** One separately approved correction after the original ten-request test budget.
 * The proxy must use a NEW named ledger capped at one; the original ledger stays exhausted.
 * This script never edits generated content and never approves or seals a document.
 */
import {readFile,writeFile,rename} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {randomUUID,createHash} from 'node:crypto';
import {Pool} from 'pg';
import {request} from '@playwright/test';
import {readConnection,integrationState} from './local-stack';
const canonical=(value:any):string=>Array.isArray(value)?'['+value.map(canonical).join(',')+']':value&&typeof value==='object'?'{'+Object.keys(value).sort().map(key=>JSON.stringify(key)+':'+canonical(value[key])).join(',')+'}':JSON.stringify(value);
const m01LiveHash=(value:unknown)=>createHash('sha256').update(canonical(value)).digest('hex');
const requireRealTriggerRun=(value:unknown)=>{if(typeof value!=='string'||!/^run_[A-Za-z0-9_-]+$/.test(value)||value.startsWith('run_local_'))throw Error('Real development Trigger run required');return value};
const args=process.argv.slice(2);
if(args.length!==1||!['--start-approved-one','--resume'].includes(args[0]))throw Error('Use --start-approved-one only after explicit additional approval, or --resume');
const run='founder-conviction-20261029';const directory=resolve(integrationState,'m01-live',run);
const cp=JSON.parse(await readFile(join(directory,'checkpoint.json'),'utf8'));
if(cp.callBudget!==10||cp.reservedCalls!==10||cp.nextOperation!==8||cp.sealedVersionId||Object.keys(cp.confirmations).length)throw Error('Requires completed, reviewed, unapproved original ten-request test');
const connection=await readConnection();const test=JSON.parse(await readFile(resolve(integrationState,'test.json'),'utf8'));
if(test.appUrl!=='http://127.0.0.1:5188'||!String(cp.base).includes(cp.engagementId))throw Error('Wrong local fixture');
const path=join(directory,'extra-matrix.json');const pool=new Pool({connectionString:connection.databaseUrl});const api=await request.newContext({baseURL:test.appUrl,extraHTTPHeaders:{origin:test.appUrl,accept:'application/json'}});
const save=async(value:unknown)=>{const temp=path+'.'+randomUUID()+'.tmp';await writeFile(temp,JSON.stringify(value,null,2),{mode:0o600,flag:'wx'});await rename(temp,path)};
try{
 const login=await api.post('/api/auth/sign-in/email',{data:{email:test.email,password:test.password}});if(!login.ok())throw Error('Synthetic sign-in failed');
 const readSession=async()=>{const response=await api.get(cp.base+'?sessionId='+cp.sessionId);if(!response.ok())throw Error('Session read failed');return(await response.json()).session};
 let receipt:any;try{receipt=JSON.parse(await readFile(path,'utf8'));if(args[0]!=='--resume')throw Error('Extra request exists; resume its exact command');}catch(error){if(!(error instanceof Error&&'code'in error&&error.code==='ENOENT'))throw error;if(args[0]!=='--start-approved-one')throw Error('No extra request checkpoint');const current=await readSession();if(current.seal||!current.setTwoDraft)throw Error('Wrong test phase');receipt={version:1,runName:run,separatelyApprovedMaximum:1,baseBudgetUsed:10,status:'reserved',commandId:randomUUID(),inputRevision:current.revision,preservedDerivedHash:m01LiveHash(current.setTwoDraft),createdAt:new Date().toISOString()};await save(receipt)}
 const scope=[cp.organisationId,cp.brandId,cp.engagementId,cp.sessionId];
 let job=(await pool.query('SELECT id,status,provider_run_id FROM strategy_job WHERE organisation_id=$1 AND brand_id=$2 AND engagement_id=$3 AND session_id=$4 AND command_id=$5',[...scope,receipt.commandId])).rows[0];
 if(!job){const current=await readSession();if(current.revision!==receipt.inputRevision)throw Error('Input revision changed before extra request');const response=await api.post(cp.base,{data:{action:'revise-matrix',sessionId:cp.sessionId,expectedRevision:receipt.inputRevision,commandId:receipt.commandId,note:'The current boundary lists are 5/5/5 and fail the existing strict-largest Can Claim gate. The transcript supports distinct statements about the Friday promise, uncertainty, named ownership, updates, refusal rules, limits and first impressions. Preserve distinct supported statements as separate entries instead of merging unrelated points. Keep all fictional qualifiers and genuine limitations; never invent, pad or move unsupported claims merely to satisfy counts. Check final list lengths and finish every sentence.'}});if(!response.ok())throw Error('Extra enqueue rejected: '+response.status());job={id:(await response.json()).jobId};if(!job.id)throw Error('No persisted job returned');}
 receipt.jobId=job.id;await save(receipt);
 const until=Date.now()+1_100_000;
 while(Date.now()<until){const row=(await pool.query('SELECT status,provider_run_id FROM strategy_job WHERE organisation_id=$1 AND brand_id=$2 AND engagement_id=$3 AND session_id=$4 AND id=$5',[...scope,receipt.jobId])).rows[0];if(!row)throw Error('Missing scoped job');if(row.provider_run_id)receipt.providerRunId=requireRealTriggerRun(row.provider_run_id);receipt.status=row.status;await save(receipt);if(['failed','cancelled'].includes(row.status))throw Error('Extra matrix request ended '+row.status+'; no automatic retry');if(row.status==='succeeded'){
  requireRealTriggerRun(receipt.providerRunId);const revision=(await pool.query('SELECT command_input,payload_text,revision FROM strategy_revision WHERE organisation_id=$1 AND brand_id=$2 AND engagement_id=$3 AND session_id=$4 AND revision=$5',[...scope,receipt.inputRevision+1])).rows[0];if(!revision)throw Error('No committed correction revision');const command=typeof revision.command_input==='string'?JSON.parse(revision.command_input):revision.command_input;if(command.operation!=='revise-matrix'||command.commandId!==receipt.commandId)throw Error('Wrong correction command');const saved=JSON.parse(revision.payload_text);const current=await readSession();if(m01LiveHash(saved.outputs)!==m01LiveHash(current.outputs)||m01LiveHash(saved.setTwoDraft)!==receipt.preservedDerivedHash)throw Error('Correction readback or derived content mismatch');receipt.status='review-ready';receipt.completedRevision=revision.revision;receipt.candidateHash=m01LiveHash(saved.outputs);receipt.candidate=saved.outputs;await save(receipt);console.log(JSON.stringify({status:'awaiting-extra-matrix-review',review:path,candidateHash:receipt.candidateHash,providerRunId:receipt.providerRunId,paidRequestsMaximum:11}));break;
 }await new Promise(r=>setTimeout(r,2000));}
 if(receipt.status!=='review-ready')throw Error('Timed out; resume the same correction command');
}finally{await api.dispose();await pool.end()}
