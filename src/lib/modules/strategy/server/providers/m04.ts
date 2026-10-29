import { z } from "zod";
import { M04_DEFAULT_SYNTHESIS_MODEL } from "../model-policy";
import type { DataStage } from "../stages/m04/contracts";
import { Reply } from "../stages/m04/chat";
import { draftMessages, draftResponseSchema, parseDraftCandidate } from "../stages/m04/synthesis";
import type { M04Session } from "../stages/m04/contracts";
import type { M04ServicePorts } from "../stages/m04/service";
import { boundedCompletion } from "./completion";

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

class SafeProviderError extends Error {
  constructor(name: string, message: string) { super(message); this.name = name; }
}

function providerErrorName(kind: FailureKind): string {
  return `M04Provider${kind.split("_").map((part) => part[0]!.toUpperCase() + part.slice(1)).join("")}Error`;
}

/** OpenRouter-compatible adapter for the M04 service ports. */
export function createM04Providers(configInput: M04ProviderConfig): Pick<M04ServicePorts, "generate" | "chat"> {
  const config = ConfigSchema.parse(configInput);
  const diagnose = (event: M04ProviderDiagnostic) => {
    try { config.onDiagnostic?.(event); } catch { /* Observability must not affect generation. */ }
  };

  async function complete(messages: unknown[], model: string, maxTokens: number, options?: { responseFormat?: unknown; provider?: unknown; stream?: boolean }) {
    const result = await boundedCompletion({ apiKey: config.apiKey, endpoint: config.endpoint, timeoutMs: config.timeoutMs, fetch: config.fetch, errorPrefix: "M04Provider", reportCompleted: false, onDiagnostic: (event) => {
      if (event.phase === "completed") return;
      diagnose({ phase: event.phase, model: event.model, maxTokens, ...(event.requestBytes === undefined ? {} : { requestBytes: event.requestBytes }), ...(event.elapsedMs === undefined ? {} : { elapsedMs: event.elapsedMs }), ...(event.status === undefined ? {} : { status: event.status }), ...(event.failureKind === undefined ? {} : { failureKind: event.failureKind as FailureKind }), ...(event.generationId === undefined ? {} : { generationId: event.generationId }), ...(event.phase === "start" && config.reasoningEffort !== undefined ? { reasoningEffort: config.reasoningEffort } : {}) });
    } }, { messages, model, maxTokens, responseFormat: options?.responseFormat, provider: options?.provider, stream: options?.stream, reasoningEffort: config.reasoningEffort });
    return { ...result, startedAt: result.startedAt };
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
