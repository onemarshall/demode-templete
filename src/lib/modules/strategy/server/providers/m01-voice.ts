import { z } from "zod";

type M01VoiceFetch = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
const Config = z.object({
  apiKey: z.string().min(1),
  model: z.string().min(1).default("gpt-live-1"),
  endpoint: z.string().url().default("https://api.openai.com/v1/live/sessions"),
  timeoutMs: z.number().int().min(1000).max(30_000).default(15_000),
  fetch: z.custom<M01VoiceFetch>().optional(),
});
const MAX_SDP = 128_000;
const MAX_INSTRUCTIONS = 24_000;
const MAX_RESPONSE = 32_000;

export interface M01VoiceSessionRequest {
  sdp: string;
  instructions: string;
}
export interface M01VoiceSessionResponse {
  session: { id: string };
  transport: { sdp: string };
}
export type M01VoiceProvider = ((request: M01VoiceSessionRequest) => Promise<M01VoiceSessionResponse>) & {
  /** Best-effort server-side termination for a provider session ID minted by this adapter. */
  hangup(sessionId: string): Promise<void>;
};

/** Server-only adapter for the legacy OpenAI Live WebRTC session exchange. */
export function createM01VoiceProvider(input: z.input<typeof Config>) {
  const config = Config.parse(input);
  const endpoint = new URL(config.endpoint);
  const loopback = ["localhost", "127.0.0.1", "[::1]"].includes(endpoint.hostname);
  if ((!loopback && (endpoint.protocol !== "https:" || endpoint.hostname !== "api.openai.com")) || (loopback && !["http:", "https:"].includes(endpoint.protocol)) || endpoint.username || endpoint.password || endpoint.hash)
    throw new Error("M01 voice provider configuration is invalid");
  const fetcher = config.fetch ?? (globalThis.fetch as M01VoiceFetch);

  const create = async ({ sdp, instructions }: M01VoiceSessionRequest): Promise<M01VoiceSessionResponse> => {
    if (typeof sdp !== "string" || !sdp.trim() || sdp.length > MAX_SDP || typeof instructions !== "string" || !instructions.trim() || instructions.length > MAX_INSTRUCTIONS)
      throw new Error("M01 voice request is invalid");
    const abort = new AbortController();
    const timer = setTimeout(() => abort.abort(), config.timeoutMs);
    try {
      const response = await fetcher(endpoint, {
        method: "POST",
        redirect: "error",
        signal: abort.signal,
        headers: { authorization: `Bearer ${config.apiKey}`, "content-type": "application/json", accept: "application/json" },
        body: JSON.stringify({
          session: {
            model: config.model,
            instructions,
            client: { data_channel: {
              allowed_client_events: ["session.commentary.append", "session.close"],
              allowed_server_events: ["session.started", "session.closed", "session.input_transcript.delta", "session.output_transcript.delta", "error"].map(type => ({ type })),
            } },
          },
          transport: { type: "webrtc", sdp },
        }),
      });
      const length = Number(response.headers.get("content-length") ?? 0);
      if (length > MAX_RESPONSE) throw new Error("M01 voice provider response is invalid");
      if (!response.ok) throw new Error("M01 voice provider request failed");
      const body = await response.text();
      if (body.length > MAX_RESPONSE) throw new Error("M01 voice provider response is invalid");
      const parsed = z.object({
        session: z.object({ id: z.string().min(1).max(256) }),
        transport: z.object({ type: z.literal("webrtc").optional(), sdp: z.string().min(1).max(MAX_SDP) }),
      }).safeParse(JSON.parse(body));
      if (!parsed.success) throw new Error("M01 voice provider response is invalid");
      return { session: { id: parsed.data.session.id }, transport: { sdp: parsed.data.transport.sdp } };
    } catch (error) {
      if (error instanceof Error && error.message.startsWith("M01 voice")) throw error;
      throw new Error(abort.signal.aborted ? "M01 voice provider timed out" : "M01 voice provider request failed");
    } finally {
      clearTimeout(timer);
    }
  };
  const hangup = async (sessionId: string): Promise<void> => {
    if (typeof sessionId !== "string" || !/^[A-Za-z0-9_-]{1,256}$/.test(sessionId)) throw new Error("M01 voice session is invalid");
    const abort = new AbortController();
    const timer = setTimeout(() => abort.abort(), config.timeoutMs);
    try {
      const url = new URL(`${endpoint.pathname.replace(/\/$/, "")}/${encodeURIComponent(sessionId)}/hangup`, endpoint.origin);
      const response = await fetcher(url, {
        method: "POST",
        redirect: "error",
        signal: abort.signal,
        headers: { authorization: `Bearer ${config.apiKey}`, accept: "application/json" },
      });
      if (!response.ok) throw new Error("M01 voice provider hangup failed");
    } catch (error) {
      if (error instanceof Error && error.message === "M01 voice provider hangup failed") throw error;
      throw new Error(abort.signal.aborted ? "M01 voice provider timed out" : "M01 voice provider hangup failed");
    } finally {
      clearTimeout(timer);
    }
  };
  return Object.assign(create, { hangup }) as M01VoiceProvider;
}
