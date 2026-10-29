<script lang="ts">
  import { onMount, untrack } from 'svelte';
  import { replaceState } from '$app/navigation';
  import Stepper from '#lib/modules/strategy/components/Stepper.svelte';
  import StageFieldEditor from '#lib/modules/strategy/components/StageFieldEditor.svelte';
  import { M12_STAGE_DEFINITIONS } from '#lib/modules/strategy/shared/fields/m12.js';
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();

  type Loaded = {
    session: any; checks: any; gates: { id: string; result: string; basis: string; findings: any[] }[];
    upstreamCurrent: boolean; sealCheck: any; review: any; rendered: string; documents: any[];
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
  let routeChoice = $state('full');
  let routeReason = $state('');
  let decision = $state<any>({ response: 'accept', approverName: '', approverRole: '', approverRef: '', exactResponse: '', revisionNote: '', returnStage: 'inheritance', declineReason: '' });
  let successorReason = $state('');
  let documents = $state<any[]>(initial.session ? (initial as Loaded).documents ?? [] : []);

  const labels = ['Eligibility', 'Inheritance', 'Assets', 'Rhythm', 'Schedule', 'Response', 'Scorecard', 'Rules', 'Checklists', 'Close-out', 'Checks', 'Review', 'Decision', 'Sealed'];
  const stages = ['eligibility', 'inheritance', 'assets', 'rhythm', 'schedule', 'response', 'scorecard', 'rules', 'checklist', 'transition', 'checks', 'review', 'client-decision', 'sealed'];
  const dataStages = ['inheritance', 'assets', 'rhythm', 'schedule', 'response', 'scorecard', 'rules', 'checklist', 'transition'];
  let activeStep = $derived(record ? Math.max(0, stages.indexOf(record.session.stage)) : 0);
  let canEdit = $derived(Boolean(record && record.session.stage !== 'sealed' && record.upstreamCurrent));
  let currentStage = $derived(record?.session.stage ?? '');
  let isDataStage = $derived(dataStages.includes(currentStage));

  function syncDraft() {
    if (!record) return;
    const stage = record.session.stage;
    if (!dataStages.includes(stage)) return;
    if (draftStage === stage) return;
    draft = structuredClone(record.session.drafts?.[stage]?.candidate ?? record.session.data?.[stage] ?? {});
    draftStage = stage;
  }

  $effect(() => {
    const loaded = $state.snapshot(record) as Loaded | null;
    if (!loaded) return;
    documents = loaded.documents ?? [];
    if (loaded.session.data?.clientDecision) {
      const existing = loaded.session.data.clientDecision;
      decision = { ...decision, response: existing.response, approverName: existing.approver?.name ?? '', approverRole: existing.approver?.role ?? '', approverRef: existing.approver?.authorityRef ?? '', exactResponse: existing.exactResponse ?? '' };
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
    if (!response.ok) throw new Error(result.error ?? 'Unable to load Working Cycle');
    replaceState(url, {});
    if (id) { record = result; documents = result.documents ?? []; draftStage = ''; viewStep = activeStep; }
    else { sessions = result.sessions ?? []; sourceReady = result.sourceReady; record = null; }
  }

  async function pollJob(id: string, action: string) {
    busy = true; pendingJob = id; message = action === 'review' ? 'Running the independent review…' : 'Drafting…';
    try {
      const url = new URL(location.pathname, location.origin);
      url.searchParams.set('jobId', id); url.searchParams.set('jobAction', action); url.searchParams.set('sessionId', record!.session.sessionId);
      replaceState(url, {});
      const until = Date.now() + 300000;
      while (Date.now() < until) {
        const response = await fetch(url, { headers: { accept: 'application/json' } });
        const job = await response.json();
        if (!response.ok) throw new Error(job.error ?? 'Unable to check progress');
        if (job.status === 'succeeded') { pendingJob = null; await readCurrent(job.sessionId); message = 'Result loaded. Review it before confirming anything.'; return; }
        if (job.status === 'failed' || job.status === 'cancelled') { pendingJob = null; throw new Error('The job stopped. Your confirmed work is unchanged.'); }
        await new Promise(resolve => setTimeout(resolve, 2000));
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
      if (['draft', 'review'].includes(action) && result.jobId) { busy = false; await pollJob(result.jobId, action); return; }
      if (action === 'create') await readCurrent(result.session?.sessionId ?? result.payload?.sessionId ?? result.id);
      else if (action === 'successor') await readCurrent(result.id);
      else await readCurrent(record!.session.sessionId);
      message = action === 'decide' ? 'Decision recorded.' : action === 'run-checks' ? 'Checks ran.' : 'Saved. The current record has been reloaded.';
    } catch (cause) { message = cause instanceof Error ? cause.message : 'Unable to save'; }
    finally { busy = false; }
  }

  function confirmStage() { void send('confirm', { stage: currentStage, payload: draft }); }
  function saveDraft() { void send('save', { stage: currentStage, payload: draft }); }
  function reviseStage() { void send('revise', { stage: currentStage }); }
  function confirmRoute() { void send('confirm-route', { route: routeChoice, reason: routeReason }); }
  function submitDecision() {
    void send('decide', { decision: {
      response: decision.response,
      approver: { name: decision.approverName, role: decision.approverRole, authorityRef: decision.approverRef },
      exactResponse: decision.exactResponse,
      revisionNote: decision.revisionNote,
      returnStage: decision.response === 'revise' ? decision.returnStage : null,
      declineReason: decision.declineReason,
    } });
  }
</script>

<svelte:head><title>Working Cycle · Strategy</title></svelte:head>
<main class="mx-auto max-w-6xl space-y-6 p-6">
  <header class="space-y-2">
    <p class="text-sm text-muted-foreground">Strategy · Module 08</p>
    <h1 class="text-3xl font-semibold">Working Cycle</h1>
    <p>Turn the accepted sales strategy into proof-backed pillars, a library, distribution, production and honest measurement.</p>
  </header>
  {#if message}<p class="rounded border p-3" role="status">{message}</p>{/if}
  {#if pendingJob}<button disabled={busy || !hydrated} onclick={() => pollJob(pendingJob!, 'draft')}>Check job progress</button>{/if}

  {#if !record}
    <section class="space-y-4 rounded border p-5">
      <h2 class="text-xl font-semibold">Start or reopen a digital direction</h2>
      <fieldset class="space-y-2 rounded border p-3">
        <legend>Confirm the module route</legend>
        <select class="w-full rounded border p-2" bind:value={routeChoice}><option value="full">Full</option><option value="constrained">Constrained</option><option value="light">Light</option></select>
        <textarea class="w-full rounded border p-2" rows="2" placeholder="Why this route" bind:value={routeReason}></textarea>
        <button disabled={busy || !hydrated || !routeReason.trim()} onclick={confirmRoute}>Confirm route</button>
      </fieldset>
      {#if !sourceReady}<p role="status">No sealed Sales Strategy is connected yet. Starting will verify and connect the newest sealed strategy.</p>{/if}
      <button disabled={busy || !hydrated} onclick={() => send('create')}>Start from the current sealed Sales Strategy</button>
      <div class="flex flex-wrap gap-2">{#each sessions as item (item.id)}<button class="rounded border px-3 py-2" disabled={busy || !hydrated} onclick={async () => { busy = true; try { await readCurrent(item.id); } catch (e) { message = e instanceof Error ? e.message : 'Unable to load'; } finally { busy = false; } }}>Open session · revision {item.revision}</button>{/each}</div>
    </section>
  {:else}
    {#if !record.upstreamCurrent}<p class="rounded border border-amber-500 p-3" role="alert">The pinned Sales Strategy is no longer current. This record stays readable, but new work cannot continue.</p>{/if}
    <p class="text-sm">{record.session.stage} · {record.session.status} · revision {record.session.revision} · route {record.session.route} · capability {record.session.capability}</p>

    <Stepper steps={labels.map(label => ({ label }))} bind:viewStep {activeStep} stepDone={labels.map((_, index) => index < activeStep || (index === 13 && !!record?.session.seal))} canVisit={(index: number) => index === activeStep} runLabel="Working Cycle progress" />

    {#if currentStage === 'eligibility'}
      <section class="space-y-3 rounded border p-5">
        <h2 class="text-xl">Eligibility</h2>
        <p>Route <strong>{record.session.route}</strong> · capability <strong>{record.session.capability}</strong>. The sealed Sales Strategy, its review and its accepted decision were verified when this session was created.</p>
        <button class="rounded bg-primary px-4 py-2 text-primary-foreground" disabled={busy || !canEdit} onclick={() => send('confirm-eligibility')}>Confirm eligibility</button>
      </section>
    {:else if isDataStage}
      <section class="space-y-4 rounded border p-5">
        <h2 class="text-xl">{M12_STAGE_DEFINITIONS[currentStage]?.label ?? currentStage}</h2>
        <p class="text-sm">{M12_STAGE_DEFINITIONS[currentStage]?.purpose ?? ''}</p>
        {#if record.session.drafts?.[currentStage]}<aside class="rounded border border-blue-500/60 p-3"><p><strong>Unconfirmed suggestion.</strong></p></aside>{/if}
        {#if M12_STAGE_DEFINITIONS[currentStage]}
          <StageFieldEditor fields={M12_STAGE_DEFINITIONS[currentStage].fields} value={draft} onChange={(next) => draft = next} />
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
    {:else if currentStage === 'checks'}
      <section class="space-y-3 rounded border p-5">
        <h2 class="text-xl">Completion checks</h2>
        <button class="rounded bg-primary px-4 py-2 text-primary-foreground" disabled={busy || !canEdit} onclick={() => send('run-checks')}>Run gates 0–8 and freeze the candidate</button>
        <ul class="space-y-1">{#each record.gates as gate (gate.id)}<li>{gate.result === 'pass' ? '✓' : '✗'} <strong>{gate.id}</strong> — {gate.basis}{#if gate.findings.length}<ul class="list-disc pl-6">{#each gate.findings as finding (finding.code + finding.message)}<li>{finding.message}</li>{/each}</ul>{/if}</li>{/each}</ul>
        {#if record.checks}<p class="text-sm">Candidate {record.checks.candidateHash ? 'frozen' : 'not frozen'}</p>{/if}
      </section>
    {:else if currentStage === 'review'}
      <section class="space-y-3 rounded border p-5">
        <h2 class="text-xl">Independent review</h2>
        <button class="rounded bg-primary px-4 py-2 text-primary-foreground" disabled={busy || !canEdit} onclick={() => send('review')}>Run the six-lens review</button>
        {#if record.review}<p>Verdict: <strong>{record.review.verdict}</strong> · independence {record.review.reviewer?.independence} · {record.review.findings?.length ?? 0} finding(s)</p>{/if}
      </section>
    {:else if currentStage === 'client-decision'}
      <section class="space-y-3 rounded border p-5">
        <h2 class="text-xl">Client decision</h2>
        <article class="prose max-w-none rounded border p-4">{@html record.rendered}</article>
        <label>Response<select class="mt-1 w-full rounded border p-2" bind:value={decision.response}><option value="accept">Accept</option><option value="revise">Revise</option><option value="decline">Decline</option></select></label>
        <div class="grid gap-2 md:grid-cols-3">
          <input class="rounded border p-2" placeholder="Approver name" bind:value={decision.approverName}/>
          <input class="rounded border p-2" placeholder="Approver role" bind:value={decision.approverRole}/>
          <input class="rounded border p-2" placeholder="Authority reference" bind:value={decision.approverRef}/>
        </div>
        <label class="block">Exact response<textarea class="mt-1 w-full rounded border p-2" rows="2" bind:value={decision.exactResponse}></textarea></label>
        {#if decision.response === 'revise'}
          <label class="block">What must change<textarea class="mt-1 w-full rounded border p-2" rows="2" bind:value={decision.revisionNote}></textarea></label>
          <label>Return to<select class="mt-1 w-full rounded border p-2" bind:value={decision.returnStage}>{#each dataStages as stage (stage)}<option value={stage}>{stage}</option>{/each}</select></label>
        {/if}
        {#if decision.response === 'decline'}<label class="block">Reason<textarea class="mt-1 w-full rounded border p-2" rows="2" bind:value={decision.declineReason}></textarea></label>{/if}
        <button class="rounded bg-primary px-4 py-2 text-primary-foreground" disabled={busy || !canEdit} onclick={submitDecision}>Record decision{decision.response === 'accept' ? ' and seal' : ''}</button>
      </section>
    {:else if currentStage === 'sealed'}
      <section class="space-y-3 rounded border p-5">
        <h2 class="text-xl">Sealed Working Cycle</h2>
        <p>Version {record.session.seal?.versionId} · SHA-256 {record.session.seal?.hash}</p>
        {#each documents.filter(item => item.kind === 'working-cycle') as document (document.id)}
          <article class="prose max-w-none rounded border p-4" aria-label="Saved digital direction" data-document-id={document.id}>
            <h3 class="not-prose font-semibold">Saved strategy · {document.id}</h3>
            {@html document.contentHtml ?? ''}
            <a class="not-prose underline" href={`./working-cycle/handoff?sessionId=${record.session.sessionId}&versionId=${document.versionId}&documentId=${document.id}`}>Download exact Markdown strategy</a>
          </article>
        {/each}
        {#each documents.filter(item => item.kind !== 'working-cycle') as document (document.id)}
          <p><a class="underline" href={`./working-cycle/handoff?sessionId=${record.session.sessionId}&versionId=${document.versionId}&documentId=${document.id}`}>Download {document.kind}</a></p>
        {/each}
        <fieldset class="space-y-2 rounded border p-3">
          <legend>Create a successor</legend>
          <textarea class="w-full rounded border p-2" rows="2" placeholder="Reason" bind:value={successorReason}></textarea>
          <button class="rounded bg-primary px-4 py-2 text-primary-foreground" disabled={busy || !successorReason.trim()} onclick={() => send('successor', { reason: successorReason })}>Create successor</button>
        </fieldset>
      </section>
    {/if}
  {/if}
</main>
