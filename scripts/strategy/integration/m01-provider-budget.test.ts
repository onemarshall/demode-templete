import { afterEach, describe, expect, test } from 'bun:test';
import { mkdtemp, readFile, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createM01ProviderBudget, FileM01BudgetLedger, type M01BudgetConfig } from './m01-provider-budget.ts';

const base = (overrides: Partial<M01BudgetConfig> = {}): M01BudgetConfig => ({ runName: 'budget-test', maxCalls: 3, model: 'openai/gpt-6.1-sol', maxTokens: 1800, timeoutMs: 5000, apiKey: 'synthetic-test-key', ...overrides });
const request = (overrides: Record<string, unknown> = {}) => new Request('http://127.0.0.1:8137/chat/completions', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ model: 'untrusted/request-model', max_tokens: 999999, reasoning: { effort: 'high' }, max_completion_tokens: 900000, max_output_tokens: 900000, models: ['untrusted/fallback'], messages: [{ role: 'user', content: 'fictional' }], ...overrides }) });
let dirs: string[] = [];
async function tempDir() { const path = await mkdtemp(join(tmpdir(), 'm01-budget-test-')); dirs.push(path); return path; }
afterEach(async () => { await Promise.all(dirs.map(path => rm(path, { recursive: true, force: true }))); dirs = []; });

describe('local M01 provider budget', () => {
  test('forces approved model and token ceiling and forwards only to the fixed provider endpoint', async () => {
    const ledger = new FileM01BudgetLedger(join(await tempDir(), 'ledger.json'));
    let capturedUrl = '', capturedAuth = '', capturedBody: any;
    const handle = createM01ProviderBudget(base(), { ledger, fetchImpl: async (url, init) => {
      capturedUrl = String(url); capturedAuth = new Headers(init?.headers).get('authorization') ?? ''; capturedBody = JSON.parse(String(init?.body));
      return Response.json({ choices: [] }, { status: 200 });
    } });
    const response = await handle(request());
    expect(response.status).toBe(200);
    expect(capturedUrl).toBe('https://openrouter.ai/api/v1/chat/completions');
    expect(capturedAuth).toBe('Bearer synthetic-test-key');
    expect(capturedBody).toMatchObject({ model: 'openai/gpt-6.1-sol', max_tokens: 1800, reasoning: { effort: 'none' } });
    expect(capturedBody).not.toHaveProperty('max_completion_tokens');
    expect(capturedBody).not.toHaveProperty('max_output_tokens');
    expect(capturedBody).not.toHaveProperty('models');
    expect(capturedBody.messages[0].content).toBe('fictional');
  });

  test('durably reserves before an ambiguous failure and enforces the cap across restart and concurrent requests', async () => {
    const path = join(await tempDir(), 'ledger.json');
    const config = base({ maxCalls: 2 });
    let calls = 0;
    const first = createM01ProviderBudget(config, { ledger: new FileM01BudgetLedger(path), fetchImpl: async () => { calls++; throw new Error('ambiguous network failure'); } });
    const results = await Promise.all([first(request()), first(request()), first(request())]);
    expect(results.map(result => result.status).sort()).toEqual([429, 502, 502]);
    expect(calls).toBe(2);
    const saved = JSON.parse(await readFile(path, 'utf8'));
    expect(saved.reservations).toHaveLength(2);
    expect(saved).not.toHaveProperty('apiKey');
    expect(saved).not.toHaveProperty('request');
    const restarted = createM01ProviderBudget(config, { ledger: new FileM01BudgetLedger(path), fetchImpl: async () => { calls++; return Response.json({}); } });
    expect((await restarted(request())).status).toBe(429);
    expect(calls).toBe(2);
    expect((await createM01ProviderBudget(base({ maxCalls: 3 }), { ledger: new FileM01BudgetLedger(path) })(request())).status).toBe(503);
  });

  test('does not log provider secrets or request content', async () => {
    const messages: string[] = [];
    const ledger = new FileM01BudgetLedger(join(await tempDir(), 'ledger.json'));
    const handle = createM01ProviderBudget(base(), { ledger, log: message => messages.push(message), fetchImpl: async () => Response.json({ choices: [] }) });
    await handle(request());
    expect(messages.join('\n')).not.toContain('synthetic-test-key');
    expect(messages.join('\n')).not.toContain('fictional');
    expect(messages).toHaveLength(1);
  });

  test('bounds methods, paths, input and rejects invalid token or timeout limits', async () => {
    const handle = createM01ProviderBudget(base(), { ledger: new FileM01BudgetLedger(join(await tempDir(), 'ledger.json')), fetchImpl: async () => { throw new Error('must not call'); } });
    expect((await handle(new Request('http://127.0.0.1:8137/chat/completions', { method: 'GET' }))).status).toBe(405);
    expect((await handle(new Request('http://127.0.0.1:8137/other', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' }))).status).toBe(404);
    expect((await handle(new Request('http://127.0.0.1:8137/chat/completions', { method: 'POST', headers: { 'content-type': 'application/json' }, body: 'x'.repeat(2 * 1024 * 1024 + 1) }))).status).toBe(413);
    expect(() => createM01ProviderBudget(base({ maxTokens: 18_001 }), { ledger: new FileM01BudgetLedger('/tmp/no-write') })).toThrow('max tokens');
    expect(() => createM01ProviderBudget(base({ timeoutMs: 900_001 }), { ledger: new FileM01BudgetLedger('/tmp/no-write') })).toThrow('timeout');
  });

  test('ledger files stay owner-only and reject altered resume settings', async () => {
    const path = join(await tempDir(), 'ledger.json');
    const config = base();
    await new FileM01BudgetLedger(path).reserve(config);
    expect((await stat(path)).mode & 0o077).toBe(0);
    await expect(new FileM01BudgetLedger(path).snapshot(base({ model: 'openai/other' }))).rejects.toThrow('resume limits');
  });

  test('timeout across a stalled response body consumes its reservation', async () => {
    const path = join(await tempDir(), 'ledger.json');
    const handle = createM01ProviderBudget(base({ maxCalls: 1, timeoutMs: 1000 }), {
      ledger: new FileM01BudgetLedger(path),
      fetchImpl: async () => new Response(new ReadableStream({ start() {} }), { status: 200 }),
    });
    const response = await handle(request());
    expect(response.status).toBe(504);
    expect(JSON.parse(await readFile(path, 'utf8')).reservations).toHaveLength(1);
  });

  test('preserves a smaller valid token request and rejects malformed limits before admission', async () => {
    const path = join(await tempDir(), 'ledger.json');
    const config = base({ maxCalls: 2, maxTokens: 12_000 });
    const sent: any[] = [];
    const handle = createM01ProviderBudget(config, { ledger: new FileM01BudgetLedger(path), fetchImpl: async (_url, init) => { sent.push(JSON.parse(String(init?.body))); return Response.json({}); } });
    expect((await handle(request({ max_tokens: 4000 }))).status).toBe(200);
    expect(sent[0].max_tokens).toBe(4000);
    expect(sent[0].reasoning).toEqual({ effort: 'none' });
    expect((await handle(request({ max_tokens: -1 }))).status).toBe(400);
    expect((await handle(request({ max_tokens: 0 }))).status).toBe(400);
    expect((await handle(request({ max_tokens: 1.5 }))).status).toBe(400);
    expect(JSON.parse(await readFile(path, 'utf8')).reservations).toHaveLength(1);
  });
});
