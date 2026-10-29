<script lang="ts">
  import { onMount, untrack } from 'svelte';
  import { replaceState } from '$app/navigation';
  import Stepper from '#lib/modules/strategy/components/Stepper.svelte';
  import type { PageData } from './$types';
  let { data }: { data: PageData } = $props();
  type Loaded = {
    session: any; recon: any; artifacts: { artifacts: any[] }; collection: any; seal: any;
    revision: number; sourceVersionId: string; sourceHash: string; upstreamCurrent: boolean; history: any[]; documents: any[]; drafts: Record<string, any>;
    progression: { options: { outcome: string; reason: string }[]; blocked: string | null };
  };
  const initial = untrack(() => data.initial) as { session?: any; sessions?: any[]; sourceReady?: boolean };
  let sessions = $state(initial.sessions ?? []);
  let record = $state<Loaded | null>(initial.session ? initial as Loaded : null);
  let sourceReady = $state(initial.sourceReady ?? true);
  let busy = $state(false);
  let hydrated = $state(false);
  let message = $state('');
  let viewStep = $state(0);
  let pendingJob = $state<string | null>(null);
  let candidateNote = $state('');
  onMount(() => { hydrated = true; const url = new URL(location.href); const job = url.searchParams.get('jobId'); if (job) void pollJob(job, url.searchParams.get('jobAction') === 'collect-url' ? 'collect-url' : 'draft'); });

  const labels = ['Research setup', 'Gather evidence', 'Review collection', 'Builder inputs', 'Vacuum gates', 'Structural risk', 'Evidence and outcome', 'Judgements', 'Sealed record'];
  let activeStep = $derived(record ? (record.session.stage === 'setup' ? 0 : record.session.stage === 'gather' ? 1 : record.session.stage === 'artefact-review' ? 2 : record.session.stage === 'builder-inputs' ? 3 : record.session.stage === 'gates' ? 4 : record.session.stage === 'risk' ? 5 : record.session.stage === 'outcome' ? 6 : record.session.stage === 'judgements' ? 7 : 8) : 0);
  let currentGate = $derived.by(() => {
    if (!record) return 'gate1';
    const r = record.recon;
    if (r.gate1.verdict !== 'pass') return 'gate1';
    if (r.gate2.verdict !== 'pass') return 'gate2';
    if (r.gate3.verdict !== 'pass') return 'gate3';
    if (r.gate4.verdict === 'pending') return 'gate4';
    return 'gate6';
  });
  let draftGate = $derived(!record ? '' : record.session.stage === 'setup' ? 'setup' : record.session.stage === 'gates' ? currentGate : record.session.stage === 'risk' ? 'gate5' : record.session.stage === 'outcome' && record.recon.gate4.verdict === 'pass' && record.recon.gate6.a.verdict === 'pending' ? 'gate6' : '');
  let currentCandidate = $derived(draftGate ? record?.drafts?.[draftGate] ?? null : null);
  let canEdit = $derived(Boolean(record && record.session.stage !== 'sealed' && record.upstreamCurrent));

  let research = $state<any>({ competitors: [{ name: '', url: '', note: '' }], cohort: '', geography: '', platforms: [], sectorGuess: '', rationale: '' });
  let route = $state('full'); let routeReason = $state('');
  let artifact = $state<any>({ kind: 'customer', channel: 'paste', target: '', source: '', url: '', title: '', retrievedAt: new Date().toISOString(), evidenceDate: '', verbatim: '', access: 'public', consent: 'public artifact', note: '' });
  let builder = $state<any>({ p1: { verdict: 'evidence-insufficient', finding: '' }, p2: { verdict: 'evidence-insufficient', segment: '', standingStrength: null, finding: '' }, p3: { verdict: 'evidence-insufficient', finding: '' }, foundersProblem: '', secondVoice: { present: null, name: '', role: '', competingDiagnosis: '', converge: '', diverge: '', signal: '' }, ownedAudit: [] });
  let builderAudit = $state<any>({ source: '', size: '', read: 'no', routing: 'not-relevant', artifactRef: null });
  let terrain = $state<any>({ tam: '', trajectory: null, tailwind: '', diagnosis: 'ambiguous-needs-evidence', diagnosisEvidence: '' });
  let terrainRefsText = $state('');
  let gate1 = $state<any>({ decodes: [], descriptiveDefault: '', cohort: '', concentration: 'competitive', verdict: 'evidence-insufficient', finding: '' });
  let gate2 = $state<any>({ vulnerabilityEvidence: '', defendersCase: '', rebuttal: '', artifactRefs: [], verdict: 'evidence-insufficient', finding: '' });
  let gate3 = $state<any>({ trigger: '', hack: '', pain: '', limitingBelief: '', traceToDefault: '', artifactRefs: [], verdict: 'evidence-insufficient', finding: '' });
  let gate4 = $state<any>({ priceRange: '', evidence: '', artifactRefs: [], verdict: 'evidence-insufficient', finding: '' });
  let risks = $state<any[]>(['r1', 'r2', 'r3', 'r4'].map(pattern => ({ pattern, state: 'unclear', evidence: '', severity: null, mitigationRouting: null, acknowledgmentLine: '', declined: false, dispute: '' })));
  let gate6 = $state<any>({ implication: '', traceSentence: '', standsWithoutTruth: null, artifactRefs: [], verdictA: 'evidence-insufficient', verdictB: 'evidence-insufficient', finding: '' });
  let review = $state<any>({ disposition: 'insufficient', rationale: '' });
  let outcome = $state<any>({ outcome: 'outcome_b', statement: '', contrarianFlags: [] });
  let contrarianText = $state('');
  let successorReason = $state(''); let revisionFrom = $state('gates'); let revisionReason = $state('');
  let documents = $state<any[]>(initial.session ? (initial as Loaded).documents ?? [] : []);
  let researchPlatformText = $state('');
  let referenceText = $state('');

  $effect(() => {
    // $state deeply proxies loaded records. snapshot() avoids DataCloneError
    // when cloning nested proxy values during hydration.
    const loaded = $state.snapshot(record) as Loaded | null;
    if (!loaded) return;
    const s = loaded.session, r = loaded.recon;
    const nextResearch = structuredClone(s.research?.draft ?? s.research?.confirmed ?? { competitors: [{ name: '', url: '', note: '' }], cohort: '', geography: '', platforms: [], sectorGuess: '', rationale: '' });
    research = nextResearch;
    researchPlatformText = nextResearch.platforms.join(', ');
    route = s.route ?? 'full'; routeReason = s.routeReason ?? '';
    builder = { p1: { ...r.preconditions.p1 }, p2: { ...r.preconditions.p2 }, p3: { ...r.preconditions.p3 }, foundersProblem: r.secondVoice.foundersProblem, secondVoice: { ...r.secondVoice }, ownedAudit: structuredClone(r.gate3.ownedAudit ?? []) };
    terrain = { tam: r.terrain.tam, trajectory: r.terrain.trajectory === 'pending' ? null : r.terrain.trajectory, tailwind: r.terrain.tailwind, diagnosis: r.terrain.diagnosis === 'pending' ? 'ambiguous-needs-evidence' : r.terrain.diagnosis, diagnosisEvidence: r.terrain.diagnosisEvidence };
    terrainRefsText = (r.terrain.artifactRefs ?? []).join(', ');
    gate1 = { decodes: structuredClone(r.gate1.decodes ?? []), descriptiveDefault: r.gate1.descriptiveDefault, cohort: r.gate1.cohort, concentration: r.gate1.concentration === 'pending' ? 'competitive' : r.gate1.concentration, verdict: r.gate1.verdict === 'pending' ? 'evidence-insufficient' : r.gate1.verdict, finding: r.gate1.finding };
    gate2 = { vulnerabilityEvidence: r.gate2.vulnerabilityEvidence, defendersCase: r.gate2.defendersCase, rebuttal: r.gate2.rebuttal, artifactRefs: [...r.gate2.artifactRefs], verdict: r.gate2.verdict === 'pending' ? 'evidence-insufficient' : r.gate2.verdict, finding: r.gate2.finding };
    gate3 = { trigger: r.gate3.painProfile.trigger, hack: r.gate3.painProfile.hack, pain: r.gate3.painProfile.pain, limitingBelief: r.gate3.painProfile.limitingBelief, traceToDefault: r.gate3.painProfile.traceToDefault, artifactRefs: [...r.gate3.artifactRefs], verdict: r.gate3.verdict === 'pending' ? 'evidence-insufficient' : r.gate3.verdict, finding: r.gate3.finding };
    gate4 = { priceRange: r.gate4.priceRange, evidence: r.gate4.evidence, artifactRefs: [...r.gate4.artifactRefs], verdict: r.gate4.verdict === 'pending' ? 'evidence-insufficient' : r.gate4.verdict, finding: r.gate4.finding };
    if (r.gate5.risks.length) risks = r.gate5.risks.map((item: any) => ({ pattern: item.pattern, state: item.state === 'pending' ? 'unclear' : item.state, evidence: item.evidence, severity: item.severity, mitigationRouting: item.mitigationRouting, acknowledgmentLine: item.acknowledgment.line, declined: item.acknowledgment.declined, dispute: item.acknowledgment.dispute }));
    gate6 = { implication: r.gate6.a.implication, traceSentence: r.gate6.b.traceSentence, standsWithoutTruth: r.gate6.b.standsWithoutTruth, artifactRefs: [...r.gate6.a.artifactRefs], verdictA: r.gate6.a.verdict === 'pending' ? 'evidence-insufficient' : r.gate6.a.verdict, verdictB: r.gate6.b.verdict === 'pending' ? 'evidence-insufficient' : r.gate6.b.verdict, finding: r.gate6.a.finding };
    if (s.evidenceReview) review = { disposition: s.evidenceReview.disposition, rationale: s.evidenceReview.rationale };
    if (s.progressionDecision) outcome = { outcome: s.progressionDecision.outcome, statement: s.progressionDecision.statement, contrarianFlags: r.contrarianTrap.flags };
    documents = loaded.documents ?? [];
  });

  async function readCurrent(id?: string) {
    const url = new URL(location.pathname, location.origin);
    if (id) url.searchParams.set('sessionId', id);
    const response = await fetch(url, { headers: { accept: 'application/json' } });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error ?? 'Unable to load Market Reality');
    replaceState(url, {});
    if (id) { record = result; documents = result.documents ?? []; if (result.progression?.options?.length && !result.progression.options.some((item: any) => item.outcome === outcome.outcome)) outcome = { ...outcome, outcome: result.progression.options[0].outcome }; viewStep = activeStep; }
    else { sessions = result.sessions ?? []; sourceReady = result.sourceReady; record = null; }
  }
  async function pollJob(id: string, action: 'draft' | 'collect-url' = 'draft') {
    busy = true; pendingJob = id; message = action === 'collect-url' ? 'Collecting the public page…' : 'Waiting for the draft job…';
    try {
      const url = new URL(location.pathname, location.origin); url.searchParams.set('jobId', id); url.searchParams.set('jobAction', action); url.searchParams.set('sessionId', record!.session.sessionId); replaceState(url, {});
      const until = Date.now() + 90000;
      while (Date.now() < until) {
        const response = await fetch(url, { headers: { accept: 'application/json' } }); const job = await response.json();
        if (!response.ok) throw new Error(job.error ?? 'Unable to check draft progress');
        if (job.status === 'succeeded') {
          pendingJob = null; await readCurrent(job.sessionId); message = action === 'collect-url' ? 'Public page collected and saved as a gathered evidence item. Review its source text and provenance.' : 'Suggested draft loaded. Review and edit every field before confirming it.'; return;
        }
        if (job.status === 'failed' || job.status === 'cancelled') { pendingJob = null; throw new Error('Draft job stopped. Your confirmed work is unchanged.'); }
        await new Promise(resolve => setTimeout(resolve, 1800));
      }
      message = 'Draft is still running. Return to this page to check its persisted job.';
    } catch (cause) { message = cause instanceof Error ? cause.message : 'Unable to check draft'; }
    finally { busy = false; }
  }
  function useCandidate() {
    const candidate = currentCandidate?.candidate as Record<string, any> | undefined;
    if (!candidate) return;
    const gate = draftGate;
    if (gate === 'setup') { research = { ...research, ...candidate }; researchPlatformText = (candidate.platforms ?? []).join(', '); }
    if (gate === 'terrain') terrain = { ...terrain, ...candidate };
    if (gate === 'gate1') { gate1 = { ...gate1, ...candidate }; referenceText = (candidate.decodes ?? []).flatMap((item: any) => item.beliefs?.length ? item.beliefs.map((belief: any) => `${item.competitor} | ${belief.belief ?? ''} | ${belief.confidence ?? 'medium'} | ${belief.vulnerability ?? ''}`) : [`${item.competitor} |  | medium | `]).join('\n'); }
    if (gate === 'gate2') gate2 = { ...gate2, ...candidate };
    if (gate === 'gate3') gate3 = { ...gate3, ...candidate };
    if (gate === 'gate4') gate4 = { ...gate4, ...candidate };
    if (gate === 'gate5' && Array.isArray(candidate.risks)) risks = candidate.risks.map((row: any) => ({ ...row, acknowledgmentLine: row.acknowledgmentLine ?? '' }));
    if (gate === 'gate6') gate6 = { ...gate6, ...candidate };
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
      if (action === 'create') { await readCurrent(result.session?.sessionId ?? result.payload?.session?.sessionId ?? result.id); }
      else if (action === 'successor') { await readCurrent(result.id); }
      else await readCurrent(record!.session.sessionId);
      message = action === 'seal' ? 'Market Reality is sealed and saved.' : action === 'successor' ? 'A new editable successor is open, pinned to the current sealed M01 source.' : 'Saved. The current record has been reloaded.';
    } catch (cause) { message = cause instanceof Error ? cause.message : 'Unable to save'; }
    finally { busy = false; }
  }
  async function addResearcher() { research.competitors = [...research.competitors, { name: '', url: '', note: '' }]; }
  async function addArtifact() {
    const payload = { ...artifact, retrievedAt: new Date().toISOString(), ...(artifact.url ? { url: artifact.url } : {}), ...(artifact.title ? { title: artifact.title } : {}) };
    await send('add-artifact', { artifact: payload });
  }
  async function addAudit() { builder.ownedAudit = [...builder.ownedAudit, { ...builderAudit }]; builderAudit = { source: '', size: '', read: 'no', routing: 'not-relevant', artifactRef: null }; }
  const refArray = (text: string) => text.split(',').map(value => value.trim()).filter(Boolean);
  async function confirmSetup() { research.platforms = researchPlatformText.split(',').map((v: string) => v.trim()).filter(Boolean); await send('confirm-setup', { research, route, routeReason }); }
  async function confirmBuilder() { await send('builder-inputs', { inputs: builder }); }
  async function confirmGate1() {
    const decoded = new Map<string, { competitor: string; beliefs: { belief: string; confidence: 'high' | 'medium' | 'low'; vulnerability: string }[] }>();
    for (const parts of referenceText.split('\n').map(line => line.split('|').map(value => value.trim())).filter(parts => parts.some(Boolean))) {
      const [competitor = '', belief = '', confidence = 'medium', vulnerability = ''] = parts;
      if (!competitor) continue;
      if (!decoded.has(competitor)) decoded.set(competitor, { competitor, beliefs: [] });
      if (belief) decoded.get(competitor)!.beliefs.push({ belief, confidence: ['high','medium','low'].includes(confidence) ? confidence as 'high' | 'medium' | 'low' : 'medium', vulnerability });
    }
    await send('confirm-gate1', { terrain: { ...terrain, artifactRefs: refArray(terrainRefsText) }, gate: { ...gate1, decodes: [...decoded.values()] } });
  }
  async function confirmGate(n: 2 | 3 | 4) { const item = n === 2 ? gate2 : n === 3 ? gate3 : gate4; await send(`confirm-gate${n}`, { gate: { ...item, artifactRefs: refArray(item.refsText ?? item.artifactRefs.join(', ')) } }); }
  async function confirmGate5() { await send('confirm-gate5', { gate: { risks } }); }
  async function confirmGate6() { gate6.artifactRefs = refArray(gate6.refsText ?? gate6.artifactRefs.join(', ')); gate6.standsWithoutTruth = gate6.standsWithoutTruth === true || gate6.standsWithoutTruth === 'true' ? true : gate6.standsWithoutTruth === false || gate6.standsWithoutTruth === 'false' ? false : null; await send('confirm-gate6', { gate: gate6 }); }
  async function confirmReview() { await send('evidence-review', { review }); }
  async function chooseOutcome() { outcome.contrarianFlags = contrarianText.split('\n').map(v => v.trim()).filter(Boolean); await send('outcome', { outcome }); }
  function evidenceOptions() { return record?.artifacts.artifacts.map(a => ({ id: a.id, label: `${a.kind}: ${a.target || a.source} · ${a.status}` })) ?? []; }
