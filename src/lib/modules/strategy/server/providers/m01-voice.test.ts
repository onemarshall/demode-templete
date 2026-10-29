import { describe, expect, test } from "bun:test";
import { createM01VoiceProvider } from "./m01-voice";

describe("M01 voice provider", () => {
  test("exchanges SDP using the bounded legacy Live session contract", async () => {
    let request: any;
    const provider = createM01VoiceProvider({ apiKey: "secret", fetch: async (_url, init) => {
      request = JSON.parse(String(init?.body));
      expect(init?.redirect).toBe("error");
      return new Response(JSON.stringify({ session: { id: "live_1" }, transport: { type: "webrtc", sdp: "answer" } }));
    } });
    await expect(provider({ sdp: "offer", instructions: "private prompt" })).resolves.toEqual({ session: { id: "live_1" }, transport: { sdp: "answer" } });
    expect(request).toEqual({
      session: {
        model: "gpt-live-1",
        instructions: "private prompt",
        client: { data_channel: {
          allowed_client_events: ["session.commentary.append", "session.close"],
          allowed_server_events: ["session.started", "session.closed", "session.input_transcript.delta", "session.output_transcript.delta", "error"].map(type => ({ type })),
        } },
      },
      transport: { type: "webrtc", sdp: "offer" },
    });
    expect(request.session.client.data_channel.allowed_client_events).not.toContain("session.update");
  });

  test("exposes a bounded server-side hangup helper", async () => {
    let url = "", method = "";
    const provider = createM01VoiceProvider({ apiKey: "secret", fetch: async (input, init) => {
      url = String(input); method = String(init?.method);
      return new Response(null, { status: 204 });
    } });
    await expect(provider.hangup("live_1")).resolves.toBeUndefined();
    expect(url).toBe("https://api.openai.com/v1/live/sessions/live_1/hangup");
    expect(method).toBe("POST");
    await expect(provider.hangup("../bad")).rejects.toThrow("M01 voice session is invalid");
  });

  test("returns static errors and rejects unsafe endpoints", async () => {
    const provider = createM01VoiceProvider({ apiKey: "secret", fetch: async () => new Response("private error details", { status: 503 }) });
    await expect(provider({ sdp: "offer", instructions: "prompt" })).rejects.toThrow("M01 voice provider request failed");
    expect(() => createM01VoiceProvider({ apiKey: "secret", endpoint: "http://api.openai.com/x" })).toThrow("M01 voice provider configuration is invalid");
  });

  test("bounds SDP and instructions before network access", async () => {
    let called = false;
    const provider = createM01VoiceProvider({ apiKey: "secret", fetch: async () => { called = true; return new Response(); } });
    await expect(provider({ sdp: "x".repeat(128_001), instructions: "prompt" })).rejects.toThrow("M01 voice request is invalid");
    expect(called).toBe(false);
  });
});
