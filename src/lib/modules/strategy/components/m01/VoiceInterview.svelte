<script lang="ts">
  import { onDestroy, onMount } from "svelte";
  import { M01TranscriptOutbox, normalizeM01TranscriptEvent } from "../../shared/m01-transcript";
  import type { M01TranscriptEvent, M01TranscriptCommand } from "../../shared/m01-transcript";

  type Props = {
    sessionId: string;
    revision: number;
    disabled?: boolean;
    endpoint?: string;
    onSaved?: () => Promise<void>;
    onActiveChange?: (active: boolean) => void;
  };
  let { sessionId, revision, disabled = false, endpoint = typeof location === "undefined" ? "" : location.pathname, onSaved, onActiveChange }: Props = $props();

  type Line = { speaker: "You" | "Interviewer"; text: string };
  let lines = $state<Line[]>([]);
  let status = $state("");
  let pending = $state(0);
  let busy = $state(false);
  let active = $state(false);
  let audio: HTMLAudioElement;
  let pc: RTCPeerConnection | undefined;
  let channel: RTCDataChannel | undefined;
  let microphone: MediaStream | undefined;
  let queue: M01TranscriptOutbox | undefined;
  let flushPromise: Promise<void> | undefined;
  let closingTimer: ReturnType<typeof setTimeout> | undefined;
  let flushTimer: ReturnType<typeof setInterval> | undefined;
  let startTimer: ReturnType<typeof setTimeout> | undefined;
  let disconnectTimer: ReturnType<typeof setTimeout> | undefined;
  let finishing = false;
  let startGeneration = 0;
  let revisionNow = $state(0);
  const cue = "The session has started. Begin now with the OPENING FOR THIS SESSION: greet the speaker, say you've read their material, say how many questions there are, ask the two opening questions, then the first planned question.";
  const storeKey = () => `m01-transcript:${location.pathname}:${sessionId}`;
  const postUrl = () => endpoint || location.pathname;

  function updatePending() { pending = queue?.pendingEvents ?? 0; }
  function transcriptEvent(value: any): any { return value?.event ?? value; }
  async function reconcileConflict(command: M01TranscriptCommand, outbox: M01TranscriptOutbox): Promise<"ack" | "retry"> {
    const url = new URL(postUrl(), location.origin);
    url.searchParams.set("sessionId", sessionId);
    const response = await fetch(url, { headers: { accept: "application/json" } });
    if (!response.ok) throw new Error("Couldn’t check the saved interview. Your transcript remains pending.");
    const current = await response.json();
    const session = current?.session;
    if (!session || !Number.isInteger(session.revision)) throw new Error("Couldn’t check the saved interview. Your transcript remains pending.");
    const saved = (session.transcript ?? []).map(transcriptEvent).filter((event: any) => event && typeof event.event_id === "string");
    const byId = new Map<string, any>(saved.map((event: any) => [event.event_id, event]));
    const matched = command.events.filter(event => byId.has(event.event_id));
    if (matched.some(event => {
      const stored = byId.get(event.event_id);
      return stored.type !== event.type || stored.delta !== event.delta;
    })) throw new Error("A transcript event ID has different saved text. Your pending transcript was kept for review.");
    if (matched.length === command.events.length) {
      outbox.acknowledge(command.commandId);
      revisionNow = session.revision;
      updatePending();
      return "ack";
    }
    if (current.source?.upstreamCurrent === false || session.seal || session.handoff)
      throw new Error("This interview’s source changed or the session is sealed. Your transcript remains pending.");
    revisionNow = session.revision;
    outbox.rebaseFirst(session.revision);
    return "retry";
  }
  function getQueue() {
    if (!queue && typeof sessionStorage !== "undefined") queue = new M01TranscriptOutbox(sessionStorage, storeKey(), sessionId);
    updatePending();
    return queue;
  }
  function addEvent(input: unknown) {
    const event = normalizeM01TranscriptEvent(input);
    if (!event) return;
    lines = [...lines, { speaker: event.type === "session.input_transcript.delta" ? "You" : "Interviewer", text: event.delta }];
    try { getQueue()?.enqueue([event], revisionNow); updatePending(); }
    catch { status = "Transcript is still visible here, but local storage is full. Keep this page open and retry saving."; }
  }

  export async function flushPending(): Promise<void> {
    if (flushPromise) return flushPromise;
    flushPromise = (async () => {
      const outbox = getQueue();
      if (!outbox) return;
      while (outbox.first()) {
        const command = outbox.first()!;
        const response = await fetch(postUrl(), { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "append-events", ...command }) });
        if (response.status === 409) {
          const result = await reconcileConflict(command, outbox);
          if (result === "retry") continue;
          if (outbox.first()) outbox.rebaseFirst(revisionNow);
          continue;
        }
        if (!response.ok) throw new Error(response.status === 403 ? "Access was revoked. Your transcript remains saved on this device." : "Transcript save failed. Your pending transcript is kept on this device.");
        let result: any = {};
        try { result = await response.json(); } catch { /* success responses may be empty */ }
        const nextRevision = result?.revision ?? result?.session?.revision ?? result?.data?.revision;
        revisionNow = Number.isInteger(nextRevision) ? nextRevision : command.expectedRevision + 1;
        outbox.acknowledge(command.commandId);
        if (outbox.first()) outbox.rebaseFirst(revisionNow);
        updatePending();
      }
    })().finally(() => { flushPromise = undefined; });
    return flushPromise;
  }

  function stopTracks() {
    startGeneration++;
    clearTimeout(startTimer); startTimer = undefined;
    clearTimeout(disconnectTimer); disconnectTimer = undefined;
    clearInterval(flushTimer); flushTimer = undefined;
    channel?.close(); channel = undefined;
    pc?.close(); pc = undefined;
    microphone?.getTracks().forEach(track => track.stop()); microphone = undefined;
    if (audio) audio.srcObject = null;
    active = false; busy = false; onActiveChange?.(false);
  }
  function onData({ data }: MessageEvent) {
    let event: any;
    try { event = JSON.parse(String(data)); } catch { return; }
    if (event.type === "session.input_transcript.delta" || event.type === "session.output_transcript.delta") addEvent(event);
    if (event.type === "session.started") {
      clearTimeout(startTimer); startTimer = undefined;
      active = true; busy = false; onActiveChange?.(true);
      channel?.send(JSON.stringify({ type: "session.commentary.append", event_id: crypto.randomUUID(), delegation_id: null, content: cue }));
      status = "Connected. Speak when you’re ready.";
    }
    if (event.type === "session.closed") void finish();
  }
  async function start() {
    if (disabled || busy || active) return;
    const generation = ++startGeneration;
    busy = true; active = true; finishing = false; onActiveChange?.(true); lines = []; status = "Requesting microphone access…";
    getQueue();
    clearInterval(flushTimer);
    flushTimer = setInterval(() => { void flushPending().catch(cause => {
      status = cause instanceof Error ? cause.message : "Transcript pending save.";
      if (cause instanceof Error && cause.message.startsWith("Access was revoked")) stopTracks();
    }); }, 2_000);
    const connection = new RTCPeerConnection(); pc = connection;
    connection.addEventListener("connectionstatechange", () => {
      if (pc !== connection || generation !== startGeneration) return;
      if (connection.connectionState === "connected") { clearTimeout(disconnectTimer); disconnectTimer = undefined; }
      if (connection.connectionState === "failed") {
        status = "The voice connection failed. Your transcript remains saved or pending.";
        void finish();
      } else if (connection.connectionState === "disconnected") {
        clearTimeout(disconnectTimer);
        disconnectTimer = setTimeout(() => {
          if (pc === connection && connection.connectionState === "disconnected") {
            status = "The voice connection was lost. Your transcript remains saved or pending.";
            void finish();
          }
        }, 5_000);
      } else if (connection.connectionState === "closed" && active) {
        status = "The voice connection closed. Your transcript remains saved or pending.";
        void finish();
      }
    });
    connection.addEventListener("track", event => { if (audio) audio.srcObject = event.streams[0] ?? new MediaStream([event.track]); });
    try {
      const acquired = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (generation !== startGeneration) { acquired.getTracks().forEach(track => track.stop()); return; }
      microphone = acquired;
      for (const track of microphone.getAudioTracks()) connection.addTrack(track, microphone);
      const dataChannel = connection.createDataChannel("oai-events"); channel = dataChannel;
      dataChannel.addEventListener("message", event => {
        if (pc === connection && generation === startGeneration) onData(event);
      });
      dataChannel.addEventListener("close", () => {
        if (pc === connection && generation === startGeneration && active) {
          status = "The voice session closed. Your transcript remains saved or pending.";
          void finish();
        }
      });
      const offer = await connection.createOffer();
      await connection.setLocalDescription(offer);
      await new Promise<void>((resolve, reject) => {
        if (connection.iceGatheringState === "complete") return resolve();
        const timer = setTimeout(() => reject(new Error("Timed out gathering the audio connection.")), 10_000);
        connection.addEventListener("icegatheringstatechange", () => {
          if (connection.iceGatheringState === "complete") { clearTimeout(timer); resolve(); }
        });
      });
      const sdp = connection.localDescription?.sdp;
      if (!sdp) throw new Error("The audio offer was empty.");
      if (generation !== startGeneration) return;
      status = "Connecting…";
      const response = await fetch(postUrl(), { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "voice-session", sessionId, expectedRevision: revisionNow, commandId: crypto.randomUUID(), sdp }) });
      if (!response.ok) throw new Error(response.status === 403 ? "Access was revoked." : "Couldn’t start the voice interview.");
      const result = await response.json();
      if (generation !== startGeneration) return;
      if (typeof result?.transport?.sdp !== "string" || !result.transport.sdp.trim()) throw new Error("The voice service returned an empty audio answer.");
      await connection.setRemoteDescription({ type: "answer", sdp: result.transport.sdp });
      if (generation !== startGeneration) return;
      status = "Waiting for the interview to start…";
      startTimer = setTimeout(() => {
        if (generation === startGeneration && busy) {
          status = "The voice session did not start. Your transcript remains saved or pending.";
          void finish();
        }
      }, 15_000);
    } catch (cause) {
      if (generation !== startGeneration) return;
      status = cause instanceof Error ? cause.message : "Couldn’t start the voice interview.";
      stopTracks();
    }
  }
  async function finish() {
    if (finishing) return;
    finishing = true;
    clearTimeout(closingTimer);
    try {
      await flushPending();
      await onSaved?.();
      status = pending ? "Transcript pending save." : "Interview saved.";
    } catch (cause) { status = cause instanceof Error ? cause.message : "Transcript pending save."; }
    finally { stopTracks(); }
  }
  async function end() {
    status = "Saving the transcript…";
    try { await flushPending(); }
    catch (cause) { status = cause instanceof Error ? cause.message : "Transcript pending save."; }
    if (channel?.readyState === "open") {
      channel.send(JSON.stringify({ type: "session.close", event_id: crypto.randomUUID() }));
      closingTimer = setTimeout(() => { void finish(); }, 2_000);
    }
    else await finish();
  }
  async function retry() {
    try { await flushPending(); status = "Transcript saved."; await onSaved?.(); }
    catch (cause) { status = cause instanceof Error ? cause.message : "Transcript pending save."; }
  }
  onMount(() => {
    const outbox = getQueue();
    if (!outbox) return;
    lines = outbox.commands.flatMap(command => command.events.map(event => ({ speaker: event.type === "session.input_transcript.delta" ? "You" as const : "Interviewer" as const, text: event.delta })));
    if (outbox.pendingEvents) void retry();
  });
  onDestroy(() => { clearTimeout(closingTimer); stopTracks(); });
  $effect(() => { revisionNow = revision; updatePending(); });
