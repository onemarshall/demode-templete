import { z } from "zod";

export type FetchFn = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
export type CompletionConfig = {
  apiKey: string; endpoint: string; timeoutMs: number; fetch?: FetchFn;
  errorPrefix: string; onDiagnostic?: (event: CompletionDiagnostic) => void; reportCompleted?: boolean;
};
export type CompletionDiagnostic = { phase: "start" | "headers" | "completed" | "failed"; model: string; maxTokens?: number; requestBytes?: number; elapsedMs?: number; status?: number; failureKind?: string; generationId?: string };
const ResponseSchema = z.object({ id: z.unknown().optional(), choices: z.array(z.object({ message: z.object({ content: z.string().nullable().optional() }), finish_reason: z.string().nullable().optional() })).optional(), usage: z.unknown().optional() });
const MAX_RESPONSE_BYTES = 2 * 1024 * 1024;
class ProviderError extends Error { constructor(name: string, message: string) { super(message); this.name = name; } }
const safeId = (value: unknown) => typeof value === "string" && value.length <= 128 && /^[A-Za-z0-9._:-]+$/.test(value) ? value : undefined;
async function boundedText(response: Response, signal: AbortSignal) {
  const length = response.headers.get("content-length");
  if (length && Number(length) > MAX_RESPONSE_BYTES) throw new Error("oversize");
  if (!response.body) throw new Error("empty");
  const reader = response.body.getReader(), chunks: Uint8Array[] = []; let total = 0;
  const cancel = () => { void reader.cancel().catch(() => {}); };
  signal.addEventListener("abort", cancel, { once: true });
  try { while (true) { const { done, value } = await reader.read(); if (done) break; total += value.byteLength; if (total > MAX_RESPONSE_BYTES) { await reader.cancel(); throw new Error("oversize"); } chunks.push(value); } }
  finally { signal.removeEventListener("abort", cancel); reader.releaseLock(); }
  const bytes = new Uint8Array(total); let offset = 0; for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
}
/** Bounded OpenAI-compatible HTTP completion transport shared by M01 and M04. */
export async function boundedCompletion(config: CompletionConfig, request: { messages: unknown[]; model: string; maxTokens: number; responseFormat?: unknown; provider?: unknown; stream?: boolean; reasoningEffort?: string }) {
  const fetcher = config.fetch ?? globalThis.fetch, controller = new AbortController(), startedAt = Date.now();
  const body = JSON.stringify({ model: request.model, max_tokens: request.maxTokens, response_format: request.responseFormat ?? { type: "json_object" }, ...(request.provider === undefined ? {} : { provider: request.provider }), ...(request.stream === undefined ? {} : { stream: request.stream }), ...(request.reasoningEffort === undefined ? {} : { reasoning: { effort: request.reasoningEffort } }), messages: request.messages });
  const requestBytes = new TextEncoder().encode(body).byteLength; let status: number | undefined, generationId: string | undefined;
  const diagnose = (event: CompletionDiagnostic) => { try { config.onDiagnostic?.(event); } catch { /* diagnostics are isolated */ } };
  const fail = (kind: string, message: string) => new ProviderError(`${config.errorPrefix}${kind.split("_").map(x => x[0]!.toUpperCase()+x.slice(1)).join("")}Error`, message);
  diagnose({ phase: "start", model: request.model, maxTokens: request.maxTokens, requestBytes, elapsedMs: 0 });
  let timer: ReturnType<typeof setTimeout> | undefined;
  const operation = async () => {
    let response: Response;
    try { response = await fetcher(config.endpoint, { method: "POST", headers: { authorization: `Bearer ${config.apiKey}`, "content-type": "application/json" }, signal: controller.signal, redirect: "error", body }); }
    catch { throw fail(controller.signal.aborted ? "timeout" : "request", "AI provider request failed or timed out"); }
    status = response.status; diagnose({ phase: "headers", model: request.model, requestBytes, elapsedMs: Date.now()-startedAt, status });
    if (response.redirected || (status >= 300 && status < 400)) throw fail("redirect", "AI provider redirect was rejected");
    if (!response.ok) throw fail("http", "AI provider request failed");
    let parsed: z.infer<typeof ResponseSchema>;
    try { parsed = ResponseSchema.parse(JSON.parse(await boundedText(response, controller.signal))); }
    catch { throw fail(controller.signal.aborted ? "timeout" : "response", "AI provider returned an invalid response"); }
    generationId = safeId(parsed.id); const choice = parsed.choices?.[0];
    if (choice?.finish_reason === "length") throw fail("truncated", "AI response was truncated; retry with a narrower request");
    if (!choice?.message.content) throw fail("no_content", "AI provider returned no usable response");
    let value: unknown; try { value = JSON.parse(choice.message.content); } catch { throw fail("content_json", "AI provider returned invalid JSON"); }
    return { value, usage: parsed.usage, status, generationId, startedAt, requestBytes };
  };
  const deadline = new Promise<never>((_, reject) => { timer = setTimeout(() => { controller.abort(); reject(fail("timeout", "AI provider request failed or timed out")); }, config.timeoutMs); });
  try { const result = await Promise.race([operation(), deadline]); if (config.reportCompleted !== false) diagnose({ phase: "completed", model: request.model, requestBytes, elapsedMs: Date.now()-startedAt, ...(status === undefined ? {} : { status }), ...(generationId ? { generationId } : {}) }); return result; }
  catch (error) { const kind = error instanceof Error ? error.name.replace(config.errorPrefix, "").replace(/Error$/, "") : "Response"; diagnose({ phase: "failed", model: request.model, requestBytes, elapsedMs: Date.now()-startedAt, ...(status === undefined ? {} : { status }), failureKind: kind.replace(/[A-Z]/g, c => `_${c.toLowerCase()}`).replace(/^_/, ""), ...(generationId ? { generationId } : {}) }); throw error; }
  finally { if (timer !== undefined) clearTimeout(timer); }
}
