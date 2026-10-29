/**
 * Local-only M01 provider budget proxy. It is deliberately not imported by app
 * or worker code. The durable reservation is written before each upstream POST,
 * so a crash or timeout still consumes the attempt.
 */
import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import { chmod, mkdir, open, readFile, rename, rm, stat, writeFile } from 'node:fs/promises';
import { resolve, join, dirname, basename } from 'node:path';
import { randomUUID } from 'node:crypto';
import { parse as parseEnv } from 'dotenv';
import { readConnection, integrationState } from './local-stack.ts';

const UPSTREAM = 'https://openrouter.ai/api/v1/chat/completions';
const HOST = '127.0.0.1';
const PORT = 8137;
const MAX_REQUEST_BYTES = 2 * 1024 * 1024;
const MAX_RESPONSE_BYTES = 8 * 1024 * 1024;
const MAX_TOKENS = 18_000;
const MAX_TIMEOUT_MS = 900_000;
type FetchLike = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
const safeReply = (status: number, message: string) => new Response(JSON.stringify({ error: message }), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } });

export interface M01BudgetConfig {
  runName: string;
  maxCalls: number;
  model: string;
  maxTokens: number;
  timeoutMs: number;
  apiKey: string;
}
export interface M01BudgetLedgerState {
  schemaVersion: 1;
  runName: string;
  maxCalls: number;
  model: string;
  maxTokens: number;
  timeoutMs: number;
  reservations: Array<{ id: string; reservedAt: string }>;
}

function assertConfig(config: M01BudgetConfig) {
  if (!/^[a-z0-9][a-z0-9-]{0,47}$/.test(config.runName)) throw new Error('M01 budget requires a named run');
  if (!Number.isInteger(config.maxCalls) || config.maxCalls < 1 || config.maxCalls > 10) throw new Error('M01 budget must be from 1 through 10 attempts');
  if (!/^[A-Za-z0-9][A-Za-z0-9._/-]{0,127}$/.test(config.model) || config.model.includes('..')) throw new Error('M01 budget model is invalid');
  if (!Number.isInteger(config.maxTokens) || config.maxTokens < 1 || config.maxTokens > MAX_TOKENS) throw new Error('M01 budget max tokens must be from 1 through 18000');
  if (!Number.isInteger(config.timeoutMs) || config.timeoutMs < 1_000 || config.timeoutMs > MAX_TIMEOUT_MS) throw new Error('M01 budget timeout must be from 1000 through 900000 ms');
  if (!config.apiKey || /[\r\n]/.test(config.apiKey)) throw new Error('M01 budget provider key is missing or invalid');
}

/** File-backed ledger; every admitted attempt is atomically saved before fetch. */
export class FileM01BudgetLedger {
  private queue: Promise<void> = Promise.resolve();
  private state?: M01BudgetLedgerState;
  constructor(readonly path: string) {}

  async reserve(config: M01BudgetConfig): Promise<{ admitted: boolean; count: number }> {
    let unlock!: () => void;
    const previous = this.queue;
    this.queue = new Promise<void>(resolve => { unlock = resolve; });
    await previous;
    try {
      const state = this.state ?? await this.read(config);
      this.assertSameConfig(state, config);
      if (state.reservations.length >= config.maxCalls) return { admitted: false, count: state.reservations.length };
      state.reservations.push({ id: randomUUID(), reservedAt: new Date().toISOString() });
      await this.write(state);
      this.state = state;
      return { admitted: true, count: state.reservations.length };
    } finally { unlock(); }
  }

  async snapshot(config: M01BudgetConfig): Promise<M01BudgetLedgerState> {
    const state = this.state ?? await this.read(config);
    this.assertSameConfig(state, config);
    return structuredClone(state);
  }

  private async read(config: M01BudgetConfig): Promise<M01BudgetLedgerState> {
    try {
      const state = JSON.parse(await readFile(this.path, 'utf8')) as M01BudgetLedgerState;
      if (state.schemaVersion !== 1 || !Array.isArray(state.reservations) || state.reservations.some(item => typeof item?.id !== 'string' || typeof item?.reservedAt !== 'string')) throw new Error('M01 budget ledger is invalid');
      this.assertSameConfig(state, config);
      return state;
    } catch (error) {
      if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') {
        return { schemaVersion: 1, runName: config.runName, maxCalls: config.maxCalls, model: config.model, maxTokens: config.maxTokens, timeoutMs: config.timeoutMs, reservations: [] };
      }
      throw error;
    }
  }

  private assertSameConfig(state: M01BudgetLedgerState, config: M01BudgetConfig) {
    if (state.runName !== config.runName || state.maxCalls !== config.maxCalls || state.model !== config.model || state.maxTokens !== config.maxTokens || state.timeoutMs !== config.timeoutMs) throw new Error('M01 budget resume limits do not match the durable ledger');
    if (state.reservations.length > config.maxCalls) throw new Error('M01 budget ledger exceeds its configured limit');
  }

  private async write(state: M01BudgetLedgerState) {
    await mkdir(dirname(this.path), { recursive: true, mode: 0o700 });
    await chmod(dirname(this.path), 0o700);
    const temp = join(dirname(this.path), `.${basename(this.path)}.${process.pid}.${randomUUID()}.tmp`);
    try {
      await writeFile(temp, JSON.stringify(state), { flag: 'wx', mode: 0o600 });
      await chmod(temp, 0o600);
      await rename(temp, this.path);
      await chmod(this.path, 0o600);
    } catch (error) { await rm(temp, { force: true }); throw error; }
  }
}

