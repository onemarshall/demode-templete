<script lang="ts">
  import { onMount, untrack } from 'svelte';
  import { replaceState } from '$app/navigation';
  import Stepper from '#lib/modules/strategy/components/Stepper.svelte';
  import StageFieldEditor from '#lib/modules/strategy/components/StageFieldEditor.svelte';
  import { M02_STAGE_DEFINITIONS } from '#lib/modules/strategy/shared/fields/m02.js';
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();

  type Loaded = {
    session: any; recon: any; artifacts: { artifacts: any[] }; collection: any; seal: any;
    revision: number; sourceVersionId: string; sourceHash: string; upstreamCurrent: boolean;
    history: any[]; documents: any[]; drafts: Record<string, any>; progression: any;
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
  let draft = $state<Record<string, any>>({});
  let draftKey = $state('');
  let reviewDraft = $state<any>({ review: { disposition: 'insufficient', rationale: '' } });
  let outcomeDraft = $state<any>({ outcome: { outcome: '', statement: '', contrarianFlags: [] } });
  let artifact = $state<any>({ kind: 'customer', channel: 'paste', target: '', source: '', url: '', verbatim: '', access: 'public', consent: 'public artifact', note: '' });
  let successorReason = $state('');
  let documents = $state<any[]>(initial.session ? (initial as Loaded).documents ?? [] : []);

  const labels = ['Research setup', 'Gather evidence', 'Review collection', 'Builder inputs', 'Vacuum gates', 'Structural risk', 'Evidence and outcome', 'Judgements', 'Sealed record'];
  const stages = ['setup', 'gather', 'artefact-review', 'builder-inputs', 'gates', 'risk', 'outcome', 'judgements', 'sealed'];
  let activeStep = $derived(record ? Math.max(0, stages.indexOf(record.session.stage)) : 0);
  let canEdit = $derived(Boolean(record && record.session.stage !== 'sealed' && record.upstreamCurrent));
  let stage = $derived(record?.session.stage ?? '');
  let currentGate = $derived.by(() => {
    if (!record) return 'gate1';
    const recon = record.recon;
    if (recon.gate1.verdict !== 'pass') return 'gate1';
    if (recon.gate2.verdict !== 'pass') return 'gate2';
    if (recon.gate3.verdict !== 'pass') return 'gate3';
    if (recon.gate4.verdict === 'pending') return 'gate4';
    return 'gate6';
  });
  /** Which definition and confirm action the current screen uses. */
  let screen = $derived.by(() => {
    if (!record) return { key: '', action: '' };
    if (stage === 'setup') return { key: 'setup', action: 'confirm-setup' };
    if (stage === 'builder-inputs') return { key: 'builder-inputs', action: 'builder-inputs' };
    if (stage === 'gates') return { key: currentGate === 'gate1' ? 'gate1-terrain' : currentGate, action: `confirm-${currentGate}` };
    if (stage === 'risk') return { key: 'gate5', action: 'confirm-gate5' };
    if (stage === 'outcome') return record.recon.gate4.verdict === 'pass' && record.recon.gate6.a.verdict === 'pending' ? { key: 'gate6', action: 'confirm-gate6' } : { key: '', action: '' };
    return { key: '', action: '' };
  });

  function editorValue(): Record<string, any> {
    if (!record) return {};
    const recon = record.recon;
    if (stage === 'setup') return { research: record.drafts.setup?.candidate ?? record.session.research?.confirmed ?? record.session.research?.draft ?? {}, route: record.session.route ?? 'full', routeReason: record.session.routeReason ?? '' };
    if (stage === 'builder-inputs') return { inputs: record.drafts['builder-inputs']?.candidate ?? { p1: recon.preconditions.p1, p2: recon.preconditions.p2, p3: recon.preconditions.p3, foundersProblem: recon.secondVoice.foundersProblem, secondVoice: recon.secondVoice, ownedAudit: recon.gate3.ownedAudit ?? [] } };
    if (stage === 'gates') return currentGate === 'gate1' ? { terrain: recon.terrain, gate: record.drafts.gate1?.candidate ?? recon.gate1 } : { gate: record.drafts[currentGate]?.candidate ?? recon[currentGate] };
    if (stage === 'risk') return { gate: { risks: recon.gate5.risks } };
    if (stage === 'outcome') return { gate: record.drafts.gate6?.candidate ?? recon.gate6 };
    return {};
  }

  function syncDraft() {
    if (!record) return;
    const key = `${stage}:${screen.key}`;
    if (draftKey === key) return;
    draft = structuredClone(editorValue());
    draftKey = key;
  }

  $effect(() => {
    const loaded = $state.snapshot(record) as Loaded | null;
    if (!loaded) return;
    documents = loaded.documents ?? [];
    syncDraft();
  });

  onMount(() => {
    hydrated = true;
    const url = new URL(location.href);
    const job = url.searchParams.get('jobId');
    if (job) void pollJob(job, url.searchParams.get('jobAction') === 'collect-url' ? 'collect-url' : 'draft');
  });

  async function readCurrent(id?: string) {
    const url = new URL(location.pathname, location.origin);
    if (id) url.searchParams.set('sessionId', id);
    const response = await fetch(url, { headers: { accept: 'application/json' } });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error ?? 'Unable to load Market Reality');
    replaceState(url, {});
    if (id) { record = result; documents = result.documents ?? []; draftKey = ''; viewStep = activeStep; }
    else { sessions = result.sessions ?? []; sourceReady = result.sourceReady; record = null; }
  }

  async function pollJob(id: string, action: string) {
    busy = true; pendingJob = id; message = action === 'collect-url' ? 'Collecting the public page…' : 'Waiting for the draft job…';
    try {
      const url = new URL(location.pathname, location.origin);
      url.searchParams.set('jobId', id); url.searchParams.set('jobAction', action); url.searchParams.set('sessionId', record!.session.sessionId);
      replaceState(url, {});
      const until = Date.now() + 120000;
      while (Date.now() < until) {
        const response = await fetch(url, { headers: { accept: 'application/json' } });
        const job = await response.json();
        if (!response.ok) throw new Error(job.error ?? 'Unable to check progress');
        if (job.status === 'succeeded') { pendingJob = null; await readCurrent(job.sessionId); message = 'Result loaded. Review it before confirming.'; return; }
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
      if ((action === 'draft' || action === 'collect-url') && result.jobId) { busy = false; await pollJob(result.jobId, action); return; }
      if (action === 'create') await readCurrent(result.session?.sessionId ?? result.payload?.session?.sessionId ?? result.id);
      else if (action === 'successor') await readCurrent(result.id);
      else await readCurrent(record!.session.sessionId);
      message = action === 'seal' ? 'Market Reality is sealed and saved.' : action === 'successor' ? 'A new editable successor is open.' : 'Saved. The current record has been reloaded.';
    } catch (cause) { message = cause instanceof Error ? cause.message : 'Unable to save'; }
    finally { busy = false; }
  }

  function addArtifact() {
    const payload = { ...artifact, retrievedAt: new Date().toISOString(), ...(artifact.url ? { url: artifact.url } : {}) };
    void send('add-artifact', { artifact: payload });
  }
  function confirmScreen() { void send(screen.action, draft); }
</script>

<svelte:head><title>Market Reality · Strategy</title></svelte:head>
<main class="mx-auto max-w-6xl space-y-6 p-6">
  <header class="space-y-2">
    <p class="text-sm text-muted-foreground">Strategy · Module 02</p>
    <h1 class="text-3xl font-semibold">Market Reality</h1>
    <p>Gather and judge market evidence against the exact sealed Founder Conviction source. Every suggestion remains an editable candidate.</p>
  </header>
  {#if message}<p class="rounded border p-3" role="status">{message}</p>{/if}
  {#if pendingJob}<button disabled={busy || !hydrated} onclick={() => pollJob(pendingJob!, 'draft')}>Check draft progress</button>{/if}

  {#if !record}
    <section class="space-y-4 rounded border p-5">
      <h2 class="text-xl font-semibold">Start or reopen a Market Reality record</h2>
      {#if !sourceReady}<p role="status">No M02 source is connected yet. Starting a record will verify and connect the current sealed M01 source.</p>{/if}
      <button disabled={busy || !hydrated} onclick={() => send('create')}>Start from the current sealed M01 source</button>
      <div class="flex flex-wrap gap-2">{#each sessions as item (item.id)}<button class="rounded border px-3 py-2" disabled={busy || !hydrated} onclick={async () => { busy = true; try { await readCurrent(item.id); } catch (e) { message = e instanceof Error ? e.message : 'Unable to load'; } finally { busy = false; } }}>Open record · revision {item.revision}</button>{/each}</div>
    </section>
  {:else}
    {#if !record.upstreamCurrent}<p class="rounded border border-amber-500 p-3" role="alert">The pinned M01 source is no longer current. This record remains readable, but new work cannot continue.</p>{/if}
    <p class="text-sm">{record.session.stage.replaceAll('-', ' ')} · revision {record.revision} · source {record.sourceHash.slice(0, 12)}…</p>

    <Stepper steps={labels.map(label => ({ label }))} bind:viewStep {activeStep} stepDone={labels.map((_, index) => index < activeStep || (index === 8 && !!record?.seal))} canVisit={(index: number) => index === activeStep} runLabel="Market Reality progress" />

    {#if stage === 'gather'}
      <section class="space-y-5 rounded border p-5">
        <h2 class="text-xl">Gather evidence</h2>
        <p>Paste observed source material with its provenance. Founder testimony can motivate a hypothesis; it cannot satisfy a market gate.</p>
        <div class="grid gap-3 md:grid-cols-2">
          <label>Evidence kind<select class="mt-1 w-full rounded border p-2" bind:value={artifact.kind}><option value="competitor">Competitor</option><option value="customer">Customer</option><option value="market">Market</option><option value="owned">Owned data</option></select></label>
          <label>About whom or what<input class="mt-1 w-full rounded border p-2" bind:value={artifact.target}/></label>
          <label>Source / publication<input class="mt-1 w-full rounded border p-2" bind:value={artifact.source}/></label>
          <label>URL (optional)<input class="mt-1 w-full rounded border p-2" bind:value={artifact.url}/></label>
          <label>Access<select class="mt-1 w-full rounded border p-2" bind:value={artifact.access}><option value="public">Public</option><option value="internal">Internal</option><option value="confidential">Confidential</option></select></label>
          <label>Consent / permission basis<input class="mt-1 w-full rounded border p-2" bind:value={artifact.consent}/></label>
        </div>
        <label class="block">Verbatim evidence<textarea class="mt-1 w-full rounded border p-2" rows="6" bind:value={artifact.verbatim}></textarea></label>
        <label class="block">Operator note<textarea class="mt-1 w-full rounded border p-2" rows="2" bind:value={artifact.note}></textarea></label>
        <div class="flex flex-wrap gap-3">
          <button disabled={busy || !canEdit || !artifact.target.trim() || !artifact.source.trim() || !artifact.verbatim.trim()} onclick={addArtifact}>Save evidence item</button>
          <button disabled={busy || !canEdit || !artifact.target.trim() || !artifact.url.trim()} onclick={() => send('collect-url', { url: artifact.url, kind: artifact.kind, target: artifact.target })}>Fetch public HTTPS page</button>
          <button disabled={busy || !canEdit} onclick={() => send('finish-gather')}>Finish gathering and review coverage</button>
        </div>
        <h3 class="font-semibold">Evidence log</h3>
        {#if record.artifacts.artifacts.length}<ul class="space-y-2">{#each record.artifacts.artifacts as item (item.id)}<li class="rounded border p-3"><strong>{item.kind} · {item.target}</strong> — {item.source} · {item.status}<p class="whitespace-pre-wrap">{item.verbatim.slice(0, 400)}</p><button disabled={busy || !canEdit} onclick={() => send('delete-artifact', { artifactId: item.id })}>Remove item</button></li>{/each}</ul>{:else}<p>No evidence items have been recorded yet.</p>{/if}
      </section>
    {:else if stage === 'artefact-review'}
      <section class="space-y-4 rounded border p-5">
        <h2 class="text-xl">Review collection coverage</h2>
        <p>{record.artifacts.artifacts.length} evidence items · collection status: {record.collection.state}.</p>
        <ul>{#each record.artifacts.artifacts as item (item.id)}<li>{item.kind} · {item.target} · {item.status} · {item.source}</li>{/each}</ul>
        <button class="rounded bg-primary px-4 py-2 text-primary-foreground" disabled={busy || !canEdit} onclick={() => send('review-artifacts')}>Confirm collection review</button>
      </section>
    {:else if stage === 'outcome'}
      <section class="space-y-4 rounded border p-5">
        <h2 class="text-xl">Evidence judgment and progression</h2>
        {#if record.progression?.blocked}<p role="status">{record.progression.blocked}</p>{/if}
        {#if M02_STAGE_DEFINITIONS.review}
          <h3 class="font-semibold">Evidence judgment</h3>
          <StageFieldEditor fields={M02_STAGE_DEFINITIONS.review.fields} value={reviewDraft} onChange={(next) => reviewDraft = next} />
          <button disabled={busy || !canEdit} onclick={() => send('evidence-review', { review: reviewDraft.review })}>Record evidence judgment</button>
        {/if}
        {#if record.recon.gate4.verdict === 'pass' && record.recon.gate6.a.verdict === 'pending' && M02_STAGE_DEFINITIONS.gate6}
          <h3 class="font-semibold">Gate 6</h3>
          <StageFieldEditor fields={M02_STAGE_DEFINITIONS.gate6.fields} value={draft} onChange={(next) => draft = next} />
          <button disabled={busy || !canEdit} onclick={() => send('confirm-gate6', { gate: draft.gate })}>Confirm Gate 6</button>
        {:else if M02_STAGE_DEFINITIONS.outcome}
          <h3 class="font-semibold">Outcome</h3>
          <StageFieldEditor fields={M02_STAGE_DEFINITIONS.outcome.fields} value={outcomeDraft} onChange={(next) => outcomeDraft = next} />
          <button disabled={busy || !canEdit || !record.session.evidenceReview} onclick={() => send('outcome', { outcome: outcomeDraft.outcome })}>Record outcome</button>
        {/if}
      </section>
    {:else if stage === 'judgements'}
      <section class="space-y-4 rounded border p-5">
        <h2 class="text-xl">Judgements and seal</h2>
        <dl class="grid gap-2 md:grid-cols-2"><dt>Evidence disposition</dt><dd>{record.session.evidenceReview?.disposition ?? 'Not recorded'}</dd><dt>Progression outcome</dt><dd>{record.session.progressionDecision?.outcome ?? 'Not recorded'}</dd></dl>
        <button class="rounded bg-primary px-4 py-2 text-primary-foreground" disabled={busy || !canEdit || !record.session.progressionDecision} onclick={() => send('seal')}>Approve and seal immutable Market Reality</button>
      </section>
    {:else if stage === 'sealed'}
      <section class="space-y-4 rounded border p-5">
        <h2 class="text-xl">Sealed Market Reality</h2>
        <p>Receipt {record.seal?.receiptId} · SHA-256 {record.seal?.sealHash}</p>
        {#each documents.filter(item => item.kind === 'market-reality') as document (document.id)}
          <article class="prose max-w-none rounded border p-4" aria-label="Saved market reality document" data-document-id={document.id}>
            <h3 class="not-prose font-semibold">Saved document · {document.id}</h3>
            {@html document.contentHtml ?? ''}
            <a class="not-prose underline" href={`./market-reality/handoff?sessionId=${record.session.sessionId}&versionId=${document.versionId}&documentId=${document.id}`}>Download exact Markdown document</a>
          </article>
        {/each}
        {#each documents.filter(item => item.kind === 'receipt') as document (document.id)}
          <p><a class="underline" href={`./market-reality/handoff?sessionId=${record.session.sessionId}&versionId=${document.versionId}&documentId=${document.id}`}>Download immutable seal receipt JSON</a></p>
        {/each}
        <fieldset class="space-y-3 rounded border p-3">
          <legend>Create a successor</legend>
          <label class="block">Reason for a successor<textarea class="w-full rounded border p-2" rows="3" bind:value={successorReason}></textarea></label>
          <button class="rounded bg-primary px-4 py-2 text-primary-foreground" disabled={busy || !hydrated || !successorReason.trim()} onclick={() => send('successor', { reason: successorReason })}>Create editable successor</button>
        </fieldset>
      </section>
    {:else if screen.key}
      <section class="space-y-4 rounded border p-5">
        <h2 class="text-xl">{M02_STAGE_DEFINITIONS[screen.key]?.label ?? stage}</h2>
        <p class="text-sm">{M02_STAGE_DEFINITIONS[screen.key]?.purpose ?? ''}</p>
        {#if M02_STAGE_DEFINITIONS[screen.key]}
          <StageFieldEditor fields={M02_STAGE_DEFINITIONS[screen.key].fields} value={draft} onChange={(next) => draft = next} />
        {/if}
        <div class="flex flex-wrap gap-2">
          {#if stage !== 'builder-inputs'}<button disabled={busy || !canEdit} onclick={() => send('draft', { gate: screen.key === 'gate1-terrain' ? 'gate1' : screen.key })}>Suggest draft</button>{/if}
          <button class="rounded bg-primary px-4 py-2 text-primary-foreground" disabled={busy || !canEdit} onclick={confirmScreen}>Confirm {stage}</button>
        </div>
      </section>
    {/if}
  {/if}
</main>
