import { describe, expect, test } from "vitest";
import { z } from "zod";
import { createM04Providers } from "./m04";
import { STAGE_SCHEMAS } from "../stages/m04/contracts";

const draftSession = {
  sources: {},
  data: {},
  drafts: {},
} as any;
const marketDraft = {
  problemRecognition: "unknown",
  spending: "unknown",
  educationBurden: "unknown",
  verdict: "unknown",
  educationPeriod: "Not established",
  segmentSize: "Not established",
  reachability: "Not established",
  growth: "Not established",
  sourceRefs: ["unknown"],
  inheritedFinding: "Not established",
  interpretation: "Insufficient evidence",
  changesMarketFinding: false,
};
const financialDraft = {
  inputs: [{
    input_id: "cash-reserve", name: "Available cash", unit: "GBP", period: "current", currency: "GBP",
    source_id: "source-1", source_ref: "receipt-1", source_date: "2026-10-13", owner: "Founder",
    confidence: "unverified", calculation_use: "Review only", derivation: "Not yet established",
    review_trigger: "When records arrive", strategic_version: "v1", input_type: "unknown", value_or_range: null,
  }],
  calculations: [],
  mechanisms: Array.from({ length: 10 }, (_, index) => ({
    id: `M${index + 1}`, applicable: index === 9,
    disposition: index === 9 ? "applicable" : "unresolved",
    reason: "Requires review", finding: "Not yet established", inputIds: [], limitation: "Carry as a limitation",
  })),
  economicFloor: "Not established", convictionFloor: "Not established", biggestAssumption: "Not established",
  evidence: "Not established", ifWrong: "Not established", investmentLimit: "Not established",
  pricing: { state: "not-yet-estimable", finding: "Not established", inputIds: [], conditions: "Not established", claimsBoundary: "No claim" },
  offers: [],
  bridge: { applicable: false, job: "Not established", resources: "Not established", evidenceEvent: "Not established", owner: "Not established", limits: "Not established" },
};

function providerWith(payload: unknown, extra: Partial<Response> = {}) {
  let request: RequestInit | undefined;
  const providers = createM04Providers({
    apiKey: "test-secret",
    model: "openai/test-model",
    endpoint: "https://provider.test/chat",
    fetch: async (_input, init) => {
      request = init;
      return new Response(JSON.stringify(typeof payload === "string" ? payload : {
        choices: [{ message: { content: JSON.stringify(payload) }, finish_reason: "stop" }],
      }), { status: 200, ...extra });
    },
  });
  return { providers, getRequest: () => request };
}