</script>

<svelte:head><title>Market Reality · Strategy</title></svelte:head>
<main class="mx-auto max-w-6xl space-y-6 p-6">
  <header class="space-y-2">
    <p class="text-sm text-muted-foreground">Strategy · Module 02</p>
    <h1 class="text-3xl font-semibold">Market Reality</h1>
    <p>Gather and judge market evidence against the exact sealed Founder Conviction source. Every suggestion remains an editable candidate; only explicit confirmations advance the record.</p>
  </header>
  {#if message}<p class="rounded border p-3" role="status">{message}</p>{/if}
  {#if pendingJob}<button disabled={busy || !hydrated} onclick={() => pollJob(pendingJob!)}>Check draft progress</button>{/if}
  {#if !record}
    <section class="space-y-4 rounded border p-5">
      <h2 class="text-xl font-semibold">Start or reopen a Market Reality record</h2>
      {#if !sourceReady}<p role="status">No M02 source is connected yet. Starting a record will verify and connect the current sealed M01 source.</p>{/if}
      <button disabled={busy || !hydrated} onclick={() => send('create')}>Start from the current sealed M01 source</button>
      <div class="flex flex-wrap gap-2">{#each sessions as item}<button class="rounded border px-3 py-2" disabled={busy || !hydrated} onclick={async () => { busy = true; try { await readCurrent(item.id); } catch (e) { message = e instanceof Error ? e.message : 'Unable to load'; } finally { busy = false; } }}>Open record · revision {item.revision}</button>{/each}</div>
    </section>
  {:else}
    {#if !record.upstreamCurrent}<p class="rounded border border-amber-500 p-3" role="alert">The pinned M01 source is no longer current. This record remains readable, but new drafts or edits cannot continue; start a fresh record from the current sealed source.</p>{/if}
    <p class="text-sm">{record.session.stage.replaceAll('-', ' ')} · revision {record.revision} · source {record.sourceVersionId} · {record.sourceHash.slice(0, 12)}…</p>
    <details class="rounded border p-3"><summary class="font-medium">Pinned Founder Conviction context</summary><dl class="mt-3 grid gap-3 md:grid-cols-2"><dt>Core belief</dt><dd>{record.recon.m01Inputs.coreBelief}</dd><dt>Broken thing</dt><dd>{record.recon.m01Inputs.brokenThing}</dd><dt>Hidden Truth</dt><dd>{record.recon.m01Inputs.hiddenTruth}</dd><dt>Market-deployable expression</dt><dd>{record.recon.m01Inputs.marketDeployableHiddenTruth}</dd></dl></details>
    {#if currentCandidate}<aside class="space-y-2 rounded border border-blue-500/60 p-3"><p><strong>Unconfirmed suggestion for {draftGate}.</strong> Model: {currentCandidate.model ?? 'configured model'}{#if currentCandidate.methodRelease} · method release {currentCandidate.methodRelease}{/if}</p><p>Review this candidate, move it into the editable controls, revise it, then make a separate human confirmation.</p><button disabled={busy || !canEdit} onclick={useCandidate}>Load suggestion into editable fields</button></aside>{/if}
    {#if record.seal}<p class="rounded border p-3"><strong>Sealed version.</strong> Hash {record.seal.sealHash}. The saved document below is read back from the document store.</p>{/if}
    <Stepper steps={labels.map(label => ({ label }))} bind:viewStep {activeStep} stepDone={labels.map((_, index) => index < activeStep || (index === 8 && !!record?.seal))} canVisit={(index: number) => index === activeStep} runLabel="Market Reality progress" />

    {#if record.session.stage === 'setup'}
      <section class="space-y-4 rounded border p-5">
        <h2 class="text-xl">Research setup</h2>
        <p>Draft the cohort and research scope, then confirm it. Competitor names and URLs are leads to verify, not findings.</p>
        {#each research.competitors as competitor, i}<fieldset class="grid gap-3 rounded border p-4 md:grid-cols-3"><legend>Competitor {i + 1}</legend><label>Name<input class="w-full rounded border p-2" bind:value={competitor.name}/></label><label>URL<input class="w-full rounded border p-2" bind:value={competitor.url}/></label><label>Research note<input class="w-full rounded border p-2" bind:value={competitor.note}/></label></fieldset>{/each}
        <button class="rounded border px-3 py-2" onclick={addResearcher}>Add competitor</button>
        <label class="block">Cohort<input class="mt-1 w-full rounded border p-2" bind:value={research.cohort}/></label>
        <label class="block">Geography<input class="mt-1 w-full rounded border p-2" bind:value={research.geography}/></label>
        <label class="block">Platforms or sources (comma separated)<input class="mt-1 w-full rounded border p-2" bind:value={researchPlatformText}/></label>
        <label class="block">Sector guess<input class="mt-1 w-full rounded border p-2" bind:value={research.sectorGuess}/></label>
        <label class="block">Research rationale<textarea class="mt-1 w-full rounded border p-2" rows="3" bind:value={research.rationale}></textarea></label>
        <label class="block">Route<select class="mt-1 rounded border p-2" bind:value={route}><option value="full">Full</option><option value="light" disabled>Light pass · unavailable until an approved locked-source adoption record is connected</option><option value="constrained" disabled>Constrained · unavailable until an approved locked-source adoption record is connected</option><option value="skip" disabled>Skip · unavailable until an approved locked-source adoption record is connected</option></select></label><p class="text-sm text-muted-foreground">Only the full research path is available here. Alternate routes require an approved source record; this workflow will not create one implicitly.</p>
        <label class="block">Route reason<textarea class="mt-1 w-full rounded border p-2" rows="2" bind:value={routeReason}></textarea></label>
        <div class="flex gap-3"><button disabled={busy || !canEdit} onclick={() => send('draft', { gate: 'setup' })}>Suggest setup</button><button class="rounded bg-primary px-4 py-2 text-primary-foreground" disabled={busy || !canEdit} onclick={confirmSetup}>Confirm research setup</button></div>
      </section>
    {:else if record.session.stage === 'gather'}
      <section class="space-y-5 rounded border p-5">
        <h2 class="text-xl">Gather evidence</h2>
        <p>Paste observed source material with its provenance. Founder testimony can motivate a hypothesis; it cannot satisfy a market gate.</p>
        <div class="grid gap-3 md:grid-cols-2">
          <label>Evidence kind<select class="mt-1 w-full rounded border p-2" bind:value={artifact.kind}><option value="competitor">Competitor</option><option value="customer">Customer</option><option value="market">Market</option><option value="owned">Owned data</option></select></label>
          <label>About whom or what<input class="mt-1 w-full rounded border p-2" bind:value={artifact.target}/></label>
          <label>Source / publication<input class="mt-1 w-full rounded border p-2" bind:value={artifact.source}/></label>
          <label>URL (optional)<input class="mt-1 w-full rounded border p-2" bind:value={artifact.url}/></label>
          <label>Title (optional)<input class="mt-1 w-full rounded border p-2" bind:value={artifact.title}/></label>
          <label>Access<select class="mt-1 w-full rounded border p-2" bind:value={artifact.access}><option value="public">Public</option><option value="internal">Internal</option><option value="confidential">Confidential</option></select></label>
          <label>Consent / permission basis<input class="mt-1 w-full rounded border p-2" bind:value={artifact.consent}/></label>
          <label>Evidence date (optional)<input class="mt-1 w-full rounded border p-2" bind:value={artifact.evidenceDate}/></label>
        </div>
        <label class="block">Verbatim evidence<textarea class="mt-1 w-full rounded border p-2" rows="6" bind:value={artifact.verbatim}></textarea></label>
        <label class="block">Operator note (separate from source text)<textarea class="mt-1 w-full rounded border p-2" rows="2" bind:value={artifact.note}></textarea></label>
        <div class="flex flex-wrap gap-3"><button disabled={busy || !canEdit || !artifact.target.trim() || !artifact.source.trim() || !artifact.verbatim.trim()} onclick={addArtifact}>Save evidence item</button><button disabled={busy || !canEdit || !artifact.target.trim() || !artifact.url.trim()} onclick={() => send('collect-url', { url: artifact.url, kind: artifact.kind, target: artifact.target, ...(artifact.note.trim() ? { note: artifact.note } : {}) })}>Fetch public HTTPS page</button><button disabled={busy || !canEdit} onclick={() => send('finish-gather')}>Finish gathering and review coverage</button></div>
        <h3 class="font-semibold">Evidence log</h3>
        {#if record.artifacts.artifacts.length}<ul class="space-y-2">{#each record.artifacts.artifacts as item}<li class="rounded border p-3"><strong>{item.kind} · {item.target}</strong> — {item.source} · {item.status}<p class="whitespace-pre-wrap">{item.verbatim.slice(0, 500)}</p><button disabled={busy || !canEdit} onclick={() => send('delete-artifact', { artifactId: item.id })}>Remove item</button></li>{/each}</ul>{:else}<p>No evidence items have been recorded yet.</p>{/if}
      </section>
    {:else if record.session.stage === 'artefact-review'}
      <section class="space-y-4 rounded border p-5"><h2 class="text-xl">Review collection coverage</h2><p>{record.artifacts.artifacts.length} evidence items · collection status: {record.collection.state}. Check expected competitor, customer and market coverage; record a partial or interrupted collection honestly.</p><ul>{#each record.artifacts.artifacts as item}<li>{item.kind} · {item.target} · {item.status} · {item.source}</li>{/each}</ul><p>The server compares gathered competitor items with the confirmed research list and records whether coverage is complete or partial.</p><button class="rounded bg-primary px-4 py-2 text-primary-foreground" disabled={busy || !canEdit} onclick={() => send('review-artifacts')}>Confirm collection review</button></section>
    {:else if record.session.stage === 'builder-inputs'}
      <section class="space-y-4 rounded border p-5"><h2 class="text-xl">Builder and evidence inputs</h2><p>Record prerequisites and the founder’s problem in their words. A second voice is diagnostic context, not a substitute for external evidence.</p>
        {#each ['p1','p2','p3'] as key}<fieldset class="grid gap-3 rounded border p-3 md:grid-cols-2"><legend>{key.toUpperCase()} precondition</legend><label>Finding<textarea class="w-full rounded border p-2" rows="2" bind:value={builder[key].finding}></textarea></label><label>Verdict<select class="w-full rounded border p-2" bind:value={builder[key].verdict}><option value="pass">Pass</option><option value="fail">Fail</option><option value="evidence-insufficient">Evidence insufficient</option></select></label>{#if key === 'p2'}<label>Segment<input class="w-full rounded border p-2" bind:value={builder.p2.segment}/></label><label>Standing strength<select class="w-full rounded border p-2" bind:value={builder.p2.standingStrength}><option value={null}>Unresolved</option><option value="thin">Thin</option><option value="moderate">Moderate</option><option value="strong">Strong</option></select></label>{/if}</fieldset>{/each}
        <label class="block">Founder’s problem, in their words<textarea class="mt-1 w-full rounded border p-2" rows="3" bind:value={builder.foundersProblem}></textarea></label>
        <fieldset class="grid gap-3 rounded border p-3 md:grid-cols-2"><legend>Second-voice diagnostic (optional)</legend><label>Is a second voice present?<select class="w-full rounded border p-2" bind:value={builder.secondVoice.present}><option value={null}>Not recorded</option><option value={true}>Yes</option><option value={false}>No</option></select></label><label>Name<input class="w-full rounded border p-2" bind:value={builder.secondVoice.name}/></label><label>Role<input class="w-full rounded border p-2" bind:value={builder.secondVoice.role}/></label><label>Competing diagnosis<input class="w-full rounded border p-2" bind:value={builder.secondVoice.competingDiagnosis}/></label><label>Where they converge<input class="w-full rounded border p-2" bind:value={builder.secondVoice.converge}/></label><label>Where they diverge<input class="w-full rounded border p-2" bind:value={builder.secondVoice.diverge}/></label><label class="md:col-span-2">Signal<input class="w-full rounded border p-2" bind:value={builder.secondVoice.signal}/></label></fieldset>
        <fieldset class="space-y-2 rounded border p-3"><legend>Owned customer evidence audit</legend>{#each builder.ownedAudit as row}<p>{row.source} · {row.read} · {row.routing}</p>{/each}<div class="grid gap-2 md:grid-cols-4"><input aria-label="Dataset name" placeholder="Dataset" class="rounded border p-2" bind:value={builderAudit.source}/><input aria-label="Dataset size" placeholder="Size or period" class="rounded border p-2" bind:value={builderAudit.size}/><select class="rounded border p-2" bind:value={builderAudit.read}><option value="yes">Read</option><option value="partial">Partly read</option><option value="no">Not read</option></select><select class="rounded border p-2" bind:value={builderAudit.routing}><option value="gate-3-source">Gate 3 source</option><option value="reference">Reference</option><option value="not-relevant">Not relevant</option></select></div><button onclick={addAudit}>Add dataset audit row</button></fieldset>
        <button class="rounded bg-primary px-4 py-2 text-primary-foreground" disabled={busy || !canEdit || !builder.foundersProblem.trim()} onclick={confirmBuilder}>Confirm builder inputs</button>
      </section>
    {:else if record.session.stage === 'gates' && currentGate === 'gate1'}
      <section class="space-y-4 rounded border p-5"><h2 class="text-xl">Terrain and Gate 1 · Descriptive Default</h2><p>Assess market terrain and decode observed competitor defaults from cited competitor artifacts. Enter one observed decode per line as <code>competitor | belief | confidence | vulnerability</code>; use multiple lines to retain every belief for a competitor.</p><div class="grid gap-3 md:grid-cols-2"><label>TAM<textarea class="w-full rounded border p-2" bind:value={terrain.tam}></textarea></label><label>Trajectory<select class="w-full rounded border p-2" bind:value={terrain.trajectory}><option value={null}>Unknown</option><option value="growing">Growing</option><option value="stable">Stable</option><option value="declining">Declining</option></select></label><label>Tailwind / headwind<textarea class="w-full rounded border p-2" bind:value={terrain.tailwind}></textarea></label><label>Diagnosis<select class="w-full rounded border p-2" bind:value={terrain.diagnosis}><option value="cyclical">Cyclical</option><option value="structural-positive">Structural positive</option><option value="structural-negative">Structural negative</option><option value="ambiguous-needs-evidence">Ambiguous; needs evidence</option></select></label><label class="md:col-span-2">Diagnosis evidence<textarea class="w-full rounded border p-2" bind:value={terrain.diagnosisEvidence}></textarea></label><label class="md:col-span-2">Cited market artifact IDs<input class="w-full rounded border p-2" bind:value={terrainRefsText} placeholder={evidenceOptions().map(o => o.id).join(', ')}/></label></div><label class="block">Competitor decoding<textarea class="w-full rounded border p-2" rows="4" placeholder="Competitor | observed belief/default | high, medium or low | vulnerability" bind:value={referenceText}></textarea></label><label class="block">Descriptive default<input class="w-full rounded border p-2" bind:value={gate1.descriptiveDefault}/></label><label class="block">Cohort<input class="w-full rounded border p-2" bind:value={gate1.cohort}/></label><label>Market concentration<select class="ml-2 rounded border p-2" bind:value={gate1.concentration}><option value="competitive">Competitive</option><option value="concentrated">Concentrated</option></select></label><label>Verdict<select class="ml-2 rounded border p-2" bind:value={gate1.verdict}><option value="pass">Pass</option><option value="fail">Fail</option><option value="evidence-insufficient">Evidence insufficient</option></select></label><label class="block">Finding<textarea class="w-full rounded border p-2" bind:value={gate1.finding}></textarea></label><div class="flex gap-3"><button disabled={busy || !canEdit} onclick={() => send('draft', { gate: 'terrain' })}>Suggest terrain</button><button disabled={busy || !canEdit} onclick={() => send('draft', { gate: 'gate1' })}>Suggest Gate 1</button><button class="rounded bg-primary px-4 py-2 text-primary-foreground" disabled={busy || !canEdit} onclick={confirmGate1}>Confirm terrain and Gate 1</button></div></section>
    {:else if record.session.stage === 'gates' && currentGate === 'gate2'}
      <section class="space-y-4 rounded border p-5"><h2 class="text-xl">Gate 2 · Is the default vulnerable?</h2><p>Separate the strongest defenders’ case from evidence that the default fails in this cohort.</p><label class="block">Vulnerability evidence<textarea class="w-full rounded border p-2" rows="3" bind:value={gate2.vulnerabilityEvidence}></textarea></label><label class="block">Defenders’ case<textarea class="w-full rounded border p-2" rows="3" bind:value={gate2.defendersCase}></textarea></label><label class="block">Rebuttal<textarea class="w-full rounded border p-2" rows="3" bind:value={gate2.rebuttal}></textarea></label><label class="block">Cited artifact IDs, comma separated<input class="w-full rounded border p-2" bind:value={gate2.refsText} placeholder={evidenceOptions().map(o => o.id).join(', ')}/></label><label>Verdict<select class="ml-2 rounded border p-2" bind:value={gate2.verdict}><option value="pass">Pass</option><option value="fail">Fail</option><option value="evidence-insufficient">Evidence insufficient</option></select></label><label class="block">Finding<textarea class="w-full rounded border p-2" bind:value={gate2.finding}></textarea></label><button disabled={busy || !canEdit} onclick={() => send('draft', { gate: 'gate2' })}>Suggest Gate 2</button><button class="ml-2 rounded bg-primary px-4 py-2 text-primary-foreground" disabled={busy || !canEdit} onclick={() => confirmGate(2)}>Confirm Gate 2</button></section>
    {:else if record.session.stage === 'gates' && currentGate === 'gate3'}
      <section class="space-y-4 rounded border p-5"><h2 class="text-xl">Gate 3 · Customer pain</h2><p>Trace a customer trigger and workaround to the default. Founder testimony alone cannot pass this market gate.</p>{#each [['trigger','Trigger'],['hack','Workaround or hack'],['pain','Observed pain'],['limitingBelief','Limiting belief'],['traceToDefault','Trace to descriptive default']] as [key,label]}<label class="block">{label}<textarea class="w-full rounded border p-2" rows="2" bind:value={gate3[key]}></textarea></label>{/each}<label class="block">Cited artifact IDs<input class="w-full rounded border p-2" bind:value={gate3.refsText} placeholder={evidenceOptions().map(o => o.id).join(', ')}/></label><label>Verdict<select class="ml-2 rounded border p-2" bind:value={gate3.verdict}><option value="pass">Pass</option><option value="fail">Fail</option><option value="evidence-insufficient">Evidence insufficient</option></select></label><label class="block">Finding<textarea class="w-full rounded border p-2" bind:value={gate3.finding}></textarea></label><button disabled={busy || !canEdit} onclick={() => send('draft', { gate: 'gate3' })}>Suggest Gate 3</button><button class="ml-2 rounded bg-primary px-4 py-2 text-primary-foreground" disabled={busy || !canEdit} onclick={() => confirmGate(3)}>Confirm Gate 3</button></section>
    {:else if record.session.stage === 'gates'}
      <section class="space-y-4 rounded border p-5"><h2 class="text-xl">Gate 4 · Willingness to pay</h2><p>Evidence must show a sustainable price, not just interest or tolerance.</p><label class="block">Price range<input class="w-full rounded border p-2" bind:value={gate4.priceRange}/></label><label class="block">Evidence<textarea class="w-full rounded border p-2" rows="4" bind:value={gate4.evidence}></textarea></label><label class="block">Cited artifact IDs<input class="w-full rounded border p-2" bind:value={gate4.refsText} placeholder={evidenceOptions().map(o => o.id).join(', ')}/></label><label>Verdict<select class="ml-2 rounded border p-2" bind:value={gate4.verdict}><option value="pass">Pass</option><option value="fail">Fail</option><option value="evidence-insufficient">Evidence insufficient</option></select></label><label class="block">Finding<textarea class="w-full rounded border p-2" bind:value={gate4.finding}></textarea></label><button disabled={busy || !canEdit} onclick={() => send('draft', { gate: 'gate4' })}>Suggest Gate 4</button><button class="ml-2 rounded bg-primary px-4 py-2 text-primary-foreground" disabled={busy || !canEdit} onclick={() => confirmGate(4)}>Confirm Gate 4</button></section>
    {:else if record.session.stage === 'risk'}
      <section class="space-y-4 rounded border p-5"><h2 class="text-xl">Gate 5 · Structural strategic risk</h2><p>Record all four risk patterns. Present risks need routing and a signed acknowledgment or a recorded dispute.</p>{#each risks as risk}<fieldset class="grid gap-3 rounded border p-3 md:grid-cols-3"><legend>{risk.pattern.toUpperCase()}</legend><label>State<select class="w-full rounded border p-2" bind:value={risk.state}><option value="present">Present</option><option value="absent">Absent</option><option value="unclear">Unclear</option></select></label><label>Severity<select class="w-full rounded border p-2" bind:value={risk.severity}><option value={null}>Not set</option><option value="manageable">Manageable</option><option value="material">Material</option><option value="critical">Critical</option></select></label><label>Route<select class="w-full rounded border p-2" bind:value={risk.mitigationRouting}><option value={null}>No route</option><option value="m03">M03</option><option value="m04">M04</option><option value="m11">M11</option><option value="external">External</option></select></label><label class="md:col-span-3">Evidence<textarea class="w-full rounded border p-2" rows="2" bind:value={risk.evidence}></textarea></label><label class="md:col-span-2">Acknowledgment line<input class="w-full rounded border p-2" bind:value={risk.acknowledgmentLine}/></label><label class="flex items-center gap-2"><input type="checkbox" bind:checked={risk.declined}/> Dispute instead</label>{#if risk.declined}<label class="md:col-span-3">Dispute<textarea class="w-full rounded border p-2" bind:value={risk.dispute}></textarea></label>{/if}</fieldset>{/each}<button disabled={busy || !canEdit} onclick={() => send('draft', { gate: 'gate5' })}>Suggest risk read</button><button class="ml-2 rounded bg-primary px-4 py-2 text-primary-foreground" disabled={busy || !canEdit} onclick={confirmGate5}>Confirm Gate 5</button></section>
    {:else if record.session.stage === 'outcome' && record.recon.gate4.verdict === 'pass' && record.recon.gate6.a.verdict === 'pending'}
      <section class="space-y-4 rounded border p-5"><h2 class="text-xl">Gate 6 · Hidden Truth and trace</h2><p>Test whether the Hidden Truth is evidenced in this market and whether the vacuum traces to that truth.</p><label class="block">Market implication of the Hidden Truth<textarea class="w-full rounded border p-2" rows="3" bind:value={gate6.implication}></textarea></label><label class="block">Trace sentence<textarea class="w-full rounded border p-2" rows="3" bind:value={gate6.traceSentence}></textarea></label><label>Vacuum stands without the Hidden Truth?<select class="ml-2 rounded border p-2" bind:value={gate6.standsWithoutTruth}><option value={null}>Unresolved</option><option value={false}>No</option><option value={true}>Yes</option></select></label><label class="block">Cited artifact IDs<input class="w-full rounded border p-2" bind:value={gate6.refsText} placeholder={evidenceOptions().map(o => o.id).join(', ')}/></label><div class="grid gap-3 md:grid-cols-2"><label>Truth evidenced<select class="ml-2 rounded border p-2" bind:value={gate6.verdictA}><option value="pass">Pass</option><option value="fail">Fail</option><option value="evidence-insufficient">Evidence insufficient</option></select></label><label>Vacuum traces to truth<select class="ml-2 rounded border p-2" bind:value={gate6.verdictB}><option value="pass">Pass</option><option value="fail">Fail</option><option value="evidence-insufficient">Evidence insufficient</option></select></label></div><label class="block">Finding<textarea class="w-full rounded border p-2" bind:value={gate6.finding}></textarea></label><button disabled={busy || !canEdit} onclick={() => send('draft', { gate: 'gate6' })}>Suggest Gate 6</button><button class="ml-2 rounded bg-primary px-4 py-2 text-primary-foreground" disabled={busy || !canEdit} onclick={confirmGate6}>Confirm Gate 6</button></section>
    {:else if record.session.stage === 'outcome'}
      <section class="space-y-4 rounded border p-5"><h2 class="text-xl">Evidence judgment and progression</h2><p>Review evidence adequacy separately from choosing the permitted progression outcome.</p><div class="rounded border p-4"><h3 class="font-semibold">Evidence checks</h3><p>Distinct-source and gate-kind checks are computed from the saved artifacts and cited IDs at judgment and seal.</p><ul>{#each record.session.evidenceReview?.entanglement.problems ?? [] as problem}<li>{problem}</li>{/each}{#each record.session.evidenceReview?.evidenceProblems ?? [] as problem}<li>{problem}</li>{/each}</ul>{#if record.progression?.blocked}<p role="status">{record.progression.blocked}</p>{/if}{#each record.progression?.options ?? [] as option}<p>{option.reason}</p>{/each}</div><label>Evidence disposition<select class="ml-2 rounded border p-2" bind:value={review.disposition}><option value="sufficient_for_provisional">Sufficient for provisional work</option><option value="insufficient">Insufficient</option><option value="contested">Contested</option></select></label><label class="block">Evidence rationale<textarea class="w-full rounded border p-2" rows="3" bind:value={review.rationale}></textarea></label><button disabled={busy || !canEdit || !review.rationale.trim()} onclick={confirmReview}>Record evidence judgment</button><hr/><label>Permitted outcome<select class="ml-2 rounded border p-2" bind:value={outcome.outcome}><option value="" disabled>Select an available outcome</option>{#each record.progression?.options ?? [] as option}<option value={option.outcome}>{option.outcome.replaceAll('_', ' ')}</option>{/each}</select></label><label class="block">Outcome statement<textarea class="w-full rounded border p-2" rows="4" bind:value={outcome.statement}></textarea></label><label class="block">Contrarian flags, one per line<textarea class="w-full rounded border p-2" rows="3" bind:value={contrarianText}></textarea></label><button disabled={busy || !canEdit || !record.session.evidenceReview || !record.progression?.options?.some(option => option.outcome === outcome.outcome) || !outcome.statement.trim()} onclick={chooseOutcome}>Record progression decision</button></section>
    {:else if record.session.stage === 'judgements'}
      <section class="space-y-4 rounded border p-5"><h2 class="text-xl">Judgements and seal</h2><p>Evidence review and progression are separate receipts tied to the exact evidence basis.</p><dl class="grid gap-2 md:grid-cols-2"><dt>Evidence disposition</dt><dd>{record.session.evidenceReview?.disposition ?? 'Not recorded'}</dd><dt>Evidence basis</dt><dd>{record.session.evidenceReview?.basisHash ?? '—'}</dd><dt>Progression outcome</dt><dd>{record.session.progressionDecision?.outcome ?? 'Not recorded'}</dd><dt>Decision basis</dt><dd>{record.session.progressionDecision?.basisHash ?? '—'}</dd></dl><button class="rounded bg-primary px-4 py-2 text-primary-foreground" disabled={busy || !canEdit || !record.session.progressionDecision} onclick={() => send('seal')}>Approve and seal immutable Market Reality</button></section>
    {:else if record.session.stage === 'sealed'}
      <section class="space-y-4 rounded border p-5"><h2 class="text-xl">Sealed Market Reality</h2><p>Receipt {record.seal?.receiptId} · SHA-256 {record.seal?.sealHash}</p>{#each documents.filter(item => item.kind === 'market-reality') as document}<article class="prose max-w-none rounded border p-4" aria-label="Saved market reality document" data-document-id={document.id}><h3 class="not-prose font-semibold">Saved document · {document.id}</h3>{@html document.contentHtml ?? ''}<a class="not-prose underline" href={`./market-reality/handoff?sessionId=${record.session.sessionId}&versionId=${document.versionId}&documentId=${document.id}`}>Download exact Markdown document</a></article>{/each}{#each documents.filter(item => item.kind === 'receipt') as document}<p><a class="underline" href={`./market-reality/handoff?sessionId=${record.session.sessionId}&versionId=${document.versionId}&documentId=${document.id}`}>Download immutable seal receipt JSON</a></p>{/each}<fieldset class="space-y-3 rounded border p-3"><legend>Create a successor</legend><p>The sealed record remains immutable. A new record starts from the current verified M01 source and carries forward the research scope as a draft.</p><label class="block">Reason for a successor<textarea class="w-full rounded border p-2" rows="3" bind:value={successorReason}></textarea></label><button class="rounded bg-primary px-4 py-2 text-primary-foreground" disabled={busy || !hydrated || !successorReason.trim()} onclick={() => send('successor', { reason: successorReason })}>Create editable successor</button></fieldset></section>
    {/if}
    {#if record.session.stage !== 'sealed'}<details class="rounded border p-3"><summary>Reopen an earlier stage</summary><p class="my-2">Revising an earlier stage clears its downstream confirmations and judgements, while preserving the previous revision history.</p><div class="flex flex-wrap gap-2"><select class="rounded border p-2" bind:value={revisionFrom}><option value="gather">Evidence gathering</option><option value="builder-inputs">Builder inputs</option><option value="gates">Vacuum gates</option><option value="risk">Structural risk</option><option value="outcome">Outcome review</option></select><input class="min-w-56 rounded border p-2" placeholder="Reason for reopening" bind:value={revisionReason}/><button disabled={busy || !canEdit || !revisionReason.trim()} onclick={() => send('revise', { from: revisionFrom, reason: revisionReason })}>Reopen from this stage</button></div></details>{/if}
  {/if}
</main>
