/** Resumable, bounded M04 live-provider harness. No provider calls without --live. */
import { readFile, writeFile, mkdir, rename, chmod, rm } from 'node:fs/promises';
import { resolve, join, dirname, basename } from 'node:path';
import { pathToFileURL } from 'node:url';
import { randomUUID, createHash } from 'node:crypto';
import { parse } from 'dotenv';
import { request, chromium } from '@playwright/test';
import { Pool } from 'pg';
import { readConnection, integrationState } from './local-stack.ts';

export const M04_LIVE_STAGES = ['context', 'conviction-cost', 'market-readiness', 'human-load', 'financial-grounding', 'awareness-and-weighing', 'recommendation'] as const;
export type M04LiveStage = typeof M04_LIVE_STAGES[number];
export type M04StageCompletion = { revision: number; draftHash: string; generatedRevision: number };
export type M04StageJob = { jobId?: string; inputRevision: number; providerRunId?: string; reserved: true };
export type M04ReviewAudit = { originalGeneratedHash: string; changedFields: string[]; provenance: string; sourcePinnedIdentityCorrection: boolean };
export type M04PreviousAttempt = { job: M04StageJob; completed?: M04StageCompletion; commandId?: string; confirmCommandId?: string; reviewAudit?: M04ReviewAudit; reviewReason: string; archivedAt: string; failureKind: 'candidate-replaced' | 'terminal-job-retried'; jobStatus: string; jobError?: string | null };
export type Checkpoint = { version: 2; runName: string; sessionId?: string; createCommandId?: string; commandIds: Partial<Record<M04LiveStage, string>>; confirmCommandIds: Partial<Record<M04LiveStage, string>>; finalCommandIds: Partial<Record<'present'|'decide'|'seal', string>>; finalCommands?: Partial<Record<'present'|'decide'|'seal', { commandId: string; expectedRevision: number; payloadHash?: string }>>; finalDecisionHash?: string; presentedHash?: string; jobs: Partial<Record<M04LiveStage, M04StageJob>>; completed: Partial<Record<M04LiveStage, M04StageCompletion>>; confirmed: Partial<Record<M04LiveStage, number>>; reviewAudit?: Partial<Record<M04LiveStage, M04ReviewAudit>>; previousAttempts?: Partial<Record<M04LiveStage, M04PreviousAttempt[]>>; budgetExtensions?: { from: number; to: number; reason: string; at: string }[]; callBudget: number; reservedCalls: number; createdAt: string };
export function canonicalJson(value: any): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  if (value && typeof value === 'object') return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(',')}}`;
  return JSON.stringify(value);
}
export const safeHash = (value: unknown) => createHash('sha256').update(canonicalJson(value)).digest('hex');
export function isGeneratedSince(candidate: unknown, previous: unknown, persistedRevision: number | undefined, inputRevision: number) {
  return persistedRevision !== undefined && persistedRevision > inputRevision && safeHash(candidate) !== safeHash(previous);
}
export function hasProviderGeneration(input: { status: string; providerRunId?: string; inputRevision: number; generatedRevision?: number; generatedCandidate?: unknown; apiCandidate?: unknown }) {
  return input.status === 'succeeded' && !!input.providerRunId && !input.providerRunId.startsWith('run_local_') && input.generatedRevision === input.inputRevision + 1 && input.generatedCandidate !== undefined && safeHash(input.generatedCandidate) === safeHash(input.apiCandidate);
}
export async function readJobAndSession(api: { get: (url: string) => Promise<{ ok: () => boolean; status: () => number; json: () => Promise<any> }> }, base: string, sessionId: string, jobId: string) {
  const [jobResponse, sessionResponse] = await Promise.all([
    api.get(`${base}?sessionId=${encodeURIComponent(sessionId)}&jobId=${encodeURIComponent(jobId)}`),
    api.get(`${base}?sessionId=${encodeURIComponent(sessionId)}`),
  ]);
  if (!jobResponse.ok()) throw new Error(`Job read failed (${jobResponse.status()})`);
  if (!sessionResponse.ok()) throw new Error(`Session read failed (${sessionResponse.status()})`);
  return { job: await jobResponse.json(), session: await sessionResponse.json() };
}
export function assertDecisionMatchesPresentation(decision: any, presentationHash: unknown) {
  if (typeof presentationHash !== 'string' || !presentationHash || decision?.memoHash !== presentationHash) throw new Error('Human decision memoHash must match the presented hash; run --present-only first and use that hash');
}
export function resolveRunFiles(root: string, name: string) {
  if (!/^[a-z0-9][a-z0-9-]{0,47}$/.test(name)) throw new Error('Run name must be 1-48 lowercase letters, digits, or hyphens');
  const dir = resolve(root, 'm04-live', name);
  return { dir, checkpointPath: join(dir, 'checkpoint.json'), reviewPath: join(dir, 'review.json'), evidencePath: join(dir, 'evidence.json') };
}
export function reserveProviderCall(cp: Pick<Checkpoint, 'jobs'|'reservedCalls'|'callBudget'>, stage: M04LiveStage, inputRevision: number) {
  const existing = cp.jobs[stage];
  if (existing) return { reservation: existing, newlyReserved: false };
  if (cp.reservedCalls >= cp.callBudget) throw new Error('Lifetime provider call budget exhausted');
  const reservation = { inputRevision, reserved: true as const };
  cp.jobs[stage] = reservation;
  cp.reservedCalls++;
  return { reservation, newlyReserved: true };
}
export function prepareStageRetry(input: {
  checkpoint: Checkpoint;
  stage: M04LiveStage;
  reviewReason: string;
  session: { stage?: string; revision?: number; seal?: unknown; confirmations?: Record<string, unknown>; drafts?: Record<string, unknown> };
  previousJob: { id: string; status: string; inputRevision?: number; lastError?: string | null } | null;
  activeJobs: { id: string; status: string }[];
  extendBudget?: 1;
  maxCalls: number;
  now?: string;
}) {
  const reason = input.reviewReason.trim();
  if (!reason) throw new Error('--review-reason must be non-empty');
  if (input.session.stage !== input.stage) throw new Error(`Retry stage must match the session's current stage (${input.session.stage ?? 'unknown'})`);
  if (input.session.seal) throw new Error('Cannot retry a stage after the session is sealed');
  if (input.checkpoint.confirmed[input.stage] || input.session.confirmations?.[input.stage]) throw new Error('Cannot retry a confirmed stage');

  const cp = structuredClone(input.checkpoint);
  const priorAttempts = cp.previousAttempts?.[input.stage] ?? [];
  const currentJob = cp.jobs[input.stage];
  const currentCompletion = cp.completed[input.stage];
  if (priorAttempts.length && currentCompletion) throw new Error('This stage already has a retry candidate; review or resume it without --retry-stage');
  if (priorAttempts.length && currentJob) {
    if (priorAttempts.at(-1)?.reviewReason !== reason) throw new Error('A prepared retry already exists with a different review reason');
    if (input.extendBudget) throw new Error('The one-time budget extension cannot be repeated');
    if (input.maxCalls !== cp.callBudget) throw new Error('Resume must use the current lifetime budget');
    if (currentJob.jobId === priorAttempts.at(-1)?.job.jobId) throw new Error('Retry checkpoint still points at the archived job');
    if (input.previousJob?.id === currentJob.jobId && ['failed', 'cancelled'].includes(input.previousJob.status)) throw new Error('This stage retry already ended without a candidate; the same stage cannot be retried again');
    if (input.activeJobs.some(job => (job.status === 'pending' || job.status === 'running') && job.id !== currentJob.jobId)) throw new Error('Cannot retry while another Strategy job is active');
    return { checkpoint: cp, prepared: false, alreadyPrepared: true };
  }
  if (priorAttempts.length) {
    if (priorAttempts.at(-1)?.reviewReason !== reason) throw new Error('A prepared retry already exists with a different review reason');
    if (input.extendBudget) throw new Error('The one-time budget extension cannot be repeated');
    if (input.maxCalls !== cp.callBudget) throw new Error('Resume must use the current lifetime budget');
    if (input.activeJobs.some(job => job.status === 'pending' || job.status === 'running')) throw new Error('Cannot prepare a retry while a Strategy job is active');
    return { checkpoint: cp, prepared: false, alreadyPrepared: true };
  }
  if (input.activeJobs.some(job => job.status === 'pending' || job.status === 'running')) throw new Error('Cannot retry while a Strategy job is active');
  const completion = currentCompletion;
  const job = currentJob;
  const draft = input.session.drafts?.[input.stage];
  if (!job?.jobId || !job.providerRunId || job.providerRunId.startsWith('run_local_')) throw new Error('Retry requires an existing live durable job');
  if (!input.previousJob || input.previousJob.id !== job.jobId || input.previousJob.inputRevision !== job.inputRevision) throw new Error('Original durable job and input revision must match the checkpoint');
  const failedWithoutCandidate = !completion && input.previousJob.status === 'failed';
  if (completion) {
    if (!draft) throw new Error('Retry requires an existing completed candidate and durable job');
    if (safeHash(draft) !== completion.draftHash) throw new Error('Persisted candidate does not match the completed checkpoint hash');
    if (input.previousJob.status !== 'succeeded') throw new Error('Completed candidate must belong to a succeeded durable job');
  } else if (failedWithoutCandidate) {
    if (draft) throw new Error('A terminal failed job cannot be retried while a stage candidate exists');
    if (input.session.revision !== job.inputRevision) throw new Error('Terminal failed job input revision must match the current session revision');
  } else {
    throw new Error('Retry requires either a completed candidate or a terminal failed job without a candidate');
  }

  if (input.extendBudget) {
    const extensions = cp.budgetExtensions ?? [];
    const firstExtension = cp.callBudget === 7 && cp.reservedCalls >= 1 && cp.reservedCalls <= 7 && input.maxCalls === 8 && extensions.length === 0;
    const secondExtension = cp.callBudget === 8 && cp.reservedCalls === 8 && input.maxCalls === 9 && extensions.length === 1 && extensions[0].from === 7 && extensions[0].to === 8;
    if (input.extendBudget !== 1 || (!firstExtension && !secondExtension))
      throw new Error('One-time budget extension must advance exactly 7 to 8 or 8 to 9 at the matching reserved-call count');
    cp.budgetExtensions ??= [];
    const from = cp.callBudget;
    cp.budgetExtensions.push({ from, to: from + 1, reason, at: input.now ?? new Date().toISOString() });
    cp.callBudget = from + 1;
  } else if (input.maxCalls !== cp.callBudget) {
    throw new Error('Resume must use the current lifetime budget; use --extend-budget 1 explicitly for an allowed one-call extension');
  }
  if (!input.extendBudget && cp.reservedCalls >= cp.callBudget) throw new Error('Lifetime provider call budget exhausted; explicitly extend the budget before retrying');

  const attempt: M04PreviousAttempt = {
    job: structuredClone(job),
    ...(completion ? { completed: structuredClone(completion) } : {}),
    ...(cp.commandIds[input.stage] ? { commandId: cp.commandIds[input.stage] } : {}),
    ...(cp.confirmCommandIds[input.stage] ? { confirmCommandId: cp.confirmCommandIds[input.stage] } : {}),
    ...(cp.reviewAudit?.[input.stage] ? { reviewAudit: structuredClone(cp.reviewAudit[input.stage]) } : {}),
    reviewReason: reason,
    archivedAt: input.now ?? new Date().toISOString(),
    failureKind: completion ? 'candidate-replaced' : 'terminal-job-retried',
    jobStatus: input.previousJob.status,
    ...(input.previousJob.lastError ? { jobError: input.previousJob.lastError.slice(0, 500) } : { jobError: null }),
  };
  cp.previousAttempts ??= {};
  cp.previousAttempts[input.stage] ??= [];
  cp.previousAttempts[input.stage]!.push(attempt);
  delete cp.completed[input.stage];
  delete cp.jobs[input.stage];
  delete cp.commandIds[input.stage];
  delete cp.confirmCommandIds[input.stage];
  if (cp.reviewAudit) delete cp.reviewAudit[input.stage];
  return { checkpoint: cp, prepared: true, alreadyPrepared: false };
}
export function reconcileConfirmation(input: { stage: M04LiveStage; expectedCandidate: unknown; currentSession: any; record?: { revision: number; action: string; command_input: any; payload_text: string } }) {
  const { stage, expectedCandidate, currentSession, record } = input;
  if (!record || !currentSession) return false;
  const command = typeof record.command_input === 'string' ? JSON.parse(record.command_input) : record.command_input;
  const persisted = JSON.parse(record.payload_text);
  const confirmation = currentSession.confirmations?.[stage];
  const savedConfirmation = persisted.confirmations?.[stage];
  const key: Record<M04LiveStage, string> = { context: 'context', 'conviction-cost': 'convictionCost', 'market-readiness': 'marketReadiness', 'human-load': 'humanLoad', 'financial-grounding': 'financialGrounding', 'awareness-and-weighing': 'awareness', recommendation: 'recommendation' };
  const currentData = currentSession.data?.[key[stage]];
  const committedData = persisted.data?.[key[stage]];
  return record.action === 'edit' && command?.operation === 'step' && command?.action === 'confirm' && command?.stage === stage && confirmation?.decision === 'confirmed' && confirmation?.target === stage && Number(confirmation.revision) === Number(record.revision) && Number(savedConfirmation?.revision) === Number(record.revision) && savedConfirmation?.decision === 'confirmed' && currentSession.stage !== stage && safeHash(currentData) === safeHash(expectedCandidate) && safeHash(committedData) === safeHash(expectedCandidate) && safeHash(currentData) === safeHash(committedData);
}