describe("M04 AI provider", () => {
  test("emits allowlisted request diagnostics and ignores callback failures", async () => {
    const events: unknown[] = [];
    const providers = createM04Providers({
      apiKey: "secret-do-not-report",
      onDiagnostic(event) { events.push(event); throw new Error("callback failure"); },
      fetch: async () => new Response(JSON.stringify({
        id: "gen_safe-42",
        choices: [{ message: { content: JSON.stringify({ say: "fine", complete: false }) }, finish_reason: "stop" }],
      }), { status: 200 }),
    });
    await expect(providers.chat!({ modelContext: "private prompt", messages: [] })).resolves.toBeDefined();
    expect(events).toHaveLength(3);
    expect(events).toMatchObject([
      { phase: "start", model: "openai/gpt-6.1-sol", maxTokens: 12_000, requestBytes: expect.any(Number) },
      { phase: "headers", status: 200 },
      { phase: "completed", status: 200, generationId: "gen_safe-42" },
    ]);
    const serialized = JSON.stringify(events);
    expect(serialized).not.toContain("private prompt");
    expect(serialized).not.toContain("secret-do-not-report");
    expect(serialized).not.toContain("callback failure");
  });

  test("omits unsafe upstream generation identifiers and names HTTP failures", async () => {
    const events: any[] = [];
    const badId = createM04Providers({
      apiKey: "key",
      onDiagnostic: (event) => events.push(event),
      fetch: async () => new Response(JSON.stringify({ id: "private id with spaces", choices: [{ message: { content: JSON.stringify({ say: "ok", complete: false }) } }] })),
    });
    await badId.chat!({ modelContext: "x", messages: [] });
    expect(events.at(-1)).not.toHaveProperty("generationId");

    const failing = createM04Providers({ apiKey: "key", fetch: async () => new Response("private body", { status: 503 }) });
    const error = await failing.chat!({ modelContext: "x", messages: [] }).catch((reason) => reason);
    expect(error.name).toBe("M04ProviderHttpError");
    expect(error.message).toBe("AI provider request failed");
  });

  test("sends chat context and parses the established Reply shape", async () => {
    const { providers, getRequest } = providerWith({ say: "What matters most?", complete: false });
    const result = await providers.chat!({
      modelContext: "adviser prompt",
      messages: [{ role: "user", content: "I am considering this." }],
    });
    expect(result).toEqual({ reply: { say: "What matters most?", complete: false }, model: "openai/test-model" });
    const sent = JSON.parse(String(getRequest()?.body));
    expect(sent.messages).toEqual([
      { role: "system", content: "adviser prompt" },
      { role: "user", content: "I am considering this." },
    ]);
    expect(new Headers(getRequest()?.headers).get("authorization")).toBe("Bearer test-secret");
  });

  test("sends strict stage schema for drafts and returns model and usage", async () => {
    let sent: any;
    const providers = createM04Providers({
      apiKey: "key",
      draftModel: "openai/draft-model",
      fetch: async (_input, init) => {
        sent = JSON.parse(String(init?.body));
        return new Response(JSON.stringify({
          id: "draft-123",
          choices: [{ message: { content: JSON.stringify(marketDraft) }, finish_reason: "stop" }],
          usage: { total_tokens: 321 },
        }));
      },
    });
    const result = await providers.generate!({ session: draftSession, stage: "market-readiness", method: "method" });
    const expectedSchema = JSON.parse(JSON.stringify(z.toJSONSchema(STAGE_SCHEMAS["market-readiness"])));
    expect(sent.response_format).toEqual({
      type: "json_schema",
      json_schema: {
        name: "m04_market_readiness",
        strict: true,
        schema: expectedSchema,
      },
    });
    expect(sent.provider).toEqual({ require_parameters: true });
    expect(sent.stream).toBe(false);
    expect(result).toEqual({ candidate: marketDraft, model: "openai/draft-model", usage: { total_tokens: 321 } });
  });

  test("reports only bounded safe schema issue codes and paths for invalid drafts", async () => {
    const events: any[] = [];
    const secret = "do-not-log-this-output";
    const providers = createM04Providers({
      apiKey: "key",
      onDiagnostic: (event) => events.push(event),
      fetch: async () => new Response(JSON.stringify({
        choices: [{ message: { content: JSON.stringify({ ...marketDraft, untrustedSecret: secret, problemRecognition: 42 }) }, finish_reason: "stop" }],
      })),
    });
    await expect(providers.generate!({ session: draftSession, stage: "market-readiness", method: "private method" }))
      .rejects.toThrow("invalid draft");
    const failure = events.at(-1);
    expect(failure).toMatchObject({
      phase: "failed",
      failureKind: "draft_schema",
        schemaIssues: [{ code: "invalid_value", path: ["problemRecognition"] }],
    });
    expect(failure.schemaIssues.length).toBeLessThanOrEqual(10);
    const serialized = JSON.stringify(events);
    expect(serialized).not.toContain(secret);
    expect(serialized).not.toContain("untrustedSecret");
    expect(serialized).not.toContain("private method");
  });

  test("locally validates typed financial inputs, governed calculations, and M10 without resolving M1-M9", async () => {
    const valid = providerWith(financialDraft);
    await expect(valid.providers.generate!({ session: draftSession, stage: "financial-grounding", method: "method" }))
      .resolves.toMatchObject({ candidate: financialDraft });

    const cases = [
      { ...financialDraft, inputs: [{ ...financialDraft.inputs[0], value_or_range: "unknown" }] },
      { ...financialDraft, inputs: [{ ...financialDraft.inputs[0], source_ref: "" }] },
      { ...financialDraft, calculations: [{ id: "x", kind: "invented", inputIds: [], assumptions: "test", formula: "invented" }] },
      { ...financialDraft, calculations: [{ id: "x", kind: "sum", inputIds: [], assumptions: "test", formula: "made up" }] },
      { ...financialDraft, mechanisms: financialDraft.mechanisms.map((item, index) => index === 9 ? { ...item, applicable: false, disposition: "unresolved" } : item) },
    ];
    for (const candidate of cases) {
      const events: any[] = [];
      const provider = createM04Providers({
        apiKey: "test-secret",
        onDiagnostic: (event) => events.push(event),
        fetch: async () => new Response(JSON.stringify({
          choices: [{ message: { content: JSON.stringify(candidate) }, finish_reason: "stop" }],
        })),
      });
      await expect(provider.generate!({ session: draftSession, stage: "financial-grounding", method: "private method" }))
        .rejects.toMatchObject({ name: "M04ProviderDraftSchemaError", message: "AI provider returned an invalid draft" });
      expect(events.at(-1)).toMatchObject({ phase: "failed", failureKind: "draft_schema" });
      expect(JSON.stringify(events)).not.toContain("cash-reserve");
      expect(JSON.stringify(events)).not.toContain("receipt-1");
      expect(JSON.stringify(events)).not.toContain("Not established");
      expect(JSON.stringify(events)).not.toContain("private method");
    }
  });

  test("uses explicit token and reasoning settings while retaining defaults", async () => {
    let sent: any;
    const events: any[] = [];
    const providers = createM04Providers({
      apiKey: "key",
      draftMaxTokens: 4096,
      reasoningEffort: "none",
      onDiagnostic: (event) => events.push(event),
      fetch: async (_input, init) => {
        sent = JSON.parse(String(init?.body));
        return new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify({ say: "ok", complete: false }) } }] }));
      },
    });
    await providers.chat!({ modelContext: "x", messages: [] });
    expect(sent.max_tokens).toBe(12_000);
    expect(sent.reasoning).toEqual({ effort: "none" });
    expect(events[0]).toMatchObject({ maxTokens: 12_000, reasoningEffort: "none" });

    const noOptions = providerWith({ say: "ok", complete: false });
    await noOptions.providers.chat!({ modelContext: "x", messages: [] });
    const defaultRequest = JSON.parse(String(noOptions.getRequest()?.body));
    expect(defaultRequest.max_tokens).toBe(12_000);
    expect(defaultRequest).not.toHaveProperty("reasoning");
  });

  test("rejects malformed chat output and gives a safe provider error", async () => {
    const malformed = providerWith({ say: "", complete: true });
    await expect(malformed.providers.chat!({ modelContext: "x", messages: [] })).rejects.toThrow();

    const failing = createM04Providers({
      apiKey: "secret-value",
      fetch: async () => new Response("private upstream body", { status: 502 }),
    });
    await expect(failing.chat!({ modelContext: "x", messages: [] })).rejects.toThrow("AI provider request failed");
    await expect(failing.chat!({ modelContext: "x", messages: [] })).rejects.not.toThrow("private upstream body");
  });

  test("rejects a response with no content", async () => {
    const providers = createM04Providers({
      apiKey: "test-secret",
      fetch: async () => new Response(JSON.stringify({ choices: [{ message: { content: null } }] })),
    });
    await expect(providers.chat!({ modelContext: "x", messages: [] })).rejects.toThrow("no usable response");
  });

  test("times out while reading a stalled response body and cancels the stream", async () => {
    let cancelled = false;
    const providers = createM04Providers({
      apiKey: "test-secret",
      timeoutMs: 1000,
      fetch: async () => new Response(new ReadableStream<Uint8Array>({
        start(controller) {
          controller.enqueue(new TextEncoder().encode('{"choices":['));
        },
        cancel() {
          cancelled = true;
        },
      })),
    });
    const started = Date.now();
    await expect(providers.chat!({ modelContext: "x", messages: [] }))
      .rejects.toThrow("AI provider request failed or timed out");
    expect(Date.now() - started).toBeLessThan(3000);
    expect(cancelled).toBe(true);
  });

  test("times out when fetch itself never resolves, even if it ignores abort", async () => {
    const providers = createM04Providers({
      apiKey: "test-secret",
      timeoutMs: 1000,
      fetch: async () => new Promise<Response>(() => {}),
    });
    const started = Date.now();
    await expect(providers.chat!({ modelContext: "x", messages: [] }))
      .rejects.toThrow("AI provider request failed or timed out");
    expect(Date.now() - started).toBeLessThan(3000);
  });

  test("refuses credential-bearing endpoints and requests redirects to fail", async () => {
    expect(() => createM04Providers({ apiKey: "key", endpoint: "https://user:pass@provider.test/chat" })).toThrow();
    const { providers, getRequest } = providerWith({ say: "hello", complete: false });
    await providers.chat!({ modelContext: "x", messages: [] });
    expect(getRequest()?.redirect).toBe("error");

    const redirected = createM04Providers({
      apiKey: "key",
      fetch: async () => new Response("", { status: 302, headers: { location: "https://elsewhere.test" } }),
    });
    await expect(redirected.chat!({ modelContext: "x", messages: [] })).rejects.toThrow("redirect was rejected");
  });

  test("caps response bytes and rejects truncated or malformed JSON", async () => {
    const oversized = createM04Providers({
      apiKey: "key",
      fetch: async () => new Response("x".repeat(2 * 1024 * 1024 + 1)),
    });
    await expect(oversized.chat!({ modelContext: "x", messages: [] })).rejects.toThrow("invalid response");

    const truncated = createM04Providers({
      apiKey: "key",
      fetch: async () => new Response(JSON.stringify({
        choices: [{ message: { content: "{}" }, finish_reason: "length" }],
      })),
    });
    await expect(truncated.chat!({ modelContext: "x", messages: [] })).rejects.toThrow("truncated");

    const malformed = createM04Providers({
      apiKey: "key",
      fetch: async () => new Response("not json"),
    });
    await expect(malformed.chat!({ modelContext: "x", messages: [] })).rejects.toThrow("invalid response");
  });

  test("rejects schema-invalid chat content without surfacing model text", async () => {
    const { providers } = providerWith({ say: "", complete: "unexpected", private: "do not expose" });
    await expect(providers.chat!({ modelContext: "x", messages: [] })).rejects.toThrow("invalid chat reply");
    await expect(providers.chat!({ modelContext: "x", messages: [] })).rejects.not.toThrow("do not expose");
  });
});
