import { z } from "zod";
import { M04_DEFAULT_SYNTHESIS_MODEL } from "../model-policy";
import type { DataStage } from "../stages/m04/contracts";
import { Reply } from "../stages/m04/chat";
import { draftMessages, draftResponseSchema, parseDraftCandidate } from "../stages/m04/synthesis";
import type { M04Session } from "../stages/m04/contracts";
import type { M04ServicePorts } from "../stages/m04/service";

type FetchFn = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
type DiagnosticPhase = "start" | "headers" | "completed" | "failed";
type FailureKind = "timeout" | "request" | "redirect" | "http" | "response" | "truncated" | "no_content" | "content_json" | "chat_schema" | "draft_schema";
export type M04ProviderDiagnostic = {
  phase: DiagnosticPhase;
  model: string;
  maxTokens?: number;
  reasoningEffort?: "none" | "minimal" | "low" | "medium" | "high";
  requestBytes?: number;
  elapsedMs?: number;
  status?: number;
  failureKind?: FailureKind;
  generationId?: string;
  schemaIssues?: Array<{ code: string; path: Array<string | number> }>;
};
type DiagnosticFn = (diagnostic: M04ProviderDiagnostic) => void;
const MAX_RESPONSE_BYTES = 2 * 1024 * 1024;
const ConfigSchema = z.object({
  apiKey: z.string().min(1),
  model: z.string().min(1).default(M04_DEFAULT_SYNTHESIS_MODEL),
  chatModel: z.string().min(1).optional(),
  draftModel: z.string().min(1).optional(),
  endpoint: z.string().url().default("https://openrouter.ai/api/v1/chat/completions").refine((value) => {
    const url = new URL(value);
    return !url.username && !url.password;
  }, "Endpoint must not contain credentials"),
  timeoutMs: z.number().int().min(1000).max(900_000).default(120_000),
  draftMaxTokens: z.number().int().min(1000).max(18_000).default(18_000),
  chatMaxTokens: z.number().int().min(1000).max(12_000).default(12_000),
  reasoningEffort: z.enum(["none", "minimal", "low", "medium", "high"]).optional(),
  fetch: z.custom<FetchFn>().optional(),
  onDiagnostic: z.custom<DiagnosticFn>().optional(),
});
export type M04ProviderConfig = z.input<typeof ConfigSchema>;

const CompletionSchema = z.object({
  id: z.unknown().optional(),
  choices: z.array(z.object({
    message: z.object({ content: z.string().nullable().optional() }),
    finish_reason: z.string().nullable().optional(),
  })).optional(),
  usage: z.unknown().optional(),
});

class SafeProviderError extends Error {
  constructor(name: string, message: string) {
    super(message);
    this.name = name;
  }
}

function generationId(value: unknown): string | undefined {
  return typeof value === "string" && value.length <= 128 && /^[A-Za-z0-9._:-]+$/.test(value) ? value : undefined;
}

