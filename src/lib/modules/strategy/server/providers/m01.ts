import { z } from "zod";
import { boundedCompletion, type CompletionDiagnostic, type FetchFn } from "./completion";
import type { M01Ports } from "../stages/m01/service";
import type { ModelContract } from "../stages/m01/synthesis";

const Config = z.object({ apiKey: z.string().min(1), model: z.string().min(1).default("openai/gpt-6.1-sol"), chatModel: z.string().min(1).optional(), draftModel: z.string().min(1).optional(), endpoint: z.string().url().default("https://openrouter.ai/api/v1/chat/completions").refine(v => { const u = new URL(v); return !u.username && !u.password; }), timeoutMs: z.number().int().min(1000).max(900_000).default(120_000), draftMaxTokens: z.number().int().min(1000).max(18_000).default(18_000), chatMaxTokens: z.number().int().min(1000).max(12_000).default(12_000), reasoningEffort: z.enum(["none", "minimal", "low", "medium", "high"]).optional(), fetch: z.custom<FetchFn>().optional(), onDiagnostic: z.custom<(event: CompletionDiagnostic) => void>().optional() });
export type M01ProviderConfig = z.input<typeof Config>;
const objectSchema = (contract?: ModelContract) => contract ? { type: "json_schema", json_schema: { name: contract.name, strict: true, schema: contract.schema } } : { type: "json_object" };
/** OpenRouter-compatible M01 model adapter. Diagnostics contain metadata only. */
export function createM01Providers(input: M01ProviderConfig): NonNullable<M01Ports["model"]> {
  const config = Config.parse(input), common = { apiKey: config.apiKey, endpoint: config.endpoint, timeoutMs: config.timeoutMs, fetch: config.fetch, errorPrefix: "M01Provider", onDiagnostic: config.onDiagnostic };
  const call = async (system: string, user: string, contract?: ModelContract) => {
    const result = await boundedCompletion(common, { model: config.draftModel ?? config.model, maxTokens: config.draftMaxTokens, reasoningEffort: config.reasoningEffort, responseFormat: objectSchema(contract), provider: contract ? { require_parameters: true } : undefined, stream: contract ? false : undefined, messages: [{ role: "system", content: system }, { role: "user", content: user }] });
    return result.value;
  };
  return { name: config.draftModel ?? config.model, call, async chat(messages) {
    const result = await boundedCompletion(common, { model: config.chatModel ?? config.model, maxTokens: config.chatMaxTokens, reasoningEffort: config.reasoningEffort, responseFormat: { type: "json_schema", json_schema: { name: "m01_interview_reply", strict: true, schema: { type: "object", additionalProperties: false, required: ["say"], properties: { say: { type: "string", minLength: 1 } } } } }, provider: { require_parameters: true }, stream: false, messages });
    const parsed = z.string().parse((result.value as { say?: unknown })?.say);
    return parsed;
  } };
}
