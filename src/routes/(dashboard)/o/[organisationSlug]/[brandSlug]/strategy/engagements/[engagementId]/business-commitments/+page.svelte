<script lang="ts">
  import { onMount, untrack } from 'svelte';
  import { replaceState } from '$app/navigation';
  import Stepper from '#lib/modules/strategy/components/Stepper.svelte';
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
  let pendingStep = $state<string | null>(null);

  const labels = ['Upstream', 'Inputs', 'Challenge', 'Journey', 'Grid', 'Proof', 'Friction', 'Credibility', 'Confrontations', 'Cost', 'Advocate', 'Judgement', 'Sealed'];
  const stageIndex: Record<string, number> = { upstream: 0, inputs: 1, challenge: 2, journey: 3, grid: 4, proof: 5, friction: 6, credibility: 7, confrontations: 8, cost: 9, advocate: 10, judgement: 11, sealed: 12 };
  let activeStep = $derived(record ? (stageIndex[record.session.stage] ?? 0) : 0);
  let canEdit = $derived(Boolean(record && record.session.stage !== 'sealed' && record.upstreamCurrent));

  const GRID_ACTIONS = ['question', 'reject', 'commit', 'introduce'] as const;
  const FRICTION_SOURCES = ['beliefContradiction', 'operationalChange', 'culturalShift', 'customerExplanation', 'economicCost', 'accumulatedProof', 'specialistAuthority'] as const;
  const FRICTION_LABELS: Record<string, string> = { beliefContradiction: 'Belief contradiction', operationalChange: 'Operational change', culturalShift: 'Cultural shift', customerExplanation: 'Customer explanation', economicCost: 'Economic cost', accumulatedProof: 'Accumulated proof', specialistAuthority: 'Specialist authority' };
  const ADVOCATE_PROMPTS: Record<string, string> = {
    'case-for-default': 'What if the Industry Default is right?',
    'funded-copycat': 'What happens when a well-funded competitor copies this positioning?',
    'positioning-vs-preference': 'Is this positioning or just preference?',
  };

  const emptyRow = (action: string) => ({ action, move: '', beliefRationale: '', proofCommitment: '', operationalRule: '', specialisationSignal: '', proofArtefactType: '', traceToBelief: '' });
  const emptyProof = (action: string) => ({ action, product: '', policy: '', story: '', framework: '', proofEconomy: 'discrete-at-cost', evidenceStatus: 'supported', claimBoundaryNote: '', capturePlan: '' });
  const emptyFriction = (action: string) => ({ action, sources: Object.fromEntries(FRICTION_SOURCES.map(source => [source, { level: 'medium', note: '' }])) });

  let inputs = $state<any>({ solvesFor: 'founder', solvesForNote: '', commitmentScope: 'business', scopeNote: '', priorPositioning: { supplied: false, source: '', currentness: '', text: '', note: '' }, terrainRead: '' });
  let contradictionsText = $state('');
  let genuineVsContrarian = $state('');
  let journey = $state<any>({ from: '', to: '', experientialChange: '', experienceShape: 'product-physical', discoveryMechanism: '' });
  let grid = $state<any[]>(GRID_ACTIONS.map(emptyRow));
  let proof = $state<any[]>(GRID_ACTIONS.map(emptyProof));
  let friction = $state<any[]>(GRID_ACTIONS.map(emptyFriction));
  let lowestFrictionCompetitor = $state('');
  let lowestFrictionBasis = $state('');
  let threatAssessment = $state('');
  let credibility = $state<any>({ referenceEvidence: '', state: 'credible', cause: '', reviewCondition: '' });
  let pastAudit = $state<any[]>([]);
  let futureConfrontationsText = $state('');
  let costsText = $state('');
  let advocate = $state<any[]>(Object.keys(ADVOCATE_PROMPTS).map(id => ({ id, case: '', verdict: 'survives', note: '' })));
  let judgement = $state<any>({ optionsText: '', recommendation: '', confidence: 'moderate', confidenceBasis: '', ifHolds: '', ifNot: '', ifNoDecision: '', reversalConditions: '', integrityCheck: '', professionalCall: 'proceed_conditionally', nextWork: '' });
  let outcome = $state<any>({ outcome: 'a', statement: '', returnModule: '02', refineWhat: '', evidenceProduced: '' });
  let successorReason = $state('');
  let documents = $state<any[]>(initial.session ? (initial as Loaded).documents ?? [] : []);

  const lines = (text: string) => text.split('\n').map(value => value.trim()).filter(Boolean);

  $effect(() => {
    const loaded = $state.snapshot(record) as Loaded | null;
    if (!loaded) return;
    const c = loaded.commitments;
    inputs = structuredClone(c.inputs);
    contradictionsText = (c.beliefChallenge.contradictions ?? []).join('\n');
    genuineVsContrarian = c.beliefChallenge.genuineVsContrarian ?? '';
    journey = structuredClone(c.journey);
    grid = GRID_ACTIONS.map(action => ({ ...emptyRow(action), ...(c.grid.find((row: any) => row.action === action) ?? {}) }));
    proof = GRID_ACTIONS.map(action => ({ ...emptyProof(action), ...(c.proof.find((row: any) => row.action === action) ?? {}) }));
    friction = GRID_ACTIONS.map(action => {
      const saved = c.friction.rows.find((row: any) => row.action === action);
      const base = emptyFriction(action);
      return saved ? { action, sources: { ...base.sources, ...saved.sources } } : base;
    });
    lowestFrictionCompetitor = c.friction.lowestFrictionCompetitor ?? '';
    lowestFrictionBasis = c.friction.lowestFrictionBasis ?? '';
    threatAssessment = c.friction.threatAssessment ?? '';
    credibility = structuredClone(c.credibility);
    pastAudit = structuredClone(c.confrontations.pastAudit ?? []);
    futureConfrontationsText = (c.confrontations.futureConfrontations ?? []).join('\n');
    costsText = (c.costOfCommitment.costs ?? []).join('\n');
    advocate = Object.keys(ADVOCATE_PROMPTS).map(id => ({ id, case: '', verdict: 'survives', note: '', ...(c.advocate.challenges.find((row: any) => row.id === id) ?? {}) }));
    const j = c.judgement;
    judgement = { optionsText: (j.optionsConsidered ?? []).join('\n'), recommendation: j.recommendation, confidence: j.confidence ?? 'moderate', confidenceBasis: j.confidenceBasis, ifHolds: j.commercialConsequences.ifHolds, ifNot: j.commercialConsequences.ifNot, ifNoDecision: j.commercialConsequences.ifNoDecision, reversalConditions: j.reversalConditions, integrityCheck: j.integrityCheck, professionalCall: j.professionalCall ?? 'proceed_conditionally', nextWork: j.nextWork };
    if (c.outcome.outcome !== 'pending') outcome = { outcome: c.outcome.outcome, statement: c.outcome.statement, returnModule: c.outcome.returnDoc?.module ?? '02', refineWhat: c.outcome.returnDoc?.refineWhat ?? '', evidenceProduced: c.outcome.returnDoc?.evidenceProduced ?? '' };
    documents = loaded.documents ?? [];
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
    if (id) { record = result; documents = result.documents ?? []; viewStep = activeStep; }
    else { sessions = result.sessions ?? []; sourceReady = result.sourceReady; record = null; }
  }

  async function pollJob(id: string, step: string) {
    busy = true; pendingJob = id; pendingStep = step;
    message = `Drafting ${step}…`;
    try {
      const url = new URL(location.pathname, location.origin);
      url.searchParams.set('jobId', id); url.searchParams.set('jobStep', step); url.searchParams.set('sessionId', record!.session.sessionId);
      replaceState(url, {});
      const until = Date.now() + 120000;
      while (Date.now() < until) {
        const response = await fetch(url, { headers: { accept: 'application/json' } });
        const job = await response.json();
        if (!response.ok) throw new Error(job.error ?? 'Unable to check draft progress');
        if (job.status === 'succeeded') {
          pendingJob = null; pendingStep = null;
          await readCurrent(job.sessionId);
          message = `Suggested ${step} draft loaded. Review and edit every field before confirming it.`;
          return;
        }
        if (job.status === 'failed' || job.status === 'cancelled') { pendingJob = null; pendingStep = null; throw new Error('Draft job stopped. Your confirmed work is unchanged.'); }
        await new Promise(resolve => setTimeout(resolve, 1800));
      }
      message = 'Draft is still running. Return to this page to check its persisted job.';
    } catch (cause) { message = cause instanceof Error ? cause.message : 'Unable to check draft'; }
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
      if (action === 'create') { await readCurrent(result.session?.sessionId ?? result.payload?.session?.sessionId ?? result.id); }
      else if (action === 'successor') { await readCurrent(result.id); }
      else await readCurrent(record!.session.sessionId);
      message = action === 'seal' ? 'Business Commitments is sealed and saved.' : action === 'successor' ? 'A new editable successor is open, pinned to the current sealed Market Reality source.' : 'Saved. The current record has been reloaded.';
    } catch (cause) { message = cause instanceof Error ? cause.message : 'Unable to save'; }
    finally { busy = false; }
  }

  function candidate(step: string) { return record?.drafts?.[step]?.candidate as any; }

  function useChallenge() { const c = candidate('challenge'); if (!c) return; contradictionsText = (c.contradictions ?? []).join('\n'); genuineVsContrarian = c.genuineVsContrarian ?? genuineVsContrarian; }
  function useJourney() { const c = candidate('journey'); if (!c) return; journey = { ...journey, ...c }; }
  function useGrid() { const c = candidate('grid'); if (!c?.rows) return; grid = GRID_ACTIONS.map(action => ({ ...emptyRow(action), ...(c.rows.find((row: any) => row.action === action) ?? {}) })); }
  function useProof() { const c = candidate('proof'); if (!c?.rows) return; proof = GRID_ACTIONS.map(action => ({ ...emptyProof(action), ...(c.rows.find((row: any) => row.action === action) ?? {}) })); }
  function useFriction() {
    const c = candidate('friction'); if (!c?.rows) return;
    friction = GRID_ACTIONS.map(action => {
      const saved = c.rows.find((row: any) => row.action === action);
      const base = emptyFriction(action);
      return saved ? { action, sources: { ...base.sources, ...saved.sources } } : base;
    });
    lowestFrictionCompetitor = c.lowestFrictionCompetitor ?? lowestFrictionCompetitor;
    lowestFrictionBasis = c.lowestFrictionBasis ?? lowestFrictionBasis;
    threatAssessment = c.threatAssessment ?? threatAssessment;
  }
  function useCost() { const c = candidate('cost'); if (!c?.costs) return; costsText = c.costs.join('\n'); }
  function useAdvocate() { const c = candidate('advocate'); if (!c?.challenges) return; advocate = advocate.map(row => ({ ...row, case: c.challenges.find((entry: any) => entry.id === row.id)?.case ?? row.case })); }
  function useJudgement() {
    const c = candidate('judgement'); if (!c) return;
    judgement = { ...judgement, optionsText: (c.optionsConsidered ?? []).join('\n'), recommendation: c.recommendation ?? '', confidence: c.confidence ?? judgement.confidence, confidenceBasis: c.confidenceBasis ?? '', ifHolds: c.commercialConsequences?.ifHolds ?? '', ifNot: c.commercialConsequences?.ifNot ?? '', ifNoDecision: c.commercialConsequences?.ifNoDecision ?? '', reversalConditions: c.reversalConditions ?? '', integrityCheck: c.integrityCheck ?? '', professionalCall: c.professionalCall ?? judgement.professionalCall, nextWork: c.nextWork ?? '' };
  }

  function confirmInputs() { void send('confirm-inputs', { inputs: { ...inputs, priorPositioning: { ...inputs.priorPositioning } } }); }
  function confirmChallenge() { void send('confirm-challenge', { challenge: { contradictions: lines(contradictionsText), genuineVsContrarian } }); }
  function confirmJourney() { void send('confirm-journey', { journey }); }
  function confirmGrid() { void send('confirm-grid', { grid: { rows: grid } }); }
  function confirmProof() { void send('confirm-proof', { proof: { rows: proof } }); }
  function confirmFriction() { void send('confirm-friction', { friction: { rows: friction, lowestFrictionCompetitor, lowestFrictionBasis, threatAssessment } }); }
  function confirmCredibility() { void send('confirm-credibility', { credibility }); }
  function confirmConfrontations() { void send('confirm-confrontations', { confrontations: { pastAudit, futureConfrontations: lines(futureConfrontationsText) } }); }
  function confirmCost() { void send('confirm-cost', { cost: { costs: lines(costsText) } }); }
  function confirmAdvocate() { void send('confirm-advocate', { advocate: { challenges: advocate } }); }
  function confirmJudgement() {
    void send('confirm-judgement', { judgement: { optionsConsidered: lines(judgement.optionsText), recommendation: judgement.recommendation, confidence: judgement.confidence, confidenceBasis: judgement.confidenceBasis, commercialConsequences: { ifHolds: judgement.ifHolds, ifNot: judgement.ifNot, ifNoDecision: judgement.ifNoDecision }, reversalConditions: judgement.reversalConditions, integrityCheck: judgement.integrityCheck, professionalCall: judgement.professionalCall, nextWork: judgement.nextWork } });
  }
  function recordOutcome() {
    const returnDoc = outcome.outcome === 'x' ? { module: outcome.returnModule, refineWhat: outcome.refineWhat, evidenceProduced: outcome.evidenceProduced } : null;
    void send('outcome', { outcome: { outcome: outcome.outcome, statement: outcome.statement, returnDoc } });
  }
  function addPastAudit() { pastAudit = [...pastAudit, { item: '', beliefSays: 'yes', decision: null, note: '' }]; }
