import { describe, expect, test } from "bun:test";
import { createM01Providers } from "./m01";

describe("M01 provider", () => {
  test("uses bounded defaults, explicit model and strict operation schema without logging content", async () => {
    let request: any;
    const events: any[] = [];
    const provider = createM01Providers({ apiKey: "private-key", model: "openai/test", onDiagnostic: e => events.push(e), fetch: async (_url, init) => {
      request = JSON.parse(String(init?.body));
      return new Response(JSON.stringify({ id: "safe-123", choices: [{ message: { content: JSON.stringify({ hello: "world" }) }, finish_reason: "stop" }] }));
    } });
    await expect(provider.call("private system", "private user", { name: "m01_test", schema: { type: "object", required: ["hello"] } })).resolves.toEqual({ hello: "world" });
    expect(request).toMatchObject({ model: "openai/test", max_tokens: 18_000, response_format: { type: "json_schema", json_schema: { name: "m01_test", strict: true } }, provider: { require_parameters: true }, stream: false });
    expect(events).toMatchObject([{ phase: "start", model: "openai/test", maxTokens: 18_000 }, { phase: "headers", status: 200 }, { phase: "completed", generationId: "safe-123" }]);
    expect(JSON.stringify(events)).not.toContain("private");
  });

  test("uses bounded chat output and names errors with the M01 prefix", async () => {
    let request: any;
    const provider = createM01Providers({ apiKey: "key", fetch: async (_url, init) => { request = JSON.parse(String(init?.body)); return new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify({ say: "Ask one useful question." }) }, finish_reason: "stop" }] })); } });
    await expect(provider.chat([{ role: "user", content: "current answer" }])).resolves.toBe("Ask one useful question.");
    expect(request.response_format).toEqual({ type: "json_schema", json_schema: { name: "m01_interview_reply", strict: true, schema: { type: "object", additionalProperties: false, required: ["say"], properties: { say: { type: "string", minLength: 1 } } } } });
    expect(request.provider).toEqual({ require_parameters: true });
    expect(request.stream).toBe(false);
    expect(request.messages).toEqual([{ role: "user", content: "current answer" }]);
    const failing = createM01Providers({ apiKey: "key", fetch: async () => new Response("private", { status: 503 }) });
    await expect(failing.call("x", "y")).rejects.toMatchObject({ name: "M01ProviderHttpError", message: "AI provider request failed" });
  });
});
