/** Local-only browser proof for the M01 voice transport and transcript outbox.
 * Requires the already-running isolated Auth/worker stack and m01-voice-fake.ts.
 * This script never starts services, uses a real microphone, or contacts a paid API.
 */
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { randomUUID } from "node:crypto";
import { Pool } from "pg";
import { request, chromium } from "@playwright/test";
import { integrationState, readConnection } from "./local-stack";

type M01Target = { url: string; base: string; sessionId: string; engagementId: string; grantId: string };
const config = await readConnection();
const read = async <T>(name: string) => JSON.parse(await readFile(resolve(integrationState, name), "utf8")) as T;
const [test, target, storageState, env] = await Promise.all([
  read<any>("test.json"), read<M01Target>("m01-browser-target.json"), read<any>("m01-browser-state.json"),
  read<Record<string, string>>("runtime-env.json"),
]);
const app = new URL(test.appUrl);
const voiceUrl = new URL(env.STRATEGY_M01_VOICE_URL ?? "");
const providerUrl = new URL(env.STRATEGY_PROVIDER_URL ?? "");
const deliveryUrl = new URL(env.TRIGGER_API_URL ?? "");
if (!['http://127.0.0.1:5188', 'http://localhost:5188'].includes(app.origin) ||
    !['http://127.0.0.1:5188', 'http://localhost:5188'].includes(new URL(target.url).origin) ||
    voiceUrl.origin !== "http://127.0.0.1:8136" || voiceUrl.pathname !== "/v1/live/sessions" ||
    providerUrl.origin !== "http://127.0.0.1:8134" || deliveryUrl.origin !== "http://127.0.0.1:8135" ||
    !/^(synthetic|local|test)[-_]/i.test(env.OPENAI_API_KEY ?? "") ||
    !["true", "1"].includes(String(env.STRATEGY_M01_VOICE_ENABLED).toLowerCase())) {
  throw new Error("M01 voice proof requires the guarded local Auth, fake AI, delivery, and voice endpoints");
}
if (!target.base.startsWith("/o/") || !target.grantId || !target.engagementId)
  throw new Error("M01 voice proof requires the existing authenticated browser target");

const pool = new Pool({ connectionString: config.databaseUrl });
const api = await request.newContext({ baseURL: test.appUrl, storageState, extraHTTPHeaders: { origin: test.appUrl, accept: "application/json" } });
const browser = await chromium.launch({ headless: true });
let assertions = 0;
const check = (value: unknown, message: string) => { if (!value) throw new Error(message); assertions++; };
const waitUntil = async (predicate: () => Promise<boolean>, label: string, timeoutMs = 30_000) => {
  const until = Date.now() + timeoutMs;
  while (Date.now() < until) { if (await predicate()) return; await new Promise((resolve) => setTimeout(resolve, 100)); }
  throw new Error(`Timed out waiting for ${label}`);
};
const readSession = async (sessionId: string) => {
  const response = await api.get(`${target.base}?sessionId=${encodeURIComponent(sessionId)}`);
  if (!response.ok()) throw new Error(`M01 session read failed (${response.status()})`);
  return response.json();
};
const post = async (body: unknown) => {
  const response = await api.post(target.base, { data: body });
  const value = await response.json().catch(() => null);
  if (!response.ok()) throw new Error(`M01 ${String((body as any)?.action)} command failed (${response.status()})`);
  return value;
};
const runJob = async (sessionId: string, jobId: string, label: string) => {
  let status = "";
  await waitUntil(async () => {
    const response = await api.get(`${target.base}?sessionId=${encodeURIComponent(sessionId)}&jobId=${encodeURIComponent(jobId)}`);
    if (!response.ok()) throw new Error(`M01 ${label} status failed (${response.status()})`);
    status = (await response.json()).status;
    return status === "succeeded" || status === "failed";
  }, `${label} job completion`, 60_000);
  check(status === "succeeded", `Synthetic ${label} job succeeded`);
};