</script>

<section class="voice" aria-label="Voice interview">
  <div class="controls">
    {#if active}
      <button type="button" class="end" onclick={end}>End interview</button>
    {:else}
      <button type="button" disabled={disabled || busy} onclick={start}>{busy ? "Connecting…" : "Start voice interview"}</button>
    {/if}
    <audio bind:this={audio} autoplay></audio>
    {#if status}<p role="status">{status}</p>{/if}
  </div>
  <div class="transcript" aria-live="polite">
    {#each lines as line, index (`${index}-${line.speaker}`)}
      <p><strong>{line.speaker}:</strong> {line.text}</p>
    {/each}
    {#if lines.length === 0}<p class="empty">Your spoken interview will appear here.</p>{/if}
  </div>
  {#if pending > 0}
    <div class="pending" role="status"><span>{pending} transcript {pending === 1 ? "event" : "events"} waiting to save</span><button type="button" onclick={retry}>Retry save</button></div>
  {/if}
</section>

<style>
  .voice { display: grid; gap: 1rem; }
  .controls { display: flex; align-items: center; gap: .75rem; flex-wrap: wrap; }
  button { border: 0; border-radius: 999px; padding: .7rem 1rem; background: #243b32; color: white; cursor: pointer; font: inherit; }
  button:disabled { opacity: .55; cursor: not-allowed; }
  .end { background: #7b342d; }
  .controls p { margin: 0; font-size: .9rem; }
  audio { width: 1px; height: 1px; }
  .transcript { max-height: 22rem; overflow: auto; padding: 1rem; border: 1px solid #d8ddd8; border-radius: .75rem; }
  .transcript p { line-height: 1.5; }
  .empty { color: #66736c; }
  .pending { display: flex; align-items: center; justify-content: space-between; gap: 1rem; color: #7b342d; }
</style>
