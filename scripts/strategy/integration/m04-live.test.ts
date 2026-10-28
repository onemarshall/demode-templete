import { describe, expect, test } from 'bun:test';
import { mkdtemp, readFile, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { applyReviewEdits, assertDecisionMatchesPresentation, atomicWriteJson, authenticate, canonicalJson, hasProviderGeneration, makeReviewPacket, parseOptions, prepareStageRetry, readJobAndSession, reconcileConfirmation, reserveProviderCall, resolveRunFiles, safeHash, validationSummary } from './m04-live';

describe('M04 live harness safety', () => {
  test('defaults to a zero-call dry run', () => {
    expect(parseOptions([])).toMatchObject({ live: false, maxCalls: 0 });
  });
  test('requires explicit live mode and a bounded call count', () => {
    expect(() => parseOptions(['--max-calls', '1'])).toThrow('--max-calls requires explicit --live');
    expect(() => parseOptions(['--live', '--max-calls', '8', '--env-file', '/tmp/private.env', '--new-run', 'one'])).toThrow('New runs cannot exceed the original 7-call budget');
    expect(parseOptions(['--live', '--max-calls', '7', '--env-file', '/tmp/private.env', '--new-run', 'one']).live).toBe(true);
    expect(parseOptions(['--confirm-review', '--run', 'one', '--resume']).live).toBe(false);
    expect(parseOptions(['--present-only', '--run', 'one', '--resume']).presentOnly).toBe(true);
    expect(() => parseOptions(['--confirm-review', '--run', 'one', '--live', '--max-calls', '7', '--env-file', '/tmp/private.env'])).toThrow('separate zero-provider-call steps');
    expect(parseOptions(['--run', 'one', '--resume', '--live', '--max-calls', '8', '--env-file', '/tmp/private.env', '--retry-stage', 'financial-grounding', '--review-reason', 'Correct invalid economic input contract', '--extend-budget', '1'])).toMatchObject({ retryStage: 'financial-grounding', extendBudget: 1, maxCalls: 8 });
    expect(() => parseOptions(['--run', 'one', '--resume', '--live', '--max-calls', '7', '--env-file', '/tmp/private.env', '--retry-stage', 'financial-grounding'])).toThrow('non-empty --review-reason');
    expect(() => parseOptions(['--run', 'one', '--resume', '--live', '--max-calls', '7', '--env-file', '/tmp/private.env', '--retry-stage'])).toThrow('must name a M04 data stage');
    expect(() => parseOptions(['--run', 'one', '--resume', '--live', '--max-calls', '7', '--env-file', '/tmp/private.env', '--review-reason', 'because'])).toThrow('requires --retry-stage');
    expect(() => parseOptions(['--run', 'one', '--resume', '--live', '--max-calls', '7', '--env-file', '/tmp/private.env', '--extend-budget', '1'])).toThrow('requires --retry-stage');
    expect(() => parseOptions(['--run', 'one', '--resume', '--live', '--max-calls', '7', '--env-file', '/tmp/private.env', '--retry-stage', 'financial-grounding', '--review-reason', 'because', '--extend-budget', '1'])).toThrow('requires --max-calls 8');
    expect(() => parseOptions(['--run', 'one', '--resume', '--live', '--max-calls', '8', '--env-file', '/tmp/private.env', '--retry-stage', 'financial-grounding', '--review-reason', 'because', '--confirm-review'])).toThrow('separate from confirmation');
  });
  test('review packets preserve the exact candidate and expose source identity issues', () => {
    const candidate = { decisionOwner: 'Model guess', authorityRef: 'Guess', plannedOffer: 'Keep this wording' };
    const packet = makeReviewPacket('context', candidate, { sources: { entry: { receipt: { decisionOwner: { name: 'Pinned owner', authorityBasis: 'Pinned authority' } } } } });
    expect(packet.generatedCandidate).toEqual(candidate);
    expect(packet.validationIssues).toHaveLength(2);
    expect((packet.generatedCandidate as any).plannedOffer).toBe('Keep this wording');
    expect(packet.originalGeneratedHash).toBe(safeHash(candidate));
  });
  test('review edits are explicit and preserve all untouched semantic fields', () => {
    const original = { one: 'generated', two: 'keep' };
    expect(applyReviewEdits(original, { one: 'human revised' })).toEqual({ candidate: { one: 'human revised', two: 'keep' }, changedFields: ['one'] });
    expect(() => applyReviewEdits(original, { fixtureOnly: true })).toThrow('unknown generated field');
  });
  test('provider completion needs successful durable job, real run, and post-input generated revision', () => {
    const base = { status: 'succeeded', providerRunId: 'run_abc', inputRevision: 4, generatedRevision: 5, generatedCandidate: { text: 'draft' }, apiCandidate: { text: 'draft' } };
    expect(hasProviderGeneration(base)).toBe(true);
    expect(hasProviderGeneration({ ...base, generatedRevision: undefined })).toBe(false);
    expect(hasProviderGeneration({ ...base, generatedRevision: 4 })).toBe(false);
    expect(hasProviderGeneration({ ...base, providerRunId: 'run_local_abc' })).toBe(false);
    expect(hasProviderGeneration({ ...base, status: 'pending' })).toBe(false);
    expect(hasProviderGeneration({ ...base, apiCandidate: { text: 'prefill' } })).toBe(false);
  });
  test('candidate comparison is canonical across JSON object key order and preserves array order', () => {
    expect(canonicalJson({ b: 2, a: { y: 1, x: 0 } })).toBe(canonicalJson({ a: { x: 0, y: 1 }, b: 2 }));
    expect(safeHash({ b: 2, a: 1 })).toBe(safeHash({ a: 1, b: 2 }));
    expect(safeHash([1, 2])).not.toBe(safeHash([2, 1]));
  });
  test('job and session query responses are consumed separately', async () => {
    const urls: string[] = [];
    const api = { get: async (url: string) => {
      urls.push(url);
      const job = url.includes('&jobId=');
      const body = job ? { jobId: 'job-1', status: 'succeeded', sessionId: 'session-1' } : { session: { id: 'session-1', drafts: { context: { wording: 'generated' } } } };
      return { ok: () => true, status: () => 200, json: async () => body };
    } };
    const result = await readJobAndSession(api, 'http://local/m04', 'session-1', 'job-1');
    expect(result.job).toEqual({ jobId: 'job-1', status: 'succeeded', sessionId: 'session-1' });
    expect(result.session.session.drafts.context.wording).toBe('generated');
    expect(urls.some(url => url.includes('&jobId=job-1'))).toBe(true);
    expect(urls.some(url => url.endsWith('?sessionId=session-1'))).toBe(true);
  });
  test('safe validation packet retains typed safe message and issue paths', () => {
    expect(validationSummary({ error: { code: 'M04_REVIEW_REQUIRED', safeMessage: 'Review the named fields', issues: [{ code: 'authority', path: ['context', 'owner'] }] } })).toEqual({ message: 'Review the named fields', issues: [{ code: 'authority', path: ['context', 'owner'] }] });
  });
  test('human decision must use the hash returned by present-only', () => {
    expect(() => assertDecisionMatchesPresentation({ path: 'wait', memoHash: 'old' }, 'actual-presented-hash')).toThrow('--present-only');
    expect(() => assertDecisionMatchesPresentation({ memoHash: 'actual-presented-hash' }, 'actual-presented-hash')).not.toThrow();
  });
  test('named checkpoints are stable and separate', () => {
    expect(resolveRunFiles('/tmp/m04', 'run-a').checkpointPath).toBe('/tmp/m04/m04-live/run-a/checkpoint.json');
    expect(() => resolveRunFiles('/tmp/m04', '../other')).toThrow('Run name');
  });
  test('resume always re-authenticates without persisting cookies', async () => {
    let calls = 0;
    await authenticate({ post: async () => { calls++; return { ok: () => true, status: () => 200 }; } }, { appUrl: 'http://127.0.0.1', email: 'test@example.com', password: 'synthetic' });
    expect(calls).toBe(1);
  });
  test('retries reuse a single lifetime budget reservation', () => {
    const checkpoint: any = { jobs: {}, reservedCalls: 0, callBudget: 1 };
    expect(reserveProviderCall(checkpoint, 'context', 3).newlyReserved).toBe(true);
    expect(reserveProviderCall(checkpoint, 'context', 3).newlyReserved).toBe(false);
    expect(checkpoint.reservedCalls).toBe(1);
    expect(() => reserveProviderCall(checkpoint, 'human-load', 4)).toThrow('budget exhausted');
  });
  test('retry preparation archives the old candidate and job without refunding its call', () => {
    const stage = 'financial-grounding';
    const oldDraft = { generated: 'invalid grounding' };
    const checkpoint: any = {
      version: 2, runName: 'bounded-retry', jobs: { [stage]: { jobId: 'job-old', inputRevision: 20, providerRunId: 'run_old', reserved: true } },
      completed: { [stage]: { revision: 21, generatedRevision: 21, draftHash: safeHash(oldDraft) } },
      commandIds: { [stage]: 'draft-old' }, confirmCommandIds: { [stage]: 'confirm-old' },
      reviewAudit: { [stage]: { originalGeneratedHash: safeHash(oldDraft), changedFields: [], provenance: 'human-edited-review-packet', sourcePinnedIdentityCorrection: false } },
      confirmed: {}, callBudget: 7, reservedCalls: 7, createdAt: 'now',
    };
    const prepared = prepareStageRetry({ checkpoint, stage, reviewReason: 'Economic input contract validation failed', session: { stage, drafts: { [stage]: oldDraft }, confirmations: {} }, previousJob: { id: 'job-old', status: 'succeeded' }, activeJobs: [], extendBudget: 1, maxCalls: 8, now: 'retry-time' });
    expect(checkpoint.jobs[stage].jobId).toBe('job-old');
    expect(prepared.checkpoint.previousAttempts?.[stage]?.[0]).toMatchObject({ job: { jobId: 'job-old', providerRunId: 'run_old' }, completed: { draftHash: safeHash(oldDraft) }, commandId: 'draft-old', confirmCommandId: 'confirm-old', jobStatus: 'succeeded', reviewReason: 'Economic input contract validation failed' });
    expect(prepared.checkpoint.jobs[stage]).toBeUndefined();
    expect(prepared.checkpoint.completed[stage]).toBeUndefined();
    expect(prepared.checkpoint.commandIds[stage]).toBeUndefined();
    expect(prepared.checkpoint.confirmCommandIds[stage]).toBeUndefined();
    expect(prepared.checkpoint.reviewAudit?.[stage]).toBeUndefined();
    expect(prepared.checkpoint.reservedCalls).toBe(7);
    expect(prepared.checkpoint.callBudget).toBe(8);
    expect(prepared.checkpoint.budgetExtensions).toEqual([{ from: 7, to: 8, reason: 'Economic input contract validation failed', at: 'retry-time' }]);
    const next = reserveProviderCall(prepared.checkpoint, stage, 22);
    expect(next.newlyReserved).toBe(true);
    expect(prepared.checkpoint.reservedCalls).toBe(8);
  });
  test('retry preparation rejects confirmation, wrong stage, active work, and absent completed evidence', () => {
    const stage = 'financial-grounding';
    const draft = { generated: true };
    const base: any = { version: 2, runName: 'r', jobs: { [stage]: { jobId: 'job-old', inputRevision: 1, providerRunId: 'run_old', reserved: true } }, completed: { [stage]: { revision: 2, generatedRevision: 2, draftHash: safeHash(draft) } }, commandIds: {}, confirmCommandIds: {}, confirmed: {}, callBudget: 7, reservedCalls: 1, createdAt: 'now' };
    const input: any = { checkpoint: base, stage, reviewReason: 'Review failed grounding', session: { stage, drafts: { [stage]: draft }, confirmations: {} }, previousJob: { id: 'job-old', status: 'succeeded' }, activeJobs: [], maxCalls: 7 };
    expect(() => prepareStageRetry({ ...input, checkpoint: { ...base, confirmed: { [stage]: 3 } } })).toThrow('confirmed stage');
    expect(() => prepareStageRetry({ ...input, session: { ...input.session, stage: 'human-load' } })).toThrow('current stage');
    expect(() => prepareStageRetry({ ...input, session: { ...input.session, seal: { id: 'sealed' } } })).toThrow('sealed');
    expect(() => prepareStageRetry({ ...input, activeJobs: [{ id: 'job-active', status: 'running' }] })).toThrow('active');
    expect(() => prepareStageRetry({ ...input, session: { stage, drafts: {}, confirmations: {} } })).toThrow('completed candidate');
    expect(() => prepareStageRetry({ ...input, previousJob: null })).toThrow('Original durable job');
  });
  test('retry budget extension is explicit, one-time, and preparation is idempotent without re-archiving', () => {
    const stage = 'financial-grounding';
    const draft = { invalid: true };
    const checkpoint: any = { version: 2, runName: 'retry', jobs: { [stage]: { jobId: 'job-old', inputRevision: 4, providerRunId: 'run_old', reserved: true } }, completed: { [stage]: { revision: 5, generatedRevision: 5, draftHash: safeHash(draft) } }, commandIds: {}, confirmCommandIds: {}, confirmed: {}, callBudget: 7, reservedCalls: 7, createdAt: 'now' };
    const args: any = { checkpoint, stage, reviewReason: 'Correct rejected contract', session: { stage, drafts: { [stage]: draft }, confirmations: {} }, previousJob: { id: 'job-old', status: 'succeeded' }, activeJobs: [], maxCalls: 7 };
    expect(() => prepareStageRetry(args)).toThrow('budget exhausted');
    const first = prepareStageRetry({ ...args, extendBudget: 1, maxCalls: 8, now: 'once' }).checkpoint;
    expect(() => prepareStageRetry({ ...args, checkpoint: first, extendBudget: 1, maxCalls: 8 })).toThrow('cannot be repeated');
    const resumed = prepareStageRetry({ ...args, checkpoint: first, maxCalls: 8 });
    expect(resumed.alreadyPrepared).toBe(true);
    expect(resumed.checkpoint.previousAttempts?.[stage]).toHaveLength(1);
    const reserved = reserveProviderCall(resumed.checkpoint, stage, 6).reservation;
    const retryJob = { ...reserved, jobId: 'job-retry' };
    const repeatedPreparation = prepareStageRetry({ ...args, checkpoint: { ...resumed.checkpoint, jobs: { ...resumed.checkpoint.jobs, [stage]: retryJob } }, maxCalls: 8, activeJobs: [{ id: 'job-retry', status: 'pending' }] });
    expect(repeatedPreparation.alreadyPrepared).toBe(true);
    expect(repeatedPreparation.checkpoint.previousAttempts?.[stage]).toHaveLength(1);
    expect(reserveProviderCall(resumed.checkpoint, stage, 6).newlyReserved).toBe(false);
    expect(resumed.checkpoint.reservedCalls).toBe(8);
    const repeatedWithCandidate = { ...resumed.checkpoint, completed: { ...resumed.checkpoint.completed, [stage]: { revision: 7, generatedRevision: 7, draftHash: safeHash({ retry: true }) } }, jobs: { ...resumed.checkpoint.jobs, [stage]: { jobId: 'job-new', inputRevision: reserved.inputRevision, providerRunId: 'run_new', reserved: true } } };
    expect(() => prepareStageRetry({ ...args, checkpoint: repeatedWithCandidate, maxCalls: 8 })).toThrow('already has a retry candidate');
    expect(() => prepareStageRetry({ ...args, extendBudget: 1, maxCalls: 8, checkpoint: { ...checkpoint, callBudget: 8, budgetExtensions: [{ from: 7, to: 8, reason: 'already extended', at: 'before' }] } })).toThrow('One-time budget extension');
  });
  test('explicit 7-to-8 extension preserves a five-call lifetime count before the retry reservation', () => {
    const stage = 'financial-grounding';
    const draft = { invalid: true };
    const checkpoint: any = { version: 2, runName: 'five-used', jobs: { [stage]: { jobId: 'job-old', inputRevision: 4, providerRunId: 'run_old', reserved: true } }, completed: { [stage]: { revision: 5, generatedRevision: 5, draftHash: safeHash(draft) } }, commandIds: {}, confirmCommandIds: {}, confirmed: {}, callBudget: 7, reservedCalls: 5, createdAt: 'now' };
    const prepared = prepareStageRetry({ checkpoint, stage, reviewReason: 'Correct invalid financial contract', session: { stage, drafts: { [stage]: draft }, confirmations: {} }, previousJob: { id: 'job-old', status: 'succeeded' }, activeJobs: [], extendBudget: 1, maxCalls: 8, now: 'once' });
    expect(prepared.checkpoint.reservedCalls).toBe(5);
    expect(prepared.checkpoint.callBudget).toBe(8);
    expect(reserveProviderCall(prepared.checkpoint, stage, 6)).toMatchObject({ newlyReserved: true, reservation: { inputRevision: 6 } });
    expect(prepared.checkpoint.reservedCalls).toBe(6);
  });
  test('lost confirmation acknowledgement reconciles only the exact current committed confirmation', () => {
    const candidate = { decisionOwner: 'Owner', authorityRef: 'Pinned', plannedOffer: 'Model wording' };
    const confirmation = { decision: 'confirmed', target: 'context', revision: 6 };
    const current = { stage: 'conviction-cost', data: { context: candidate }, confirmations: { context: confirmation } };
    const payload = { data: { context: candidate }, confirmations: { context: confirmation } };
    const record: any = { revision: 6, action: 'edit', command_input: { operation: 'step', action: 'confirm', stage: 'context' }, payload_text: JSON.stringify(payload) };
    expect(reconcileConfirmation({ stage: 'context', expectedCandidate: candidate, currentSession: current, record })).toBe(true);
    expect(reconcileConfirmation({ stage: 'context', expectedCandidate: { ...candidate, plannedOffer: 'changed' }, currentSession: current, record })).toBe(false);
    expect(reconcileConfirmation({ stage: 'context', expectedCandidate: candidate, currentSession: { ...current, stage: 'context', confirmations: {} }, record })).toBe(false);
    expect(reconcileConfirmation({ stage: 'context', expectedCandidate: candidate, currentSession: { ...current, data: { context: { ...candidate, plannedOffer: 'reopened' } } }, record })).toBe(false);
  });
  test('checkpoint writes replace atomically with private permissions', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'm04-live-atomic-'));
    const path = join(dir, 'checkpoint.json');
    try {
      await atomicWriteJson(path, { version: 2, revision: 1 });
      await atomicWriteJson(path, { version: 2, revision: 2 });
      expect(JSON.parse(await readFile(path, 'utf8')).revision).toBe(2);
      expect((await stat(path)).mode & 0o777).toBe(0o600);
    } finally { await rm(dir, { recursive: true, force: true }); }
  });
});