export function createM01ProviderBudget(config: M01BudgetConfig, options: { ledger: Pick<FileM01BudgetLedger, 'reserve'>; fetchImpl?: FetchLike; log?: (message: string) => void }) {
  assertConfig(config);
  const fetchImpl = options.fetchImpl ?? fetch;
  return async (request: Request): Promise<Response> => {
    if (request.method !== 'POST') return safeReply(405, 'Method not allowed');
    const url = new URL(request.url);
    if (url.pathname !== '/chat/completions' || url.search) return safeReply(404, 'Not found');
    const contentType = request.headers.get('content-type') ?? '';
    if (!contentType.toLowerCase().startsWith('application/json')) return safeReply(415, 'JSON required');
    let bodyText: string;
    try {
      bodyText = await request.text();
      if (Buffer.byteLength(bodyText) > MAX_REQUEST_BYTES) return safeReply(413, 'Request too large');
    } catch { return safeReply(400, 'Invalid request'); }
    let body: Record<string, unknown>;
    try { body = JSON.parse(bodyText); if (!body || Array.isArray(body) || typeof body !== 'object') throw new Error(); }
    catch { return safeReply(400, 'Invalid request'); }
    const requestedTokens = body.max_tokens;
    if (requestedTokens !== undefined && (!Number.isSafeInteger(requestedTokens) || (requestedTokens as number) < 1)) return safeReply(400, 'Invalid token limit');
    const boundedTokens = requestedTokens === undefined ? config.maxTokens : Math.min(requestedTokens as number, config.maxTokens);

    let reservation: { admitted: boolean; count: number };
    try { reservation = await options.ledger.reserve(config); }
    catch { return safeReply(503, 'Provider budget unavailable'); }
    if (!reservation.admitted) return safeReply(429, 'Provider attempt budget exhausted');

    // Force model and output ceiling from the operator-approved proxy config.
    const safeBody = { ...body };
    delete safeBody.models; delete safeBody.max_completion_tokens; delete safeBody.max_output_tokens;
    const outgoing = JSON.stringify({ ...safeBody, model: config.model, max_tokens: boundedTokens, reasoning: { effort: 'none' } });
    const controller = new AbortController();
    let timeout!: ReturnType<typeof setTimeout>;
    const deadline = new Promise<never>((_, reject) => {
      timeout = setTimeout(() => { controller.abort(); reject(new Error('provider-timeout')); }, config.timeoutMs);
    });
    try {
      const work = (async () => {
        const upstream = await fetchImpl(UPSTREAM, {
          method: 'POST', redirect: 'error', signal: controller.signal,
          headers: { authorization: `Bearer ${config.apiKey}`, 'content-type': 'application/json', accept: 'application/json' },
          body: outgoing,
        });
        if (!upstream.body) return safeReply(502, 'Provider returned no response');
        const reader = upstream.body.getReader();
        const chunks: Uint8Array[] = [];
        let length = 0;
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          length += value.byteLength;
          if (length > MAX_RESPONSE_BYTES) { await reader.cancel(); return safeReply(502, 'Provider response exceeded limit'); }
          chunks.push(value);
        }
        const bytes = Buffer.concat(chunks.map(chunk => Buffer.from(chunk)));
        const headers = new Headers();
        const responseType = upstream.headers.get('content-type');
        if (responseType) headers.set('content-type', responseType);
        headers.set('cache-control', 'no-store');
        options.log?.(`M01 provider attempt ${reservation.count} completed with HTTP ${upstream.status}`);
        return new Response(bytes, { status: upstream.status, headers });
      })();
      return await Promise.race([work, deadline]);
    } catch (error) {
      const timedOut = controller.signal.aborted || (error instanceof Error && error.message === 'provider-timeout');
      options.log?.(`M01 provider attempt ${reservation.count} ended without a confirmed response`);
      return safeReply(timedOut ? 504 : 502, timedOut ? 'Provider timed out' : 'Provider request failed');
    } finally { clearTimeout(timeout); }
  };
}

