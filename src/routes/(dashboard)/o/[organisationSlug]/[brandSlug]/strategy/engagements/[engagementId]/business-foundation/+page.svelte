<script lang="ts">
  import { onMount, untrack } from 'svelte';
  import { replaceState } from '$app/navigation';
  import Stepper from '#lib/modules/strategy/components/Stepper.svelte';
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

  const labels = ['Input assessment', 'Business manifesto', 'Foundation document', 'Client decision', 'Sealed'];
  const stageIndex: Record<string, number> = { assessment: 0, manifesto: 1, document: 2, 'client-decision': 3, sealed: 4 };
  let activeStep = $derived(record ? (stageIndex[record.session.stage] ?? 0) : 0);
  let canEdit = $derived(Boolean(record && record.session.stage !== 'sealed' && record.upstreamCurrent));

  const ROW_IDS = ['factual-identity','business-form','current-offers','payer-user','buying-trigger','customer-receipt','delivery','commercial-model','market-geography','practical-outcome','distinction','founder-belief','evidence-for-claims','offer-states','operating-mechanism','unknowns'] as const;
  const ROW_LABELS: Record<string, string> = {
    'factual-identity': 'Factual business identity', 'business-form': 'Business / purchase form', 'current-offers': 'Current products and services',
    'payer-user': 'Payer and user', 'buying-trigger': 'Buying trigger', 'customer-receipt': 'What the customer receives', delivery: 'How the business delivers',
    'commercial-model': 'Commercial model and constraints', 'market-geography': 'Market, geography and routes', 'practical-outcome': 'Practical outcome',
    distinction: 'Distinction', 'founder-belief': 'Founder belief and commitments', 'evidence-for-claims': 'Evidence for claims',
    'offer-states': 'Offer states (current vs planned)', 'operating-mechanism': 'Operating mechanism', unknowns: 'Unknowns and conflicts',
  };
  const SPINE_KEYS = ['see','reject','believe','protect','choose','intendToChange','commitTo','becomesPossible'] as const;
  const SPINE_LABELS: Record<string, string> = { see: 'What we see', reject: 'What we reject', believe: 'What we believe', protect: 'What we protect', choose: 'What we choose', intendToChange: 'What we intend to change', commitTo: 'What we commit to', becomesPossible: 'What becomes possible' };
  const DECLARATION_IDS = ['derivation','no-invention','line-in-the-sand','stakes','specificity','courage','spoken','claims','role-boundary','coherence','foundation-implications'] as const;
  const STRUCTURAL_IDS = ['category','transaction','customer','outcome','delivery','specificity','consistency','distinction','evidence','portfolio'] as const;
  const SECTIONS = ['executive-overview','what-the-business-is','why-it-exists','who-it-serves','what-it-produces','products-services','portfolio','practical-outcome','distinction','founders-understanding','capability-created','manifesto','approval'] as const;

  const blankRow = (id: string) => ({ id, state: 'partial', basis: 'unknown', evidence: '', owner: '', nextAction: '', capabilityBlocked: '' });
  let assessment = $state<any>({ rows: ROW_IDS.map(blankRow), contradictions: [], decision: { state: 'awaiting_owner_decision', reason: '', questions: [], returnOwners: [], manifestoRoute: 'refused' }, assessedBy: '' });
  let manifesto = $state<any>({ convictions: [], spine: {}, manifesto: '', declarations: [], implications: [], sourceTrace: [], declarationTests: DECLARATION_IDS.map(id => ({ id, result: 'unassessed', basis: '' })) });
  let doc = $state<any>({ atAGlance: {}, productsServices: [], portfolio: [], structuralTests: STRUCTURAL_IDS.map(id => ({ id, result: 'unassessed', basis: '' })), sectionLineage: [], distillation: { variablesPreserved: [] }, operatingMechanism: null });
  let decision = $state<any>({ response: 'approve', businessConfirmed: false, standConfirmed: false, approverName: '', approverRole: '', approverRef: '', exactResponse: '', revisionNote: '', disputedField: '', returnOwner: null });
  let successorReason = $state('');
  let documents = $state<any[]>(initial.session ? (initial as Loaded).documents ?? [] : []);

  const lines = (text: string) => text.split('\n').map(value => value.trim()).filter(Boolean);

  $effect(() => {
    const loaded = $state.snapshot(record) as Loaded | null;
    if (!loaded) return;
    const s = loaded.session;
    if (s.data.assessment) assessment = structuredClone(s.data.assessment);
    if (s.data.manifesto) manifesto = structuredClone(s.data.manifesto);
    if (s.data.document) doc = structuredClone(s.data.document);
    if (s.data.approval) decision = { ...decision, response: s.data.approval.response, businessConfirmed: s.data.approval.businessConfirmed, standConfirmed: s.data.approval.standConfirmed, approverName: s.data.approval.approver?.name ?? '', approverRole: s.data.approval.approver?.role ?? '', approverRef: s.data.approval.approver?.authorityRef ?? '', exactResponse: s.data.approval.exactResponse ?? '' };
    documents = loaded.documents ?? [];
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
    if (id) { record = result; documents = result.documents ?? []; viewStep = activeStep; }
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

  function candidate(stage: string) { return record?.session?.drafts?.[stage] ?? null; }
  function useAssessment() { const c = candidate('assessment'); if (c) assessment = structuredClone(c); }
  function useManifesto() { const c = candidate('manifesto'); if (c) manifesto = structuredClone(c); }
  function useDocument() { const c = candidate('document'); if (c) doc = structuredClone(c); }

  function addContradiction() { assessment.contradictions = [...assessment.contradictions, { id: crypto.randomUUID(), issue: '', owningSource: '', whyItMatters: '', requiredAction: '', blocksFoundation: true }]; }
  function addConviction() { manifesto.convictions = [...manifesto.convictions, { statement: '', evidence: '', consequence: '' }]; }
  function addImplication() { manifesto.implications = [...manifesto.implications, { id: `imp-${manifesto.implications.length + 1}`, implication: '', disposition: 'reflected', target: '' }]; }
  function addTrace() { manifesto.sourceTrace = [...manifesto.sourceTrace, { item: '', sourceRef: '' }]; }
  function addProduct() { doc.productsServices = [...doc.productsServices, { name: '', what: '', whoFor: '', state: 'current' }]; }
  function addPortfolio() { doc.portfolio = [...doc.portfolio, { name: '', role: '', status: '', relationship: '' }]; }
  function addLineage() { doc.sectionLineage = [...doc.sectionLineage, { section: '', sources: [], basis: '', limitation: '' }]; }

  function confirmStage(stage: string, payload: unknown) { void send('confirm', { stage, payload }); }
  function reviseStage(stage: string) { void send('revise', { stage }); }
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

    {#if record.session.stage === 'assessment'}
      <section class="space-y-4 rounded border p-5">
        <h2 class="text-xl">Input assessment</h2>
        <p>Assess what the pinned sources actually establish for each of the sixteen realities. Never upgrade a row to fill a gap.</p>
        {#if candidate('assessment')}<aside class="rounded border border-blue-500/60 p-3"><p><strong>Unconfirmed suggestion.</strong></p><button disabled={busy || !canEdit} onclick={useAssessment}>Load suggestion into editable fields</button></aside>{/if}
        {#each assessment.rows as row, index (row.id)}
          <fieldset class="space-y-2 rounded border p-3">
            <legend class="font-semibold">{ROW_LABELS[row.id]}</legend>
            <div class="grid gap-2 md:grid-cols-2">
              <label>State<select class="mt-1 w-full rounded border p-2" bind:value={assessment.rows[index].state}><option value="sufficient">Sufficient</option><option value="partial">Partial</option><option value="missing">Missing</option><option value="conflicted">Conflicted</option><option value="not-applicable">Not applicable</option></select></label>
              <label>Basis<select class="mt-1 w-full rounded border p-2" bind:value={assessment.rows[index].basis}><option value="observed-fact">Observed fact</option><option value="approved-decision">Approved decision</option><option value="supported-hypothesis">Supported hypothesis</option><option value="unsupported-assertion">Unsupported assertion</option><option value="unknown">Unknown</option></select></label>
            </div>
            <label class="block">Evidence<textarea class="mt-1 w-full rounded border p-2" rows="2" bind:value={assessment.rows[index].evidence}></textarea></label>
            <label class="block">Owner<input class="mt-1 w-full rounded border p-2" bind:value={assessment.rows[index].owner}/></label>
            <label class="block">Next action<textarea class="mt-1 w-full rounded border p-2" rows="2" bind:value={assessment.rows[index].nextAction}></textarea></label>
          </fieldset>
        {/each}
        <h3 class="font-semibold">Contradictions</h3>
        {#each assessment.contradictions as contradiction, index (contradiction.id)}
          <fieldset class="space-y-2 rounded border p-3">
            <label class="block">Issue<textarea class="mt-1 w-full rounded border p-2" rows="2" bind:value={assessment.contradictions[index].issue}></textarea></label>
            <label class="block">Owning source<input class="mt-1 w-full rounded border p-2" bind:value={assessment.contradictions[index].owningSource}/></label>
            <label class="block">Why it matters<textarea class="mt-1 w-full rounded border p-2" rows="2" bind:value={assessment.contradictions[index].whyItMatters}></textarea></label>
            <label class="block">Required action<textarea class="mt-1 w-full rounded border p-2" rows="2" bind:value={assessment.contradictions[index].requiredAction}></textarea></label>
            <label class="flex items-center gap-2"><input type="checkbox" bind:checked={assessment.contradictions[index].blocksFoundation}/> Blocks the foundation</label>
          </fieldset>
        {/each}
        <button disabled={busy || !canEdit} onclick={addContradiction}>Add contradiction</button>
        <fieldset class="space-y-2 rounded border p-3">
          <legend class="font-semibold">Decision</legend>
          <label>State<select class="mt-1 w-full rounded border p-2" bind:value={assessment.decision.state}><option value="passed">Passed</option><option value="remediation_required">Remediation required</option><option value="blocked">Blocked</option><option value="awaiting_owner_decision">Awaiting owner decision</option></select></label>
          <label class="block">Reason<textarea class="mt-1 w-full rounded border p-2" rows="2" bind:value={assessment.decision.reason}></textarea></label>
          <label class="block">Questions for the return path, one per line<textarea class="mt-1 w-full rounded border p-2" rows="2" value={assessment.decision.questions.join('\n')} oninput={(event) => { assessment.decision.questions = lines((event.currentTarget as HTMLTextAreaElement).value); }}></textarea></label>
          <label>Manifesto route<select class="mt-1 w-full rounded border p-2" bind:value={assessment.decision.manifestoRoute}><option value="permitted">Permitted</option><option value="refused">Refused</option></select></label>
          <label class="block">Assessed by<input class="mt-1 w-full rounded border p-2" bind:value={assessment.assessedBy}/></label>
        </fieldset>
        <div class="flex gap-3"><button disabled={busy || !canEdit} onclick={() => send('draft', { stage: 'assessment' })}>Suggest assessment</button><button class="rounded bg-primary px-4 py-2 text-primary-foreground" disabled={busy || !canEdit} onclick={() => confirmStage('assessment', assessment)}>Confirm assessment</button>{#if record.session.confirmations.assessment}<button disabled={busy || !canEdit} onclick={() => reviseStage('assessment')}>Reopen</button>{/if}</div>
      </section>
    {:else if record.session.stage === 'manifesto'}
      <section class="space-y-4 rounded border p-5">
        <h2 class="text-xl">Business manifesto</h2>
        {#if candidate('manifesto')}<aside class="rounded border border-blue-500/60 p-3"><p><strong>Unconfirmed suggestion.</strong></p><button disabled={busy || !canEdit} onclick={useManifesto}>Load suggestion into editable fields</button></aside>{/if}
        <h3 class="font-semibold">Convictions</h3>
        {#each manifesto.convictions as conviction, index (index)}
          <fieldset class="space-y-2 rounded border p-3">
            <label class="block">Statement<textarea class="mt-1 w-full rounded border p-2" rows="2" bind:value={manifesto.convictions[index].statement}></textarea></label>
            <label class="block">Evidence<textarea class="mt-1 w-full rounded border p-2" rows="2" bind:value={manifesto.convictions[index].evidence}></textarea></label>
            <label class="block">Consequence<textarea class="mt-1 w-full rounded border p-2" rows="2" bind:value={manifesto.convictions[index].consequence}></textarea></label>
          </fieldset>
        {/each}
        <button disabled={busy || !canEdit} onclick={addConviction}>Add conviction</button>
        <h3 class="font-semibold">Spine</h3>
        {#each SPINE_KEYS as key (key)}<label class="block">{SPINE_LABELS[key]}<textarea class="mt-1 w-full rounded border p-2" rows="2" bind:value={manifesto.spine[key]}></textarea></label>{/each}
        <label class="block">Manifesto<textarea class="mt-1 w-full rounded border p-2" rows="8" bind:value={manifesto.manifesto}></textarea></label>
        <label class="block">Governing declarations, one per line (each must appear verbatim above)<textarea class="mt-1 w-full rounded border p-2" rows="3" value={manifesto.declarations.join('\n')} oninput={(event) => { manifesto.declarations = lines((event.currentTarget as HTMLTextAreaElement).value); }}></textarea></label>
        <h3 class="font-semibold">Foundation implications</h3>
        {#each manifesto.implications as implication, index (index)}
          <fieldset class="grid gap-2 rounded border p-3 md:grid-cols-3">
            <label>Implication<input class="mt-1 w-full rounded border p-2" bind:value={manifesto.implications[index].implication}/></label>
            <label>Disposition<select class="mt-1 w-full rounded border p-2" bind:value={manifesto.implications[index].disposition}><option value="reflected">Reflected</option><option value="returned">Returned</option><option value="unresolved-blocking">Unresolved (blocking)</option></select></label>
            <label>Target<input class="mt-1 w-full rounded border p-2" bind:value={manifesto.implications[index].target}/></label>
          </fieldset>
        {/each}
        <button disabled={busy || !canEdit} onclick={addImplication}>Add implication</button>
        <h3 class="font-semibold">Source trace</h3>
        {#each manifesto.sourceTrace as trace, index (index)}
          <div class="grid gap-2 md:grid-cols-2"><input class="rounded border p-2" placeholder="Item" bind:value={manifesto.sourceTrace[index].item}/><input class="rounded border p-2" placeholder="Source reference" bind:value={manifesto.sourceTrace[index].sourceRef}/></div>
        {/each}
        <button disabled={busy || !canEdit} onclick={addTrace}>Add trace entry</button>
        <h3 class="font-semibold">Declaration tests</h3>
        {#each manifesto.declarationTests as test, index (test.id)}
          <div class="grid gap-2 md:grid-cols-[12rem_10rem_1fr] md:items-center">
            <span>{test.id}</span>
            <select class="rounded border p-2" bind:value={manifesto.declarationTests[index].result}><option value="pass">Pass</option><option value="fail">Fail</option><option value="unassessed">Unassessed</option></select>
            <input class="rounded border p-2" placeholder="Basis" bind:value={manifesto.declarationTests[index].basis}/>
          </div>
        {/each}
        <div class="flex gap-3"><button disabled={busy || !canEdit} onclick={() => send('draft', { stage: 'manifesto' })}>Suggest manifesto</button><button class="rounded bg-primary px-4 py-2 text-primary-foreground" disabled={busy || !canEdit} onclick={() => confirmStage('manifesto', manifesto)}>Confirm manifesto</button>{#if record.session.confirmations.manifesto}<button disabled={busy || !canEdit} onclick={() => reviseStage('manifesto')}>Reopen</button>{/if}</div>
      </section>
    {:else if record.session.stage === 'document'}
      <section class="space-y-4 rounded border p-5">
        <h2 class="text-xl">Foundation document</h2>
        {#if candidate('document')}<aside class="rounded border border-blue-500/60 p-3"><p><strong>Unconfirmed suggestion.</strong></p><button disabled={busy || !canEdit} onclick={useDocument}>Load suggestion into editable fields</button></aside>{/if}
        <label class="block">Business name<input class="mt-1 w-full rounded border p-2" bind:value={doc.business}/></label>
        <label class="block">What this document is for<textarea class="mt-1 w-full rounded border p-2" rows="2" bind:value={doc.purposeText}></textarea></label>
        <label class="block">The business in plain terms<textarea class="mt-1 w-full rounded border p-2" rows="3" bind:value={doc.plainTerms}></textarea></label>
        <h3 class="font-semibold">At a glance</h3>
        {#each ['form','buyNow','payer','user','trigger','receives','delivery','operates'] as key (key)}<label class="block">{key}<input class="mt-1 w-full rounded border p-2" bind:value={doc.atAGlance[key]}/></label>{/each}
        {#each ['whatTheBusinessIs','whyItExists','whoItServes','whatItProduces','practicalOutcome','distinction','foundersUnderstanding','capabilityCreated','placeInSystem','approvalAuthorises'] as key (key)}<label class="block">{key}<textarea class="mt-1 w-full rounded border p-2" rows="2" bind:value={doc[key]}></textarea></label>{/each}
        <h3 class="font-semibold">Products and services</h3>
        {#each doc.productsServices as product, index (index)}
          <fieldset class="grid gap-2 rounded border p-3 md:grid-cols-4">
            <input class="rounded border p-2" placeholder="Name" bind:value={doc.productsServices[index].name}/>
            <input class="rounded border p-2" placeholder="What it is" bind:value={doc.productsServices[index].what}/>
            <input class="rounded border p-2" placeholder="Who for" bind:value={doc.productsServices[index].whoFor}/>
            <select class="rounded border p-2" bind:value={doc.productsServices[index].state}><option value="current">Current</option><option value="conditional">Conditional</option><option value="validating">Validating</option><option value="planned">Planned</option><option value="forthcoming">Forthcoming</option><option value="deferred">Deferred</option><option value="retired">Retired</option></select>
          </fieldset>
        {/each}
        <button disabled={busy || !canEdit} onclick={addProduct}>Add product</button>
        <label>Scope<select class="mt-1 w-full rounded border p-2" bind:value={doc.scope}><option value="whole-business">Whole business</option><option value="portfolio">Portfolio</option><option value="individual-offer">Individual offer</option></select></label>
        <h3 class="font-semibold">Portfolio</h3>
        {#each doc.portfolio as item, index (index)}
          <fieldset class="grid gap-2 rounded border p-3 md:grid-cols-4">
            <input class="rounded border p-2" placeholder="Name" bind:value={doc.portfolio[index].name}/>
            <input class="rounded border p-2" placeholder="Role" bind:value={doc.portfolio[index].role}/>
            <input class="rounded border p-2" placeholder="Status" bind:value={doc.portfolio[index].status}/>
            <input class="rounded border p-2" placeholder="Relationship" bind:value={doc.portfolio[index].relationship}/>
          </fieldset>
        {/each}
        <button disabled={busy || !canEdit} onclick={addPortfolio}>Add portfolio item</button>
        <div class="grid gap-2 md:grid-cols-2">
          <label>Offer form<select class="mt-1 w-full rounded border p-2" bind:value={doc.offerForm}><option value="service">Service</option><option value="physical-product">Physical product</option><option value="software">Software</option><option value="platform">Platform</option><option value="methodology-or-intellectual-system">Methodology</option><option value="licensed-intellectual-property">Licensed IP</option><option value="hybrid-or-portfolio">Hybrid or portfolio</option></select></label>
          <label>Explanatory dependency<select class="mt-1 w-full rounded border p-2" bind:value={doc.explanatoryDependency}><option value="required">Required</option><option value="helpful">Helpful</option><option value="not-required">Not required</option><option value="unresolved">Unresolved</option></select></label>
        </div>
        <label class="flex items-center gap-2"><input type="checkbox" bind:checked={doc.includeSpine}/> Include the manifesto spine</label>
        <h3 class="font-semibold">Section lineage</h3>
        {#each doc.sectionLineage as entry, index (index)}
          <div class="grid gap-2 md:grid-cols-[14rem_1fr] md:items-start">
            <select class="rounded border p-2" bind:value={doc.sectionLineage[index].section}>{#each SECTIONS as section (section)}<option value={section}>{section}</option>{/each}<option value="how-the-business-works">how-the-business-works</option></select>
            <input class="rounded border p-2" placeholder="Sources, comma separated" value={entry.sources.join(', ')} oninput={(event) => { doc.sectionLineage[index].sources = (event.currentTarget as HTMLInputElement).value.split(',').map(value => value.trim()).filter(Boolean); }}/>
            <input class="rounded border p-2 md:col-start-2" placeholder="Basis" bind:value={doc.sectionLineage[index].basis}/>
          </div>
        {/each}
        <button disabled={busy || !canEdit} onclick={addLineage}>Add lineage entry</button>
        <h3 class="font-semibold">Structural tests</h3>
        {#each doc.structuralTests as test, index (test.id)}
          <div class="grid gap-2 md:grid-cols-[12rem_10rem_1fr] md:items-center">
            <span>{test.id}</span>
            <select class="rounded border p-2" bind:value={doc.structuralTests[index].result}><option value="pass">Pass</option><option value="fail">Fail</option><option value="unassessed">Unassessed</option></select>
            <input class="rounded border p-2" placeholder="Basis" bind:value={doc.structuralTests[index].basis}/>
          </div>
        {/each}
        <h3 class="font-semibold">Distillation</h3>
        <label class="block">Load-bearing minimum<textarea class="mt-1 w-full rounded border p-2" rows="2" bind:value={doc.distillation.loadBearingMinimum}></textarea></label>
        <label class="block">Hostile reading<textarea class="mt-1 w-full rounded border p-2" rows="2" bind:value={doc.distillation.hostileReading}></textarea></label>
        <label class="block">Variables preserved, one per line<textarea class="mt-1 w-full rounded border p-2" rows="2" value={doc.distillation.variablesPreserved.join('\n')} oninput={(event) => { doc.distillation.variablesPreserved = lines((event.currentTarget as HTMLTextAreaElement).value); }}></textarea></label>
        <div class="flex gap-3"><button disabled={busy || !canEdit} onclick={() => send('draft', { stage: 'document' })}>Suggest document</button><button class="rounded bg-primary px-4 py-2 text-primary-foreground" disabled={busy || !canEdit} onclick={() => confirmStage('document', doc)}>Confirm document</button>{#if record.session.confirmations.document}<button disabled={busy || !canEdit} onclick={() => reviseStage('document')}>Reopen</button>{/if}</div>
      </section>
    {:else if record.session.stage === 'client-decision'}
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
    {:else if record.session.stage === 'sealed'}
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
