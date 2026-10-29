/** Bounded, resumable M01 live-provider harness. Nothing is sent without --live.
 * Each generation is a single review checkpoint. Candidate content is persisted
 * exactly as returned; the harness never edits or replaces generated content.
 */
import { readFile, writeFile, mkdir, rename, chmod, rm } from 'node:fs/promises';
import { resolve, join, dirname, basename } from 'node:path';
import { pathToFileURL } from 'node:url';
import { randomUUID, createHash } from 'node:crypto';
import { parse as parseEnv } from 'dotenv';
import { request } from '@playwright/test';
import { Pool } from 'pg';
import { readConnection, integrationState } from './local-stack.ts';
import { StrategyRepository } from '../../../src/lib/modules/strategy/server/data/repository.ts';
import { createStrategyAccess } from '../../../src/lib/modules/strategy/server/access.ts';
import { sourceHash } from '../../../src/lib/modules/strategy/server/stages/m01/session.ts';
import { readTranscript } from '../../../src/lib/modules/strategy/server/stages/m01/conversation.ts';
import { ANCHOR_KEYS } from '../../../src/lib/modules/strategy/server/stages/m01/synthesis.ts';
import { REVIEW_GATES } from '../../../src/lib/modules/strategy/server/stages/m01/handoff.ts';
import { fictionalFounderAnswer, fictionalFounderClosing, fictionalFounderSource, M01_LIVE_OPERATIONS } from '../../../tests/strategy/fixtures/m01-live.ts';

export type M01LiveOperation = typeof M01_LIVE_OPERATIONS[number];
export type M01AttemptStatus = 'reserved' | 'queued' | 'running' | 'failed' | 'cancelled' | 'review-ready';
export interface M01Attempt {
  reservation: number; commandId: string; inputRevision: number; jobId?: string;
  providerRunId?: string; status: M01AttemptStatus; createdAt: string;
  generatedRevision?: number; completedRevision?: number; resultHash?: string;
  failure?: string; retryReason?: string; reviewPath?: string;
}
export interface M01LiveCheckpoint {
  version: 1; runName: string; createdAt: string; callBudget: number; reservedCalls: number;
  organisationId?: string; brandId?: string; engagementId: string; grantId: string; base?: string;
  sourceVersionId?: string; sourceHash?: string; sessionId?: string; createCommandId: string;
  nextOperation: number; attempts: Partial<Record<M01LiveOperation, M01Attempt[]>>;
  accepted: Partial<Record<M01LiveOperation, string>>;
  confirmations: Record<string, { commandId: string; expectedRevision: number; revision?: number }>;
  approvedOutputsHash?: string; attestationId?: string; attestationHash?: string;
  closingContribution?: { commandId: string; eventId: string; expectedRevision: number; event: { event_id: string; type: 'session.input_transcript.delta'; delta: string }; committedRevision?: number };
  sealCommand?: { commandId: string; expectedRevision: number; body: Record<string, unknown>; fileHash: string };
  sealedVersionId?: string;
}

const validTypes = new Set(['single founder / owner', 'co-founders or leadership team', 'practitioner for a client']);
const canonicalJson = (value: any): string => Array.isArray(value)
  ? `[${value.map(canonicalJson).join(',')}]`
  : value && typeof value === 'object'
    ? `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(',')}}`
    : JSON.stringify(value);
export const m01LiveHash = (value: unknown) => createHash('sha256').update(canonicalJson(value)).digest('hex');
export function resolveM01LiveFiles(root: string, name: string) {
  if (!/^[a-z0-9][a-z0-9-]{0,47}$/.test(name)) throw new Error('Run name must be 1-48 lowercase letters, digits, or hyphens');
  const dir = resolve(root, 'm01-live', name);
  return { dir, checkpointPath: join(dir, 'checkpoint.json'), reviewPath: join(dir, 'review.json'), outputReviewPath: join(dir, 'output-review.json'), sealReviewPath: join(dir, 'seal-review.json') };
}
export function parseM01LiveOptions(argv: string[]) {
  const options: { live: boolean; run?: string; newRun?: string; resume: boolean; maxCalls?: number; envFile?: string; acceptStep?: string; retry?: M01LiveOperation; retryReason?: string; approveOutputs?: string; sealFile?: string } = {
    live: argv.includes('--live'), resume: argv.includes('--resume'),
  };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--run') options.run = argv[++i];
    else if (argv[i] === '--new-run') options.newRun = argv[++i];
    else if (argv[i] === '--max-calls') options.maxCalls = Number(argv[++i]);
    else if (argv[i] === '--env-file') options.envFile = argv[++i];
    else if (argv[i] === '--accept-step') options.acceptStep = argv[++i];
    else if (argv[i] === '--retry') options.retry = argv[++i] as M01LiveOperation;
    else if (argv[i] === '--reason') options.retryReason = argv[++i];
    else if (argv[i] === '--approve-outputs') options.approveOutputs = argv[++i];
    else if (argv[i] === '--seal-file') options.sealFile = argv[++i];
  }
  if (!options.live) {
    if (options.maxCalls !== undefined || options.envFile || options.acceptStep || options.retry || options.approveOutputs || options.sealFile)
      throw new Error('Live workflow flags require explicit --live');
    if (options.run || options.newRun || options.resume) throw new Error('A named live run requires explicit --live');
    return options;
  }
  if (!!options.run === !!options.newRun) throw new Error('Choose exactly one of --new-run <name> or --run <name>');
  if (options.newRun && options.resume) throw new Error('--new-run cannot be combined with --resume');
  if (options.run && !options.resume) throw new Error('--run requires --resume');
  if (!options.envFile) throw new Error('--live requires an explicit --env-file');
  if (!Number.isInteger(options.maxCalls) || options.maxCalls! < 8 || options.maxCalls! > 10)
    throw new Error('--live requires an explicitly approved --max-calls value from 8 through 10');
  if (options.retry && !M01_LIVE_OPERATIONS.includes(options.retry)) throw new Error('--retry must name one of the eight M01 operations');
  if (!!options.retry !== !!options.retryReason?.trim()) throw new Error('--retry requires a non-empty --reason, and --reason requires --retry');
  const actions = [options.acceptStep, options.retry, options.approveOutputs, options.sealFile].filter(Boolean);
  if (actions.length > 1) throw new Error('Choose only one of --accept-step, --retry, --approve-outputs, or --seal-file per invocation');
  if ((options.acceptStep || options.retry || options.approveOutputs || options.sealFile) && (!options.run || !options.resume))
    throw new Error('Review, retry, approval, and seal actions require --run <name> --resume');
  if (options.acceptStep && !/^[a-f0-9]{64}$/i.test(options.acceptStep)) throw new Error('--accept-step must be the 64-character hash shown in the review packet');
  if (options.approveOutputs && !/^[a-f0-9]{64}$/i.test(options.approveOutputs)) throw new Error('--approve-outputs must be the 64-character candidate hash shown in the output review');
  if (options.run && !options.resume) throw new Error('--run requires --resume');
  return options;
}

