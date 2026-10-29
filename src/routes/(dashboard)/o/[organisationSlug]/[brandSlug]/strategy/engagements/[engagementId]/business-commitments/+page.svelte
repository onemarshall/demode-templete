<script lang="ts">
  import { onMount, untrack } from 'svelte';
  import { replaceState } from '$app/navigation';
  import Stepper from '#lib/modules/strategy/components/Stepper.svelte';
  import StageFieldEditor from '#lib/modules/strategy/components/StageFieldEditor.svelte';
  import { M03_STAGE_DEFINITIONS, M03_OUTCOME_FIELDS } from '#lib/modules/strategy/shared/fields/m03.js';
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();

  type Loaded = {
    session: any; commitments: any; drafts: Record<string, any>; seal: any;
    revision: number; sourceVersionId: string; sourceHash: string; upstreamCurrent: boolean;
    history: any[]; documents: any[]; sealVerification: any;
    outcomeCheck: { canA: boolean; problems: string[] };
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
  let outcome = $state<any>({ outcome: 'a', statement: '', returnDoc: null });
  let successorReason = $state('');
  let documents = $state<any[]>(initial.session ? (initial as Loaded).documents ?? [] : []);

  const labels = ['Upstream', 'Inputs', 'Challenge', 'Journey', 'Grid', 'Proof', 'Friction', 'Credibility', 'Confrontations', 'Cost', 'Advocate', 'Judgement', 'Sealed'];
  const stages = ['upstream', 'inputs', 'challenge', 'journey', 'grid', 'proof', 'friction', 'credibility', 'confrontations', 'cost', 'advocate', 'judgement', 'sealed'];
  const dataStages = ['inputs', 'challenge', 'journey', 'grid', 'proof', 'friction', 'credibility', 'confrontations', 'cost', 'advocate', 'judgement'];
  let activeStep = $derived(record ? Math.max(0, stages.indexOf(record.session.stage)) : 0);
  let canEdit = $derived(Boolean(record && record.session.stage !== 'sealed' && record.upstreamCurrent));
  let currentStage = $derived(record?.session.stage ?? '');
  let isDataStage = $derived(dataStages.includes(currentStage));

  function syncDraft() {
    if (!record) return;
    const stage = record.session.stage;
    if (!dataStages.includes(stage)) return;
    if (draftStage === stage) return;
    draft = structuredClone(record.session.drafts?.[stage]?.candidate ?? record.commitments?.[stage] ?? {});
    draftStage = stage;
  }

  $effect(() => {
    const loaded = $state.snapshot(record) as Loaded | null;
    if (!loaded) return;
    documents = loaded.documents ?? [];
    if (loaded.commitments?.outcome?.outcome !== 'pending') outcome = structuredClone(loaded.commitments.outcome);
    syncDraft();
  });

  onMount(() => {
    hydrated = true;
    const url = new URL(location.href);
    const job = url.searchParams.get('jobId');
    if (job) void pollJob(job, url.searchParams.get('jobStep') ?? 'challenge');
  });

  async function readCurrent(id?: string) {
    const url = new URL(location.pathname, location.origin);
    if (id) url.searchParams.set('sessionId', id);
    const response = await fetch(url, { headers: { accept: 'application/json' } });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error ?? 'Unable to load Business Commitments');
    replaceState(url, {});
    if (id) { record = result; documents = result.documents ?? []; draftStage = ''; viewStep = activeStep; }
    else { sessions = result.sessions ?? []; sourceReady = result.sourceReady; record = null; }
  }

  async function pollJob(id: string, step: string) {
    busy = true; pendingJob = id; message = `Drafting ${step}…`;
    try {
      const url = new URL(location.pathname, location.origin);
      url.searchParams.set('jobId', id); url.searchParams.set('jobStep', step); url.searchParams.set('sessionId', record!.session.sessionId);
      replaceState(url, {});
      const until = Date.now() + 180000;
      while (Date.now() < until) {
        const response = await fetch(url, { headers: { accept: 'application/json' } });
        const job = await response.json();
        if (!response.ok) throw new Error(job.error ?? 'Unable to check progress');
        if (job.status === 'succeeded') { pendingJob = null; await readCurrent(job.sessionId); message = `Suggested ${step} draft loaded. Review it before confirming.`; return; }
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
      else Object.assign(body, { sessionId: record!.session.sessionId, expectedRevision: record!.revision, commandId: crypto.randomUUID() });
      const response = await fetch(location.pathname, { method: 'POST', headers: { 'content-type': 'application/json', accept: 'application/json' }, body: JSON.stringify(body) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? 'Unable to save');
      if (action === 'draft' && result.jobId) { busy = false; await pollJob(result.jobId, (fields.step as string) ?? 'draft'); return; }
      if (action === 'create') await readCurrent(result.session?.sessionId ?? result.payload?.session?.sessionId ?? result.id);
      else if (action === 'successor') await readCurrent(result.id);
      else await readCurrent(record!.session.sessionId);
      message = action === 'seal' ? 'Business Commitments is sealed and saved.' : action === 'successor' ? 'A new editable successor is open.' : 'Saved. The current record has been reloaded.';
    } catch (cause) { message = cause instanceof Error ? cause.message : 'Unable to save'; }
    finally { busy = false; }
  }

  function confirmStage() { void send(`confirm-${currentStage}`, { [currentStage]: draft }); }
  function reviseStage() { void send('revise', { from: currentStage, reason: 'Reopened from the stage screen.' }); }
  function recordOutcome() { void send('outcome', { outcome }); }
</script>

<svelte:head><title>Business Commitments · Strategy</title></svelte:head>
<main class="mx-auto max-w-6xl space-y-6 p-6">
  <header class="space-y-2">
    <p class="text-sm text-muted-foreground">Strategy · Module 03</p>
    <h1 class="text-3xl font-semibold">Business Commitments</h1>
    <p>Turn the sealed market finding into a business position. Every suggestion stays editable until a separate human confirmation.</p>
  </header>
  {#if message}<p class="rounded border p-3" role="status">{message}</p>{/if}
  {#if pendingJob}<button disabled={busy || !hydrated} onclick={() => pollJob(pendingJob!, 'draft')}>Check draft progress</button>{/if}

  {#if !record}
    <section class="space-y-4 rounded border p-5">
      <h2 class="text-xl font-semibold">Start or reopen a Business Commitments record</h2>
      {#if !sourceReady}<p role="status">No eligible sealed Market Reality record is connected yet.</p>{/if}
      <button disabled={busy || !hydrated} onclick={() => send('create')}>Start from the current sealed Market Reality</button>
      <div class="flex flex-wrap gap-2">{#each sessions as item (item.id)}<button class="rounded border px-3 py-2" disabled={busy || !hydrated} onclick={async () => { busy = true; try { await readCurrent(item.id); } catch (e) { message = e instanceof Error ? e.message : 'Unable to load'; } finally { busy = false; } }}>Open record · revision {item.revision}</button>{/each}</div>
    </section>
  {:else}
    {#if !record.upstreamCurrent}<p class="rounded border border-amber-500 p-3" role="alert">The pinned Market Reality source is no longer current. This record stays readable, but new work cannot continue.</p>{/if}
    <p class="text-sm">{record.session.stage.replaceAll('-', ' ')} · revision {record.revision} · source {record.sourceHash.slice(0, 12)}…</p>

    {#if record.commitments.riskFlags.length}<aside class="rounded border border-amber-500/60 p-3"><h3 class="font-semibold">Risk flags</h3><ul class="list-disc pl-6">{#each record.commitments.riskFlags as flag (flag)}<li>{flag}</li>{/each}</ul></aside>{/if}

    <Stepper steps={labels.map(label => ({ label }))} bind:viewStep {activeStep} stepDone={labels.map((_, index) => index < activeStep || (index === 12 && !!record?.seal))} canVisit={(index: number) => index === activeStep} runLabel="Business Commitments progress" />

    {#if currentStage === 'upstream'}
      <section class="space-y-3 rounded border p-5">
        <h2 class="text-xl">Review the sealed upstream</h2>
        <p>The human act here is having read the sealed conviction and the sealed market findings.</p>
        <button class="rounded bg-primary px-4 py-2 text-primary-foreground" disabled={busy || !canEdit} onclick={() => send('confirm-upstream', { route: 'full' })}>I have reviewed the sealed upstream</button>
      </section>
    {:else if isDataStage}
      <section class="space-y-4 rounded border p-5">
        <h2 class="text-xl">{M03_STAGE_DEFINITIONS[currentStage]?.label ?? currentStage}</h2>
        <p class="text-sm">{M03_STAGE_DEFINITIONS[currentStage]?.purpose ?? ''}</p>
        {#if record.session.drafts?.[currentStage]}<aside class="rounded border border-blue-500/60 p-3"><p><strong>Unconfirmed suggestion.</strong></p></aside>{/if}
        {#if M03_STAGE_DEFINITIONS[currentStage]}
          <StageFieldEditor fields={M03_STAGE_DEFINITIONS[currentStage].fields} value={draft} onChange={(next) => draft = next} />
        {:else}
          <p role="alert">No editor is defined for this stage.</p>
        {/if}
        <div class="flex flex-wrap gap-2">
          <button disabled={busy || !canEdit} onclick={() => send('draft', { step: currentStage })}>Suggest {currentStage}</button>
          <button class="rounded bg-primary px-4 py-2 text-primary-foreground" disabled={busy || !canEdit} onclick={confirmStage}>Confirm {currentStage}</button>
          {#if record.session.confirmations[currentStage]}<button disabled={busy || !canEdit} onclick={reviseStage}>Reopen</button>{/if}
        </div>

        {#if currentStage === 'judgement'}
          <hr/>
          <h3 class="font-semibold">Outcome</h3>
          {#if !record.outcomeCheck.canA}<div class="rounded border p-3"><p role="status">Outcome A is not currently recordable:</p><ul class="list-disc pl-6">{#each record.outcomeCheck.problems as problem (problem)}<li>{problem}</li>{/each}</ul></div>{/if}
          <StageFieldEditor fields={M03_OUTCOME_FIELDS} value={outcome} onChange={(next) => outcome = next} />
          <div class="flex gap-3">
            <button disabled={busy || !canEdit || !record.session.confirmations.judgement} onclick={recordOutcome}>Record outcome</button>
            <button class="rounded bg-primary px-4 py-2 text-primary-foreground" disabled={busy || !canEdit || !record.session.confirmations.outcome} onclick={() => send('seal')}>Approve and seal</button>
          </div>
        {/if}
      </section>
    {:else if currentStage === 'sealed'}
      <section class="space-y-4 rounded border p-5">
        <h2 class="text-xl">Sealed Business Commitments</h2>
        <p>Receipt {record.seal?.receiptId} · SHA-256 {record.seal?.sealHash} · outcome {record.seal?.outcome}</p>
        {#each documents.filter(item => item.kind !== 'receipt') as document (document.id)}
          <article class="prose max-w-none rounded border p-4" aria-label="Saved business commitments document" data-document-id={document.id}>
            <h3 class="not-prose font-semibold">Saved document · {document.id}</h3>
            {@html document.contentHtml ?? ''}
            <a class="not-prose underline" href={`./business-commitments/handoff?sessionId=${record.session.sessionId}&versionId=${document.versionId}&documentId=${document.id}`}>Download exact Markdown document</a>
          </article>
        {/each}
        {#each documents.filter(item => item.kind === 'receipt') as document (document.id)}
          <p><a class="underline" href={`./business-commitments/handoff?sessionId=${record.session.sessionId}&versionId=${document.versionId}&documentId=${document.id}`}>Download immutable seal receipt JSON</a></p>
        {/each}
        <fieldset class="space-y-3 rounded border p-3">
          <legend>Create a successor</legend>
          <label class="block">Reason for a successor<textarea class="w-full rounded border p-2" rows="3" bind:value={successorReason}></textarea></label>
          <button class="rounded bg-primary px-4 py-2 text-primary-foreground" disabled={busy || !hydrated || !successorReason.trim()} onclick={() => send('successor', { reason: successorReason })}>Create editable successor</button>
        </fieldset>
      </section>
    {/if}
  {/if}
</main>
