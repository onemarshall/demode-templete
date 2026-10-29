<script lang="ts">
  import { onMount, untrack } from 'svelte';
  import { replaceState } from '$app/navigation';
  import Stepper from '#lib/modules/strategy/components/Stepper.svelte';
  import StageFieldEditor from '#lib/modules/strategy/components/StageFieldEditor.svelte';
  import { BF_STAGE_DEFINITIONS } from '#lib/modules/strategy/shared/fields/bf.js';
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();

  type Loaded = {
    session: any; checks: { id: string; passed: boolean; detail: string }[]; gate: any;
    upstreamCurrent: boolean; sealCheck: any; review: any; rendered: string | null; documents: any[];
  };
  const initial = untrack(() => data.initial) as { session?: any; sessions?: any[]; sourceReady?: boolean };
  let sessions = $state(initial.sessions ?? []);
  let record = $state<Loaded | null>(initial.session ? (initial as Loaded) : null);
  let sourceReady = $state(initial.sourceReady ?? true);
  let busy = $state(false);
  let hydrated = $state(false);
  let message = $state('');
  let viewStep = $state(0);
  let pendingJob = $state<string | null>(null);
  let draft = $state<Record<string, unknown>>({});
  let draftStage = $state('');
  let decision = $state<any>({ response: 'approve', businessConfirmed: false, standConfirmed: false, approverName: '', approverRole: '', approverRef: '', exactResponse: '', revisionNote: '', disputedField: '', returnOwner: null });
  let successorReason = $state('');
  let documents = $state<any[]>(initial.session ? (initial as Loaded).documents ?? [] : []);

  const labels = ['Input assessment', 'Business manifesto', 'Foundation document', 'Client decision', 'Sealed'];
  const stages = ['assessment', 'manifesto', 'document', 'client-decision', 'sealed'];
  const dataStages = ['assessment', 'manifesto', 'document'];
  let activeStep = $derived(record ? Math.max(0, stages.indexOf(record.session.stage)) : 0);
  let canEdit = $derived(Boolean(record && record.session.stage !== 'sealed' && record.upstreamCurrent));
  let currentStage = $derived(record?.session.stage ?? '');
  let isDataStage = $derived(dataStages.includes(currentStage));

  function syncDraft() {
    if (!record) return;
    const stage = record.session.stage;
    if (!dataStages.includes(stage)) return;
    if (draftStage === stage) return;
    const candidate = record.session.drafts?.[stage];
    const confirmed = record.session.data?.[stage];
    draft = structuredClone(candidate ?? confirmed ?? {});
    draftStage = stage;
  }

  $effect(() => {
    const loaded = $state.snapshot(record) as Loaded | null;
    if (!loaded) return;
    documents = loaded.documents ?? [];
    if (loaded.session.data?.approval) {
      const approval = loaded.session.data.approval;
      decision = { ...decision, response: approval.response, businessConfirmed: approval.businessConfirmed, standConfirmed: approval.standConfirmed, approverName: approval.approver?.name ?? '', approverRole: approval.approver?.role ?? '', approverRef: approval.approver?.authorityRef ?? '', exactResponse: approval.exactResponse ?? '' };
    }
    syncDraft();
  });

  onMount(() => {
    hydrated = true;
    const url = new URL(location.href);
    const job = url.searchParams.get('jobId');
    if (job) void pollJob(job, url.searchParams.get('jobAction') ?? 'draft');
  });

  async function readCurrent(id?: string) {
    const url = new URL(location.pathname, location.origin);
    if (id) url.searchParams.set('sessionId', id);
    const response = await fetch(url, { headers: { accept: 'application/json' } });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error ?? 'Unable to load the Business Foundation');
    replaceState(url, {});
    if (id) { record = result; documents = result.documents ?? []; draftStage = ''; viewStep = activeStep; }
    else { sessions = result.sessions ?? []; sourceReady = result.sourceReady; record = null; }
  }

  async function pollJob(id: string, action: string) {
    busy = true; pendingJob = id; message = action === 'draft' ? 'Drafting…' : 'Reviewing the candidate…';
    try {
      const url = new URL(location.pathname, location.origin);
      url.searchParams.set('jobId', id); url.searchParams.set('jobAction', action); url.searchParams.set('sessionId', record!.session.sessionId);
      replaceState(url, {});
      const until = Date.now() + 180000;
      while (Date.now() < until) {
        const response = await fetch(url, { headers: { accept: 'application/json' } });
        const job = await response.json();
        if (!response.ok) throw new Error(job.error ?? 'Unable to check progress');
        if (job.status === 'succeeded') { pendingJob = null; await readCurrent(job.sessionId); message = 'Result loaded. Review it before confirming anything.'; return; }
        if (job.status === 'failed' || job.status === 'cancelled') { pendingJob = null; throw new Error('The job stopped. Your confirmed work is unchanged.'); }
        await new Promise(resolve => setTimeout(resolve, 1800));
      }
      message = 'Still running. Return to this page to check its persisted job.';
    } catch (cause) { message = cause instanceof Error ? cause.message : 'Unable to check progress'; }
    finally { busy = false; }
  }

  async function send(action: string, fields: Record<string, unknown> = {}) {
    if (busy || !hydrated) return;
    busy = true; message = '';
    try {
      const body: Record<string, unknown> = { action, ...fields };
      if (action === 'create') body.commandId = crypto.randomUUID();
      else Object.assign(body, { sessionId: record!.session.sessionId, expectedRevision: record!.session.revision, commandId: crypto.randomUUID() });
      const response = await fetch(location.pathname, { method: 'POST', headers: { 'content-type': 'application/json', accept: 'application/json' }, body: JSON.stringify(body) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? 'Unable to save');
      if (['draft', 'fresh-review', 'recheck'].includes(action) && result.jobId) { busy = false; await pollJob(result.jobId, action); return; }
      if (action === 'create') await readCurrent(result.session?.sessionId ?? result.payload?.sessionId ?? result.id);
      else if (action === 'successor') await readCurrent(result.id);
      else await readCurrent(record!.session.sessionId);
      message = action === 'decide' ? 'Client decision recorded. An approval seals the exact version.' : action === 'successor' ? 'A new editable successor is open.' : 'Saved. The current record has been reloaded.';
    } catch (cause) { message = cause instanceof Error ? cause.message : 'Unable to save'; }
    finally { busy = false; }
  }

  function confirmStage() { void send('confirm', { stage: currentStage, payload: draft }); }
  function saveDraft() { void send('save', { stage: currentStage, payload: draft }); }
  function reviseStage() { void send('revise', { stage: currentStage }); }
  function resolveFinding(id: string, disposition: string, note: string) { void send('resolve-finding', { findingId: id, disposition, note }); }
  function submitDecision() {
    void send('decide', { decision: {
      response: decision.response, businessConfirmed: decision.businessConfirmed, standConfirmed: decision.standConfirmed,
      approver: { name: decision.approverName, role: decision.approverRole, authorityRef: decision.approverRef },
      exactResponse: decision.exactResponse, revisionNote: decision.revisionNote, disputedField: decision.disputedField, returnOwner: decision.returnOwner,
    } });
  }
</script>

<svelte:head><title>Business Foundation · Strategy</title></svelte:head>
<main class="mx-auto max-w-6xl space-y-6 p-6">
  <header class="space-y-2">
    <p class="text-sm text-muted-foreground">Strategy · Business Foundation</p>
    <h1 class="text-3xl font-semibold">Business Foundation</h1>
    <p>The approved definition of the business that later brand work inherits. Every suggestion is an editable candidate; only explicit human confirmations advance the record.</p>
  </header>
  {#if message}<p class="rounded border p-3" role="status">{message}</p>{/if}
  {#if pendingJob}<button disabled={busy || !hydrated} onclick={() => pollJob(pendingJob!, 'draft')}>Check job progress</button>{/if}

  {#if !record}
    <section class="space-y-4 rounded border p-5">
      <h2 class="text-xl font-semibold">Start or reopen a foundation</h2>
      {#if !sourceReady}<p role="status">No eligible sealed viability check is connected yet. Starting will verify and connect the newest sealed M04 outcome.</p>{/if}
      <button disabled={busy || !hydrated} onclick={() => send('create')}>Start from the current sealed viability check</button>
      <div class="flex flex-wrap gap-2">{#each sessions as item (item.id)}<button class="rounded border px-3 py-2" disabled={busy || !hydrated} onclick={async () => { busy = true; try { await readCurrent(item.id); } catch (e) { message = e instanceof Error ? e.message : 'Unable to load'; } finally { busy = false; } }}>Open foundation · revision {item.revision}</button>{/each}</div>
    </section>
  {:else}
    {#if !record.upstreamCurrent}<p class="rounded border border-amber-500 p-3" role="alert">The pinned viability source is no longer current. This record stays readable, but new work cannot continue; start a new checked session.</p>{/if}
    <p class="text-sm">{record.session.stage} · {record.session.status} · revision {record.session.revision} · source {record.session.sourceHash.slice(0, 12)}…</p>

    <section class="rounded border p-3">
      <h2 class="font-semibold">Inheritance checks</h2>
      <ul class="mt-2 space-y-1">{#each record.checks as check (check.id)}<li>{check.passed ? '✓' : '✗'} <strong>{check.id}</strong> — {check.detail}</li>{/each}</ul>
      <p class="mt-2 text-sm">Downstream gate: <strong>{record.gate.downstreamGateState}</strong> · Brand Strategy permission: {record.gate.m05Permission}</p>
    </section>

    <Stepper steps={labels.map(label => ({ label }))} bind:viewStep {activeStep} stepDone={labels.map((_, index) => index < activeStep || (index === 4 && !!record?.session.seal))} canVisit={(index: number) => index === activeStep} runLabel="Business Foundation progress" />

    {#if isDataStage}
      <section class="space-y-4 rounded border p-5">
        <h2 class="text-xl">{BF_STAGE_DEFINITIONS[currentStage]?.label ?? currentStage}</h2>
        <p class="text-sm">{BF_STAGE_DEFINITIONS[currentStage]?.purpose ?? ''}</p>
        {#if record.session.drafts?.[currentStage]}<aside class="rounded border border-blue-500/60 p-3"><p><strong>Unconfirmed suggestion.</strong></p></aside>{/if}
        {#if BF_STAGE_DEFINITIONS[currentStage]}
          <StageFieldEditor fields={BF_STAGE_DEFINITIONS[currentStage].fields} value={draft} onChange={(next) => draft = next} />
        {:else}
          <p role="alert">No editor is defined for this stage.</p>
        {/if}
        <div class="flex flex-wrap gap-2">
          <button disabled={busy || !canEdit} onclick={() => send('draft', { stage: currentStage })}>Suggest {currentStage}</button>
          <button disabled={busy || !canEdit} onclick={saveDraft}>Save draft</button>
          <button class="rounded bg-primary px-4 py-2 text-primary-foreground" disabled={busy || !canEdit} onclick={confirmStage}>Confirm {currentStage}</button>
          {#if record.session.confirmations[currentStage]}<button disabled={busy || !canEdit} onclick={reviseStage}>Reopen this stage</button>{/if}
        </div>
      </section>
    {:else if currentStage === 'client-decision'}
      <section class="space-y-4 rounded border p-5">
        <h2 class="text-xl">Client decision</h2>
        {#if record.rendered}<article class="prose max-w-none rounded border p-4" aria-label="Foundation candidate">{@html record.rendered}</article>{/if}
        <div class="flex gap-3">
          <button disabled={busy || !canEdit} onclick={() => send('fresh-review')}>Run fresh review</button>
          <button disabled={busy || !canEdit || !record.review} onclick={() => send('recheck')}>Recheck the corrected candidate</button>
        </div>
        {#if record.review}
          <p class="text-sm">Fresh review: {record.review.findings.length} finding(s) · recheck: {record.review.recheck?.result ?? 'not run'}</p>
          {#each record.review.findings as finding (finding.id)}
            <fieldset class="space-y-2 rounded border p-3">
              <legend>{finding.classification}</legend>
              <p>{finding.finding}</p>
              <div class="flex flex-wrap gap-2">
                {#each ['corrected-locally','returned-upstream','accepted-limit','blocking'] as disposition (disposition)}
                  <button class="rounded border px-2 py-1" disabled={busy || !canEdit} onclick={() => resolveFinding(finding.id, disposition, finding.note ?? '')}>{disposition}</button>
                {/each}
              </div>
              <input class="w-full rounded border p-2" placeholder="Note (required when returning upstream)" bind:value={finding.note}/>
              <p class="text-sm">Current disposition: {finding.disposition}</p>
            </fieldset>
          {/each}
        {/if}
        <h3 class="font-semibold">Record the client's decision</h3>
        <label>Response<select class="mt-1 w-full rounded border p-2" bind:value={decision.response}><option value="approve">Approve</option><option value="revision-requested">Revision requested</option><option value="source-disputed">Source disputed</option></select></label>
        <div class="grid gap-2 md:grid-cols-3">
          <input class="rounded border p-2" placeholder="Approver name" bind:value={decision.approverName}/>
          <input class="rounded border p-2" placeholder="Approver role" bind:value={decision.approverRole}/>
          <input class="rounded border p-2" placeholder="Authority reference" bind:value={decision.approverRef}/>
        </div>
        <label class="block">Exact response<textarea class="mt-1 w-full rounded border p-2" rows="2" bind:value={decision.exactResponse}></textarea></label>
        {#if decision.response === 'approve'}
          <label class="flex items-center gap-2"><input type="checkbox" bind:checked={decision.businessConfirmed}/> This is our business</label>
          <label class="flex items-center gap-2"><input type="checkbox" bind:checked={decision.standConfirmed}/> This is where we stand</label>
        {/if}
        {#if decision.response === 'revision-requested'}<label class="block">What to change<textarea class="mt-1 w-full rounded border p-2" rows="2" bind:value={decision.revisionNote}></textarea></label>{/if}
        {#if decision.response === 'source-disputed'}
          <label class="block">Disputed field<textarea class="mt-1 w-full rounded border p-2" rows="2" bind:value={decision.disputedField}></textarea></label>
          <label>Return owner<select class="mt-1 w-full rounded border p-2" bind:value={decision.returnOwner}><option value="entry">Engagement</option><option value="m01">Founder Conviction</option><option value="m02">Market Reality</option><option value="m03">Business Commitments</option><option value="m04">Viability Check</option></select></label>
        {/if}
        <button class="rounded bg-primary px-4 py-2 text-primary-foreground" disabled={busy || !canEdit} onclick={submitDecision}>Record decision{decision.response === 'approve' ? ' and seal' : ''}</button>
      </section>
    {:else if currentStage === 'sealed'}
      <section class="space-y-4 rounded border p-5">
        <h2 class="text-xl">Sealed Business Foundation</h2>
        <p>Version {record.session.seal?.versionId} · SHA-256 {record.session.seal?.hash}</p>
        <p>Downstream gate: <strong>{record.gate.downstreamGateState}</strong> · Brand Strategy permission: {record.gate.m05Permission}</p>
        {#each documents.filter(item => item.kind === 'business-foundation') as document (document.id)}
          <article class="prose max-w-none rounded border p-4" aria-label="Saved foundation document" data-document-id={document.id}>
            <h3 class="not-prose font-semibold">Saved document · {document.id}</h3>
            {@html document.contentHtml ?? ''}
            <a class="not-prose underline" href={`./business-foundation/handoff?sessionId=${record.session.sessionId}&versionId=${document.versionId}&documentId=${document.id}`}>Download exact Markdown document</a>
          </article>
        {/each}
        {#each documents.filter(item => item.kind !== 'business-foundation') as document (document.id)}
          <p><a class="underline" href={`./business-foundation/handoff?sessionId=${record.session.sessionId}&versionId=${document.versionId}&documentId=${document.id}`}>Download {document.kind} JSON</a></p>
        {/each}
        <fieldset class="space-y-3 rounded border p-3">
          <legend>Create a successor</legend>
          <label class="block">Reason<textarea class="w-full rounded border p-2" rows="3" bind:value={successorReason}></textarea></label>
          <button class="rounded bg-primary px-4 py-2 text-primary-foreground" disabled={busy || !hydrated || !successorReason.trim()} onclick={() => send('successor', { reason: successorReason })}>Create editable successor</button>
        </fieldset>
      </section>
    {/if}
  {/if}
</main>
