import { afterEach, describe, expect, test } from 'bun:test';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  acceptM02Review, m02CandidateHash, m02ConfirmationReplay, m02JobMatches, m02LiveHash, m02OperationReady, m02ResumeDecision, m02ShouldStartProxy,
  parseM02LiveOptions, reserveM02Attempt, resolveM02LiveFiles, type M02LiveCheckpoint,
} from './m02-live.ts';
import { createM02ProviderBudget, FileM02BudgetLedger, M02_LIVE_MAX_TOKENS, M02_LIVE_MODEL, M02_LIVE_TIMEOUT_MS } from './m02-provider-budget.ts';

const config = (runName: string, maxCalls = 2) => ({ runName, maxCalls, model: M02_LIVE_MODEL, maxTokens: M02_LIVE_MAX_TOKENS, timeoutMs: M02_LIVE_TIMEOUT_MS, apiKey: 'synthetic-test-key' });
const blank = (): M02LiveCheckpoint => ({ version: 1, runName: 'test-run', createdAt: '2026-10-29T00:00:00.000Z', callBudget: 2, reservedCalls: 0, sessionId: 'session-1', nextOperation: 0, attempts: {}, accepted: {}, confirmationCommands: [], lastRevision: 1 });
let dirs: string[] = [];
async function tempDir() { const path = await mkdtemp(join(tmpdir(), 'm02-live-test-')); dirs.push(path); return path; }
afterEach(async () => { await Promise.all(dirs.map(path => rm(path, { recursive: true, force: true }))); dirs = []; });

