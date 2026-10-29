import { describe, expect, test } from 'bun:test';
import { fictionalFounderClosing, M01_LIVE_OPERATIONS } from '../../../tests/strategy/fixtures/m01-live';
import { acceptM01Step, assertLocalM01Targets, m01AppendCommandMatches, m01CommandAction, m01CommittedCommandMatches, m01LiveHash, m01NeedsClosingContribution, m01OperationAwaitingReview, m01OutputReviewCandidate, m01OutputReviewDigest, m01ResumeJobDecision, m01SealCanResume, m01SealReplayMatches, m01TranscriptSegmentCount, operationCandidate, parseM01LiveOptions, requireRealTriggerRun, reserveM01Attempt, resolveM01LiveFiles, type M01LiveCheckpoint } from './m01-live';

const checkpoint = (callBudget = 10): M01LiveCheckpoint => ({
  version: 1, runName: 'bounded-m01', createdAt: 'now', callBudget, reservedCalls: 0,
  engagementId: 'engagement', grantId: 'grant', createCommandId: 'create', nextOperation: 0,
  attempts: {}, accepted: {}, confirmations: {},
});

describe('M01 live harness safety', () => {
  test('defaults to no live work and requires an explicit bounded run', () => {
    expect(parseM01LiveOptions([])).toMatchObject({ live: false });
    expect(() => parseM01LiveOptions(['--max-calls', '8'])).toThrow('require explicit --live');
    expect(() => parseM01LiveOptions(['--live', '--new-run', 'run-a', '--env-file', '/private/dev.env'])).toThrow('approved --max-calls');
    expect(() => parseM01LiveOptions(['--live', '--new-run', 'run-a', '--max-calls', '11', '--env-file', '/private/dev.env'])).toThrow('from 8 through 10');
    expect(parseM01LiveOptions(['--live', '--new-run', 'run-a', '--max-calls', '10', '--env-file', '/private/dev.env'])).toMatchObject({ live: true, newRun: 'run-a', maxCalls: 10 });
    expect(() => parseM01LiveOptions(['--live', '--run', 'run-a', '--max-calls', '8', '--env-file', '/private/dev.env'])).toThrow('--run requires --resume');
    expect(() => parseM01LiveOptions(['--live', '--run', 'run-a', '--resume', '--max-calls', '8', '--env-file', '/private/dev.env', '--retry', 'derive'])).toThrow('non-empty --reason');
    expect(parseM01LiveOptions(['--live', '--run', 'run-a', '--resume', '--max-calls', '8', '--env-file', '/private/dev.env', '--retry', 'derive', '--reason', 'The provider returned an unusable draft'])).toMatchObject({ retry: 'derive' });
    expect(parseM01LiveOptions(['--live', '--run', 'run-a', '--resume', '--max-calls', '8', '--env-file', '/private/dev.env', '--approve-outputs', 'a'.repeat(64)]).approveOutputs).toBe('a'.repeat(64));
    expect(parseM01LiveOptions(['--live', '--run', 'run-a', '--resume', '--max-calls', '8', '--env-file', '/private/dev.env', '--seal-file', '/private/seal-review.json']).sealFile).toBe('/private/seal-review.json');
  });

  test('uses the eight requested operations and safe private checkpoint paths', () => {
    expect(M01_LIVE_OPERATIONS).toEqual(['prepare', 'turn-null', 'turn-rich', 'synthesise', 'revise-anchor', 'revise-manifesto', 'revise-matrix', 'derive']);
    expect(resolveM01LiveFiles('/tmp/integration', 'run-one').checkpointPath).toBe('/tmp/integration/m01-live/run-one/checkpoint.json');
    expect(() => resolveM01LiveFiles('/tmp/integration', '../outside')).toThrow('Run name');
  });

  test('reserves a call once, checkpoints retries as new reservations, and caps lifetime at ten', () => {
    const cp = checkpoint(10);
    const first = reserveM01Attempt(cp, 'prepare', 1, undefined, 'first');
    expect(first.newlyReserved).toBe(true);
    const resumed = reserveM01Attempt(cp, 'prepare', 1);
    expect(resumed.newlyReserved).toBe(false);
    expect(resumed.attempt.commandId).toBe(first.attempt.commandId);
    expect(resumed.attempt.reservation).toBe(first.attempt.reservation);
    expect(cp.reservedCalls).toBe(1);
    first.attempt.status = 'failed';
    const retry = reserveM01Attempt(cp, 'prepare', 1, 'Explicit review of the failed prepare attempt', 'second');
    expect(retry.newlyReserved).toBe(true);
    expect(retry.attempt.reservation).toBe(2);
    expect(retry.attempt.commandId).not.toBe(first.attempt.commandId);
    expect(cp.reservedCalls).toBe(2);
    retry.attempt.status = 'queued';
    expect(() => reserveM01Attempt(cp, 'prepare', 1, 'Do not retry active work')).toThrow('active or unstarted');
    cp.reservedCalls = 10;
    expect(() => reserveM01Attempt(cp, 'derive', 9)).toThrow('budget exhausted');
  });

  test('only accepts the exact persisted review hash for the current operation', () => {
    const cp = checkpoint();
    const candidate = { plan: { summary: 'fictional' } };
    const attempt = reserveM01Attempt(cp, 'prepare', 1).attempt;
    attempt.status = 'review-ready'; attempt.resultHash = m01LiveHash(candidate); attempt.completedRevision = 2;
    expect(m01OperationAwaitingReview(cp)).toBe('prepare');
    expect(() => acceptM01Step(cp, 'prepare', 'wrong')).toThrow('does not match');
    acceptM01Step(cp, 'prepare', m01LiveHash(candidate));
    expect(cp.accepted.prepare).toBe(m01LiveHash(candidate));
    expect(cp.nextOperation).toBe(1);
    expect(() => acceptM01Step(cp, 'prepare', m01LiveHash(candidate))).toThrow('does not match');

    for (let index = 1; index < M01_LIVE_OPERATIONS.length; index++) {
      const operation = M01_LIVE_OPERATIONS[index]!;
      const nextCandidate = { operation, summary: `fictional ${index}` };
      const nextAttempt = reserveM01Attempt(cp, operation, index + 1).attempt;
      nextAttempt.status = 'review-ready';
      nextAttempt.resultHash = m01LiveHash(nextCandidate);
      nextAttempt.completedRevision = index + 2;
      expect(m01OperationAwaitingReview(cp)).toBe(operation);
      acceptM01Step(cp, operation, nextAttempt.resultHash);
      expect(cp.nextOperation).toBe(index + 1);
    }
    expect(cp.nextOperation).toBe(M01_LIVE_OPERATIONS.length);
    expect(m01OperationAwaitingReview(cp)).toBeUndefined();
  });

  test('review digest excludes confirmation state so content remains stable through approvals', () => {
    const session = { outputs: { outputs: { manifesto: 'Candidate' }, factsAnchor: { items: [{ fact: 'Synthetic' }] }, publicRecordReadiness: { state: 'not-assessed', sentence: '' }, status: { manifesto: 'candidate' } }, setTwoDraft: { purpose: 'fictional' } };
    const before = m01OutputReviewDigest(session);
    expect(m01LiveHash(m01OutputReviewCandidate(session))).toBe(before);
    session.outputs.status.manifesto = 'locked';
    expect(m01OutputReviewDigest(session)).toBe(before);
    expect(m01LiveHash(operationCandidate({ plan: 'p' }, 'prepare'))).toBe(m01LiveHash('p'));
  });

  test('requires the guarded local app/database and real development Trigger evidence', () => {
    const valid = { databaseUrl: 'postgresql://user:pw@127.0.0.1:55433/strategy_auth_integration_test', guardedDatabaseUrl: 'postgresql://other:secret@127.0.0.1:55433/strategy_auth_integration_test', appUrl: 'http://127.0.0.1:5188', triggerKey: 'tr_dev_abc', triggerApiUrl: 'https://api.trigger.dev', triggerBranch: 'development', providerUrl: 'https://openrouter.ai/api/v1/chat/completions' };
    expect(assertLocalM01Targets(valid)).toBe(true);
    expect(() => assertLocalM01Targets({ ...valid, databaseUrl: 'postgresql://user@db.example/app' })).toThrow('isolated local integration database');
    expect(() => assertLocalM01Targets({ ...valid, appUrl: 'https://production.example' })).toThrow('local synthetic Auth app');
    expect(() => assertLocalM01Targets({ ...valid, triggerKey: 'tr_prod_secret' })).toThrow('development environment');
    expect(() => assertLocalM01Targets({ ...valid, triggerBranch: 'production' })).toThrow('development environment');
    expect(() => requireRealTriggerRun('run_local_fake')).toThrow('real Trigger');
    expect(() => requireRealTriggerRun(undefined)).toThrow('real Trigger');
    expect(requireRealTriggerRun('run_01abcXYZ')).toBe('run_01abcXYZ');
  });

  test('matches live turn labels to the committed turn action and validates command identity', () => {
    expect(m01CommandAction('turn-null')).toBe('turn');
    expect(m01CommandAction('turn-rich')).toBe('turn');
    expect(m01CommittedCommandMatches('turn-null', { operation: 'turn', commandId: 'cmd-1' }, 'cmd-1')).toBe(true);
    expect(m01CommittedCommandMatches('turn-rich', { operation: 'turn', commandId: 'other' }, 'cmd-1')).toBe(false);
    expect(m01CommittedCommandMatches('prepare', { operation: 'turn', commandId: 'cmd-1' }, 'cmd-1')).toBe(false);
  });

  test('successful persisted job resumes by reconciliation without a new reservation or enqueue decision', () => {
    const cp = checkpoint(10);
    const attempt = reserveM01Attempt(cp, 'turn-null', 4).attempt;
    attempt.jobId = 'job-1'; attempt.status = 'queued';
    const reserved = cp.reservedCalls;
    expect(m01ResumeJobDecision({ currentRevision: 5, inputRevision: 4, status: 'succeeded' })).toBe('reconcile');
    expect(cp.reservedCalls).toBe(reserved);
    expect(m01ResumeJobDecision({ currentRevision: 4, inputRevision: 4, status: 'running' })).toBe('reconcile');
    expect(m01ResumeJobDecision({ currentRevision: 4, inputRevision: 4 })).toBe('enqueue');
    expect(() => m01ResumeJobDecision({ currentRevision: 5, inputRevision: 4, status: 'running' })).toThrow('revision changed');
    expect(() => m01ResumeJobDecision({ currentRevision: 6, inputRevision: 4, status: 'succeeded' })).toThrow('revision changed');
  });

  test('reconciles an already committed seal after a lost response without resealing', () => {
    const saved = { body: { sourceAttributionId: 'att-1', reviewAnswers: { gate: 'pass' }, notes: 'Reviewed', derived: { purpose: 'fictional' } } };
    expect(m01SealCanResume({ hasOutputs: true, isSealed: true, hasDraft: false, hasSealedDerived: true })).toBe(true);
    expect(m01SealCanResume({ hasOutputs: true, isSealed: true, hasDraft: false, hasSealedDerived: false })).toBe(false);
    expect(m01SealCanResume({ hasOutputs: true, isSealed: false, hasDraft: true, hasSealedDerived: false })).toBe(true);
    const replay = { saved, attributionId: 'att-1', answers: { gate: 'pass' }, notes: 'Reviewed', derived: { purpose: 'fictional' }, committedAttributionId: 'att-1' };
    expect(m01SealReplayMatches(replay)).toBe(true);
    expect(m01SealReplayMatches({ ...replay, committedAttributionId: undefined })).toBe(false);
    expect(m01SealReplayMatches({ ...replay, notes: 'Changed' })).toBe(false);
  });

  test('adds only a fictional closing speaker segment when needed to meet synthesis minimum', () => {
    const threeSegments = [
      { event: { event_id: 'a1', type: 'session.output_transcript.delta', delta: 'Assistant plan.' } },
      { event: { event_id: 'u1', type: 'session.input_transcript.delta', delta: 'Synthetic founder answer.' } },
      { event: { event_id: 'a2', type: 'session.output_transcript.delta', delta: 'Assistant follow-up.' } },
    ];
    const closing = { event_id: 'close-1', type: 'session.input_transcript.delta' as const, delta: fictionalFounderClosing };
    expect(m01TranscriptSegmentCount(threeSegments)).toBe(3);
    expect(m01NeedsClosingContribution(threeSegments)).toBe(true);
    expect(m01TranscriptSegmentCount([...threeSegments, { event: closing }])).toBe(4);
    expect(m01NeedsClosingContribution([...threeSegments, { event: closing }])).toBe(false);
    expect(fictionalFounderClosing).toContain('not an earlier pre-session');
    expect(fictionalFounderClosing).toContain('no real market proof');
    const command = { commandId: 'append-close-1', event: closing };
    expect(m01AppendCommandMatches({ operation: 'transcript', commandId: command.commandId, events: [closing] }, command)).toBe(true);
    expect(m01AppendCommandMatches({ operation: 'transcript', commandId: command.commandId, events: [{ ...closing, delta: 'changed' }] }, command)).toBe(false);
  });
});
