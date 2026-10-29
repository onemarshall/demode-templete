/**
 * Bounded, resumable M02 live verification. One provider draft per invocation;
 * every generated candidate pauses for a content-hash review. No gate is
 * confirmed by this harness.
 */
import { chmod, mkdir, readFile, rename, rm, stat, writeFile } from 'node:fs/promises';
import { basename, dirname, join, resolve } from 'node:path';
import { randomUUID, createHash } from 'node:crypto';
import { parse as parseEnv } from 'dotenv';
import { request } from '@playwright/test';
import { Pool } from 'pg';
import { m02CommandSchema, type M02DraftGate } from '../../../src/lib/modules/strategy/server/stages/m02/commands.ts';
import { readConnection, integrationState } from './local-stack.ts';
import { FileM02BudgetLedger, M02_LIVE_MAX_TOKENS, M02_LIVE_MODEL, M02_LIVE_TIMEOUT_MS, startM02ProviderBudget } from './m02-provider-budget.ts';

export const M02_LIVE_OPERATIONS: readonly M02DraftGate[] = ['setup', 'terrain', 'gate1', 'gate2', 'gate3', 'gate4', 'gate5', 'gate6'];
export type M02AttemptStatus = 'reserved' | 'queued' | 'running' | 'failed' | 'cancelled' | 'review-ready';
export interface M02LiveAttempt {
  operation: M02DraftGate; commandId: string; sessionId: string; inputRevision: number; jobId?: string;
  status: M02AttemptStatus; createdAt: string; completedRevision?: number; candidateHash?: string; failure?: string;
}
export interface M02LiveCheckpoint {
  version: 1; runName: string; createdAt: string; callBudget: number; reservedCalls: number;
  sessionId: string; nextOperation: number; attempts: Partial<Record<M02DraftGate, M02LiveAttempt[]>>;
  accepted: Partial<Record<M02DraftGate, string>>; confirmationCommands: string[]; lastRevision: number;
  sealCommand?: { commandId: string; expectedRevision: number; contentHash: string };
}
export interface M02LiveOptions {
  live: boolean; run?: string; newRun?: string; resume: boolean; maxCalls?: number; envFile?: string;
  sessionId?: string; acceptReview?: string; confirmFile?: string; outputsReview?: boolean; sealFile?: string;
}

const canonicalJson = (value: any): string => Array.isArray(value)
  ? `[${value.map(canonicalJson).join(',')}]`
  : value && typeof value === 'object'
    ? `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(',')}}`
    : JSON.stringify(value);
export const m02LiveHash = (value: unknown) => createHash('sha256').update(canonicalJson(value)).digest('hex');

export function resolveM02LiveFiles(root: string, name: string) {
  if (!/^[a-z0-9][a-z0-9-]{0,47}$/.test(name)) throw new Error('Run name must be 1-48 lowercase letters, digits, or hyphens');
  const dir = resolve(root, 'm02-live', name);
  return { dir, checkpointPath: join(dir, 'checkpoint.json'), reviewPath: join(dir, 'draft-review.json'), outputsPath: join(dir, 'outputs-review.json') };
}