export function assertLocalM01Targets(input: { databaseUrl: string; guardedDatabaseUrl: string; appUrl: string; triggerKey: string; triggerApiUrl: string; triggerBranch: string; providerUrl: string }) {
  const db = new URL(input.databaseUrl), guarded = new URL(input.guardedDatabaseUrl), app = new URL(input.appUrl), trigger = new URL(input.triggerApiUrl), provider = new URL(input.providerUrl);
  if (!['127.0.0.1', 'localhost', '[::1]'].includes(db.hostname) || db.hostname !== guarded.hostname || db.port !== guarded.port || db.pathname !== guarded.pathname || db.pathname !== '/strategy_auth_integration_test') throw new Error('M01 live harness requires the isolated local integration database');
  if (!['127.0.0.1', 'localhost'].includes(app.hostname) || !['http:', 'https:'].includes(app.protocol)) throw new Error('M01 live harness requires the local synthetic Auth app');
  if (!input.triggerKey.startsWith('tr_dev_') || trigger.protocol !== 'https:' || !['api.trigger.dev', 'cloud.trigger.dev'].includes(trigger.hostname) || /prod|production/i.test(input.triggerBranch)) throw new Error('M01 live harness requires a non-production Trigger development environment');
  if (provider.origin !== 'https://openrouter.ai') throw new Error('M01 live harness requires the approved OpenRouter endpoint');
  return true;
}
export function operationCandidate(session: any, operation: M01LiveOperation): unknown {
  switch (operation) {
    case 'prepare': return session.plan;
    case 'turn-null': case 'turn-rich': return { chat: session.chat, transcript: session.transcript };
    case 'synthesise': case 'revise-anchor': case 'revise-manifesto': case 'revise-matrix': return session.outputs;
    case 'derive': return { outputs: session.outputs, setTwoDraft: session.setTwoDraft };
  }
}
export function m01OutputReviewCandidate(session: any) {
  return { outputs: session.outputs?.outputs, factsAnchor: session.outputs?.factsAnchor?.items, publicRecordReadiness: session.outputs?.publicRecordReadiness, setTwoDraft: session.setTwoDraft };
}
export function m01OutputReviewDigest(session: any): string { return m01LiveHash(m01OutputReviewCandidate(session)); }
export function reserveM01Attempt(checkpoint: M01LiveCheckpoint, operation: M01LiveOperation, inputRevision: number, retryReason?: string, now = new Date().toISOString()) {
  const attempts = checkpoint.attempts[operation] ?? [];
  const last = attempts.at(-1);
  if (retryReason !== undefined && !retryReason.trim()) throw new Error('Explicit retry requires a non-empty reason');
  if (!retryReason && last) return { attempt: last, newlyReserved: false };
  if (retryReason && last && !['failed', 'cancelled', 'review-ready'].includes(last.status)) throw new Error('Cannot retry an active or unstarted M01 operation');
  if (checkpoint.reservedCalls >= checkpoint.callBudget || checkpoint.reservedCalls >= 10) throw new Error('M01 lifetime reservation budget exhausted');
  const attempt: M01Attempt = { reservation: checkpoint.reservedCalls + 1, commandId: randomUUID(), inputRevision, status: 'reserved', createdAt: now, ...(retryReason ? { retryReason: retryReason.trim() } : {}) };
  checkpoint.reservedCalls++;
  checkpoint.attempts[operation] = [...attempts, attempt];
  return { attempt, newlyReserved: true };
}
export function acceptM01Step(checkpoint: M01LiveCheckpoint, operation: M01LiveOperation, candidateHash: string) {
  const index = M01_LIVE_OPERATIONS.indexOf(operation), attempt = checkpoint.attempts[operation]?.at(-1);
  if (index !== checkpoint.nextOperation || !attempt || attempt.status !== 'review-ready' || attempt.resultHash !== candidateHash)
    throw new Error('Review hash does not match the current persisted M01 candidate');
  checkpoint.accepted[operation] = candidateHash;
  checkpoint.nextOperation++;
  return checkpoint;
}
export function m01OperationAwaitingReview(checkpoint: M01LiveCheckpoint): M01LiveOperation | undefined {
  const operation = M01_LIVE_OPERATIONS[checkpoint.nextOperation];
  return operation && checkpoint.attempts[operation]?.at(-1)?.status === 'review-ready' ? operation : undefined;
}
export function m01CommandAction(operation: M01LiveOperation): string {
  return operation === 'turn-null' || operation === 'turn-rich' ? 'turn' : operation;
}
export function m01CommittedCommandMatches(operation: M01LiveOperation, commandInput: any, commandId: string): boolean {
  return commandInput?.operation === m01CommandAction(operation) && commandInput?.commandId === commandId;
}
export function m01SealCanResume(input: { hasOutputs: boolean; isSealed: boolean; hasDraft: boolean; hasSealedDerived: boolean }): boolean {
  return input.hasOutputs && (input.isSealed ? input.hasSealedDerived : input.hasDraft);
}
export function m01SealReplayMatches(input: { saved: any; attributionId: string; answers: unknown; notes: string; derived: unknown; committedAttributionId: string | undefined }): boolean {
  const saved = input.saved;
  return !!saved && saved.body?.sourceAttributionId === input.attributionId &&
    m01LiveHash(saved.body?.reviewAnswers) === m01LiveHash(input.answers) &&
    saved.body?.notes === input.notes &&
    m01LiveHash(saved.body?.derived) === m01LiveHash(input.derived) &&
    input.committedAttributionId === input.attributionId;
}
export function m01TranscriptSegmentCount(events: any[]): number { return readTranscript(events).readable.length; }
export function m01NeedsClosingContribution(events: any[]): boolean { return m01TranscriptSegmentCount(events) < 4; }
export function m01AppendCommandMatches(input: any, command: { commandId: string; event: unknown }): boolean {
  return input?.operation === 'transcript' && input?.commandId === command.commandId &&
    Array.isArray(input?.events) && input.events.some((event: unknown) => m01LiveHash(event) === m01LiveHash(command.event));
}
export function m01ResumeJobDecision(input: { currentRevision: number; inputRevision: number; status?: string | null }): 'enqueue' | 'reconcile' {
  if (!input.status) {
    if (input.currentRevision !== input.inputRevision) throw new Error('M01 session revision changed before its reserved command was enqueued');
    return 'enqueue';
  }
  const expectedRevision = input.status === 'succeeded' ? input.inputRevision + 1 : input.inputRevision;
  if (input.currentRevision !== expectedRevision) throw new Error('M01 session revision changed after this operation was reserved');
  return 'reconcile';
}
export function requireRealTriggerRun(runId: unknown): string {
  if (typeof runId !== 'string' || !/^run_[A-Za-z0-9_-]+$/.test(runId) || runId.startsWith('run_local_'))
    throw new Error('Persisted job has no real Trigger development run ID');
  return runId;
}

