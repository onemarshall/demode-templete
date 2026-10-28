<script lang="ts">
 import { untrack, onMount } from 'svelte';
 import { replaceState } from '$app/navigation';
 import Stepper from '#lib/modules/strategy/components/Stepper.svelte';
 import M04FieldEditor from '#lib/modules/strategy/components/M04FieldEditor.svelte';
 import { FIELD_DEFINITIONS } from '#lib/modules/strategy/shared/fields/m04.js';
 import type { PageData } from './$types';
 let {data}:{data:PageData}=$props();
 type Session={sessionId:string;revision:number;stage:string;status:string;data:Record<string,unknown>;drafts:Record<string,unknown>;confirmations:Record<string,unknown>;presented?:{hash:string}|null;seal?:unknown;history?:{action?:string;stage?:string;messages?:{role:string;content:string}[];candidateProvided?:boolean;model?:string;methodRelease?:string;sourceHash?:string;at?:string}[]};
 const keys:Record<string,string>={context:'context','conviction-cost':'convictionCost','market-readiness':'marketReadiness','human-load':'humanLoad','financial-grounding':'financialGrounding','awareness-and-weighing':'awareness',recommendation:'recommendation','human-decision':'decision'};
 const names=[...Object.keys(keys),'checks','sealed'];
 const steps=names.map(name=>({label:FIELD_DEFINITIONS[name]?.label??name}));
 let initial=untrack(()=>data.initial) as {upstreamCurrent?:boolean;session?:Session;sessions?:{id:string;revision:number;payload:unknown}[];checks?:unknown;documents?:{id:string;versionId:string;kind:string;contentHtml?:string;hash?:string}[]};
 let session=$state<Session|null>(initial.session??null);
 let upstreamCurrent=$state(initial.upstreamCurrent!==false);
 let sessions=$state(initial.sessions??[]);
 let viewStep=$state(initial.session?Math.max(0,names.indexOf(initial.session.stage)):0);
 let draft=$state<Record<string,unknown>>({});
 let message=$state('');let busy=$state(false);let hydrated=$state(false);onMount(()=>{hydrated=true;const id=new URL(location.href).searchParams.get('jobId');if(id)void pollJob(id);});
 let chatInput=$state('');let chatLines=$state<{role:string;content:string}[]>([]);
 let pendingCreate:string|null=null;
 let reason=$state('');let owner=$state('m03');let finding=$state('');let changedPremise=$state('');
 let checks=$state<{id:string;passed:boolean;detail:string}[]>((initial.checks??[]) as {id:string;passed:boolean;detail:string}[]);
 let pendingJob=$state<string|null>(null);
 const statusLabels:Record<string,string>={draft:'In progress','revision-requested':'Revision requested','dependency-return':'Returned for upstream review','adjustment-return':'Returned for adjustment',sealed:'Sealed',approved:'Approved'};
 let documents=$state(initial.documents??[]);
 const stage=$derived(names[viewStep]);
 const activeStep=$derived(session?names.indexOf(session.stage):0);
 const confirmedStage=$derived(Boolean(session?.confirmations[stage]));
 const candidateProvenance=$derived([...(session?.history??[])].reverse().find(item=>(item.action==='model-draft'||(item.action==='chat-turn'&&item.candidateProvided))&&item.stage===stage));
 const hasSavedDraft=$derived(Boolean(session?.drafts[stage]));
 function edit(value:Record<string,unknown>) {
  if(stage==='human-decision') {
   const authorising=value.response==='accept'||value.response==='override';
   value={...value,memoHash:session?.presented?.hash??'',allowedOutputs:authorising&&value.path==='proceed-informed'?['M04 hypothesis analysis only']:authorising&&value.path==='accept-constraint'&&value.reducedName?[`reduced-${value.reducedName}`]:[]};
  }
  draft=value;
 }
 $effect(()=>{if(session){edit(structuredClone($state.snapshot((session.drafts[stage]??session.data[keys[stage]]??{}) as Record<string,unknown>)));chatLines=(session.history??[]).filter(item=>item.action==='chat-turn'&&item.stage===stage).flatMap(item=>item.messages??[]);}});
 async function load(id:string) {
  const url=new URL(location.href);url.searchParams.set('sessionId',id);url.searchParams.delete('jobId');
  const response=await fetch(url,{headers:{accept:'application/json'}});const result=await response.json();
  if(!response.ok)throw new Error(result.error);if(session?.sessionId!==id)pendingJob=null;replaceState(url,{});session=result.session;upstreamCurrent=result.upstreamCurrent!==false;checks=result.checks;documents=result.documents??[];viewStep=Math.max(0,names.indexOf(result.session.stage));
 }
 async function pollJob(id:string) {
  busy=true;pendingJob=id;message='Preparing your suggestion…';
  try {
   const url=new URL(location.href);url.searchParams.set('jobId',id);replaceState(url,{});
   const watchUntil=Date.now()+90000;
   let attempt=0;while(Date.now()<watchUntil){
    const response=await fetch(url,{headers:{accept:'application/json'}});const job=await response.json();
    if(!response.ok)throw new Error(job.error);
    if(job.status==='succeeded'){await load(job.sessionId);pendingJob=null;message='Suggestion ready for your review.';return true;}
    if(job.status==='failed'||job.status==='cancelled'){pendingJob=null;throw new Error('Draft preparation stopped. Your confirmed work is unchanged.');}
    await new Promise(resolve=>setTimeout(resolve,attempt++<10?1500:3000));
   }
   message='Draft preparation is still running. Your saved work is safe. Check progress again or return to this page later.';
  }catch(e){message=e instanceof Error?e.message:'Unable to check draft progress';}finally{busy=false;}
  return false;
 }
 async function run(action:string) {
  busy=true;message='';
  try {
   let body:Record<string,unknown>={action};
   if(action==='create'){pendingCreate??=crypto.randomUUID();body.commandId=pendingCreate;}
   if(action!=='create')body={...body,sessionId:session!.sessionId,expectedRevision:session!.revision,commandId:crypto.randomUUID()};
   if(['save','confirm','revise'].includes(action))body={...body,stage,payload:draft};
   if(action==='draft')body={...body,stage};
   if(action==='chat')body={...body,stage,message:chatInput.trim()||null};
   if(action==='decide')body={...body,payload:draft};
   if(action==='successor')body={...body,reason};
   if(action==='return')body={...body,owner,finding,changedPremise};
   const response=await fetch(location.pathname,{method:'POST',headers:{'content-type':'application/json',accept:'application/json'},body:JSON.stringify(body)});
   const result=await response.json();if(!response.ok)throw new Error(result.error);
   if((action==='draft'||action==='chat')&&result.jobId){const ready=await pollJob(result.jobId);if(action==='chat'&&ready)chatInput='';return;}
   if(action==='create')pendingCreate=null;
   if(action==='chat'){chatLines=result.messages;chatInput='';await load(result.session.id);}else await load(result.id);message='Saved.';
  }catch(e){message=e instanceof Error?e.message:'Unable to save';}finally{busy=false;}
 }
 async function select(id:string){busy=true;try{await load(id);}catch(e){message=e instanceof Error?e.message:'Unable to load';}finally{busy=false;}}