function failureKind(error: unknown): FailureKind {
  const name = error instanceof Error ? error.name : "";
  return name.startsWith("M04Provider") ? (name.slice("M04Provider".length, -5).replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`).replace(/^_/, "") as FailureKind) : "response";
}

function providerErrorName(kind: FailureKind): string {
  return `M04Provider${kind.split("_").map((part) => part[0]!.toUpperCase() + part.slice(1)).join("")}Error`;
}

async function readBoundedBody(response: Response, signal: AbortSignal): Promise<string> {
  const length = response.headers.get("content-length");
  if (length && Number(length) > MAX_RESPONSE_BYTES) throw new Error("AI provider response exceeded the size limit");
  if (!response.body) throw new Error("AI provider returned no response body");
  const reader = response.body.getReader();
  const cancelOnAbort = () => {
    void reader.cancel().catch(() => {});
  };
  signal.addEventListener("abort", cancelOnAbort, { once: true });
  if (signal.aborted) cancelOnAbort();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > MAX_RESPONSE_BYTES) {
        await reader.cancel();
        throw new Error("AI provider response exceeded the size limit");
      }
      chunks.push(value);
    }
  } finally {
    signal.removeEventListener("abort", cancelOnAbort);
    reader.releaseLock();
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    throw new Error("AI provider returned an invalid response");
  }
}

/** OpenRouter-compatible adapter for the M04 service ports. */
export function createM04Providers(configInput: M04ProviderConfig): Pick<M04ServicePorts, "generate" | "chat"> {
  const config = ConfigSchema.parse(configInput);
  const fetcher: FetchFn = config.fetch ?? globalThis.fetch;
  const diagnose = (event: M04ProviderDiagnostic) => {
    try { config.onDiagnostic?.(event); } catch { /* Observability must not affect generation. */ }
  };

  async function complete(messages: unknown[], model: string, maxTokens: number, options?: { responseFormat?: unknown; provider?: unknown; stream?: boolean }) {
    const controller = new AbortController();
    let timeout: ReturnType<typeof setTimeout> | undefined;
    const startedAt = Date.now();
    const body = JSON.stringify({
      model,
      max_tokens: maxTokens,
      response_format: options?.responseFormat ?? { type: "json_object" },
      ...(options?.provider === undefined ? {} : { provider: options.provider }),
      ...(options?.stream === undefined ? {} : { stream: options.stream }),
      ...(config.reasoningEffort === undefined ? {} : { reasoning: { effort: config.reasoningEffort } }),
      messages,
    });
    const requestBytes = new TextEncoder().encode(body).byteLength;
    let status: number | undefined;
    let generation: string | undefined;
    diagnose({ phase: "start", model, maxTokens, ...(config.reasoningEffort === undefined ? {} : { reasoningEffort: config.reasoningEffort }), requestBytes, elapsedMs: 0 });
    const operation = async () => {
      let response: Response;
      try {
        response = await fetcher(config.endpoint, {
          method: "POST",
          headers: {
            authorization: `Bearer ${config.apiKey}`,
            "content-type": "application/json",
          },
          signal: controller.signal,
          redirect: "error",
          body,
        });
      } catch {
        throw new SafeProviderError(providerErrorName(controller.signal.aborted ? "timeout" : "request"), "AI provider request failed or timed out");
      }
      status = response.status;
      diagnose({ phase: "headers", model, requestBytes, elapsedMs: Date.now() - startedAt, status });
      if (response.redirected || (response.status >= 300 && response.status < 400))
        throw new SafeProviderError(providerErrorName("redirect"), "AI provider redirect was rejected");
      if (!response.ok) throw new SafeProviderError(providerErrorName("http"), "AI provider request failed");
      let responseBody: z.infer<typeof CompletionSchema>;
      try {
        responseBody = CompletionSchema.parse(JSON.parse(await readBoundedBody(response, controller.signal)));
      } catch {
        throw new SafeProviderError(providerErrorName(controller.signal.aborted ? "timeout" : "response"), "AI provider returned an invalid response");
      }
      generation = generationId(responseBody.id);
      const choice = responseBody.choices?.[0];
      if (choice?.finish_reason === "length") throw new SafeProviderError(providerErrorName("truncated"), "AI response was truncated; retry with a narrower request");
      if (!choice?.message.content) throw new SafeProviderError(providerErrorName("no_content"), "AI provider returned no usable response");
      let value: unknown;
      try { value = JSON.parse(choice.message.content); } catch { throw new SafeProviderError(providerErrorName("content_json"), "AI provider returned invalid JSON"); }
      return { value, usage: responseBody.usage, status, generationId: generation, startedAt, requestBytes };
    };
    const deadline = new Promise<never>((_resolve, reject) => {
      timeout = setTimeout(() => {
        controller.abort();
        reject(new SafeProviderError(providerErrorName("timeout"), "AI provider request failed or timed out"));
      }, config.timeoutMs);
    });
    try {
      return await Promise.race([operation(), deadline]);
    } catch (error) {
      diagnose({ phase: "failed", model, requestBytes, elapsedMs: Date.now() - startedAt, ...(status === undefined ? {} : { status }), failureKind: failureKind(error), ...(generation ? { generationId: generation } : {}) });
      throw error;
    } finally {
      if (timeout !== undefined) clearTimeout(timeout);
    }
  }

  return {
    async chat(request) {
      const model = config.chatModel ?? config.model;
      const result = await complete([
        { role: "system", content: request.modelContext },
        ...request.messages,
      ], model, config.chatMaxTokens);
      let reply: z.infer<typeof Reply>;
      try {
        reply = Reply.parse(result.value);
      } catch {
        const error = new SafeProviderError(providerErrorName("chat_schema"), "AI provider returned an invalid chat reply");
        diagnose({ phase: "failed", model, requestBytes: result.requestBytes, elapsedMs: Date.now() - result.startedAt, ...(result.status === undefined ? {} : { status: result.status }), failureKind: "chat_schema", ...(result.generationId ? { generationId: result.generationId } : {}) });
        throw error;
      }
      diagnose({ phase: "completed", model, requestBytes: result.requestBytes, elapsedMs: Date.now() - result.startedAt, ...(result.status === undefined ? {} : { status: result.status }), ...(result.generationId ? { generationId: result.generationId } : {}) });
      return { reply, model };
    },
    async generate(request: { session: M04Session; stage: DataStage; method: string }) {
      if (request.stage === "human-decision") throw new Error("The decision must be recorded by an authorised human");
      const model = config.draftModel ?? config.model;
      const jsonSchema = draftResponseSchema(request.session, request.stage);
      const safePropertyNames = new Set<string>();
      const collectProperties = (node: unknown): void => {
        if (!node || typeof node !== "object") return;
        const record = node as Record<string, unknown>;
        if (record.properties && typeof record.properties === "object") {
          for (const [name, child] of Object.entries(record.properties as Record<string, unknown>)) {
            safePropertyNames.add(name);
            collectProperties(child);
          }
        }
        if (record.items) collectProperties(record.items);
        if (record.definitions && typeof record.definitions === "object")
          for (const child of Object.values(record.definitions as Record<string, unknown>)) collectProperties(child);
      };
      collectProperties(jsonSchema);
      const result = await complete(draftMessages(request.session, request.stage, request.method), model, config.draftMaxTokens, {
        responseFormat: { type: "json_schema", json_schema: { name: `m04_${request.stage.replace(/[^A-Za-z0-9_]/g, "_")}`, strict: true, schema: jsonSchema } },
        provider: { require_parameters: true },
        stream: false,
      });
      let candidate: unknown;
      try {
        candidate = parseDraftCandidate(request.stage, result.value);
      } catch (reason) {
        const error = new SafeProviderError(providerErrorName("draft_schema"), "AI provider returned an invalid draft");
        const schemaIssues = reason instanceof z.ZodError
          ? reason.issues.slice(0, 10).map((issue) => ({
              code: /^[a-z_]+$/.test(issue.code) ? issue.code : "unknown",
              path: issue.path.slice(0, 12).map((part) => typeof part === "number" ? part : typeof part === "string" && safePropertyNames.has(part) ? part : "[unknown]"),
            }))
          : undefined;
        diagnose({ phase: "failed", model, requestBytes: result.requestBytes, elapsedMs: Date.now() - result.startedAt, ...(result.status === undefined ? {} : { status: result.status }), failureKind: "draft_schema", ...(schemaIssues ? { schemaIssues } : {}), ...(result.generationId ? { generationId: result.generationId } : {}) });
        throw error;
      }
      diagnose({ phase: "completed", model, requestBytes: result.requestBytes, elapsedMs: Date.now() - result.startedAt, ...(result.status === undefined ? {} : { status: result.status }), ...(result.generationId ? { generationId: result.generationId } : {}) });
      return { candidate, model, usage: result.usage ?? null };
    },
  };
}
