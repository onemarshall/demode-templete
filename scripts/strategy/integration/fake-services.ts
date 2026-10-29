/** Loopback provider and delivery contract servers; no cloud or model spend. */
import {readFile,writeFile} from 'node:fs/promises';
import {openSync,closeSync} from 'node:fs';
import {resolve} from 'node:path';
import {spawn} from 'node:child_process';
import {randomUUID} from 'node:crypto';
import {readConnection,integrationState} from './local-stack';
import {m01Plan,m01Outputs,m01SetTwo} from '../../../tests/strategy/fixtures/m01';
await readConnection();
const env=JSON.parse(await readFile(resolve(integrationState,'runtime-env.json'),'utf8'));
const fixture=JSON.parse(await readFile(resolve(integrationState,'fixture.json'),'utf8'));
const source=JSON.parse(await readFile(resolve(integrationState,'source.json'),'utf8'));
const jobs=new Map<string,string>();const metrics={providerRequests:0,deliveryRequests:0,workerStarts:0,stages:[] as string[]};
async function save(){await writeFile(resolve(integrationState,'http-contract-metrics.json'),JSON.stringify(metrics),{mode:0o600});}
const provider=Bun.serve({hostname:'127.0.0.1',port:8134,maxRequestBodySize:4_000_000,async fetch(request){
 if(request.headers.get('authorization')!==`Bearer ${env.OPENROUTER_API_KEY}`)return new Response(null,{status:401});
 const body=await request.json() as any;
 const contract=body.response_format?.json_schema?.name;
 if(String(contract).startsWith('m02_')){
  const drafts=JSON.parse(await readFile(resolve(integrationState,'m02-draft-fixture.json'),'utf8'));
  const gate=String(contract).slice(4);if(!drafts[gate])return new Response('Unsupported synthetic M02 gate',{status:400});
  metrics.providerRequests++;metrics.stages.push(contract);await save();
  return Response.json({choices:[{message:{content:JSON.stringify(drafts[gate])},finish_reason:'stop'}],usage:{prompt_tokens:1,completion_tokens:1}});
 }
 if(String(contract).startsWith('m01_')){
  const output=m01Outputs(); const values:Record<string,unknown>={m01_intake_plan:m01Plan(),m01_interview_reply:{say:'Synthetic interview question: what did that silence cost you?'},m01_conviction_outputs:{...output.outputs,factsAnchor:output.factsAnchor.items,publicRecordReadiness:output.publicRecordReadiness},m01_anchor_revision:{sentence:output.outputs.anchors[0].sentence},m01_manifesto_revision:{manifesto:output.outputs.manifesto},m01_matrix_revision:{evidenceMatrix:output.outputs.evidenceMatrix,claimsBoundaryInputs:output.outputs.claimsBoundaryInputs},m01_set_two_draft:m01SetTwo()};
  if(!values[contract])return new Response('Unsupported synthetic contract',{status:400});
  metrics.providerRequests++;metrics.stages.push(contract);await save();
  return Response.json({choices:[{message:{content:JSON.stringify(values[contract])},finish_reason:'stop'}],usage:{prompt_tokens:1,completion_tokens:1}});
 }
 if(String(body.messages?.[0]?.content).startsWith('You are the viability adviser inside a Langfell Viability Check')){metrics.providerRequests++;metrics.stages.push('chat');await save();return Response.json({choices:[{message:{content:JSON.stringify({say:'Synthetic adviser response for this disposable test.',complete:false})},finish_reason:'stop'}],usage:{prompt_tokens:1,completion_tokens:1}});}
 const match=String(body.messages?.[0]?.content).match(/Generate only the requested stage ([\w-]+) as JSON/);
 const stage=match?.[1];const supplied=JSON.parse(body.messages?.[1]?.content??'{}');
 if(!stage||!fixture.candidates[stage]||JSON.stringify(supplied.sourceBundle)!==JSON.stringify(source.chain))return new Response('Synthetic source required',{status:400});
 metrics.providerRequests++;metrics.stages.push(stage);await save();
 let failure:any;try{failure=JSON.parse(await readFile(resolve(integrationState,'provider-failure.json'),'utf8'));}catch{}
 if(failure?.enabled)return Response.json({error:'Synthetic provider failure'},{status:503});
 return Response.json({choices:[{message:{content:JSON.stringify(fixture.candidates[stage])},finish_reason:'stop'}],usage:{prompt_tokens:1,completion_tokens:1}});
}});
const delivery=Bun.serve({hostname:'127.0.0.1',port:8135,maxRequestBodySize:100_000,async fetch(request){
 const taskPath=new URL(request.url).pathname; const m01=taskPath==='/api/v1/tasks/auth-strategy-m01-session-v1/trigger',m02=taskPath==='/api/v1/tasks/auth-strategy-m02-session-v1/trigger';
 if(!m01&&!m02&&taskPath!=='/api/v1/tasks/auth-strategy-m04-session-v2/trigger')return new Response(null,{status:404});
 if(request.headers.get('authorization')!==`Bearer ${env.TRIGGER_SECRET_KEY}`)return new Response(null,{status:401});
 const body=await request.json() as any;const packet=typeof body.payload==='string'?JSON.parse(body.payload):body.payload;const payload=body.options?.payloadType==='application/super+json'?packet.json:packet;
 if(payload?.version!==1||!/^[0-9a-f-]{36}$/i.test(payload.jobId))return new Response(null,{status:400});
 metrics.deliveryRequests++;const key=String(body.options?.idempotencyKey??request.headers.get('idempotency-key')??randomUUID());
 let runId=jobs.get(key);if(!runId){runId=`run_local_${randomUUID().replaceAll('-','')}`;jobs.set(key,runId);
  let paused=false;try{paused=JSON.parse(await readFile(resolve(integrationState,'pause-delivery.json'),'utf8')).enabled===true;}catch{}
  if(!paused){const fd=openSync(resolve(integrationState,'worker.log'),'a',0o600);try{const child=spawn('node',[resolve(integrationState,'worker.mjs'),payload.jobId,...(m02?['--m02']:m01?['--m01']:[])],{cwd:process.cwd(),env:{PATH:process.env.PATH,HOME:process.env.HOME,TMPDIR:process.env.TMPDIR,...env},stdio:['ignore',fd,fd]});child.on('error',()=>{});child.unref();metrics.workerStarts++;}finally{closeSync(fd)}}
 }
 await save();return Response.json({id:runId},{headers:{'x-trigger-jwt':'synthetic-token'}});
}});
await save();console.log('Loopback provider8134 and delivery8135 contract services ready.');
process.on('SIGTERM',()=>{provider.stop();delivery.stop();process.exit(0)});