export function parseM02LiveOptions(argv: string[]): M02LiveOptions {
  const options: M02LiveOptions = { live: argv.includes('--live'), resume: argv.includes('--resume') };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--run') options.run = argv[++i];
    else if (argv[i] === '--new-run') options.newRun = argv[++i];
    else if (argv[i] === '--max-calls') options.maxCalls = Number(argv[++i]);
    else if (argv[i] === '--env-file') options.envFile = argv[++i];
    else if (argv[i] === '--session-id') options.sessionId = argv[++i];
    else if (argv[i] === '--accept-review') options.acceptReview = argv[++i];
    else if (argv[i] === '--confirm-file') options.confirmFile = argv[++i];
    else if (argv[i] === '--outputs-review') options.outputsReview = true;
    else if (argv[i] === '--seal-file') options.sealFile = argv[++i];
  }
  const actions = [options.acceptReview, options.confirmFile, options.outputsReview, options.sealFile].filter(Boolean);
  if (!options.live) {
    if (options.run || options.newRun || options.resume || options.maxCalls !== undefined || options.envFile || options.sessionId || actions.length)
      throw new Error('M02 live workflow flags require explicit --live');
    return options;
  }
  if (!!options.run === !!options.newRun) throw new Error('Choose exactly one of --new-run <name> or --run <name>');
  if (options.newRun && options.resume) throw new Error('--new-run cannot be combined with --resume');
  if (options.run && !options.resume) throw new Error('--run requires --resume');
  if (!options.envFile) throw new Error('--live requires an explicit --env-file');
  if (!Number.isInteger(options.maxCalls) || options.maxCalls! < 1 || options.maxCalls! > 8) throw new Error('--live requires an explicit --max-calls value from 1 through 8');
  if (options.newRun && !options.sessionId) throw new Error('--new-run requires an existing M02 --session-id');
  if (options.acceptReview && !/^[a-f0-9]{64}$/i.test(options.acceptReview)) throw new Error('--accept-review must be the 64-character hash in the current draft review packet');
  if (actions.length > 1) throw new Error('Choose only one of --accept-review, --confirm-file, --outputs-review, or --seal-file');
  if (actions.length && (!options.run || !options.resume)) throw new Error('Review and command actions require --run <name> --resume');
  if (options.confirmFile && options.sealFile) throw new Error('Use a separate invocation for M02 seal review');
  return options;
}

export function reserveM02Attempt(checkpoint: M02LiveCheckpoint, operation: M02DraftGate, inputRevision: number, now = new Date().toISOString()) {
  const attempts = checkpoint.attempts[operation] ?? [];
  if (attempts.at(-1)) return { attempt: attempts.at(-1)!, newlyReserved: false };
  if (checkpoint.reservedCalls >= checkpoint.callBudget || checkpoint.reservedCalls >= 8) throw new Error('M02 lifetime provider-call reservation budget exhausted');
  const attempt: M02LiveAttempt = { operation, commandId: randomUUID(), sessionId: checkpoint.sessionId, inputRevision, status: 'reserved', createdAt: now };
  checkpoint.reservedCalls++;
  checkpoint.attempts[operation] = [...attempts, attempt];
  return { attempt, newlyReserved: true };
}

export function m02JobMatches(job: any, attempt: M02LiveAttempt) {
  const command = job?.command;
  return job?.id === (attempt.jobId ?? job?.id) && job?.sessionId === attempt.sessionId &&
    Number(job?.expectedRevision ?? job?.input_revision) === attempt.inputRevision && job?.commandId === attempt.commandId &&
    command?.action === 'draft' && command?.gate === attempt.operation && command?.commandId === attempt.commandId &&
    command?.sessionId === attempt.sessionId && command?.expectedRevision === attempt.inputRevision &&
    command?.module === 'm02' && command?.stage === 'm02';
}

export function m02ResumeDecision(input: { currentRevision: number; inputRevision: number; status?: string | null }): 'enqueue' | 'reconcile' {
  if (!input.status) {
    if (input.currentRevision !== input.inputRevision) throw new Error('M02 revision changed before the reserved draft was enqueued');
    return 'enqueue';
  }
  if (input.currentRevision < input.inputRevision || input.currentRevision > input.inputRevision + 1)
    throw new Error('M02 revision cannot be reconciled to the reserved draft');
  return 'reconcile';
}

export function m02Candidate(record: any, operation: M02DraftGate) { return record?.drafts?.[operation]?.candidate; }
export function m02CandidateHash(record: any, operation: M02DraftGate) {
  const candidate = m02Candidate(record, operation);
  if (candidate === undefined) throw new Error(`No persisted M02 ${operation} candidate is available for review`);
  return m02LiveHash(candidate);
}