describe('bounded M02 live verification', () => {
  test('requires explicit live approval, named new or resume run, and no more than eight calls', () => {
    expect(parseM02LiveOptions([])).toMatchObject({ live: false });
    expect(() => parseM02LiveOptions(['--new-run', 'x'])).toThrow('--live');
    expect(() => parseM02LiveOptions(['--live', '--new-run', 'x', '--max-calls', '9', '--env-file', 'private.env', '--session-id', 's'])).toThrow('1 through 8');
    expect(() => parseM02LiveOptions(['--live', '--new-run', 'x', '--max-calls', '1', '--env-file', 'private.env'])).toThrow('--session-id');
    expect(parseM02LiveOptions(['--live', '--new-run', 'x', '--max-calls', '1', '--env-file', 'private.env', '--session-id', '00000000-0000-4000-8000-000000000001'])).toMatchObject({ live: true, newRun: 'x' });
    expect(() => parseM02LiveOptions(['--live', '--run', 'x', '--max-calls', '1', '--env-file', 'private.env'])).toThrow('--resume');
    expect(() => parseM02LiveOptions(['--live', '--run', 'x', '--resume', '--max-calls', '1', '--env-file', 'private.env', '--accept-review', 'no'])).toThrow('64-character');
  });

  test('reserves each operation once and reconciles lost responses only against the same semantic job', () => {
    const state = blank();
    const one = reserveM02Attempt(state, 'setup', 1, '2026-10-29T00:00:01.000Z');
    expect(one.newlyReserved).toBe(true);
    expect(reserveM02Attempt(state, 'setup', 1).newlyReserved).toBe(false);
    expect(state.reservedCalls).toBe(1);
    expect(m02ResumeDecision({ currentRevision: 1, inputRevision: 1 })).toBe('enqueue');
    expect(m02ResumeDecision({ currentRevision: 2, inputRevision: 1, status: 'succeeded' })).toBe('reconcile');
    expect(() => m02ResumeDecision({ currentRevision: 3, inputRevision: 1, status: 'succeeded' })).toThrow('cannot be reconciled');
    const job = { id: 'job-1', sessionId: 'session-1', expectedRevision: 1, commandId: one.attempt.commandId, command: {
      action: 'draft', gate: 'setup', sessionId: 'session-1', expectedRevision: 1, commandId: one.attempt.commandId, module: 'm02', stage: 'm02',
    } };
    expect(m02JobMatches(job, one.attempt)).toBe(true);
    expect(m02JobMatches({ ...job, command: { ...job.command, gate: 'gate1' } }, one.attempt)).toBe(false);
    expect(m02JobMatches({ ...job, expectedRevision: 0 }, one.attempt)).toBe(false);
  });

  test('only accepts the exact persisted candidate hash and waits for human lifecycle commands', () => {
    const state = blank();
    const { attempt } = reserveM02Attempt(state, 'setup', 1);
    const candidate = { competitors: [{ name: 'Synthetic' }] };
    const record = { revision: 2, session: { stage: 'setup', confirmations: {} }, drafts: { setup: { candidate } } };
    const hash = m02CandidateHash(record, 'setup');
    attempt.status = 'review-ready'; attempt.completedRevision = 2; attempt.candidateHash = hash;
    expect(m02LiveHash(candidate)).toBe(hash);
    expect(m02OperationReady(record, 'setup', state.accepted)).toBe(true);
    expect(m02OperationReady({ ...record, session: { stage: 'gates', confirmations: { setup: true } } }, 'setup', state.accepted)).toBe(false);
    expect(() => acceptM02Review(state, 'setup', '0'.repeat(64), record)).toThrow('does not match');
    acceptM02Review(state, 'setup', hash, record);
    expect(state.accepted.setup).toBe(hash);
    expect(state.nextOperation).toBe(1);
    expect(() => acceptM02Review(state, 'setup', hash, record)).toThrow('does not match');
  });

  test('uses the persisted confirmation keys and requires each upstream gate to pass', () => {
    const base: any = { session: { stage: 'gates', confirmations: { 'builder-inputs': { by: 'human' } } }, recon: {
      gate1: { verdict: 'pending' }, gate2: { verdict: 'pending' }, gate3: { verdict: 'pending' }, gate4: { verdict: 'pending' },
    } };
    expect(m02OperationReady(base, 'terrain', {})).toBe(true);
    expect(m02OperationReady({ ...base, session: { ...base.session, confirmations: { builderInputs: true } } }, 'terrain', {})).toBe(false);
    expect(m02OperationReady(base, 'gate2', {})).toBe(false);
    expect(m02OperationReady({ ...base, recon: { ...base.recon, gate1: { verdict: 'fail' } } }, 'gate2', {})).toBe(false);
    expect(m02OperationReady({ ...base, recon: { ...base.recon, gate1: { verdict: 'pass' } } }, 'gate2', {})).toBe(true);
    expect(m02OperationReady({ ...base, recon: { ...base.recon, gate2: { verdict: 'pass' } } }, 'gate3', {})).toBe(true);
    expect(m02OperationReady({ ...base, recon: { ...base.recon, gate3: { verdict: 'pass' } } }, 'gate4', {})).toBe(true);
    expect(m02OperationReady({ session: { stage: 'risk' }, recon: { gate4: { verdict: 'pass' } } }, 'gate5', {})).toBe(true);
    expect(m02OperationReady({ session: { stage: 'outcome', confirmations: { gate5: true } }, recon: { gate4: { verdict: 'fail' } } }, 'gate6', {})).toBe(false);
    expect(m02OperationReady({ session: { stage: 'outcome', confirmations: { gate5: true } }, recon: { gate4: { verdict: 'pass' } } }, 'gate6', {})).toBe(true);
  });

  test('reconciles a lost human-command response before checking the now-stale revision and starts no provider proxy for review actions', () => {
    const command = { action: 'confirm-setup', sessionId: 'session-1', expectedRevision: 4, commandId: 'same-command' };
    expect(m02ConfirmationReplay({ command, currentRevision: 5, prior: { commandInput: command } })).toBe('reconcile');
    expect(() => m02ConfirmationReplay({ command, currentRevision: 5, prior: { commandInput: { ...command, action: 'confirm-gate1' } } })).toThrow('different command content');
    expect(() => m02ConfirmationReplay({ command, currentRevision: 5 })).toThrow('revision is stale');
    expect(m02ShouldStartProxy({})).toBe(true);
    expect(m02ShouldStartProxy({ confirmFile: 'operator.json' })).toBe(false);
    expect(m02ShouldStartProxy({ acceptReview: 'a'.repeat(64) })).toBe(false);
    expect(m02ShouldStartProxy({ outputsReview: true })).toBe(false);
    expect(m02ShouldStartProxy({ sealFile: 'seal.json' })).toBe(false);
  });

  test('shared proxy ledger durably counts ambiguous failures across restart and enforces the M02 cap', async () => {
    const path = join(await tempDir(), 'ledger.json');
    const limits = config('m02-budget-test', 1);
    const request = () => new Request('http://127.0.0.1:8137/chat/completions', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ messages: [{ role: 'user', content: 'synthetic test' }] }) });
    let outgoing = 0;
    const first = createM02ProviderBudget(limits, { ledger: new FileM02BudgetLedger(path), fetchImpl: async () => { outgoing++; throw new Error('ambiguous failure'); } });
    expect((await first(request())).status).toBe(502);
    expect(outgoing).toBe(1);
    const saved = JSON.parse(await readFile(path, 'utf8'));
    expect(saved.reservations).toHaveLength(1);
    expect(saved).not.toHaveProperty('apiKey');
    const restarted = createM02ProviderBudget(limits, { ledger: new FileM02BudgetLedger(path), fetchImpl: async () => { outgoing++; return Response.json({}); } });
    expect((await restarted(request())).status).toBe(429);
    expect(outgoing).toBe(1);
    expect(() => createM02ProviderBudget({ ...limits, maxCalls: 9 }, { ledger: new FileM02BudgetLedger(path) })).toThrow('1 through 8');
    expect(resolveM02LiveFiles('/tmp/m02', 'test-run').checkpointPath).toContain('/m02-live/test-run/checkpoint.json');
  });
});
