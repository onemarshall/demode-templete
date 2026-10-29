export type M01TranscriptEvent = {
  event_id: string;
  type: "session.input_transcript.delta" | "session.output_transcript.delta";
  delta: string;
};
export type M01TranscriptCommand = {
  sessionId: string;
  expectedRevision: number;
  commandId: string;
  events: M01TranscriptEvent[];
};

export interface TranscriptStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}
const MAX_EVENTS = 500;
const MAX_EVENT_TEXT = 4_000;
const MAX_PENDING_BYTES = 1_000_000;
const id = () => globalThis.crypto?.randomUUID?.() ?? `evt_${Date.now().toString(36)}_${Math.random().toString(36).slice(2)}`;

/** Keep only the transcript fields needed by the interview UI and persistence API. */
export function normalizeM01TranscriptEvent(input: unknown): M01TranscriptEvent | null {
  if (!input || typeof input !== "object" || Array.isArray(input)) return null;
  const event = input as Record<string, unknown>;
  if (event.type !== "session.input_transcript.delta" && event.type !== "session.output_transcript.delta") return null;
  if (typeof event.delta !== "string" || !event.delta.trim()) return null;
  const eventId = typeof event.event_id === "string" && event.event_id.trim() ? event.event_id.trim().slice(0, 256) : id();
  if (event.delta.length > MAX_PENDING_BYTES) return null;
  return { event_id: eventId, type: event.type, delta: event.delta };
}

/** A small sessionStorage-backed outbox. Entries are immutable after capture so retries replay the exact command. */
export class M01TranscriptOutbox {
  private entries: M01TranscriptCommand[];
  constructor(private readonly storage: TranscriptStorage, private readonly key: string, private readonly sessionId: string) {
    try {
      const parsed: unknown = JSON.parse(storage.getItem(key) ?? "[]");
      this.entries = Array.isArray(parsed) ? parsed.filter((entry): entry is M01TranscriptCommand => this.valid(entry)) : [];
    } catch { this.entries = []; }
  }
  get pendingEvents(): number { return this.entries.reduce((sum, entry) => sum + entry.events.length, 0); }
  get commands(): readonly M01TranscriptCommand[] { return this.entries; }

  enqueue(events: M01TranscriptEvent[], expectedRevision: number): M01TranscriptCommand[] {
    if (!events.length) return [];
    const commands: M01TranscriptCommand[] = [];
    const bounded: M01TranscriptEvent[] = events.flatMap(event => {
      if (event.delta.length <= MAX_EVENT_TEXT) return [event];
      const chunks: M01TranscriptEvent[] = [];
      for (let offset = 0; offset < event.delta.length; offset += MAX_EVENT_TEXT) chunks.push({ ...event, event_id: `${event.event_id}:${offset}`, delta: event.delta.slice(offset, offset + MAX_EVENT_TEXT) });
      return chunks;
    });
    for (let start = 0; start < bounded.length; start += MAX_EVENTS) {
      const command = { sessionId: this.sessionId, expectedRevision, commandId: id(), events: bounded.slice(start, start + MAX_EVENTS) };
      this.entries.push(command);
      commands.push(command);
    }
    this.persist();
    return commands;
  }
  first(): M01TranscriptCommand | undefined { return this.entries[0]; }
  acknowledge(commandId: string): void {
    const index = this.entries.findIndex(entry => entry.commandId === commandId);
    if (index >= 0) { this.entries.splice(index, 1); this.persist(); }
  }
  rebaseFirst(expectedRevision: number): void {
    if (!this.entries[0] || this.entries[0].expectedRevision === expectedRevision) return;
    this.entries[0] = { ...this.entries[0], expectedRevision, commandId: id() };
    this.persist();
  }
  private valid(value: unknown): value is M01TranscriptCommand {
    if (!value || typeof value !== "object") return false;
    const v = value as M01TranscriptCommand;
    return v.sessionId === this.sessionId && Number.isInteger(v.expectedRevision) && typeof v.commandId === "string" && Array.isArray(v.events) && v.events.length > 0 && v.events.length <= MAX_EVENTS && v.events.every(e => e && typeof e.event_id === "string" && typeof e.delta === "string" && (e.type === "session.input_transcript.delta" || e.type === "session.output_transcript.delta"));
  }
  private persist(): void {
    const value = JSON.stringify(this.entries);
    if (value.length > MAX_PENDING_BYTES) throw new Error("Transcript queue is full. Save or retry before continuing.");
    this.storage.setItem(this.key, value);
  }
}