export function parseOptions(argv: string[]) {
  const options = { live: argv.includes('--live'), maxCalls: 0, resume: argv.includes('--resume'), newRun: undefined as string | undefined, run: undefined as string | undefined, confirm: argv.includes('--confirm-review'), presentOnly: argv.includes('--present-only'), envFile: undefined as string | undefined, finalDecision: undefined as string | undefined, retryStage: undefined as M04LiveStage | undefined, reviewReason: undefined as string | undefined, extendBudget: undefined as 1 | undefined };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--max-calls') options.maxCalls = Number(argv[++i]);
    if (argv[i] === '--env-file') options.envFile = argv[++i];
    if (argv[i] === '--final-decision') options.finalDecision = argv[++i];
    if (argv[i] === '--new-run') options.newRun = argv[++i];
    if (argv[i] === '--run') options.run = argv[++i];
    if (argv[i] === '--retry-stage') options.retryStage = argv[++i] as M04LiveStage;
    if (argv[i] === '--review-reason') options.reviewReason = argv[++i];
    if (argv[i] === '--extend-budget') options.extendBudget = Number(argv[++i]) as 1;
  }
  if (!options.live && options.maxCalls !== 0) throw new Error('--max-calls requires explicit --live');
  if (options.live && (!Number.isInteger(options.maxCalls) || options.maxCalls < 1 || options.maxCalls > 9)) throw new Error('--live requires --max-calls between 1 and 9');
  if (argv.includes('--retry-stage') && !options.retryStage) throw new Error('--retry-stage must name a M04 data stage');
  if (options.retryStage && !M04_LIVE_STAGES.includes(options.retryStage)) throw new Error('--retry-stage must name a M04 data stage');
  if (options.retryStage && (!options.live || !options.run || !options.resume || options.newRun)) throw new Error('--retry-stage requires --run <name> --resume --live');
  if (options.retryStage && !options.reviewReason?.trim()) throw new Error('--retry-stage requires a non-empty --review-reason');
  if (!options.retryStage && options.reviewReason) throw new Error('--review-reason requires --retry-stage');
  if (options.extendBudget !== undefined && options.extendBudget !== 1) throw new Error('--extend-budget supports exactly 1 additional call');
  if (options.extendBudget && !options.retryStage) throw new Error('--extend-budget requires --retry-stage');
  if (options.newRun && options.maxCalls > 7) throw new Error('New runs cannot exceed the original 7-call budget');
  if (options.extendBudget && ![8, 9].includes(options.maxCalls)) throw new Error('--extend-budget 1 requires --max-calls 8 or 9');
  if (options.envFile && !options.live) throw new Error('--env-file requires explicit --live');
  if (options.newRun && options.run) throw new Error('Use --new-run or --run, not both');
  if (options.live && !options.envFile) throw new Error('--live requires --env-file pointing to the private approved development configuration');
  if (options.confirm && !options.run) throw new Error('--confirm-review requires --run <existing-run-name>');
  if (options.finalDecision && !options.run) throw new Error('--final-decision requires --run <existing-run-name>');
  if (options.presentOnly && !options.run) throw new Error('--present-only requires --run <existing-run-name>');
  if ([options.confirm, options.presentOnly, !!options.finalDecision].filter(Boolean).length > 1) throw new Error('Choose one zero-provider-call review action');
  if (options.retryStage && (options.confirm || options.presentOnly || options.finalDecision)) throw new Error('--retry-stage is separate from confirmation, presentation, and final decision');
  if (options.live && !options.newRun && !options.run) throw new Error('--live requires --new-run <name> or --run <name>');
  if (options.live && (options.confirm || options.finalDecision)) throw new Error('Review confirmation and final decision are separate zero-provider-call steps; omit --live');
  return options;
}