type AppendAttempt = { eventIds: string[]; expectedRevision: number; commandId: string; status?: number; mode: string };
const appendAttempts: AppendAttempt[] = [];
let appendMode: "normal" | "drop-after-commit" | "hold" = "normal";
let droppedCommitStatus: number | undefined;
let context: Awaited<ReturnType<typeof browser.newContext>> | undefined;

try {
  // This grant and database belong to the already-created disposable integration fixture.
  await pool.query("UPDATE strategy_access_grant SET revoked_at=NULL WHERE id=$1", [target.grantId]);
  const created = await post({ action: "create", commandId: randomUUID() });
  const sessionId = created.id as string;
  check(Boolean(sessionId), "Authenticated create command made a fresh M01 session");
  const prepared = await post({ action: "prepare", sessionId, expectedRevision: created.revision, commandId: randomUUID() });
  check(Boolean(prepared.jobId), "Authenticated prepare command queued through the real M01 host");
  await runJob(sessionId, prepared.jobId, "prepare");
  const preparedState = await readSession(sessionId);
  check(Boolean(preparedState.session?.plan), "Synthetic worker persisted the interview plan");
  check(preparedState.capabilities?.voice === true, "Isolated runtime exposes the enabled local voice capability");

  context = await browser.newContext({ storageState });
  await context.addInitScript(() => {
    const state = { getUserMediaCalls: 0, stoppedTracks: 0, closedPeers: 0, failNext: false, channel: undefined as any };
    (window as any).__m01Voice = state;
    class FakeChannel {
      readyState = "open";
      private listeners = new Map<string, ((event: any) => void)[]>();
      addEventListener(type: string, fn: (event: any) => void) { this.listeners.set(type, [...(this.listeners.get(type) ?? []), fn]); }
      dispatch(type: string, event: any = {}) { for (const fn of this.listeners.get(type) ?? []) fn(event); }
      send(raw: string) {
        let message: any; try { message = JSON.parse(raw); } catch { return; }
        if (message.type === "session.close") setTimeout(() => this.dispatch("message", { data: JSON.stringify({ type: "session.closed" }) }), 0);
      }
      close() { this.readyState = "closed"; this.dispatch("close", {}); }
    }
    class FakePeerConnection {
      connectionState = "new";
      iceGatheringState = "complete";
      localDescription: any = null;
      private listeners = new Map<string, ((event: any) => void)[]>();
      private channel = new FakeChannel();
      addEventListener(type: string, fn: (event: any) => void) { this.listeners.set(type, [...(this.listeners.get(type) ?? []), fn]); }
      private dispatch(type: string, event: any = {}) { for (const fn of this.listeners.get(type) ?? []) fn(event); }
      addTrack() {}
      createDataChannel() { state.channel = this.channel; return this.channel; }
      async createOffer() { return { type: "offer", sdp: "synthetic-offer" }; }
      async setLocalDescription(offer: any) { this.localDescription = offer; }
      async setRemoteDescription() {
        if (state.failNext) {
          state.failNext = false; this.connectionState = "failed"; this.dispatch("connectionstatechange");
        } else {
          this.connectionState = "connected"; this.dispatch("connectionstatechange");
          setTimeout(() => this.channel.dispatch("message", { data: JSON.stringify({ type: "session.started" }) }), 0);
        }
      }
      close() { state.closedPeers++; this.connectionState = "closed"; this.dispatch("connectionstatechange"); }
    }
    Object.defineProperty(window, "RTCPeerConnection", { configurable: true, value: FakePeerConnection });
    Object.defineProperty(navigator, "mediaDevices", { configurable: true, value: {
      async getUserMedia() {
        state.getUserMediaCalls++;
        const track = { stop() { state.stoppedTracks++; } };
        return { getTracks: () => [track], getAudioTracks: () => [track] };
      },
    } });
  });

  const page = await context.newPage();
  page.on("pageerror", (error) => { throw error; });
  page.on("response", async (response) => {
    if (response.request().method() !== "POST" || new URL(response.url()).pathname !== target.base) return;
    let body: any; try { body = response.request().postDataJSON(); } catch { return; }
    if (body?.action === "append-events") {
      const attempt = appendAttempts.findLast((entry) => entry.commandId === body.commandId);
      if (attempt) attempt.status = response.status();
    }
  });
  await page.route((url) => url.origin === app.origin && url.pathname === target.base, async (route) => {
    const request = route.request();
    if (request.method() !== "POST") return route.continue();
    let body: any; try { body = request.postDataJSON(); } catch { return route.continue(); }
    if (body?.action !== "append-events") return route.continue();
    const mode = appendMode;
    const events = Array.isArray(body.events) ? body.events : [];
    appendAttempts.push({ eventIds: events.map((event: any) => event.event_id), expectedRevision: body.expectedRevision, commandId: body.commandId, mode });
    if (mode === "hold") return route.abort("failed");
    if (mode === "drop-after-commit") {
      appendMode = "normal";
      const response = await route.fetch();
      droppedCommitStatus = response.status();
      return route.abort("failed");
    }
    return route.continue();
  });

  await page.goto(`${app.origin}${target.base}?sessionId=${encodeURIComponent(sessionId)}`, { waitUntil: "domcontentloaded", timeout: 120_000 });
  const start = page.getByRole("button", { name: "Start voice interview", exact: true });
  await start.waitFor({ timeout: 30_000 });
  appendMode = "drop-after-commit";
  await start.click();
  await page.getByRole("status").filter({ hasText: "Connected. Speak when you’re ready." }).waitFor({ timeout: 30_000 });
  await page.evaluate(() => {
    const channel = (window as any).__m01Voice.channel;
    const send = (event: unknown) => channel.dispatch("message", { data: JSON.stringify(event) });
    send({ type: "session.input_transcript.delta", event_id: "voice-input-1", delta: "Synthetic spoken answer." });
    send({ type: "session.input_transcript.delta", event_id: "voice-input-1", delta: "Synthetic spoken answer." });
    send({ type: "session.output_transcript.delta", event_id: "voice-output-1", delta: "Synthetic interviewer question." });
  });
  await waitUntil(async () => {
    const state = await readSession(sessionId);
    const events = (state.session?.transcript ?? []).map((line: any) => line.event ?? line);
    return events.some((event: any) => event.event_id === "voice-output-1");
  }, "initial voice transcript persistence");
  const firstSaved = await readSession(sessionId);
  const savedEvents = (firstSaved.session?.transcript ?? []).map((line: any) => line.event ?? line);
  check(droppedCommitStatus === 200, "The first append committed before its browser response was deliberately lost");
  check(appendAttempts.length >= 4, "The browser retried the lost response and flushed the remaining transcript commands");
  check(savedEvents.filter((event: any) => event.event_id === "voice-input-1").length === 1,
    "Identical provider event replay is stored once with no duplicated transcript text");
  check(savedEvents.filter((event: any) => event.event_id === "voice-output-1").length === 1,
    "Output transcript event is stored once");

  // Leave one event in sessionStorage, advance the server revision elsewhere, then
  // reload. The client must reconcile the conflict and rebase the immutable outbox.
  appendMode = "hold";
  const conflictEventId = "voice-reload-rebase-1";
  await page.evaluate((eventId) => (window as any).__m01Voice.channel.dispatch("message", {
    data: JSON.stringify({ type: "session.input_transcript.delta", event_id: eventId, delta: "Synthetic answer saved after reload." }),
  }), conflictEventId);
  await waitUntil(async () => appendAttempts.some((attempt) => attempt.mode === "hold" && attempt.eventIds.includes(conflictEventId)), "held outbox request");
  await page.getByText(/1 transcript event waiting to save/).waitFor({ timeout: 10_000 });
  const queuedRevision = (await readSession(sessionId)).session.revision;
  const storedQueue = await page.evaluate((prefix) => {
    const key = Object.keys(sessionStorage).find((candidate) => candidate.startsWith(prefix));
    return key ? JSON.parse(sessionStorage.getItem(key) ?? "[]") : [];
  }, `m01-transcript:${target.base}:${sessionId}`);
  check(storedQueue.some((item: any) => item.events?.some((event: any) => event.event_id === conflictEventId)),
    "Pending transcript command is stored in the browser outbox before reload");
  await post({ action: "note", sessionId, expectedRevision: queuedRevision, commandId: randomUUID(), note: "Synthetic concurrent revision for conflict rebase." });
  const rebasedRevision = (await readSession(sessionId)).session.revision;
  check(rebasedRevision > queuedRevision, "A concurrent authenticated command advanced the server revision");
  appendMode = "normal";
  await page.reload({ waitUntil: "domcontentloaded" });
  await waitUntil(async () => {
    const state = await readSession(sessionId);
    const events = (state.session?.transcript ?? []).map((line: any) => line.event ?? line);
    return events.some((event: any) => event.event_id === conflictEventId);
  }, "reloaded outbox rebase and transcript save");
  const rebaseAttempts = appendAttempts.filter((attempt) => attempt.eventIds.includes(conflictEventId));
  check(rebaseAttempts.some((attempt) => attempt.expectedRevision === queuedRevision) &&
    rebaseAttempts.some((attempt) => attempt.expectedRevision === rebasedRevision),
  "Reloaded outbox receives the revision conflict, rebases, and retries at the current revision");
  const afterReload = await readSession(sessionId);
  const afterReloadEvents = (afterReload.session?.transcript ?? []).map((line: any) => line.event ?? line);
  check(afterReloadEvents.filter((event: any) => event.event_id === conflictEventId).length === 1,
    "Rebased reload persists the queued text exactly once");

  // End should release every local media/RTC resource; a separate failed connection
  // attempt checks the failure lifecycle without using a real microphone.
  const resumedStart = page.getByRole("button", { name: "Start voice interview", exact: true });
  await resumedStart.waitFor({ timeout: 30_000 });
  await resumedStart.click();
  await page.getByRole("status").filter({ hasText: "Connected. Speak when you’re ready." }).waitFor({ timeout: 30_000 });
  await page.getByRole("button", { name: "End interview", exact: true }).click();
  await waitUntil(() => page.evaluate(() => {
    const state = (window as any).__m01Voice;
    return state.stoppedTracks >= 1 && state.closedPeers >= 1;
  }), "End interview resource cleanup");
  check(await page.getByRole("button", { name: "Start voice interview", exact: true }).isVisible(),
    "End returns the UI to the inactive state after stopping media and peer connection");

  await page.evaluate(() => { (window as any).__m01Voice.failNext = true; });
  await page.getByRole("button", { name: "Start voice interview", exact: true }).click();
  await waitUntil(() => page.evaluate(() => {
    const state = (window as any).__m01Voice;
    return state.stoppedTracks >= 2 && state.closedPeers >= 2;
  }), "failed connection resource cleanup");
  check(await page.getByRole("button", { name: "Start voice interview", exact: true }).isVisible(),
    "A failed voice connection releases its local track and peer connection");

  const fakeMetrics = await read<any>("m01-voice-fake-metrics.json");
  check(fakeMetrics.synthetic === true && fakeMetrics.sessionRequests >= 3 && fakeMetrics.invalidRequests === 0,
    "All voice session exchanges reached the authenticated synthetic loopback fake");
  await writeFile(resolve(integrationState, "m01-voice-browser-result.json"), JSON.stringify({
    passed: true, assertions, synthetic: true, provider: "loopback-8136", realMicrophone: false,
    sessionId, eventIds: ["voice-input-1", "voice-output-1", conflictEventId],
    appendAttempts: appendAttempts.length, at: new Date().toISOString(),
  }, null, 2), { mode: 0o600 });
  console.log(`PASS: ${assertions} M01 synthetic voice browser assertions.`);
} finally {
  await context?.close();
  await browser.close();
  await api.dispose();
  await pool.query("UPDATE strategy_access_grant SET revoked_at=now() WHERE id=$1", [target.grantId]);
  await pool.end();
}