</script>
<main class="mx-auto max-w-5xl space-y-6 p-6">
 <h1 class="text-2xl font-semibold">Viability check</h1>
 <p>Working in this brand’s engagement. Decisions and approvals use your authenticated authority.</p>
 {#if message}<p role="status">{message}</p>{/if}
 {#if pendingJob}<button disabled={busy||!hydrated} onclick={()=>pollJob(pendingJob!)}>Check suggested draft progress</button>{/if}
 <div class="flex flex-wrap gap-3">
  <button disabled={busy||!hydrated} onclick={()=>run('create')}>Start a new check</button>
  {#each sessions as item}<button disabled={busy||!hydrated} onclick={()=>select(item.id)}>Open check · revision {item.revision}</button>{/each}
 </div>
 {#if session}
  {#if !upstreamCurrent}<p role="alert" class="rounded border p-3">The approved source documents for this check have changed. Start a new check from the current sources; this record remains available for its history.</p>{/if}
  <p>{statusLabels[session.status]??session.status.replaceAll('-',' ')} · revision {session.revision}</p>
  <Stepper {steps} bind:viewStep {activeStep} stepDone={names.map(n=>!!session?.confirmations[n]||(n==='sealed'&&!!session?.seal))} canVisit={(i:number)=>i<=activeStep} runLabel="Viability check progress" />
  {#if FIELD_DEFINITIONS[stage]}
   <section class="space-y-4 rounded border p-4">
    <h2 class="text-xl">{FIELD_DEFINITIONS[stage].label}</h2>
    <p>{FIELD_DEFINITIONS[stage].purpose}</p>
    {#if confirmedStage}<p class="rounded border p-3" role="status"><strong>Confirmed record.</strong> This step is read-only. Reopen it to make changes.</p>
    {:else if candidateProvenance}<p class="rounded border p-3"><strong>Suggested candidate.</strong> Review and confirm this suggestion yourself.</p><details><summary>Draft source details</summary><p>Model: {candidateProvenance.model??'configured model'}{#if candidateProvenance.methodRelease} · Method version: {candidateProvenance.methodRelease}{/if}{#if candidateProvenance.sourceHash} · Uses this check’s pinned source bundle{/if}.</p></details>
    {:else if hasSavedDraft}<p class="rounded border p-3"><strong>Saved working draft.</strong> This has not been confirmed.</p>{/if}
    <fieldset disabled={!hydrated||confirmedStage||Boolean(session.seal)}><legend class="sr-only">{FIELD_DEFINITIONS[stage].label} fields</legend><M04FieldEditor fields={FIELD_DEFINITIONS[stage].fields} value={draft} onChange={edit}/></fieldset>
    {#if stage==='human-decision' && session.data.recommendation}
     <section class="space-y-2 rounded border p-4" aria-labelledby="presented-recommendation-title">
      <h3 id="presented-recommendation-title" class="text-lg font-medium">Exact recommendation for human review</h3>
      <p>Review this saved recommendation before presenting it and recording a separate decision.</p>
      <pre class="max-h-[36rem] overflow-auto whitespace-pre-wrap rounded bg-muted p-3 text-sm">{JSON.stringify(session.data.recommendation,null,2)}</pre>
      {#if session.presented}<p>Presented version hash: <code>{session.presented.hash}</code></p>{:else}<p>This recommendation has not yet been presented.</p>{/if}
     </section>
    {/if}
    {#if !session.seal}
     {#if !confirmedStage&&!['recommendation','human-decision'].includes(stage)}<section><h3>Guided conversation</h3>{#each chatLines as line}<p><strong>{line.role}:</strong> {line.content}</p>{/each}<label>Your response <textarea bind:value={chatInput}></textarea></label><button disabled={busy||!hydrated||Boolean(pendingJob)} onclick={()=>run('chat')}>{chatLines.length?'Send response':'Begin conversation'}</button></section>{/if}
     <div class="flex flex-wrap gap-3">
      {#if !confirmedStage}<button disabled={busy||!hydrated||Boolean(pendingJob)} onclick={()=>run('save')}>Save draft</button>
      {#if stage!=='human-decision'}<button disabled={busy||!hydrated||Boolean(pendingJob)} onclick={()=>run('draft')}>Suggest a draft</button><button disabled={busy||!hydrated||Boolean(pendingJob)} onclick={()=>run('confirm')}>Confirm this step</button>
      {:else}<button disabled={busy||!hydrated||Boolean(pendingJob)} onclick={()=>run('present')}>Present exact recommendation</button><button disabled={busy||!hydrated||Boolean(pendingJob)||!session.presented} onclick={()=>run('decide')}>Record human decision</button>{/if}{/if}
      {#if session.confirmations[stage]}<button disabled={busy||!hydrated||Boolean(pendingJob)} onclick={()=>run('revise')}>Reopen this step</button>{/if}
     </div>
    {/if}
   </section>
  {/if}
  {#if stage==='checks'||session.seal}<section><h2>Quality checks</h2><ul>{#each checks as check}<li><strong>{check.passed?'Passed':'Needs attention'}</strong> — {check.detail||check.id.replaceAll('-',' ')}</li>{/each}</ul>{#if !session.seal}<button disabled={busy||!hydrated} onclick={()=>run('seal')}>Approve and seal immutable version</button>{/if}</section>{/if}
  {#if session.seal}<section class="space-y-6"><h2>Sealed documents</h2>{#each documents.filter(document=>document.kind==='viability-check') as document}<article class="prose max-w-none" aria-label="Saved viability document" data-document-id={document.id}>{@html document.contentHtml??''}</article><p><a href={`./viability-check/handoff?sessionId=${session.sessionId}&versionId=${document.versionId}&documentId=${document.id}`}>Download viability check as Markdown</a></p>{/each}</section><section><h2>Create a successor</h2><label>Reason <input bind:value={reason}/></label><button disabled={busy||!hydrated||!reason.trim()} onclick={()=>run('successor')}>Create successor</button></section>
  {:else}<details><summary>Return an issue upstream</summary><label>Owner <select bind:value={owner}><option value="entry">Engagement entry</option><option value="m01">M01</option><option value="m02">M02</option><option value="m03">M03</option></select></label><label>Finding <textarea bind:value={finding}></textarea></label><label>Changed premise <textarea bind:value={changedPremise}></textarea></label><button disabled={busy||!hydrated||!finding.trim()||!changedPremise.trim()} onclick={()=>run('return')}>Record upstream return</button></details>{/if}
 {/if}
</main>