export function m02OperationReady(record: any, operation: M02DraftGate, accepted: Partial<Record<M02DraftGate, string>>) {
  const session = record?.session, recon = record?.recon, confirmations = session?.confirmations ?? {};
  if (operation === 'setup') return session?.stage === 'setup' && !confirmations.setup;
  if (operation === 'terrain') return session?.stage === 'gates' && !!confirmations['builder-inputs'];
  if (operation === 'gate1') return session?.stage === 'gates' && !!accepted.terrain;
  if (operation === 'gate2') return session?.stage === 'gates' && recon?.gate1?.verdict === 'pass';
  if (operation === 'gate3') return session?.stage === 'gates' && recon?.gate2?.verdict === 'pass';
  if (operation === 'gate4') return session?.stage === 'gates' && recon?.gate3?.verdict === 'pass';
  if (operation === 'gate5') return session?.stage === 'risk';
  return session?.stage === 'outcome' && recon?.gate4?.verdict === 'pass' && !!confirmations.gate5;
}

export function m02ShouldStartProxy(options: Pick<M02LiveOptions, 'acceptReview' | 'confirmFile' | 'outputsReview' | 'sealFile'>) {
  return !options.acceptReview && !options.confirmFile && !options.outputsReview && !options.sealFile;
}

export function m02ConfirmationReplay(input: { command: any; currentRevision: number; prior?: { commandInput: unknown } | null }): 'reconcile' | 'submit' {
  if (input.prior) {
    if (m02LiveHash(input.prior.commandInput) !== m02LiveHash(input.command)) throw new Error('Persisted M02 command ID belongs to different command content');
    return 'reconcile';
  }
  if (input.command.expectedRevision !== input.currentRevision) throw new Error('Pinned M02 command revision is stale');
  return 'submit';
}

export function acceptM02Review(checkpoint: M02LiveCheckpoint, operation: M02DraftGate, hash: string, record: any) {
  const index = M02_LIVE_OPERATIONS.indexOf(operation), attempt = checkpoint.attempts[operation]?.at(-1);
  if (index !== checkpoint.nextOperation || !attempt || attempt.status !== 'review-ready' || attempt.candidateHash !== hash || m02CandidateHash(record, operation) !== hash)
    throw new Error('Review hash does not match the current persisted M02 candidate');
  checkpoint.accepted[operation] = hash;
  checkpoint.nextOperation++;
  checkpoint.lastRevision = record.revision;
  return checkpoint;
}

async function readJson<T>(path: string): Promise<T> { return JSON.parse(await readFile(path, 'utf8')) as T; }
async function atomicWriteJson(path: string, value: unknown) {
  await mkdir(dirname(path), { recursive: true, mode: 0o700 });
  const temp = join(dirname(path), `.${basename(path)}.${process.pid}.${randomUUID()}.tmp`);
  try { await writeFile(temp, JSON.stringify(value, null, 2), { mode: 0o600, flag: 'wx' }); await chmod(temp, 0o600); await rename(temp, path); }
  catch (error) { await rm(temp, { force: true }); throw error; }
}
const scrub = (text: string) => text.replace(/Bearer\s+\S+|tr_(?:dev|prod)_[A-Za-z0-9_-]+|sk-[A-Za-z0-9_-]+/gi, '[redacted]');
const loadCheckpoint = async (path: string, options: M02LiveOptions, runName: string): Promise<M02LiveCheckpoint> => {
  try {
    const state = await readJson<M02LiveCheckpoint>(path);
    if (!options.run || !options.resume || options.newRun || state.version !== 1 || state.runName !== runName || state.callBudget !== options.maxCalls)
      throw new Error('M02 checkpoint exists; resume must use its exact run name and lifetime call budget');
    return state;
  } catch (error) {
    if (!(error instanceof Error && 'code' in error && error.code === 'ENOENT')) throw error;
    if (options.run || !options.newRun) throw new Error('M02 checkpoint is missing; use --new-run <name>');
    return { version: 1, runName, createdAt: new Date().toISOString(), callBudget: options.maxCalls!, reservedCalls: 0,
      sessionId: options.sessionId!, nextOperation: 0, attempts: {}, accepted: {}, confirmationCommands: [], lastRevision: 0 };
  }
};