async function readApprovedConfig(argv: string[]) {
  const args = new Map<string, string>();
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--live') { args.set('--live', 'true'); continue; }
    if (argv[i]?.startsWith('--')) args.set(argv[i]!, argv[++i] ?? '');
  }
  if (args.get('--live') !== 'true') throw new Error('Start requires explicit --live');
  // Read the guarded connection before touching the supplied private env file.
  await readConnection();
  const runName = args.get('--run') ?? '';
  const envFile = args.get('--env-file');
  const maxCalls = Number(args.get('--max-calls'));
  const model = args.get('--model') ?? '';
  const maxTokens = Number(args.get('--max-tokens'));
  const timeoutMs = Number(args.get('--timeout-ms'));
  if (!envFile || !runName || !Number.isInteger(maxCalls) || !Number.isInteger(maxTokens) || !Number.isInteger(timeoutMs)) throw new Error('Supply --env-file, --run, --max-calls, --model, --max-tokens, and --timeout-ms explicitly');
  const envPath = resolve(envFile);
  const info = await stat(envPath);
  if ((info.mode & 0o077) !== 0) throw new Error('Provider env file must be owner-only');
  const env = parseEnv(await readFile(envPath, 'utf8'));
  const config = { runName, maxCalls, model, maxTokens, timeoutMs, apiKey: env.OPENROUTER_API_KEY ?? '' };
  assertConfig(config);
  return config;
}

async function readNodeBody(request: IncomingMessage) {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of request) {
    const value = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    size += value.length;
    if (size > MAX_REQUEST_BYTES) throw new Error('body-too-large');
    chunks.push(value);
  }
  return Buffer.concat(chunks);
}
function writeResponse(response: ServerResponse, result: Response) {
  response.statusCode = result.status;
  result.headers.forEach((value, name) => response.setHeader(name, value));
  void result.arrayBuffer().then(bytes => response.end(Buffer.from(bytes))).catch(() => { response.statusCode = 502; response.end(); });
}

export async function startM01ProviderBudget(config: M01BudgetConfig, stateDir = integrationState, fetchImpl?: FetchLike): Promise<{ server: Server; close(): Promise<void>; ledgerPath: string }> {
  assertConfig(config);
  const dir = resolve(stateDir, 'm01-provider-budget', config.runName);
  await mkdir(dir, { recursive: true, mode: 0o700 }); await chmod(dir, 0o700);
  const ledgerPath = join(dir, 'ledger.json');
  // Exclusive process lock prevents two proxies from independently admitting requests.
  // A crashed process leaves a lockfile; reclaim it only when its owner is gone.
  const lockPath = `${ledgerPath}.lock`;
  let lock;
  try { lock = await open(lockPath, 'wx', 0o600); }
  catch (error) {
    if (!(error && typeof error === 'object' && 'code' in error && error.code === 'EEXIST')) throw error;
    let stale = false;
    try {
      const pid = Number((await readFile(lockPath, 'utf8')).trim());
      if (Number.isInteger(pid) && pid > 0) { try { process.kill(pid, 0); } catch (probe) { stale = !!probe && typeof probe === 'object' && 'code' in probe && probe.code === 'ESRCH'; } }
    } catch { stale = true; }
    if (!stale) throw new Error('M01 budget proxy already owns this run ledger');
    await rm(lockPath, { force: true });
    lock = await open(lockPath, 'wx', 0o600);
  }
  await lock.writeFile(String(process.pid));
  const ledger = new FileM01BudgetLedger(ledgerPath);
  const handle = createM01ProviderBudget(config, { ledger, fetchImpl, log: message => process.stdout.write(`${message}\n`) });
  const server = createServer(async (incoming, outgoing) => {
    try {
      const body = await readNodeBody(incoming);
      const request = new Request(`http://${HOST}:${PORT}${incoming.url ?? '/'}`, { method: incoming.method, headers: incoming.headers as HeadersInit, body: ['GET', 'HEAD'].includes(incoming.method ?? '') ? undefined : body });
      writeResponse(outgoing, await handle(request));
    } catch (error) {
      writeResponse(outgoing, safeReply(error instanceof Error && error.message === 'body-too-large' ? 413 : 400, error instanceof Error && error.message === 'body-too-large' ? 'Request too large' : 'Invalid request'));
    }
  });
  try { await new Promise<void>((resolveListen, reject) => { server.once('error', reject); server.listen(PORT, HOST, resolveListen); }); }
  catch (error) { await lock.close(); await rm(lockPath, { force: true }); throw error; }
  return { server, ledgerPath, close: async () => { await new Promise<void>((resolveClose, reject) => server.close(error => error ? reject(error) : resolveClose())); await lock.close(); await rm(lockPath, { force: true }); } };
}

if (import.meta.main) {
  const config = await readApprovedConfig(process.argv.slice(2));
  const proxy = await startM01ProviderBudget(config);
  process.stdout.write(`M01 local budget proxy listening on http://${HOST}:${PORT}/chat/completions; run=${config.runName}; maximum attempts=${config.maxCalls}\n`);
  const close = () => { void proxy.close().then(() => process.exit(0)); };
  process.once('SIGINT', close); process.once('SIGTERM', close);
}