</script>

<svelte:head><title>Business Commitments · Strategy</title></svelte:head>
<main class="mx-auto max-w-6xl space-y-6 p-6">
  <header class="space-y-2">
    <p class="text-sm text-muted-foreground">Strategy · Module 03</p>
    <h1 class="text-3xl font-semibold">Business Commitments</h1>
    <p>Turn the sealed market finding into a business position: what we challenge, what we commit to proving, and what it costs competitors to follow. Every suggestion stays editable until a separate human confirmation.</p>
  </header>
  {#if message}<p class="rounded border p-3" role="status">{message}</p>{/if}
  {#if pendingJob}<button disabled={busy || !hydrated} onclick={() => pollJob(pendingJob!, pendingStep ?? 'challenge')}>Check draft progress</button>{/if}

  {#if !record}
    <section class="space-y-4 rounded border p-5">
      <h2 class="text-xl font-semibold">Start or reopen a Business Commitments record</h2>
      {#if !sourceReady}<p role="status">No eligible sealed Market Reality record is connected yet. Starting a record will verify and connect the newest sealed M02 outcome.</p>{/if}
      <button disabled={busy || !hydrated} onclick={() => send('create')}>Start from the current sealed Market Reality</button>
      <div class="flex flex-wrap gap-2">{#each sessions as item (item.id)}<button class="rounded border px-3 py-2" disabled={busy || !hydrated} onclick={async () => { busy = true; try { await readCurrent(item.id); } catch (e) { message = e instanceof Error ? e.message : 'Unable to load'; } finally { busy = false; } }}>Open record · revision {item.revision}</button>{/each}</div>
    </section>
  {:else}
    {#if !record.upstreamCurrent}<p class="rounded border border-amber-500 p-3" role="alert">The pinned Market Reality source is no longer current. This record stays readable, but new drafts or edits cannot continue; start a fresh record from the current sealed source.</p>{/if}
    <p class="text-sm">{record.session.stage.replaceAll('-', ' ')} · revision {record.revision} · source {record.sourceVersionId} · {record.sourceHash.slice(0, 12)}…</p>

    <details class="rounded border p-3">
      <summary class="font-medium">Sealed upstream this run builds on</summary>
      <dl class="mt-3 grid gap-3 md:grid-cols-2">
        <dt>Core belief</dt><dd>{record.commitments.upstream.m01Inputs.coreBelief}</dd>
        <dt>Hidden Truth</dt><dd>{record.commitments.upstream.m01Inputs.hiddenTruth}</dd>
        <dt>Industry default</dt><dd>{record.commitments.upstream.m02Findings.descriptiveDefault}</dd>
        <dt>Cohort</dt><dd>{record.commitments.upstream.m02Findings.cohort}</dd>
        <dt>M02 outcome</dt><dd>{record.commitments.upstream.m02Outcome} · {record.commitments.upstream.m02RelianceScope}</dd>
        <dt>M01 lock</dt><dd>{record.commitments.upstream.m01.lockState}</dd>
      </dl>
      {#if record.commitments.upstream.carriedForward.acknowledgedRisks.length}
        <h3 class="mt-4 font-semibold">Acknowledged structural risks</h3>
        <ul class="list-disc pl-6">{#each record.commitments.upstream.carriedForward.acknowledgedRisks as risk (risk.pattern)}<li>{risk.label} · {risk.state} · routed {risk.routing ?? 'unrouted'}{risk.landedIn ? ` · landed ${risk.landedIn}` : ''}</li>{/each}</ul>
      {/if}
    </details>

    {#if record.commitments.riskFlags.length}<aside class="rounded border border-amber-500/60 p-3"><h3 class="font-semibold">Risk flags</h3><ul class="list-disc pl-6">{#each record.commitments.riskFlags as flag (flag)}<li>{flag}</li>{/each}</ul></aside>{/if}

    <Stepper steps={labels.map(label => ({ label }))} bind:viewStep {activeStep} stepDone={labels.map((_, index) => index < activeStep || (index === 12 && !!record?.seal))} canVisit={(index: number) => index === activeStep} runLabel="Business Commitments progress" />

    {#if record.session.stage === 'upstream'}
      <section class="space-y-3 rounded border p-5">
        <h2 class="text-xl">Review the sealed upstream</h2>
        <p>The human act here is having read the sealed conviction and the sealed market findings above. Nothing is drafted from recall.</p>
        <button class="rounded bg-primary px-4 py-2 text-primary-foreground" disabled={busy || !canEdit} onclick={() => send('confirm-upstream', { route: 'full' })}>I have reviewed the sealed upstream</button>
      </section>
    {:else if record.session.stage === 'inputs'}
      <section class="space-y-4 rounded border p-5">
        <h2 class="text-xl">Review inputs</h2>
        <label class="block">Whose problem-shape does this positioning solve for?
          <select class="mt-1 w-full rounded border p-2" bind:value={inputs.solvesFor}><option value="founder">The founder's</option><option value="second_voice">The second voice's</option><option value="shared">Shared</option></select>
        </label>
        <label class="block">Why that framing wins<textarea class="mt-1 w-full rounded border p-2" rows="2" bind:value={inputs.solvesForNote}></textarea></label>
        <label class="block">Commitment scope
          <select class="mt-1 w-full rounded border p-2" bind:value={inputs.commitmentScope}><option value="business">Business</option><option value="offer">Offer</option><option value="business_unit">Business unit</option><option value="portfolio">Portfolio</option><option value="parent_brand">Parent brand</option><option value="sub_brand">Sub-brand</option><option value="initiative">Initiative</option></select>
        </label>
        <label class="block">Scope note<textarea class="mt-1 w-full rounded border p-2" rows="2" bind:value={inputs.scopeNote}></textarea></label>
        <fieldset class="space-y-2 rounded border p-3">
          <legend>Existing positioning (optional input, never authority)</legend>
          <label class="flex items-center gap-2"><input type="checkbox" bind:checked={inputs.priorPositioning.supplied}/> Prior positioning supplied</label>
          {#if inputs.priorPositioning.supplied}
            <label class="block">Source<input class="mt-1 w-full rounded border p-2" bind:value={inputs.priorPositioning.source}/></label>
            <label class="block">Currentness<input class="mt-1 w-full rounded border p-2" bind:value={inputs.priorPositioning.currentness}/></label>
            <label class="block">Material<textarea class="mt-1 w-full rounded border p-2" rows="3" bind:value={inputs.priorPositioning.text}></textarea></label>
          {/if}
        </fieldset>
        <label class="block">Terrain read — how the diagnosis shapes this run<textarea class="mt-1 w-full rounded border p-2" rows="3" bind:value={inputs.terrainRead}></textarea></label>
        <p class="text-sm text-muted-foreground">Terrain diagnosis: {record.commitments.upstream.carriedForward.terrainDiagnosis || 'unrecorded'}. A cyclical or undiagnosed terrain needs a written reason to proceed.</p>
        <button class="rounded bg-primary px-4 py-2 text-primary-foreground" disabled={busy || !canEdit} onclick={confirmInputs}>Confirm inputs</button>
      </section>
    {:else if record.session.stage === 'challenge'}
      <section class="space-y-4 rounded border p-5">
        <h2 class="text-xl">Belief challenge</h2>
        <p>What the market believes: <strong>{record.commitments.upstream.m02Findings.descriptiveDefault}</strong></p>
        <p>What we believe: <strong>{record.commitments.upstream.m01Inputs.coreBelief}</strong></p>
        {#if candidate('challenge')}<aside class="rounded border border-blue-500/60 p-3"><p><strong>Unconfirmed suggestion.</strong></p><button disabled={busy || !canEdit} onclick={useChallenge}>Load suggestion into editable fields</button></aside>{/if}
        <label class="block">Points of contradiction, one per line<textarea class="mt-1 w-full rounded border p-2" rows="4" bind:value={contradictionsText}></textarea></label>
        <label class="block">Genuine belief difference or contrarianism?<textarea class="mt-1 w-full rounded border p-2" rows="4" bind:value={genuineVsContrarian}></textarea></label>
        <div class="flex gap-3"><button disabled={busy || !canEdit} onclick={() => send('draft', { step: 'challenge' })}>Suggest challenge</button><button class="rounded bg-primary px-4 py-2 text-primary-foreground" disabled={busy || !canEdit} onclick={confirmChallenge}>Confirm challenge</button></div>
      </section>
    {:else if record.session.stage === 'journey'}
      <section class="space-y-4 rounded border p-5">
        <h2 class="text-xl">Belief shift journey</h2>
        {#if candidate('journey')}<aside class="rounded border border-blue-500/60 p-3"><p><strong>Unconfirmed suggestion.</strong></p><button disabled={busy || !canEdit} onclick={useJourney}>Load suggestion into editable fields</button></aside>{/if}
        <label class="block">FROM belief<textarea class="mt-1 w-full rounded border p-2" rows="2" bind:value={journey.from}></textarea></label>
        <label class="block">TO belief<textarea class="mt-1 w-full rounded border p-2" rows="2" bind:value={journey.to}></textarea></label>
        <label class="block">Experiential change, in the customer's voice<textarea class="mt-1 w-full rounded border p-2" rows="4" bind:value={journey.experientialChange}></textarea></label>
        <label class="block">Experience shape
          <select class="mt-1 w-full rounded border p-2" bind:value={journey.experienceShape}><option value="product-physical">Product / physical</option><option value="community-relational">Community / relational</option><option value="b2b-operational">B2B / operational</option><option value="knowledge">Knowledge</option></select>
        </label>
        <label class="block">Discovery mechanism<textarea class="mt-1 w-full rounded border p-2" rows="3" bind:value={journey.discoveryMechanism}></textarea></label>
        <div class="flex gap-3"><button disabled={busy || !canEdit} onclick={() => send('draft', { step: 'journey' })}>Suggest journey</button><button class="rounded bg-primary px-4 py-2 text-primary-foreground" disabled={busy || !canEdit} onclick={confirmJourney}>Confirm journey</button></div>
      </section>
    {:else if record.session.stage === 'grid'}
      <section class="space-y-4 rounded border p-5">
        <h2 class="text-xl">Conviction grid</h2>
        {#if candidate('grid')}<aside class="rounded border border-blue-500/60 p-3"><p><strong>Unconfirmed suggestion.</strong></p><button disabled={busy || !canEdit} onclick={useGrid}>Load suggestion into editable fields</button></aside>{/if}
        {#each grid as row, index (row.action)}
          <fieldset class="space-y-2 rounded border p-3">
            <legend class="font-semibold">{row.action.toUpperCase()}</legend>
            <label class="block">Move<textarea class="mt-1 w-full rounded border p-2" rows="2" bind:value={grid[index].move}></textarea></label>
            <label class="block">Belief rationale<textarea class="mt-1 w-full rounded border p-2" rows="2" bind:value={grid[index].beliefRationale}></textarea></label>
            <label class="block">Proof commitment<textarea class="mt-1 w-full rounded border p-2" rows="2" bind:value={grid[index].proofCommitment}></textarea></label>
            <label class="block">Operational rule<textarea class="mt-1 w-full rounded border p-2" rows="2" bind:value={grid[index].operationalRule}></textarea></label>
            {#if row.action === 'question' || row.action === 'reject'}
              <label class="block">Public specialisation signal<textarea class="mt-1 w-full rounded border p-2" rows="2" bind:value={grid[index].specialisationSignal}></textarea></label>
            {:else}
              <label class="block">Deployable proof artefact type<textarea class="mt-1 w-full rounded border p-2" rows="2" bind:value={grid[index].proofArtefactType}></textarea></label>
            {/if}
            <label class="block">Trace to the Core Belief<textarea class="mt-1 w-full rounded border p-2" rows="2" bind:value={grid[index].traceToBelief}></textarea></label>
          </fieldset>
        {/each}
        <div class="flex gap-3"><button disabled={busy || !canEdit} onclick={() => send('draft', { step: 'grid' })}>Suggest grid</button><button class="rounded bg-primary px-4 py-2 text-primary-foreground" disabled={busy || !canEdit} onclick={confirmGrid}>Confirm grid</button></div>
      </section>
    {:else if record.session.stage === 'proof'}
      <section class="space-y-4 rounded border p-5">
        <h2 class="text-xl">Proof points</h2>
        {#if candidate('proof')}<aside class="rounded border border-blue-500/60 p-3"><p><strong>Unconfirmed suggestion.</strong></p><button disabled={busy || !canEdit} onclick={useProof}>Load suggestion into editable fields</button></aside>{/if}
        {#each proof as row, index (row.action)}
          <fieldset class="space-y-2 rounded border p-3">
            <legend class="font-semibold">{row.action.toUpperCase()}</legend>
            <label class="block">Product<textarea class="mt-1 w-full rounded border p-2" rows="2" bind:value={proof[index].product}></textarea></label>
            <label class="block">Policy<textarea class="mt-1 w-full rounded border p-2" rows="2" bind:value={proof[index].policy}></textarea></label>
            <label class="block">Story<textarea class="mt-1 w-full rounded border p-2" rows="2" bind:value={proof[index].story}></textarea></label>
            <label class="block">Framework<textarea class="mt-1 w-full rounded border p-2" rows="2" bind:value={proof[index].framework}></textarea></label>
            <div class="grid gap-3 md:grid-cols-2">
              <label>Proof economy<select class="mt-1 w-full rounded border p-2" bind:value={proof[index].proofEconomy}><option value="discrete-at-cost">Discrete at cost</option><option value="compounding-public">Compounding public</option><option value="both">Both</option></select></label>
              <label>Evidence status<select class="mt-1 w-full rounded border p-2" bind:value={proof[index].evidenceStatus}><option value="supported">Supported</option><option value="prospective">Prospective</option><option value="thin">Thin</option></select></label>
            </div>
            <label class="block">Claims-boundary note<textarea class="mt-1 w-full rounded border p-2" rows="2" bind:value={proof[index].claimBoundaryNote}></textarea></label>
            {#if proof[index].evidenceStatus !== 'supported'}<label class="block">Capture-and-review plan<textarea class="mt-1 w-full rounded border p-2" rows="2" bind:value={proof[index].capturePlan}></textarea></label>{/if}
          </fieldset>
        {/each}
        <div class="flex gap-3"><button disabled={busy || !canEdit} onclick={() => send('draft', { step: 'proof' })}>Suggest proof</button><button class="rounded bg-primary px-4 py-2 text-primary-foreground" disabled={busy || !canEdit} onclick={confirmProof}>Confirm proof</button></div>
      </section>
    {:else if record.session.stage === 'friction'}
      <section class="space-y-4 rounded border p-5">
        <h2 class="text-xl">Competitor friction</h2>
        {#if candidate('friction')}<aside class="rounded border border-blue-500/60 p-3"><p><strong>Unconfirmed suggestion.</strong></p><button disabled={busy || !canEdit} onclick={useFriction}>Load suggestion into editable fields</button></aside>{/if}
        {#each friction as row, index (row.action)}
          <fieldset class="space-y-2 rounded border p-3">
            <legend class="font-semibold">{row.action.toUpperCase()}</legend>
            {#each FRICTION_SOURCES as source (source)}
              <div class="grid gap-2 md:grid-cols-[14rem_8rem_1fr] md:items-center">
                <span>{FRICTION_LABELS[source]}</span>
                <select class="rounded border p-2" bind:value={friction[index].sources[source].level}><option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option></select>
                <input class="rounded border p-2" placeholder="Evidence-grounded note" bind:value={friction[index].sources[source].note}/>
              </div>
            {/each}
          </fieldset>
        {/each}
        <label class="block">Lowest-friction competitor — the real copy threat<input class="mt-1 w-full rounded border p-2" bind:value={lowestFrictionCompetitor}/></label>
        <label class="block">What they would actually have to change<textarea class="mt-1 w-full rounded border p-2" rows="2" bind:value={lowestFrictionBasis}></textarea></label>
        <label class="block">Threat assessment against that competitor<textarea class="mt-1 w-full rounded border p-2" rows="3" bind:value={threatAssessment}></textarea></label>
        <div class="flex gap-3"><button disabled={busy || !canEdit} onclick={() => send('draft', { step: 'friction' })}>Suggest friction</button><button class="rounded bg-primary px-4 py-2 text-primary-foreground" disabled={busy || !canEdit} onclick={confirmFriction}>Confirm friction</button></div>
      </section>
    {:else if record.session.stage === 'credibility'}
      <section class="space-y-4 rounded border p-5">
        <h2 class="text-xl">Market credibility</h2>
        <label class="block">Independent reference evidence<textarea class="mt-1 w-full rounded border p-2" rows="3" bind:value={credibility.referenceEvidence}></textarea></label>
        <label class="block">State
          <select class="mt-1 w-full rounded border p-2" bind:value={credibility.state}><option value="credible">Credible</option><option value="credibility-gap">Credibility gap</option><option value="not-yet-observable">Not yet observable</option></select>
        </label>
        {#if credibility.state !== 'credible'}<label class="block">Likely cause<textarea class="mt-1 w-full rounded border p-2" rows="2" bind:value={credibility.cause}></textarea></label>{/if}
        {#if credibility.state === 'credibility-gap'}<label class="block">Review condition<textarea class="mt-1 w-full rounded border p-2" rows="2" bind:value={credibility.reviewCondition}></textarea></label>{/if}
        <button class="rounded bg-primary px-4 py-2 text-primary-foreground" disabled={busy || !canEdit} onclick={confirmCredibility}>Confirm credibility</button>
      </section>
    {:else if record.session.stage === 'confrontations'}
      <section class="space-y-4 rounded border p-5">
        <h2 class="text-xl">Honest confrontations</h2>
        <p>Audit the last 12–24 months against the belief. An undecided contradiction is allowed but blocks Outcome A.</p>
        {#each pastAudit as row, index (index)}
          <fieldset class="space-y-2 rounded border p-3">
            <legend>Item {index + 1}</legend>
            <label class="block">What happened<input class="mt-1 w-full rounded border p-2" bind:value={pastAudit[index].item}/></label>
            <label class="block">Does the belief say this should happen?
              <select class="mt-1 w-full rounded border p-2" bind:value={pastAudit[index].beliefSays}><option value="yes">Yes</option><option value="no">No</option></select>
            </label>
            {#if pastAudit[index].beliefSays === 'no'}
              <label class="block">Decision
                <select class="mt-1 w-full rounded border p-2" bind:value={pastAudit[index].decision}><option value={null}>Undecided</option><option value="refine">Refine the belief</option><option value="pivot">Document the pivot</option><option value="undecided">Record as undecided</option></select>
              </label>
            {/if}
            <label class="block">Note<textarea class="mt-1 w-full rounded border p-2" rows="2" bind:value={pastAudit[index].note}></textarea></label>
          </fieldset>
        {/each}
        <button disabled={busy || !canEdit} onclick={addPastAudit}>Add past-behaviour item</button>
        <label class="block">Where we have to say no going forward, one per line<textarea class="mt-1 w-full rounded border p-2" rows="3" bind:value={futureConfrontationsText}></textarea></label>
        <button class="rounded bg-primary px-4 py-2 text-primary-foreground" disabled={busy || !canEdit} onclick={confirmConfrontations}>Confirm confrontations</button>
      </section>
    {:else if record.session.stage === 'cost'}
      <section class="space-y-4 rounded border p-5">
        <h2 class="text-xl">Cost of commitment</h2>
        {#if candidate('cost')}<aside class="rounded border border-blue-500/60 p-3"><p><strong>Unconfirmed suggestion.</strong></p><button disabled={busy || !canEdit} onclick={useCost}>Load suggestion into editable fields</button></aside>{/if}
        <label class="block">Genuine costs, one per line<textarea class="mt-1 w-full rounded border p-2" rows="5" bind:value={costsText}></textarea></label>
        <p class="text-sm text-muted-foreground">An empty list is recorded as a risk flag — a commitment with no costs isn't real.</p>
        <div class="flex gap-3"><button disabled={busy || !canEdit} onclick={() => send('draft', { step: 'cost' })}>Suggest costs</button><button class="rounded bg-primary px-4 py-2 text-primary-foreground" disabled={busy || !canEdit} onclick={confirmCost}>Confirm costs</button></div>
      </section>
    {:else if record.session.stage === 'advocate'}
      <section class="space-y-4 rounded border p-5">
        <h2 class="text-xl">Advocate challenges</h2>
        {#if candidate('advocate')}<aside class="rounded border border-blue-500/60 p-3"><p><strong>Unconfirmed suggestion.</strong></p><button disabled={busy || !canEdit} onclick={useAdvocate}>Load suggestion into editable fields</button></aside>{/if}
        {#each advocate as row, index (row.id)}
          <fieldset class="space-y-2 rounded border p-3">
            <legend class="font-semibold">{ADVOCATE_PROMPTS[row.id]}</legend>
            <label class="block">Strongest honest case<textarea class="mt-1 w-full rounded border p-2" rows="4" bind:value={advocate[index].case}></textarea></label>
            <label class="block">Verdict
              <select class="mt-1 w-full rounded border p-2" bind:value={advocate[index].verdict}><option value="survives">The position survives this</option><option value="fails">The position does not survive this</option></select>
            </label>
            <label class="block">Note<textarea class="mt-1 w-full rounded border p-2" rows="2" bind:value={advocate[index].note}></textarea></label>
          </fieldset>
        {/each}
        <div class="flex gap-3"><button disabled={busy || !canEdit} onclick={() => send('draft', { step: 'advocate' })}>Suggest challenges</button><button class="rounded bg-primary px-4 py-2 text-primary-foreground" disabled={busy || !canEdit} onclick={confirmAdvocate}>Confirm challenges</button></div>
      </section>
    {:else if record.session.stage === 'judgement'}
      <section class="space-y-4 rounded border p-5">
        <h2 class="text-xl">Strategic judgement</h2>
        {#if candidate('judgement')}<aside class="rounded border border-blue-500/60 p-3"><p><strong>Unconfirmed suggestion.</strong></p><button disabled={busy || !canEdit} onclick={useJudgement}>Load suggestion into editable fields</button></aside>{/if}
        <label class="block">Options considered, one per line<textarea class="mt-1 w-full rounded border p-2" rows="3" bind:value={judgement.optionsText}></textarea></label>
        <label class="block">Recommendation<textarea class="mt-1 w-full rounded border p-2" rows="3" bind:value={judgement.recommendation}></textarea></label>
        <label class="block">Confidence
          <select class="mt-1 w-full rounded border p-2" bind:value={judgement.confidence}><option value="high">High</option><option value="moderate">Moderate</option><option value="low">Low</option></select>
        </label>
        <label class="block">Confidence basis<textarea class="mt-1 w-full rounded border p-2" rows="3" bind:value={judgement.confidenceBasis}></textarea></label>
        <label class="block">If the commitment holds<textarea class="mt-1 w-full rounded border p-2" rows="2" bind:value={judgement.ifHolds}></textarea></label>
        <label class="block">If it doesn't<textarea class="mt-1 w-full rounded border p-2" rows="2" bind:value={judgement.ifNot}></textarea></label>
        <label class="block">If no decision is made<textarea class="mt-1 w-full rounded border p-2" rows="2" bind:value={judgement.ifNoDecision}></textarea></label>
        <label class="block">What would change this advice<textarea class="mt-1 w-full rounded border p-2" rows="2" bind:value={judgement.reversalConditions}></textarea></label>
        <label class="block">Integrity check<textarea class="mt-1 w-full rounded border p-2" rows="2" bind:value={judgement.integrityCheck}></textarea></label>
        <label class="block">Professional call
          <select class="mt-1 w-full rounded border p-2" bind:value={judgement.professionalCall}><option value="proceed">Proceed</option><option value="proceed_conditionally">Proceed conditionally</option><option value="gather_evidence">Gather evidence</option><option value="return">Return</option><option value="do_not_proceed">Do not proceed</option></select>
        </label>
        <label class="block">Next work or return owner<textarea class="mt-1 w-full rounded border p-2" rows="2" bind:value={judgement.nextWork}></textarea></label>
        <div class="flex gap-3"><button disabled={busy || !canEdit} onclick={() => send('draft', { step: 'judgement' })}>Suggest judgement</button><button class="rounded bg-primary px-4 py-2 text-primary-foreground" disabled={busy || !canEdit} onclick={confirmJudgement}>Confirm judgement</button></div>

        <hr/>
        <h3 class="font-semibold">Outcome</h3>
        {#if !record.outcomeCheck.canA}<div class="rounded border p-3"><p role="status">Outcome A is not currently recordable:</p><ul class="list-disc pl-6">{#each record.outcomeCheck.problems as problem (problem)}<li>{problem}</li>{/each}</ul></div>{/if}
        <label class="block">Outcome
          <select class="mt-1 w-full rounded border p-2" bind:value={outcome.outcome}><option value="a">A — position recorded (provisional)</option><option value="x">X — return to upstream work</option></select>
        </label>
        <label class="block">Outcome statement<textarea class="mt-1 w-full rounded border p-2" rows="3" bind:value={outcome.statement}></textarea></label>
        {#if outcome.outcome === 'x'}
          <label class="block">Returns to
            <select class="mt-1 w-full rounded border p-2" bind:value={outcome.returnModule}><option value="01">Founder Conviction Foundation</option><option value="02">Market Reality Check</option></select>
          </label>
          <label class="block">What needs refining<textarea class="mt-1 w-full rounded border p-2" rows="2" bind:value={outcome.refineWhat}></textarea></label>
          <label class="block">What this run produced for that work<textarea class="mt-1 w-full rounded border p-2" rows="2" bind:value={outcome.evidenceProduced}></textarea></label>
        {/if}
        <div class="flex gap-3"><button disabled={busy || !canEdit || !record.session.confirmations.judgement} onclick={recordOutcome}>Record outcome</button><button class="rounded bg-primary px-4 py-2 text-primary-foreground" disabled={busy || !canEdit || !record.session.confirmations.outcome} onclick={() => send('seal')}>Approve and seal immutable Business Commitments</button></div>
      </section>
    {:else if record.session.stage === 'sealed'}
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
          <p>The sealed record remains immutable. A new record starts from the current verified Market Reality source.</p>
          <label class="block">Reason for a successor<textarea class="w-full rounded border p-2" rows="3" bind:value={successorReason}></textarea></label>
          <button class="rounded bg-primary px-4 py-2 text-primary-foreground" disabled={busy || !hydrated || !successorReason.trim()} onclick={() => send('successor', { reason: successorReason })}>Create editable successor</button>
        </fieldset>
      </section>
    {/if}
  {/if}
</main>
