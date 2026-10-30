import { describe, expect, test } from "vitest";
import { M01TranscriptOutbox, normalizeM01TranscriptEvent, type TranscriptStorage } from "./m01-transcript";

class MemoryStorage implements TranscriptStorage {
  values = new Map<string, string>();
  getItem(key: string) { return this.values.get(key) ?? null; }
  setItem(key: string, value: string) { this.values.set(key, value); }
}

describe("M01 transcript outbox", () => {
  test("normalizes only transcript deltas and assigns stable event IDs", () => {
    const value = normalizeM01TranscriptEvent({ type: "session.input_transcript.delta", delta: "hello" })!;
    expect(value).toMatchObject({ type: "session.input_transcript.delta", delta: "hello" });
    expect(value.event_id).toBeTruthy();
    expect(normalizeM01TranscriptEvent({ type: "session.update", instructions: "secret" })).toBeNull();
  });
  test("persists immutable commands and removes only after acknowledgement", () => {
    const storage = new MemoryStorage(), queue = new M01TranscriptOutbox(storage, "org/session", "session");
    const [command] = queue.enqueue([{ event_id: "event_1", type: "session.input_transcript.delta", delta: "hello" }], 7);
    const serialized = storage.getItem("org/session");
    const restored = new M01TranscriptOutbox(storage, "org/session", "session");
    expect(restored.first()).toEqual(command);
    expect(restored.first()?.expectedRevision).toBe(7);
    expect(storage.getItem("org/session")).toBe(serialized);
    restored.acknowledge(command.commandId);
    expect(restored.pendingEvents).toBe(0);
  });
  test("reissues only the unsent head after a confirmed conflict", () => {
    const storage = new MemoryStorage(), queue = new M01TranscriptOutbox(storage, "q", "s");
    const [command] = queue.enqueue([{ event_id: "event_1", type: "session.input_transcript.delta", delta: "hello" }], 7);
    queue.rebaseFirst(9);
    expect(queue.first()).toMatchObject({ expectedRevision: 9, events: command.events });
    expect(queue.first()?.commandId).not.toBe(command.commandId);
  });
  test("bounds batches and preserves long text by chunking it", () => {
    const storage = new MemoryStorage(), queue = new M01TranscriptOutbox(storage, "q", "s");
    const [command] = queue.enqueue([{ event_id: "evt", type: "session.output_transcript.delta", delta: "a".repeat(8_500) }], 0);
    expect(command.events.map(event => event.delta.length)).toEqual([4_000, 4_000, 500]);
    expect(command.events.map(event => event.delta).join("")).toBe("a".repeat(8_500));
  });
});