async function readJson<T>(path: string): Promise<T> { return JSON.parse(await readFile(path, 'utf8')) as T; }
async function atomicWriteJson(path: string, value: unknown) {
  await mkdir(dirname(path), { recursive: true, mode: 0o700 });
  const temp = join(dirname(path), `.${basename(path)}.${process.pid}.${randomUUID()}.tmp`);
  try { await writeFile(temp, JSON.stringify(value, null, 2), { mode: 0o600, flag: 'wx' }); await chmod(temp, 0o600); await rename(temp, path); }
  catch (error) { await rm(temp, { force: true }); throw error; }
}
const jobCommand = (operation: M01LiveOperation, sessionId: string, expectedRevision: number, commandId: string) => ({
  ...(operation === 'turn-null' ? { action: m01CommandAction(operation), message: null } : operation === 'turn-rich' ? { action: m01CommandAction(operation), message: fictionalFounderAnswer } : operation === 'revise-anchor' ? { action: m01CommandAction(operation), anchorKey: 'Core Belief', note: 'Keep the fictional founder’s distinction between uncertainty and reassurance explicit. Use the required Core Belief form: I believe that [truth], and therefore I must [action].' } : operation === 'revise-manifesto' ? { action: m01CommandAction(operation), note: 'Keep this explicitly fictional conviction direct and do not add evidence or outcomes.' } : operation === 'revise-matrix' ? { action: m01CommandAction(operation), note: 'The current matrix has only two specifically evidenced claims. Review the fictional transcript for at least three distinct claims genuinely supported by its cited statements, including the described paper-board practice and explicit refusal rules. Keep every source labelled fictional; do not invent evidence to reach a count. Use Fact only for multiple corroborating evidence items, Thesis for limited support, and Belief where unsupported. Keep Can Claim larger than either other list only where genuinely supported, with complete sentences.' } : { action: m01CommandAction(operation) }),
  sessionId, expectedRevision, commandId,
});
const freshCheckpoint = (runName: string, callBudget: number): M01LiveCheckpoint => ({
  version: 1, runName, createdAt: new Date().toISOString(), callBudget, reservedCalls: 0,
  engagementId: randomUUID(), grantId: randomUUID(), createCommandId: randomUUID(), nextOperation: 0,
  attempts: {}, accepted: {}, confirmations: {},
});
const scrub = (value: string) => value.replace(/Bearer\s+\S+|tr_(?:dev|prod)_[A-Za-z0-9_-]+|sk-[A-Za-z0-9_-]+/gi, '[redacted]');

