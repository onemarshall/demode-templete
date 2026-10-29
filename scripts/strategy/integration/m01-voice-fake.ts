/** Loopback-only M01 WebRTC session contract fake. Never reaches an external provider. */
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { integrationState, readConnection } from "./local-stack";

await readConnection();
const env = JSON.parse(await readFile(resolve(integrationState, "runtime-env.json"), "utf8")) as Record<string, string>;
const key = env.OPENAI_API_KEY?.trim();
const endpoint = new URL(env.STRATEGY_M01_VOICE_URL ?? "");
if (!key || !/^(synthetic|local|test)[-_]/i.test(key)) throw new Error("M01 voice fake requires a synthetic-only bearer key in runtime-env.json");
if (endpoint.origin !== "http://127.0.0.1:8136" || endpoint.pathname !== "/v1/live/sessions")
  throw new Error("M01 voice fake only serves the isolated loopback 8136 endpoint");

const metrics = { sessionRequests: 0, hangupRequests: 0, invalidRequests: 0, synthetic: true };
const metricsPath = resolve(integrationState, "m01-voice-fake-metrics.json");
const save = () => writeFile(metricsPath, JSON.stringify(metrics), { mode: 0o600 });
const server = Bun.serve({ hostname: "127.0.0.1", port: 8136, maxRequestBodySize: 200_000, async fetch(request) {
  const url = new URL(request.url);
  if (request.headers.get("authorization") !== `Bearer ${key}`) {
    metrics.invalidRequests++;
    await save();
    return new Response(null, { status: 401 });
  }
  if (request.method === "POST" && url.pathname === "/v1/live/sessions") {
    let body: any;
    try { body = await request.json(); } catch {
      metrics.invalidRequests++;
      await save();
      return new Response(null, { status: 400 });
    }
    if (body?.transport?.type !== "webrtc" || typeof body?.transport?.sdp !== "string" || !body.transport.sdp.trim() ||
        typeof body?.session?.instructions !== "string" || !body.session.instructions.trim() ||
        body.session?.client?.data_channel?.allowed_server_events?.some((event: any) => ![
          "session.started", "session.closed", "session.input_transcript.delta", "session.output_transcript.delta", "error",
        ].includes(event?.type))) {
      metrics.invalidRequests++;
      await save();
      return new Response(null, { status: 400 });
    }
    metrics.sessionRequests++;
    await save();
    return Response.json({ session: { id: "synthetic_voice" }, transport: { type: "webrtc", sdp: "synthetic-answer" } });
  }
  if (request.method === "POST" && url.pathname === "/v1/live/sessions/synthetic_voice/hangup") {
    metrics.hangupRequests++;
    await save();
    return Response.json({ ok: true });
  }
  return new Response(null, { status: 404 });
}});
await save();
console.log("Synthetic M01 voice contract fake listening on 127.0.0.1:8136.");
process.on("SIGTERM", () => { server.stop(); process.exit(0); });
process.on("SIGINT", () => { server.stop(); process.exit(0); });