export function makeReviewPacket(stage: M04LiveStage, candidate: Record<string, unknown>, session: any) {
  const packet = structuredClone(candidate);
  const issues: string[] = [];
  if (stage === 'context') {
    const owner = session.sources?.entry?.receipt?.decisionOwner;
    if (owner && packet.decisionOwner !== owner.name) issues.push('decisionOwner must match the pinned source identity');
    if (owner && packet.authorityRef !== owner.authorityBasis) issues.push('authorityRef must match the pinned source authority');
  }
  return { kind: 'm04-live-review', synthetic: true, stage, originalGeneratedHash: safeHash(packet), generatedCandidate: packet, validationIssues: issues, humanEdits: {}, instruction: 'Review the generated content. Preserve it unless you make an intentional edit. Record deliberate top-level field changes in humanEdits. Do not add a human decision here.' };
}

export function applyReviewEdits(candidate: Record<string, unknown>, edits: Record<string, unknown>) {
  const result = structuredClone(candidate);
  for (const [key, value] of Object.entries(edits)) {
    if (!Object.hasOwn(candidate, key)) throw new Error(`Review edit names unknown generated field: ${key}`);
    result[key] = value;
  }
  return { candidate: result, changedFields: Object.keys(edits) };
}

export function validationSummary(body: any) {
  const issueSource = body?.issues ?? body?.validationIssues ?? body?.error?.issues ?? body?.error?.validationIssues;
  const issues = Array.isArray(issueSource) ? issueSource : [];
  const typed = body?.error?.code ? body.error : body;
  const message = typed?.safeMessage ?? (typeof typed?.code === 'string' ? typed.message ?? (typeof body?.error === 'string' ? body.error : undefined) : undefined);
  return { message: typeof message === 'string' ? message.slice(0, 300) : undefined, issues: issues.slice(0, 20).map((issue: any) => ({ code: typeof issue?.code === 'string' ? issue.code.slice(0, 80) : undefined, path: Array.isArray(issue?.path) ? issue.path.filter((x: unknown) => typeof x === 'string' || typeof x === 'number').slice(0, 12) : undefined })) };
}