async function main() {
  const options = parseM01LiveOptions(process.argv.slice(2));
  if (!options.live) { console.log(JSON.stringify({ mode: 'dry-run', operations: M01_LIVE_OPERATIONS, providerCalls: 0, maximumReservations: 10 })); return; }
  const config = await readConnection();
  const test = await readJson<any>(resolve(integrationState, 'test.json'));
  const existingTarget = await readJson<any>(resolve(integrationState, 'm01-browser-target.json'));
  const env = parseEnv(await readFile(resolve(options.envFile!), 'utf8'));
  assertLocalM01Targets({ databaseUrl: env.BETTER_DATABASE_URL ?? '', guardedDatabaseUrl: config.databaseUrl, appUrl: test.appUrl, triggerKey: env.TRIGGER_SECRET_KEY ?? '', triggerApiUrl: env.TRIGGER_API_URL ?? '', triggerBranch: env.TRIGGER_DEV_BRANCH ?? '', providerUrl: env.STRATEGY_PROVIDER_URL ?? 'https://openrouter.ai/api/v1/chat/completions' });
  if (!env.OPENROUTER_API_KEY) throw new Error('Explicit live env file is missing its provider key');
  const runName = options.newRun ?? options.run!;
  const files = resolveM01LiveFiles(integrationState, runName);
  await mkdir(files.dir, { recursive: true, mode: 0o700 }); await chmod(files.dir, 0o700);
  let checkpoint: M01LiveCheckpoint;
  try {
    checkpoint = await readJson<M01LiveCheckpoint>(files.checkpointPath);
    if (!options.run || !options.resume || options.newRun) throw new Error('Checkpoint already exists; use --run <name> --resume or select a different --new-run name');
    if (checkpoint.version !== 1 || checkpoint.runName !== runName || !Number.isInteger(checkpoint.callBudget) || checkpoint.callBudget < 8 || checkpoint.callBudget > 10) throw new Error('Unsupported or mismatched M01 checkpoint');
    if (options.maxCalls !== checkpoint.callBudget) throw new Error('Resume must use the checkpoint’s exact lifetime --max-calls budget');
  } catch (error) {
    if (!(error instanceof Error && 'code' in error && error.code === 'ENOENT')) throw error;
    if (options.run || !options.newRun) throw new Error('Run checkpoint is missing; use --new-run <name> for a fresh run');
    checkpoint = freshCheckpoint(runName, options.maxCalls!);
    await atomicWriteJson(files.checkpointPath, checkpoint);
  }

  const pool = new Pool({ connectionString: config.databaseUrl, max: 3 });
  const api = await request.newContext({ baseURL: test.appUrl, extraHTTPHeaders: { origin: test.appUrl, accept: 'application/json' } });
  try {
    // Seed each run in its own engagement so it cannot stale the prior M01 browser proof.
    const ownerRow = (await pool.query('SELECT g.organisation_id,g.brand_id,g.user_id,g.authority_role FROM strategy_access_grant g WHERE g.id=$1 AND g.revoked_at IS NULL', [existingTarget.grantId])).rows[0];
    const actor = (await pool.query('SELECT id FROM "user" WHERE email=$1', [test.email])).rows[0];
    if (!ownerRow || !actor || actor.id !== ownerRow.user_id) throw new Error('M01 live fixture identity or prior integration grant is unavailable');
    checkpoint.organisationId ??= ownerRow.organisation_id;
    checkpoint.brandId ??= ownerRow.brand_id;
    checkpoint.base ??= String(existingTarget.base).replace(existingTarget.engagementId, checkpoint.engagementId);
    if (!checkpoint.organisationId || !checkpoint.brandId || !checkpoint.grantId || !checkpoint.base || !checkpoint.base.includes(checkpoint.engagementId)) throw new Error('Could not isolate a new M01 engagement route');
    await pool.query('INSERT INTO strategy_engagement(organisation_id,brand_id,id,label,created_by) VALUES($1,$2,$3,$4,$5) ON CONFLICT DO NOTHING', [checkpoint.organisationId, checkpoint.brandId, checkpoint.engagementId, `Synthetic M01 live ${runName}`, actor.id]);
    await pool.query("INSERT INTO strategy_access_grant(id,organisation_id,brand_id,engagement_id,user_id,actions,is_approver,authority_role) VALUES($1,$2,$3,$4,$5,ARRAY['read','edit','approve','generate','export','manage'],true,$6) ON CONFLICT(id) DO NOTHING", [checkpoint.grantId, checkpoint.organisationId, checkpoint.brandId, checkpoint.engagementId, actor.id, ownerRow.authority_role]);
    const access = createStrategyAccess(async request => ({ actorId: actor.id, organisationId: request.organisationId, brandId: request.brandId, activeMembership: true, activeBrandAssignment: true, actions: ['read','edit','approve','generate','export','manage'], approvalEngagementId: request.engagementId }));
    const scope = await access.authorize({ organisationId: checkpoint.organisationId, brandId: checkpoint.brandId, engagementId: checkpoint.engagementId, action: 'manage' });
    const repository = new StrategyRepository(pool);
    const currentSource = await repository.getSource(scope, 'm01-input');
    if (!currentSource || currentSource.hash !== sourceHash(fictionalFounderSource)) {
      await repository.setSource(scope, { id: randomUUID(), slot: 'm01-input', body: fictionalFounderSource, hash: sourceHash(fictionalFounderSource) });
    }
    const source = await repository.getSource(scope, 'm01-input');
    if (!source || source.hash !== sourceHash(fictionalFounderSource)) throw new Error('Fictional M01 input did not become the current trusted source');
    checkpoint.sourceVersionId = source.id; checkpoint.sourceHash = source.hash;
    await atomicWriteJson(files.checkpointPath, checkpoint);

    const login = await api.post('/api/auth/sign-in/email', { data: { email: test.email, password: test.password } });
    if (!login.ok()) throw new Error(`Synthetic sign-in failed (${login.status()})`);
    const authenticated = await api.get('/api/auth/get-session');
    if (!authenticated.ok() || (await authenticated.json()).user.id !== actor.id) throw new Error('Authenticated user did not match the scoped M01 fixture actor');
    const baseUrl = test.appUrl + checkpoint.base;

    const postJson = async (body: unknown) => {
      const response = await api.post(baseUrl, { data: body });
      let value: any; try { value = await response.json(); } catch { value = {}; }
      return { response, value };
    };
    const getSession = async () => {
      if (!checkpoint.sessionId) throw new Error('M01 live session is not initialized');
      const response = await api.get(`${baseUrl}?sessionId=${encodeURIComponent(checkpoint.sessionId)}`);
      if (!response.ok()) throw new Error(`M01 session read failed (${response.status()})`);
      return response.json();
    };
    if (!checkpoint.sessionId) {
      const prior = (await pool.query('SELECT session_id FROM strategy_create_command WHERE organisation_id=$1 AND brand_id=$2 AND engagement_id=$3 AND command_id=$4', [checkpoint.organisationId, checkpoint.brandId, checkpoint.engagementId, checkpoint.createCommandId])).rows[0];
      if (prior) checkpoint.sessionId = prior.session_id;
      else {
        await atomicWriteJson(files.checkpointPath, checkpoint);
        const created = await postJson({ action: 'create', commandId: checkpoint.createCommandId });
        if (!created.response.ok()) throw new Error(`M01 session creation failed (${created.response.status()}); resume reuses its command ID`);
        checkpoint.sessionId = created.value.id ?? created.value.session?.id;
        if (!checkpoint.sessionId) throw new Error('M01 create response did not expose a session ID');
      }
      await atomicWriteJson(files.checkpointPath, checkpoint);
    }

    if (options.acceptStep) {
      const operation = m01OperationAwaitingReview(checkpoint);
      if (!operation) throw new Error('There is no completed M01 operation awaiting review');
      const current = await getSession();
      const digest = m01LiveHash(operationCandidate(current.session, operation));
      const attempt = checkpoint.attempts[operation]?.at(-1);
      if (!attempt || attempt.completedRevision !== current.session.revision || digest !== attempt.resultHash) throw new Error('Persisted candidate changed since its review packet was written');
      acceptM01Step(checkpoint, operation, options.acceptStep);
      await atomicWriteJson(files.checkpointPath, checkpoint);
    }

    if (options.retry) {
      const currentOp = M01_LIVE_OPERATIONS[checkpoint.nextOperation];
      if (currentOp !== options.retry) throw new Error('Retry must name the current unaccepted M01 operation');
      const last = checkpoint.attempts[options.retry]?.at(-1);
      if (!last || !['failed','cancelled','review-ready'].includes(last.status)) throw new Error('Retry requires a failed job or an explicitly rejected, unaccepted review candidate');
      const active = last.jobId ? (await pool.query("SELECT status FROM strategy_job WHERE id=$1 AND status IN ('pending','running')", [last.jobId])).rows[0] : null;
      if (active) throw new Error('Cannot retry while the prior M01 job is active');
    }

    if (options.approveOutputs) {
      if (checkpoint.nextOperation !== M01_LIVE_OPERATIONS.length || M01_LIVE_OPERATIONS.some(op => !checkpoint.accepted[op])) throw new Error('All eight generated operations must be reviewed and accepted before output approval');
      const current = await getSession();
      const digest = m01OutputReviewDigest(current.session);
      if (digest !== options.approveOutputs) throw new Error('Output review hash does not match the current persisted M01 content');
      const review = await readJson<any>(files.outputReviewPath);
      if (review.contentHash !== digest || m01LiveHash(review.candidate) !== digest) throw new Error('Saved output review packet differs from persisted candidate content');
      checkpoint.approvedOutputsHash = digest;
      await atomicWriteJson(files.checkpointPath, checkpoint);
      const confirmParts: { part: string; anchorKey?: string }[] = [
        ...ANCHOR_KEYS.map(anchorKey => ({ part: 'anchor', anchorKey })),
        { part: 'manifesto' }, { part: 'languageBank' }, { part: 'evidenceMatrix' }, { part: 'factsAnchor' }, { part: 'readiness' },
      ];
      for (const item of confirmParts) {
        const key = item.anchorKey ? `anchor:${item.anchorKey}` : item.part;
        if (checkpoint.confirmations[key]?.revision) continue;
        const currentSession = await getSession();
        if (m01OutputReviewDigest(currentSession.session) !== digest) throw new Error('M01 candidate changed during output confirmation');
        let receipt = checkpoint.confirmations[key];
        if (!receipt) { receipt = { commandId: randomUUID(), expectedRevision: currentSession.session.revision }; checkpoint.confirmations[key] = receipt; await atomicWriteJson(files.checkpointPath, checkpoint); }
        const prior = (await pool.query('SELECT revision,command_input FROM strategy_revision WHERE organisation_id=$1 AND brand_id=$2 AND engagement_id=$3 AND session_id=$4 AND command_id=$5', [checkpoint.organisationId, checkpoint.brandId, checkpoint.engagementId, checkpoint.sessionId, receipt.commandId])).rows[0];
        if (prior) {
          const saved = typeof prior.command_input === 'string' ? JSON.parse(prior.command_input) : prior.command_input;
          if (saved.operation !== 'confirm' || saved.part !== item.part || (item.anchorKey && saved.anchorKey !== item.anchorKey)) throw new Error('Existing confirmation command ID belongs to different content');
          receipt.revision = Number(prior.revision);
        } else {
          const { response, value } = await postJson({ action: 'confirm', sessionId: checkpoint.sessionId, expectedRevision: receipt.expectedRevision, commandId: receipt.commandId, ...item });
          if (!response.ok()) throw new Error(`M01 output confirmation failed (${response.status()}); resume reuses its saved command ID`);
          receipt.revision = Number(value.revision);
        }
        await atomicWriteJson(files.checkpointPath, checkpoint);
      }
      const reviewed = await getSession();
      if (m01OutputReviewDigest(reviewed.session) !== digest) throw new Error('M01 output content changed during confirmations');
      const sealReview = {
        kind: 'm01-live-seal-review', runName, sessionId: checkpoint.sessionId,
        candidateHash: digest, instruction: 'Review every generated field. Do not rewrite model output here. Set every review answer to pass only if you personally judge it passes; provide an explicit synthetic source attestation below.',
        sourceAuthority: { type: 'single founder / owner', name: 'Fictional founder (synthetic scenario)', materialUsed: fictionalFounderSource.parts.map(part => part.file).join(', '), evidenceRefs: fictionalFounderSource.parts.map(part => part.file), statement: 'I attest this is entirely fictional synthetic source material for software testing; it is not testimony from a real founder or evidence about a real client.' },
        reviewAnswers: Object.fromEntries(REVIEW_GATES.map(gate => [gate.id, 'pending'])), notes: '',
      };
      await atomicWriteJson(files.sealReviewPath, sealReview);
      console.log(JSON.stringify({ status: 'outputs-confirmed-awaiting-seal-review', candidateHash: digest, sealReview: files.sealReviewPath }));
      return;
    }

    if (options.sealFile) {
      if (!checkpoint.approvedOutputsHash || Object.keys(checkpoint.confirmations).length !== ANCHOR_KEYS.length + 5) throw new Error('M01 outputs must receive their separate explicit approval before seal review');
      const sealFile = await readJson<any>(resolve(options.sealFile));
      const current = await getSession();
      const digest = m01OutputReviewDigest(current.session);
      if (digest !== checkpoint.approvedOutputsHash || sealFile.candidateHash !== digest) throw new Error('Seal review hash differs from the approved persisted candidate');
      if (Object.keys(sealFile).some(key => !['kind','runName','sessionId','candidateHash','instruction','sourceAuthority','reviewAnswers','notes'].includes(key))) throw new Error('Seal review file must not add or replace generated M01 content');
      const answers = sealFile.reviewAnswers;
      if (!answers || REVIEW_GATES.some(gate => answers[gate.id] !== 'pass') || Object.keys(answers).length !== REVIEW_GATES.length) throw new Error('Every M01 human review gate must be explicitly answered pass before sealing');
      const authority = sealFile.sourceAuthority;
      if (!authority || !validTypes.has(authority.type) || !String(authority.name ?? '').trim() || !String(authority.materialUsed ?? '').trim() || !String(authority.statement ?? '').toLowerCase().includes('synthetic') || !Array.isArray(authority.evidenceRefs) || !authority.evidenceRefs.length) throw new Error('Source attribution must identify the synthetic scenario and contain an explicit evidence reference');
      const knownFiles = new Set(fictionalFounderSource.parts.map(part => part.file));
      if (authority.evidenceRefs.some((ref: string) => !knownFiles.has(ref))) throw new Error('Source attribution references material outside the synthetic fixture');
      if (!m01SealCanResume({ hasOutputs: !!current.session.outputs, isSealed: !!current.session.seal, hasDraft: !!current.session.setTwoDraft, hasSealedDerived: !!current.session.handoff?.derived })) throw new Error('Current M01 session is not ready for seal or seal reconciliation');
      const head = (await pool.query(`SELECT h.version_id,v.seal_hash FROM strategy_source_head h JOIN strategy_version v ON v.organisation_id=h.organisation_id AND v.brand_id=h.brand_id AND v.engagement_id=h.engagement_id AND v.id=h.version_id WHERE h.organisation_id=$1 AND h.brand_id=$2 AND h.engagement_id=$3 AND h.slot='m01-input'`, [checkpoint.organisationId, checkpoint.brandId, checkpoint.engagementId])).rows[0];
      if (!head || head.version_id !== checkpoint.sourceVersionId || head.seal_hash !== checkpoint.sourceHash) throw new Error('Pinned synthetic M01 source changed before seal review');
      const evidenceRefs = [...new Set(authority.evidenceRefs)];
      const matching = await pool.query(`SELECT id,evidence_refs FROM strategy_m01_source_attribution WHERE organisation_id=$1 AND brand_id=$2 AND engagement_id=$3 AND source_version_id=$4 AND source_hash=$5 AND source_type=$6 AND source_name=$7 AND material_used=$8 AND attestation_statement=$9 AND attested_by=$10 ORDER BY created_at DESC`, [checkpoint.organisationId, checkpoint.brandId, checkpoint.engagementId, head.version_id, head.seal_hash, authority.type, authority.name.trim(), authority.materialUsed.trim(), authority.statement.trim(), actor.id]);
      const prior = matching.rows.find(row => m01LiveHash(row.evidence_refs) === m01LiveHash(evidenceRefs));
      if (matching.rows.length && !prior) throw new Error('A prior source attestation exists with different evidence; do not silently replace it');
      if (!checkpoint.attestationId) {
        if (prior) checkpoint.attestationId = prior.id;
        else {
          await atomicWriteJson(files.checkpointPath, checkpoint);
          const attested = await postJson({ action: 'attest-source', type: authority.type, name: authority.name.trim(), materialUsed: authority.materialUsed.trim(), evidenceRefs, statement: authority.statement.trim() });
          if (!attested.response.ok()) throw new Error(`Synthetic source attestation failed (${attested.response.status()})`);
          checkpoint.attestationId = attested.value.attribution?.id;
          if (!checkpoint.attestationId) throw new Error('Source attribution response did not return its ID');
        }
        checkpoint.attestationHash = m01LiveHash({ type: authority.type, name: authority.name.trim(), materialUsed: authority.materialUsed.trim(), evidenceRefs, statement: authority.statement.trim() });
        await atomicWriteJson(files.checkpointPath, checkpoint);
      } else if (checkpoint.attestationHash !== m01LiveHash({ type: authority.type, name: authority.name.trim(), materialUsed: authority.materialUsed.trim(), evidenceRefs, statement: authority.statement.trim() })) {
        throw new Error('Seal file source attestation changed after its attribution was recorded');
      }
      if (current.session.seal) {
        const saved = checkpoint.sealCommand;
        const use = (await pool.query('SELECT attribution_id FROM strategy_m01_source_attribution_use WHERE organisation_id=$1 AND brand_id=$2 AND engagement_id=$3 AND session_id=$4 AND revision=$5', [checkpoint.organisationId, checkpoint.brandId, checkpoint.engagementId, checkpoint.sessionId, current.session.revision])).rows[0];
        if (!m01SealReplayMatches({ saved, attributionId: checkpoint.attestationId!, answers, notes: String(sealFile.notes ?? ''), derived: current.session.handoff?.derived, committedAttributionId: use?.attribution_id })) throw new Error('Existing seal does not reconcile to this saved human review and attestation');
        checkpoint.sealedVersionId = current.session.seal.versionId;
        await atomicWriteJson(files.checkpointPath, checkpoint);
        console.log(JSON.stringify({ status: 'sealed-for-synthetic-integration', sessionId: checkpoint.sessionId, versionId: checkpoint.sealedVersionId, candidateHash: digest }));
        return;
      }
      let seal = checkpoint.sealCommand;
      const body = { action: 'seal', sessionId: checkpoint.sessionId, expectedRevision: current.session.revision, reviewAnswers: answers, derived: current.session.setTwoDraft, sourceAttributionId: checkpoint.attestationId, notes: String(sealFile.notes ?? '') };
      const fileHash = m01LiveHash({ candidateHash: digest, body });
      if (!seal) { seal = { commandId: randomUUID(), expectedRevision: current.session.revision, body, fileHash }; checkpoint.sealCommand = seal; await atomicWriteJson(files.checkpointPath, checkpoint); }
      else if (seal.fileHash !== fileHash) throw new Error('Seal command is already checkpointed with different approval content');
      if (!current.session.seal) {
        const { response } = await postJson({ ...seal.body, commandId: seal.commandId });
        if (!response.ok()) throw new Error(`M01 seal failed (${response.status()}); resume will reconcile the same command ID`);
      }
      const sealed = await getSession();
      if (!sealed.session.seal?.versionId || !sealed.session.handoff) throw new Error('Sealed M01 version is not present after commit');
      checkpoint.sealedVersionId = sealed.session.seal.versionId;
      await atomicWriteJson(files.checkpointPath, checkpoint);
      console.log(JSON.stringify({ status: 'sealed-for-synthetic-integration', sessionId: checkpoint.sessionId, versionId: checkpoint.sealedVersionId, candidateHash: digest }));
      return;
    }

    const operation = M01_LIVE_OPERATIONS[checkpoint.nextOperation];
    if (!operation) {
      const final = await getSession();
      const digest = m01OutputReviewDigest(final.session);
      const packet = { kind: 'm01-live-output-review', runName, sessionId: checkpoint.sessionId, contentHash: digest, synthetic: true, instruction: 'Inspect the exact generated candidate below. Do not edit it. To approve confirmations, pass this contentHash with --approve-outputs.', candidate: m01OutputReviewCandidate(final.session) };
      await atomicWriteJson(files.outputReviewPath, packet);
      console.log(JSON.stringify({ status: 'awaiting-explicit-output-review', contentHash: digest, review: files.outputReviewPath }));
      return;
    }
    let current = await getSession();
    if (operation === 'synthesise') {
      const needsClosing = m01NeedsClosingContribution(current.session.transcript);
      let closing = checkpoint.closingContribution;
      if (needsClosing && !closing) {
        closing = {
          commandId: randomUUID(), eventId: randomUUID(), expectedRevision: current.session.revision,
          event: { event_id: '', type: 'session.input_transcript.delta', delta: fictionalFounderClosing },
        };
        closing.event.event_id = closing.eventId;
        checkpoint.closingContribution = closing;
        await atomicWriteJson(files.checkpointPath, checkpoint);
      }
      if (closing) {
        const prior = (await pool.query('SELECT revision,command_input FROM strategy_revision WHERE organisation_id=$1 AND brand_id=$2 AND engagement_id=$3 AND session_id=$4 AND command_id=$5', [checkpoint.organisationId, checkpoint.brandId, checkpoint.engagementId, checkpoint.sessionId, closing.commandId])).rows[0];
        if (prior) {
          const saved = typeof prior.command_input === 'string' ? JSON.parse(prior.command_input) : prior.command_input;
          if (!m01AppendCommandMatches(saved, { commandId: closing.commandId, event: closing.event })) throw new Error('Existing transcript contribution command differs from the saved synthetic contribution');
          closing.committedRevision = Number(prior.revision);
        } else if (needsClosing) {
          if (current.session.revision !== closing.expectedRevision) throw new Error('M01 revision changed before the saved closing contribution was committed');
          const { response } = await postJson({ action: 'append-events', sessionId: checkpoint.sessionId, expectedRevision: closing.expectedRevision, commandId: closing.commandId, events: [closing.event] });
          if (!response.ok()) throw new Error(`Synthetic closing contribution failed (${response.status()}); resume will reconcile the same command ID`);
        }
        await atomicWriteJson(files.checkpointPath, checkpoint);
        if (prior || needsClosing) current = await getSession();
        if (prior || needsClosing) {
          const committedEvent = current.session.transcript.some((line: any) => line.event?.event_id === closing!.eventId && m01LiveHash(line.event) === m01LiveHash(closing!.event));
          if (!committedEvent) throw new Error('Saved synthetic closing contribution is absent from the M01 transcript');
        }
      }
      if (needsClosing && m01NeedsClosingContribution(current.session.transcript)) throw new Error('M01 transcript still does not meet the four-segment synthesis minimum');
    }
    let attempt = checkpoint.attempts[operation]?.at(-1);
    if (options.retry) {
      // Reserve only after any required synthetic transcript contribution has committed.
      const reserved = reserveM01Attempt(checkpoint, operation, current.session.revision, options.retryReason);
      await atomicWriteJson(files.checkpointPath, checkpoint);
      if (!reserved.newlyReserved) throw new Error('Retry did not create a distinct lifetime reservation');
      attempt = checkpoint.attempts[operation]?.at(-1);
    } else if (!attempt) {
      attempt = reserveM01Attempt(checkpoint, operation, current.session.revision).attempt;
      await atomicWriteJson(files.checkpointPath, checkpoint); // consume budget before the billable request
    } else if (attempt.status === 'failed' || attempt.status === 'cancelled') {
      throw new Error(`M01 ${operation} stopped on terminal job status ${attempt.status}; use --retry ${operation} --reason "..." with an unused reservation`);
    } else if (attempt.status === 'review-ready') {
      throw new Error(`M01 ${operation} candidate awaits review; resume with --accept-step ${attempt.resultHash}`);
    }
    if (!attempt) throw new Error('M01 operation reservation unavailable');
    const command = jobCommand(operation, checkpoint.sessionId!, attempt.inputRevision, attempt.commandId);
    let jobRow = attempt.jobId ? (await pool.query('SELECT id,command_id,status,provider_run_id,input_revision,last_error FROM strategy_job WHERE organisation_id=$1 AND brand_id=$2 AND engagement_id=$3 AND session_id=$4 AND id=$5', [checkpoint.organisationId, checkpoint.brandId, checkpoint.engagementId, checkpoint.sessionId, attempt.jobId])).rows[0] : null;
    if (!jobRow) jobRow = (await pool.query('SELECT id,command_id,status,provider_run_id,input_revision,last_error FROM strategy_job WHERE organisation_id=$1 AND brand_id=$2 AND engagement_id=$3 AND session_id=$4 AND command_id=$5', [checkpoint.organisationId, checkpoint.brandId, checkpoint.engagementId, checkpoint.sessionId, attempt.commandId])).rows[0] ?? null;
    if (jobRow && (String(jobRow.command_id) !== attempt.commandId || Number(jobRow.input_revision) !== attempt.inputRevision)) throw new Error('Persisted M01 job does not match the saved command reservation');
    const resumeDecision = m01ResumeJobDecision({ currentRevision: current.session.revision, inputRevision: attempt.inputRevision, status: jobRow?.status });
    if (resumeDecision === 'enqueue') {
      // A lost HTTP response is recovered by replaying the exact command ID/body.
      // The server's command uniqueness makes this enqueue idempotent.
      const { response, value } = await postJson(command);
      if (!response.ok()) {
        attempt.status = 'failed'; attempt.failure = `enqueue rejected (${response.status()})`;
        await atomicWriteJson(files.checkpointPath, checkpoint);
        throw new Error(`M01 ${operation} enqueue failed (${response.status()}); it is checkpointed and will not be retried without an explicit --retry`);
      }
      if (!value.jobId) throw new Error('M01 queued response did not expose a durable job ID');
      attempt.jobId = value.jobId; attempt.status = 'queued';
      await atomicWriteJson(files.checkpointPath, checkpoint);
      jobRow = { id: value.jobId, status: value.status ?? 'pending', input_revision: attempt.inputRevision, provider_run_id: null };
    } else {
      attempt.jobId = String(jobRow.id);
      await atomicWriteJson(files.checkpointPath, checkpoint);
    }

    const deadline = Date.now() + 1_100_000;
    while (Date.now() < deadline) {
      const persisted = (await pool.query('SELECT status,provider_run_id,input_revision,last_error FROM strategy_job WHERE organisation_id=$1 AND brand_id=$2 AND engagement_id=$3 AND session_id=$4 AND id=$5', [checkpoint.organisationId, checkpoint.brandId, checkpoint.engagementId, checkpoint.sessionId, attempt.jobId])).rows[0];
      if (!persisted) throw new Error('Persisted M01 job is unavailable in the isolated integration database');
      if (Number(persisted.input_revision) !== attempt.inputRevision) throw new Error('Persisted M01 job input revision differs from the reservation');
      if (persisted.provider_run_id) {
        attempt.providerRunId = requireRealTriggerRun(String(persisted.provider_run_id));
        checkpoint.attempts[operation]![checkpoint.attempts[operation]!.length - 1] = attempt;
      }
      attempt.status = persisted.status === 'running' ? 'running' : persisted.status === 'pending' ? 'queued' : attempt.status;
      await atomicWriteJson(files.checkpointPath, checkpoint);
      if (persisted.status === 'failed' || persisted.status === 'cancelled') {
        attempt.status = persisted.status; attempt.failure = String(persisted.last_error ?? persisted.status).slice(0, 500);
        await atomicWriteJson(files.checkpointPath, checkpoint);
        throw new Error(`M01 ${operation} ended ${persisted.status}; it is checkpointed and will not be retried without an explicit --retry`);
      }
      if (persisted.status === 'succeeded') {
        const providerRunId = requireRealTriggerRun(attempt.providerRunId);
        const generated = (await pool.query(`SELECT revision,command_input,payload_text FROM strategy_revision WHERE organisation_id=$1 AND brand_id=$2 AND engagement_id=$3 AND session_id=$4 AND revision=$5`, [checkpoint.organisationId, checkpoint.brandId, checkpoint.engagementId, checkpoint.sessionId, attempt.inputRevision + 1])).rows[0];
        if (!generated) throw new Error('M01 worker reported success without a committed generation revision');
        const commandInput = typeof generated.command_input === 'string' ? JSON.parse(generated.command_input) : generated.command_input;
        if (!m01CommittedCommandMatches(operation, commandInput, attempt.commandId)) throw new Error('Committed M01 revision does not match the reserved generation command');
        const persistedSession = JSON.parse(generated.payload_text);
        const apiResponse = await api.get(`${baseUrl}?sessionId=${encodeURIComponent(checkpoint.sessionId!)}&jobId=${encodeURIComponent(attempt.jobId!)}`);
        if (!apiResponse.ok()) throw new Error(`M01 job API read failed (${apiResponse.status()})`);
        const apiJob = await apiResponse.json() as any;
        if (apiJob.jobId !== attempt.jobId || apiJob.sessionId !== checkpoint.sessionId || apiJob.status !== 'succeeded') throw new Error('M01 job status API disagrees with its committed job');
        const savedValue = operationCandidate(persistedSession, operation), digest = m01LiveHash(savedValue);
        const apiState = await getSession();
        if (m01LiveHash(operationCandidate(apiState.session, operation)) !== digest) throw new Error('M01 API candidate differs from the committed revision bytes');
        attempt.status = 'review-ready'; attempt.generatedRevision = Number(generated.revision); attempt.completedRevision = Number(apiState.session.revision); attempt.resultHash = digest;
        await atomicWriteJson(files.checkpointPath, checkpoint);
        const reviewPath = join(files.dir, `${operation}-attempt-${attempt.reservation}-review.json`);
        attempt.reviewPath = reviewPath;
        await atomicWriteJson(files.checkpointPath, checkpoint);
        await atomicWriteJson(reviewPath, { kind: 'm01-live-step-review', synthetic: true, runName, operation, reservation: attempt.reservation, commandId: attempt.commandId, jobId: attempt.jobId, providerRunId, inputRevision: attempt.inputRevision, generatedRevision: attempt.generatedRevision, completedRevision: attempt.completedRevision, candidateHash: digest, instruction: 'Inspect the exact persisted candidate below. No model output is changed by this packet. Continue only with --accept-step <candidateHash>; reject explicitly with --retry <operation> --reason "...".', candidate: savedValue });
        console.log(JSON.stringify({ status: 'awaiting-step-review', operation, candidateHash: digest, review: reviewPath, reservation: attempt.reservation, providerRunId }));
        return;
      }
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    throw new Error(`Timed out waiting for M01 ${operation}; resume will inspect the same persisted job and command ID`);
  } finally {
    await api.dispose(); await pool.end();
  }
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url)
  main().catch(error => { const message = error instanceof Error ? error.message : 'M01 live harness failed'; console.error(scrub(message)); process.exitCode = 1; });
