#!/usr/bin/env bun
/** Scheduler entry point. Supply these private environment variables on the job host. */
const origin = process.env.MONTSEL_RECOVERY_ORIGIN;
const token = process.env.MONTSEL_RECOVERY_TOKEN;
if (!origin || !token || token.length < 32) throw new Error('Set the private recovery origin and token on the scheduler host.');
const url = new URL('/api/internal/montsel/provisioning-retry', origin);
if (url.protocol !== 'https:' && !['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)) throw new Error('Recovery requires HTTPS outside localhost.');
const response = await fetch(url, { method: 'POST', headers: { authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(60_000) });
if (!response.ok) throw new Error(`Provisioning recovery failed (${response.status}).`);
const result = await response.json() as { processed: number; active: number; failed: number };
console.log(JSON.stringify({ processed: result.processed, active: result.active, failed: result.failed }));