async function main() {
  const options = parseM02LiveOptions(process.argv.slice(2));
  if (!options.live) { console.log(JSON.stringify({ mode: 'dry-run', operations: M02_LIVE_OPERATIONS, providerCalls: 0, maximumReservations: 8 })); return; }
  // The guarded disposable stack is checked before reading the explicitly supplied env file.
  const guarded = await readConnection();
  const test = await readJson<any>(resolve(integrationState, 'test.json'));
  const target = await readJson<any>(resolve(integrationState, 'm01-browser-target.json'));
  const envPath = resolve(options.envFile!);
  if ((await stat(envPath)).mode & 0o077) throw new Error('Explicit M02 live env file must be owner-only');
  const env = parseEnv(await readFile(envPath, 'utf8'));
  const database = new URL(env.BETTER_DATABASE_URL ?? 'postgres://invalid/invalid');
  const model = env.M02_SYNTHESIS_MODEL;
  const endpoint = new URL(env.STRATEGY_PROVIDER_URL ?? 'https://openrouter.ai/api/v1/chat/completions');
  if (database.hostname !== '127.0.0.1' || database.port !== '55433' || database.pathname !== '/strategy_auth_integration_test' || env.BETTER_DATABASE_URL !== guarded.databaseUrl)
    throw new Error('M02 live verification requires the isolated local integration database');
  if (env.NODE_ENV !== 'development' || (model !== M02_LIVE_MODEL) || env.MODEL_POLICY_DEV !== '1')
    throw new Error(`M02 provider override requires development mode, MODEL_POLICY_DEV=1 and M02_SYNTHESIS_MODEL=${M02_LIVE_MODEL}`);
  if (endpoint.href !== 'http://127.0.0.1:8137/chat/completions' || Number(env.STRATEGY_PROVIDER_TIMEOUT_MS) !== M02_LIVE_TIMEOUT_MS || Number(env.STRATEGY_DRAFT_MAX_TOKENS) !== M02_LIVE_MAX_TOKENS)
    throw new Error('M02 live env must target the local budget proxy with 12000 tokens and a 900000 ms timeout');
  if (!env.OPENROUTER_API_KEY) throw new Error('Explicit M02 live env file is missing its provider key');
  const branch = env.TRIGGER_DEV_BRANCH ?? '';
  if (!String(env.TRIGGER_SECRET_KEY ?? '').startsWith('tr_dev_') || !branch || /prod|production/i.test(branch))
    throw new Error('M02 live verification requires a non-production Trigger development branch');
  const runName = options.newRun ?? options.run!;
  const files = resolveM02LiveFiles(integrationState, runName);
  await mkdir(files.dir, { recursive: true, mode: 0o700 }); await chmod(files.dir, 0o700);
  const checkpoint = await loadCheckpoint(files.checkpointPath, options, runName);
  if (checkpoint.sessionId !== (options.sessionId ?? checkpoint.sessionId)) throw new Error('Resume session does not match the checkpoint');

  const proxyConfig = { runName, maxCalls: checkpoint.callBudget, model: M02_LIVE_MODEL, maxTokens: M02_LIVE_MAX_TOKENS, timeoutMs: M02_LIVE_TIMEOUT_MS, apiKey: env.OPENROUTER_API_KEY };
  const pool = new Pool({ connectionString: guarded.databaseUrl, max: 3 });
  const api = await request.newContext({ baseURL: test.appUrl, storageState: await readJson(resolve(integrationState, 'm01-browser-state.json')), extraHTTPHeaders: { origin: test.appUrl, accept: 'application/json' } });
  let proxy: Awaited<ReturnType<typeof startM02ProviderBudget>> | undefined;
  try {
    if (test.appUrl !== 'http://127.0.0.1:5188') throw new Error('M02 verification requires the isolated local Auth app');
    const base = String(target.base).replace(/founder-conviction$/, 'market-reality');
    if (!base.includes('/market-reality')) throw new Error('Could not resolve the M02 Auth route from the guarded fixture');
    const sessionResponse = await api.get(`${base}?sessionId=${encodeURIComponent(checkpoint.sessionId)}`);
    if (!sessionResponse.ok()) throw new Error(`Pinned M02 session read failed (${sessionResponse.status()})`);
    let current: any = await sessionResponse.json();
    if (checkpoint.lastRevision && current.revision < checkpoint.lastRevision) throw new Error('M02 record revision moved backwards');
    if (!checkpoint.lastRevision) checkpoint.lastRevision = current.revision;
    await atomicWriteJson(files.checkpointPath, checkpoint);

    const post = async (body: unknown) => {
      const response = await api.post(base, { data: body });
      let value: any; try { value = await response.json(); } catch { value = {}; }
      return { response, value };
    };
    const refresh = async () => {
      const response = await api.get(`${base}?sessionId=${encodeURIComponent(checkpoint.sessionId)}`);
      if (!response.ok()) throw new Error(`M02 session refresh failed (${response.status()})`);
      current = await response.json(); return current;
    };
    const writeDraftReview = async (operation: M02DraftGate, attempt: M02LiveAttempt) => {
      const hash = m02CandidateHash(current, operation);
      attempt.status = 'review-ready'; attempt.completedRevision = current.revision; attempt.candidateHash = hash;
      checkpoint.lastRevision = current.revision; await atomicWriteJson(files.checkpointPath, checkpoint);
      await atomicWriteJson(files.reviewPath, { kind: 'm02-live-draft-review', runName, operation, sessionId: checkpoint.sessionId,
        commandId: attempt.commandId, inputRevision: attempt.inputRevision, completedRevision: current.revision,
        candidateHash: hash, candidate: m02Candidate(current, operation), instruction: 'Review this exact persisted candidate. It has not confirmed or sealed a gate. Accept by resuming with --accept-review <candidateHash>.' });
      console.log(JSON.stringify({ status: 'awaiting-candidate-review', operation, candidateHash: hash, review: files.reviewPath }));
    };

    if (options.confirmFile) {
      const command = await readJson<any>(resolve(options.confirmFile));
      const parsed = m02CommandSchema.parse(command);
      if (new Set<string>(['draft', 'create', 'successor', 'seal', 'collect-url']).has(parsed.action) || parsed.sessionId !== checkpoint.sessionId)
        throw new Error('Confirm file must be an existing non-generation Auth command pinned to this session and current revision; seal uses --seal-file');
      const prior = (await pool.query('SELECT revision,action,command_input FROM strategy_revision WHERE session_id=$1 AND command_id=$2', [checkpoint.sessionId, parsed.commandId])).rows[0];
      const saved = prior ? (typeof prior.command_input === 'string' ? JSON.parse(prior.command_input) : prior.command_input) : null;
      const replay = m02ConfirmationReplay({ command: parsed, currentRevision: current.revision, prior: prior ? { commandInput: saved } : null });
      if (replay === 'reconcile') {
        await refresh();
        console.log(JSON.stringify({ status: 'confirmation-reconciled', commandId: parsed.commandId, revision: prior.revision }));
        return;
      }
      if (!checkpoint.confirmationCommands.includes(parsed.commandId)) checkpoint.confirmationCommands.push(parsed.commandId);
      await atomicWriteJson(files.checkpointPath, checkpoint);
      const { response, value } = await post(parsed);
      if (!response.ok()) throw new Error(`Pinned Auth command failed (${response.status()}): ${scrub(String(value.error ?? 'unknown'))}`);
      await refresh(); checkpoint.lastRevision = current.revision; await atomicWriteJson(files.checkpointPath, checkpoint);
      console.log(JSON.stringify({ status: 'confirmation-committed', commandId: parsed.commandId, revision: current.revision })); return;
    }

    if (options.outputsReview) {
      const review = { kind: 'm02-live-outputs-review', runName, sessionId: checkpoint.sessionId, revision: current.revision,
        contentHash: m02LiveHash({ session: current.session, recon: current.recon, artifacts: current.artifacts, collection: current.collection, seal: current.seal }),
        candidate: { session: current.session, recon: current.recon, artifacts: current.artifacts, collection: current.collection, seal: current.seal },
        instruction: 'Review the exact persisted M02 output. To request sealing, create a separate seal file pinned to this content hash, session, revision, and a fresh commandId.' };
      await atomicWriteJson(files.outputsPath, review);
      console.log(JSON.stringify({ status: 'awaiting-outputs-review', contentHash: review.contentHash, review: files.outputsPath })); return;
    }

    if (options.sealFile) {
      const review = await readJson<any>(resolve(files.outputsPath));
      const approval = await readJson<any>(resolve(options.sealFile));
      const currentHash = m02LiveHash({ session: current.session, recon: current.recon, artifacts: current.artifacts, collection: current.collection, seal: current.seal });
      if (approval.kind !== 'm02-live-seal-review' || approval.decision !== 'seal' || approval.sessionId !== checkpoint.sessionId || !/^[a-f0-9-]{36}$/i.test(approval.commandId) ||
        approval.runName !== runName || review.sessionId !== checkpoint.sessionId || review.runName !== runName || review.revision !== approval.expectedRevision || approval.contentHash !== review.contentHash)
        throw new Error('Seal file must explicitly approve the pinned outputs-review hash, session and revision');
      const command = m02CommandSchema.parse({ action: 'seal', sessionId: checkpoint.sessionId, expectedRevision: approval.expectedRevision, commandId: approval.commandId });
      if (current.session.stage === 'sealed') {
        const prior = (await pool.query('SELECT revision,command_input FROM strategy_revision WHERE session_id=$1 AND command_id=$2', [checkpoint.sessionId, command.commandId])).rows[0];
        if (!prior) throw new Error('M02 is sealed but the supplied seal command is not its persisted command');
        const saved = typeof prior.command_input === 'string' ? JSON.parse(prior.command_input) : prior.command_input;
        if (m02LiveHash(saved) !== m02LiveHash(command) || !current.seal?.receiptId) throw new Error('Persisted seal does not reconcile to the explicit review file');
        await refresh(); console.log(JSON.stringify({ status: 'explicit-seal-reconciled', sessionId: checkpoint.sessionId, revision: prior.revision })); return;
      }
      if (approval.expectedRevision !== current.revision || approval.contentHash !== currentHash) throw new Error('Seal approval differs from the current persisted M02 outputs review');
      if (checkpoint.sealCommand && (checkpoint.sealCommand.commandId !== command.commandId || checkpoint.sealCommand.expectedRevision !== command.expectedRevision || checkpoint.sealCommand.contentHash !== currentHash))
        throw new Error('Seal command was checkpointed with different approval content');
      checkpoint.sealCommand ??= { commandId: command.commandId, expectedRevision: command.expectedRevision, contentHash: currentHash };
      await atomicWriteJson(files.checkpointPath, checkpoint);
      const prior = (await pool.query('SELECT revision,action,command_input FROM strategy_revision WHERE session_id=$1 AND command_id=$2', [checkpoint.sessionId, command.commandId])).rows[0];
      if (prior) {
        const saved = typeof prior.command_input === 'string' ? JSON.parse(prior.command_input) : prior.command_input;
        if (m02LiveHash(saved) !== m02LiveHash(command)) throw new Error('Persisted seal command ID belongs to different input');
        await refresh(); console.log(JSON.stringify({ status: 'explicit-seal-reconciled', sessionId: checkpoint.sessionId, revision: prior.revision })); return;
      }
      const { response, value } = await post(command);
      if (!response.ok()) throw new Error(`Explicit M02 seal command failed (${response.status()}): ${scrub(String(value.error ?? 'unknown'))}`);
      await refresh(); console.log(JSON.stringify({ status: 'explicit-seal-committed', sessionId: checkpoint.sessionId, revision: current.revision })); return;
    }

    if (options.acceptReview) {
      const operation = M02_LIVE_OPERATIONS[checkpoint.nextOperation];
      if (!operation) throw new Error('All eight M02 draft operations have been reviewed');
      const packet = await readJson<any>(files.reviewPath);
      if (packet.candidateHash !== options.acceptReview || packet.operation !== operation || packet.sessionId !== checkpoint.sessionId)
        throw new Error('Acceptance hash does not identify the current M02 draft review packet');
      const attempt = checkpoint.attempts[operation]?.at(-1);
      if (!attempt || current.revision !== attempt.completedRevision) throw new Error('M02 record revision changed after the draft review packet');
      acceptM02Review(checkpoint, operation, options.acceptReview, current);
      await atomicWriteJson(files.checkpointPath, checkpoint);
      console.log(JSON.stringify({ status: 'candidate-review-accepted', operation, candidateHash: options.acceptReview, nextOperation: M02_LIVE_OPERATIONS[checkpoint.nextOperation] ?? null })); return;
    }

    const operation = M02_LIVE_OPERATIONS[checkpoint.nextOperation];
    if (!operation) { console.log(JSON.stringify({ status: 'all-drafts-reviewed', next: 'Use explicit --outputs-review, then a separate human-authored --seal-file if appropriate.' })); return; }
    if (checkpoint.accepted[operation]) throw new Error(`M02 ${operation} is already accepted; provide required Auth commands or accept the next review checkpoint`);
    if (!m02OperationReady(current, operation, checkpoint.accepted)) throw new Error(`M02 ${operation} is not ready in the persisted lifecycle; submit the required human Auth command through --confirm-file first`);
    let attempt = checkpoint.attempts[operation]?.at(-1);
    if (!attempt) {
      const reserved = reserveM02Attempt(checkpoint, operation, current.revision);
      attempt = reserved.attempt; await atomicWriteJson(files.checkpointPath, checkpoint); // reservation precedes queue request
    } else if (attempt.status === 'review-ready') {
      throw new Error(`M02 ${operation} awaits human review; resume with --accept-review ${attempt.candidateHash}`);
    }
    if (!attempt) throw new Error('M02 provider reservation unavailable');
    if (!m02ShouldStartProxy(options)) throw new Error('Review and operator Auth commands do not start the provider proxy');
    proxy = await startM02ProviderBudget(proxyConfig, integrationState);
    const ledger = new FileM02BudgetLedger(proxy.ledgerPath);
    const command = { action: 'draft', gate: operation, sessionId: checkpoint.sessionId, expectedRevision: attempt.inputRevision, commandId: attempt.commandId };
    const existing = (await pool.query('SELECT id,session_id,input_revision,command_id,command_text,status,result_text FROM strategy_job WHERE session_id=$1 AND command_id=$2', [checkpoint.sessionId, attempt.commandId])).rows[0];
    let job: any = existing ? { id: existing.id, sessionId: existing.session_id, expectedRevision: Number(existing.input_revision), commandId: existing.command_id, command: JSON.parse(existing.command_text), status: existing.status } : null;
    if (job && !m02JobMatches(job, attempt)) throw new Error('Persisted M02 job is semantically different from its checkpoint reservation');
    const decision = m02ResumeDecision({ currentRevision: current.revision, inputRevision: attempt.inputRevision, status: job?.status });
    if (decision === 'enqueue') {
      const { response, value } = await post(command);
      if (!response.ok()) {
        attempt.status = 'failed'; attempt.failure = `enqueue response ${response.status()}`; await atomicWriteJson(files.checkpointPath, checkpoint);
        // Reconciliation on resume checks strategy_job first and replays only this exact command.
        throw new Error(`M02 draft enqueue failed (${response.status()}); checkpoint retained for exact replay`);
      }
      if (!value.jobId) throw new Error('M02 queued response did not contain a durable jobId');
      attempt.jobId = value.jobId; attempt.status = value.status === 'running' ? 'running' : 'queued';
      await atomicWriteJson(files.checkpointPath, checkpoint);
      job = { id: value.jobId, sessionId: value.sessionId, expectedRevision: attempt.inputRevision, commandId: attempt.commandId,
        command: { ...command, module: 'm02', stage: 'm02' }, status: value.status ?? 'pending' };
    } else {
      attempt.jobId = String(job.id); attempt.status = job.status; await atomicWriteJson(files.checkpointPath, checkpoint);
    }
    if (!m02JobMatches(job, attempt)) throw new Error('M02 durable job does not match the operation reservation');
    const deadline = Date.now() + M02_LIVE_TIMEOUT_MS + 60_000;
    while (Date.now() < deadline) {
      const statusResponse = await api.get(`${base}?sessionId=${encodeURIComponent(checkpoint.sessionId)}&jobId=${encodeURIComponent(attempt.jobId!)}`);
      if (!statusResponse.ok()) throw new Error(`M02 job poll failed (${statusResponse.status()})`);
      const status = await statusResponse.json() as any;
      if (status.sessionId !== checkpoint.sessionId || status.jobId !== attempt.jobId) throw new Error('M02 status response escaped its pinned job/session');
      attempt.status = status.status; await atomicWriteJson(files.checkpointPath, checkpoint);
      if (['succeeded', 'failed', 'cancelled'].includes(status.status)) break;
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    await refresh();
    const persisted = (await pool.query('SELECT id,session_id,input_revision,command_id,command_text,status,result_text FROM strategy_job WHERE id=$1 AND session_id=$2', [attempt.jobId, checkpoint.sessionId])).rows[0];
    if (!persisted) throw new Error('Pinned M02 durable job disappeared during polling');
    const finalJob = { id: persisted.id, sessionId: persisted.session_id, expectedRevision: Number(persisted.input_revision), commandId: persisted.command_id, command: JSON.parse(persisted.command_text), status: persisted.status };
    if (!m02JobMatches(finalJob, attempt)) throw new Error('Persisted M02 job failed final semantic reconciliation');
    if (persisted.status !== 'succeeded') {
      attempt.status = persisted.status; attempt.failure = scrub(String(persisted.result_text ?? 'provider job did not succeed')).slice(0, 300);
      await atomicWriteJson(files.checkpointPath, checkpoint);
      throw new Error(`M02 ${operation} stopped with ${persisted.status}; no automatic repair or retry was attempted`);
    }
    if (current.revision !== attempt.inputRevision + 1) throw new Error('M02 draft did not commit exactly one revision');
    if (!m02Candidate(current, operation)) throw new Error('M02 succeeded without a persisted candidate');
    if (current.session.confirmations?.[operation]) throw new Error('M02 generation unexpectedly confirmed a gate; stop for review');
    await writeDraftReview(operation, attempt);
    const budget = await ledger.snapshot(proxyConfig);
    console.log(JSON.stringify({ status: 'candidate-ready-for-review', operation, jobId: attempt.jobId, inputRevision: attempt.inputRevision, completedRevision: current.revision, candidateHash: attempt.candidateHash, actualProviderReservations: budget.reservations.length, review: files.reviewPath }));
  } finally {
    await api.dispose(); await pool.end(); if (proxy) await proxy.close();
  }
}

if (import.meta.main) {
  main().catch(error => { console.error(scrub(error instanceof Error ? error.message : 'M02 live verification failed')); process.exitCode = 1; });
}