async function readJson<T>(path: string): Promise<T> { return JSON.parse(await readFile(path, 'utf8')) as T; }
export async function atomicWriteJson(path: string, value: unknown) {
  await mkdir(dirname(path), { recursive: true, mode: 0o700 });
  const temporary = join(dirname(path), `.${basename(path)}.${process.pid}.${randomUUID()}.tmp`);
  try {
    await writeFile(temporary, JSON.stringify(value, null, 2), { mode: 0o600, flag: 'wx' });
    await chmod(temporary, 0o600);
    await rename(temporary, path);
  } catch (error) {
    await rm(temporary, { force: true });
    throw error;
  }
}
async function saveCheckpoint(path: string, cp: Checkpoint) { await atomicWriteJson(path, cp); }
export async function authenticate(api: { post: (url: string, options: unknown) => Promise<{ ok: () => boolean; status: () => number }> }, test: { appUrl: string; email: string; password: string }) {
  const response = await api.post(`${test.appUrl}/api/auth/sign-in/email`, { data: { email: test.email, password: test.password } });
  if (!response.ok()) throw new Error(`Synthetic sign-in failed (${response.status()})`);
}

async function main() {
  const options = parseOptions(process.argv.slice(2));
  if (!options.live && !options.confirm && !options.presentOnly && !options.finalDecision) { console.log(JSON.stringify({ mode: 'dry-run', stages: M04_LIVE_STAGES, providerCalls: 0 })); return; }
  const runName = options.newRun ?? options.run!;
  const files = resolveRunFiles(integrationState, runName);
  await mkdir(files.dir, { recursive: true, mode: 0o700 });
  const checkpointPath = files.checkpointPath, reviewPath = files.reviewPath;
  const config = await readConnection();
  const test = await readJson<any>(join(integrationState, 'test.json'));
  const target = await readJson<any>(join(integrationState, 'browser-target.json'));
  let values: Record<string, string> = {};
  if (options.envFile) values = parse(await readFile(resolve(options.envFile), 'utf8'));
  if (options.live && !values.BETTER_DATABASE_URL) throw new Error('Private live env file must include BETTER_DATABASE_URL');
  if (values.BETTER_DATABASE_URL) {
    const configured = new URL(values.BETTER_DATABASE_URL); const guarded = new URL(config.databaseUrl);
    if (configured.hostname !== guarded.hostname || configured.port !== guarded.port || configured.pathname !== guarded.pathname) throw new Error('Live configuration is outside the isolated integration database');
  }
  if (options.live && (!values.TRIGGER_SECRET_KEY?.startsWith('tr_dev_') || !values.TRIGGER_API_URL || new URL(values.TRIGGER_API_URL).protocol !== 'https:' || !values.TRIGGER_DEV_BRANCH || /prod|production/i.test(values.TRIGGER_DEV_BRANCH))) throw new Error('Live env must contain a development Trigger key, HTTPS API URL, and non-production branch');
  if (options.live && /run_local_/i.test(values.TRIGGER_API_URL ?? '')) throw new Error('Local Trigger run IDs are not valid live-provider evidence');
  if (test.appUrl && !['127.0.0.1', 'localhost'].includes(new URL(test.appUrl).hostname)) throw new Error('Only the local synthetic Auth app is permitted');
  let cp: Checkpoint;
  try {
    cp = await readJson<Checkpoint>(checkpointPath);
    if (!options.run || options.newRun || !options.resume) throw new Error('Checkpoint already exists; use --run <name> --resume or choose a new --new-run name');
    if (cp.version !== 2 || cp.runName !== runName) throw new Error('Unsupported or mismatched checkpoint');
    const extending = options.retryStage && options.extendBudget === 1 && ((cp.callBudget === 7 && options.maxCalls === 8) || (cp.callBudget === 8 && options.maxCalls === 9));
    if (options.live && options.maxCalls !== cp.callBudget && !extending) throw new Error('Resume must use the current lifetime --max-calls budget');
  } catch (error) {
    if (!(error instanceof Error && 'code' in error && error.code === 'ENOENT')) throw error;
    if (options.run || !options.newRun) throw new Error('Run checkpoint is missing; choose --new-run <name> for a fresh run');
    cp = { version: 2, runName, commandIds: {}, confirmCommandIds: {}, finalCommandIds: {}, jobs: {}, completed: {}, confirmed: {}, callBudget: options.maxCalls, reservedCalls: 0, createdAt: new Date().toISOString() };
    await saveCheckpoint(checkpointPath, cp);
  }
  const api = await request.newContext({ baseURL: test.appUrl, extraHTTPHeaders: { origin: test.appUrl, accept: 'application/json' } });
  const observer = new Pool({ connectionString: config.databaseUrl });
  try {
    await authenticate(api, test);
    if (!cp.sessionId) {
      cp.createCommandId ??= randomUUID(); await saveCheckpoint(checkpointPath, cp);
      const created = await api.post(test.appUrl + target.base, { data: { action: 'create', commandId: cp.createCommandId } });
      if (!created.ok()) throw new Error(`Session create failed (${created.status()}); resume reuses its command id`);
      const body = await created.json(); cp.sessionId = body.session?.id ?? body.id;
      if (!cp.sessionId) throw new Error('Create response did not expose a session id; inspect the API contract before retrying');
      await saveCheckpoint(checkpointPath, cp);
    }
    if (options.confirm) {
      const packet = await readJson<any>(reviewPath);
      const stage = packet.stage as M04LiveStage;
      if (!M04_LIVE_STAGES.includes(stage) || !cp.completed[stage]) throw new Error('Review packet does not match a generated stage');
      const loaded = await (await api.get(`${test.appUrl}${target.base}?sessionId=${encodeURIComponent(cp.sessionId)}`)).json();
      const draft = loaded.session?.drafts?.[stage];
      const original = packet.generatedCandidate;
      if (safeHash(original) !== cp.completed[stage]!.draftHash || (draft && safeHash(draft) !== cp.completed[stage]!.draftHash)) throw new Error('Generated candidate changed; review packet cannot replace model content');
      const edited = applyReviewEdits(original, packet.humanEdits ?? {});
      let candidate = edited.candidate;
      if (stage === 'context') {
        const owner = loaded.session.sources?.entry?.receipt?.decisionOwner;
        if (owner) { candidate.decisionOwner = owner.name; candidate.authorityRef = owner.authorityBasis; }
      }
      const commandId = cp.confirmCommandIds[stage] ?? randomUUID(); cp.confirmCommandIds[stage] = commandId; await saveCheckpoint(checkpointPath, cp);
      const receipt = await observer.query('SELECT revision,action,command_input,payload_text FROM strategy_revision WHERE session_id=$1 AND command_id=$2', [cp.sessionId, commandId]);
      const prior = receipt.rows[0];
      if (prior) {
        if (!reconcileConfirmation({ stage, expectedCandidate: candidate, currentSession: loaded.session, record: prior })) throw new Error('Prior confirmation no longer matches current stage data; the session may have been reopened or edited');
        cp.confirmed[stage] = Number(prior.revision);
      } else {
        if (cp.confirmed[stage]) throw new Error('Checkpoint claims confirmation but its durable command receipt is missing');
        if (!draft) throw new Error('Generated draft is missing and no matching committed confirmation receipt exists');
        const result = await api.post(test.appUrl + target.base, { data: { action: 'confirm', sessionId: cp.sessionId, expectedRevision: loaded.session.revision, commandId, stage, payload: candidate } });
        if (!result.ok()) {
          let responseBody: any = {}; try { responseBody = await result.json(); } catch {}
          const safeIssue = { status: result.status(), ...validationSummary(responseBody) };
          packet.validationIssues = [...(packet.validationIssues ?? []), safeIssue];
          await atomicWriteJson(reviewPath, packet);
          throw new Error(`Confirmation rejected (${result.status()}); safe issue code, message, and paths are in the review packet`);
        }
        cp.confirmed[stage] = (await result.json()).revision;
      }
      await saveCheckpoint(checkpointPath, cp);
      cp.reviewAudit ??= {} as any;
      (cp.reviewAudit as any)[stage] = { originalGeneratedHash: packet.originalGeneratedHash, changedFields: edited.changedFields, provenance: 'human-edited-review-packet', sourcePinnedIdentityCorrection: stage === 'context' && (candidate.decisionOwner !== original.decisionOwner || candidate.authorityRef !== original.authorityRef) };
      await saveCheckpoint(checkpointPath, cp);
      console.log(JSON.stringify({ stage, status: 'confirmed-for-synthetic-review', revision: cp.confirmed[stage], changedFields: edited.changedFields }));
    }
    if (options.presentOnly) {
      const remaining = M04_LIVE_STAGES.filter(stage => !cp.confirmed[stage]);
      if (remaining.length) throw new Error(`Cannot present before all seven generated stages are confirmed: ${remaining.join(', ')}`);
      let loaded = await (await api.get(`${test.appUrl}${target.base}?sessionId=${encodeURIComponent(cp.sessionId!)}`)).json();
      if (!loaded.session.presented) {
        let command = cp.finalCommands?.present;
        if (!command) {
          const commandId = cp.finalCommandIds.present ?? randomUUID(); cp.finalCommandIds.present = commandId;
          command = { commandId, expectedRevision: loaded.session.revision };
          cp.finalCommands ??= {}; cp.finalCommands.present = command; await saveCheckpoint(checkpointPath, cp);
        }
        const result = await api.post(test.appUrl + target.base, { data: { action: 'present', sessionId: cp.sessionId, expectedRevision: command.expectedRevision, commandId: command.commandId } });
        if (!result.ok()) throw new Error(`Presentation rejected (${result.status()}); no human decision was created`);
        loaded = await (await api.get(`${test.appUrl}${target.base}?sessionId=${encodeURIComponent(cp.sessionId!)}`)).json();
      }
      const presentationHash = loaded.session.presented?.hash;
      if (typeof presentationHash !== 'string' || !presentationHash) throw new Error('Presented M04 hash is unavailable');
      cp.presentedHash = presentationHash; await saveCheckpoint(checkpointPath, cp);
      console.log(JSON.stringify({ runName, status: 'presented-awaiting-human-decision', presentationHash }));
      return;
    }
    if (options.finalDecision) {
      const remaining = M04_LIVE_STAGES.filter(stage => !cp.confirmed[stage]);
      if (remaining.length) throw new Error(`Cannot seal before all seven generated stages are confirmed: ${remaining.join(', ')}`);
      const decision = await readJson<Record<string, unknown>>(resolve(options.finalDecision));
      if (!decision || typeof decision !== 'object' || Array.isArray(decision)) throw new Error('Final decision file must contain one JSON object supplied by the human decision maker');
      const decisionHash = safeHash(decision);
      if (cp.finalDecisionHash && cp.finalDecisionHash !== decisionHash) throw new Error('Final decision differs from the decision already checkpointed for this run');
      const current = await (await api.get(`${test.appUrl}${target.base}?sessionId=${encodeURIComponent(cp.sessionId!)}`)).json();
      const presentationHash = current.session.presented?.hash;
      assertDecisionMatchesPresentation(decision, presentationHash);
      if (cp.presentedHash && cp.presentedHash !== presentationHash) throw new Error('Presented hash changed after review; do not apply the saved human decision');
      cp.finalDecisionHash = decisionHash; await saveCheckpoint(checkpointPath, cp);
      for (const action of ['decide', 'seal'] as const) {
        const loaded = await (await api.get(`${test.appUrl}${target.base}?sessionId=${encodeURIComponent(cp.sessionId!)}`)).json();
        if (action === 'present' && loaded.session.presented) continue;
        if (action === 'decide' && (loaded.session.data?.decision || loaded.session.confirmations?.['human-decision'])) continue;
        if (action === 'seal' && loaded.session.seal) continue;
        let command = cp.finalCommands?.[action];
        if (!command) {
          const commandId = cp.finalCommandIds[action] ?? randomUUID(); cp.finalCommandIds[action] = commandId;
          command = { commandId, expectedRevision: loaded.session.revision, ...(action === 'decide' ? { payloadHash: decisionHash } : {}) };
          cp.finalCommands ??= {}; cp.finalCommands[action] = command; await saveCheckpoint(checkpointPath, cp);
        }
        const result = await api.post(test.appUrl + target.base, { data: { action, sessionId: cp.sessionId, expectedRevision: command.expectedRevision, commandId: command.commandId, ...(action === 'decide' ? { payload: decision } : {}) } });
        if (!result.ok()) throw new Error(`${action} rejected (${result.status()}); final decision remains human supplied`);
      }
      const finalRead = await api.get(`${test.appUrl}${target.base}?sessionId=${encodeURIComponent(cp.sessionId!)}`);
      const published = await finalRead.json();
      const doc = published.documents?.find((item: any) => item.kind === 'viability-check');
      if (!finalRead.ok() || !published.session?.seal || !doc) throw new Error('Sealed document was not available for verification');
      const pool = new Pool({ connectionString: config.databaseUrl });
      try {
        const saved = (await pool.query('SELECT content,hash FROM strategy_document WHERE id=$1', [doc.id])).rows[0];
        const direct = await fetch(`${config.directusUrl}/items/strategy_document?filter[id][_eq]=${doc.id}`, { headers: { authorization: `Bearer ${config.readerToken}` } });
        const directBody = await direct.json() as any;
        const exported = await api.get(`${test.appUrl}${target.base}/handoff?sessionId=${encodeURIComponent(cp.sessionId!)}&versionId=${doc.versionId}&documentId=${doc.id}`);
        const exportText = await exported.text();
        const evidence = { runName, sessionId: cp.sessionId, sessionRevision: published.session.revision, sealed: !!published.session.seal, documentId: doc.id, versionId: doc.versionId, databaseMatches: doc.content === saved?.content, hashMatches: createHash('sha256').update(saved?.content ?? '').digest('hex') === saved?.hash, rendered: typeof doc.contentHtml === 'string' && doc.contentHtml.includes('<h'), directusStatus: direct.status, directusMatches: directBody.data?.[0]?.content === saved?.content, exportStatus: exported.status(), exportMatches: exported.ok() && exportText === saved?.content, generatedStages: Object.keys(cp.completed), providerRuns: Object.fromEntries(Object.entries(cp.jobs).map(([stage, job]) => [stage, job?.providerRunId])), reviewAudit: cp.reviewAudit ?? {}, synthetic: true, humanDecisionProvided: true, at: new Date().toISOString() };
        const browser = await chromium.launch({ headless: true });
        try {
          const context = await browser.newContext({ storageState: await api.storageState() }); const page = await context.newPage();
          await page.goto(`${test.appUrl}${target.base}?sessionId=${encodeURIComponent(cp.sessionId!)}`, { waitUntil: 'domcontentloaded', timeout: 180_000 });
          const article = page.getByRole('article', { name: 'Saved viability document' }); await article.waitFor({ timeout: 30_000 });
          (evidence as any).browserDocumentVisible = await article.count() === 1;
          await page.screenshot({ path: join(files.dir, 'sealed.png'), fullPage: true }); await context.close();
        } finally { await browser.close(); }
        (evidence as any).passed = ['sealed','databaseMatches','hashMatches','rendered','directusMatches','exportMatches','browserDocumentVisible'].every(key => (evidence as any)[key] === true);
        await writeFile(files.evidencePath, JSON.stringify(evidence, null, 2), { mode: 0o600 });
        console.log(JSON.stringify({ passed: (evidence as any).passed, evidence: files.evidencePath }));
      } finally { await pool.end(); }
      return;
    }
    if (options.retryStage) {
      const stage = options.retryStage;
      const response = await api.get(`${test.appUrl}${target.base}?sessionId=${encodeURIComponent(cp.sessionId!)}`);
      if (!response.ok()) throw new Error(`Session read failed (${response.status()})`);
      const loaded = await response.json();
      const oldJobId = cp.jobs[stage]?.jobId;
      const previousJobRow = oldJobId
        ? (await observer.query('SELECT id,status,last_error,input_revision FROM strategy_job WHERE id=$1 AND session_id=$2 AND engagement_id=$3', [oldJobId, cp.sessionId, test.engagementId])).rows[0]
        : undefined;
      const activeRows = await observer.query("SELECT id,status FROM strategy_job WHERE session_id=$1 AND engagement_id=$2 AND status IN ('pending','running')", [cp.sessionId, test.engagementId]);
      const prepared = prepareStageRetry({
        checkpoint: cp,
        stage,
        reviewReason: options.reviewReason!,
        session: loaded.session,
        previousJob: previousJobRow ? { id: String(previousJobRow.id), status: String(previousJobRow.status), inputRevision: Number(previousJobRow.input_revision), lastError: previousJobRow.last_error == null ? null : String(previousJobRow.last_error) } : null,
        activeJobs: activeRows.rows.map((row: any) => ({ id: String(row.id), status: String(row.status) })),
        extendBudget: options.extendBudget,
        maxCalls: options.maxCalls,
      });
      cp = prepared.checkpoint;
      if (prepared.prepared) await saveCheckpoint(checkpointPath, cp);
    }
    let calls = 0;
    const stagesToRun = options.retryStage ? [options.retryStage] : M04_LIVE_STAGES;
    for (const stage of stagesToRun) {
      if (cp.confirmed[stage]) continue;
      if (!options.live) break;
      let loadedResponse = await api.get(`${test.appUrl}${target.base}?sessionId=${encodeURIComponent(cp.sessionId)}`);
      if (!loadedResponse.ok()) throw new Error(`Session read failed (${loadedResponse.status()})`);
      let loaded = await loadedResponse.json();
      const commandId = cp.commandIds[stage] ?? randomUUID();
      cp.commandIds[stage] = commandId;
      let reservation = cp.jobs[stage];
      if (!reservation) {
        try { reservation = reserveProviderCall(cp, stage, loaded.session.revision).reservation; }
        catch { break; }
        // Lifetime budget is consumed and checkpointed before the billable command.
        await saveCheckpoint(checkpointPath, cp);
      }
      let jobId = reservation.jobId;
      if (!jobId) {
        const draft = await api.post(test.appUrl + target.base, { data: { action: 'draft', sessionId: cp.sessionId, expectedRevision: reservation.inputRevision, stage, commandId } });
        if (!draft.ok()) throw new Error(`Draft request failed (${draft.status()}); resume reuses its persisted command id and budget reservation`);
        const response = await draft.json(); jobId = response.jobId;
        if (!jobId) throw new Error('Draft command returned no job id');
        reservation.jobId = jobId; await saveCheckpoint(checkpointPath, cp); calls++;
      }
      const end = Date.now() + 1_100_000;
      while (Date.now() < end) {
        await new Promise(r => setTimeout(r, 2000));
        const evidence = await observer.query('SELECT status,provider_run_id,input_revision FROM strategy_job WHERE id=$1 AND session_id=$2 AND engagement_id=$3', [jobId, cp.sessionId, test.engagementId]);
        const job = evidence.rows[0];
        if (!job) throw new Error('Persisted M04 job is unavailable in the guarded integration database');
        if (Number(job.input_revision) !== reservation.inputRevision) throw new Error('Persisted job input revision differs from the checkpoint');
        if (job.provider_run_id && String(job.provider_run_id).startsWith('run_local_')) throw new Error('Local fake Trigger run cannot count as live provider evidence');
        if (job.provider_run_id && reservation.providerRunId!==String(job.provider_run_id)) { reservation.providerRunId = String(job.provider_run_id); await saveCheckpoint(checkpointPath, cp); }
        if (job.status === 'failed' || job.status === 'cancelled') throw new Error(`Provider job ${job.status} for ${stage}; inspect guarded local job diagnostics`);
        if (job.status !== 'succeeded') continue;
        const apiState = await readJobAndSession(api, test.appUrl + target.base, cp.sessionId!, jobId);
        if (apiState.job.jobId !== jobId || apiState.job.sessionId !== cp.sessionId) throw new Error('Job API returned a mismatched session or job');
        loaded = apiState.session;
        const candidate = loaded.session?.drafts?.[stage];
        const generated = await observer.query("SELECT revision,payload->'drafts'->$3 AS candidate FROM strategy_revision WHERE session_id=$1 AND revision>$2 AND action='generate' ORDER BY revision DESC LIMIT 1", [cp.sessionId, reservation.inputRevision, stage]);
        const generatedRow = generated.rows[0];
        if (job.status === 'failed' || job.status === 'cancelled') throw new Error(`Provider job ${job.status} for ${stage}; inspect guarded local job diagnostics`);
        if (candidate && generatedRow && hasProviderGeneration({ status: job.status, providerRunId: reservation.providerRunId, inputRevision: reservation.inputRevision, generatedRevision: Number(generatedRow.revision), generatedCandidate: generatedRow.candidate, apiCandidate: candidate })) {
          cp.completed[stage] = { revision: loaded.session.revision, generatedRevision: Number(generatedRow.revision), draftHash: safeHash(candidate) };
          await saveCheckpoint(checkpointPath, cp);
          const packet = makeReviewPacket(stage, candidate, loaded.session);
          await writeFile(reviewPath, JSON.stringify(packet, null, 2), { mode: 0o600 });
          break;
        }
      }
      if (!cp.completed[stage]) throw new Error(`Timed out waiting for ${stage}; resume will inspect persisted session before submitting again`);
      console.log(JSON.stringify({ stage, status: 'draft-ready', review: reviewPath, revision: cp.completed[stage]!.revision }));
      break; // Require explicit human review and confirmation before drafting the next stage.
    }
    console.log(JSON.stringify({ sessionId: cp.sessionId, completedStages: Object.keys(cp.completed), confirmedStages: Object.keys(cp.confirmed), liveCallsThisRun: calls, remainingStages: M04_LIVE_STAGES.filter(s => !cp.completed[s]) }));
  } finally { await api.dispose(); await observer.end(); }
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) main().catch(error => { const message = error instanceof Error ? error.message : 'M04 live harness failed'; console.error(message.replace(/(?:Bearer\s+|sk-[A-Za-z0-9_-]+|[A-Za-z0-9_-]{32,})/g, '[redacted]')); process.exitCode = 1; });
