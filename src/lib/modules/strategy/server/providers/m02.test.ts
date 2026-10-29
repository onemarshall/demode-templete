import { describe, expect, it, vi } from "vitest";
import { methodReleaseManifests } from "../system.generated";
import { createM02Providers } from "./m02";

const m02Release = Object.entries(methodReleaseManifests).find(([, manifest]) =>
  Boolean(manifest.hashes["02-Market-Reality-Check/02-Prompt.md"]),
)?.[0];

function setup(payload: unknown, extra: Partial<Response> = {}) {
  let request: RequestInit | undefined;
  const fetch = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
    request = init;
    return new Response(
      JSON.stringify(typeof payload === "string" ? payload : {
        choices: [{ message: { content: JSON.stringify(payload) }, finish_reason: "stop" }],
        usage: { total_tokens: 123 },
      }),
      { status: 200, ...extra },
    );
  });
  const providers = createM02Providers({
    apiKey: "test-secret",
    model: "openai/test-model",
    endpoint: "https://provider.test/chat",
    fetch,
  });
  return { providers, fetch, getRequest: () => request };
}

describe("M02 provider", () => {
  it("uses the exact pinned M02 method release and returns a validated setup hypothesis", async () => {
    expect(m02Release).toBeTruthy();
    const candidate = {
      competitors: [{ name: "Example competitor", url: "https://example.test" }],
      cohort: "Independent repair shops",
      geography: "North West England",
    };
    const state = { m01Inputs: { hiddenTruth: "Founder supplied hypothesis" }, artifacts: [] };
    const { providers, getRequest, fetch } = setup(candidate);
    const result = await providers.generate({ gate: "setup", state, methodRelease: m02Release! });
    expect(result).toEqual({
      candidate: {
        ...candidate,
        competitors: [{ ...candidate.competitors[0], urlSource: "model" }],
        platforms: [],
        sectorGuess: "",
        rationale: "",
      },
      model: "openai/test-model",
      usage: { total_tokens: 123 },
    });
    expect(fetch).toHaveBeenCalledOnce();
    const body = JSON.parse(String(getRequest()?.body));
    expect(body.model).toBe("openai/test-model");
    expect(body.max_tokens).toBe(12_000);
    expect(body.response_format).toMatchObject({ type: "json_schema", json_schema: { strict: true, name: "m02_setup" } });
    expect(body.provider).toEqual({ require_parameters: true });
    expect(body.stream).toBe(false);
    const system = body.messages[0].content as string;
    expect(system).toContain("Market Reality Check");
    expect(system).toContain("Do not perform or imply external research");
    expect(body.messages[1].content).toContain(JSON.stringify(state));
    expect(new Headers(getRequest()?.headers).get("authorization")).toBe("Bearer test-secret");
  });

  it("validates the existing gate draft schemas locally, including a transform-bearing risk draft", async () => {
    const cases = [
      { gate: "terrain", candidate: { diagnosis: "ambiguous-needs-evidence" } },
      { gate: "gate1", candidate: {} },
      { gate: "gate2", candidate: {} },
      { gate: "gate3", candidate: {} },
      { gate: "gate4", candidate: {} },
      { gate: "gate5", candidate: { risks: [{ pattern: "r1", state: "unclear", acknowledgmentLine: null }] } },
      { gate: "gate6", candidate: {} },
    ] as const;
    for (const { gate, candidate } of cases) {
      const { providers } = setup(candidate);
      const result = await providers.generate({ gate, state: {}, methodRelease: m02Release! });
      expect(result.model).toBe("openai/test-model");
      if (gate === "gate5") {
        expect(result.candidate).toMatchObject({
          risks: [{ pattern: "r1", state: "unclear", acknowledgmentLine: "", evidence: "", severity: null }],
        });
      } else {
        expect(result.candidate).toMatchObject(candidate);
      }
    }
  });

  it("rejects malformed candidates with safe diagnostics and does not return or log provider content", async () => {
    const secret = "untrusted-private-provider-output";
    const diagnostics: unknown[] = [];
    const providers = createM02Providers({
      apiKey: "test-secret",
      model: "openai/test-model",
      onDiagnostic: (event) => diagnostics.push(event),
      fetch: async () => new Response(JSON.stringify({
        choices: [{ message: { content: JSON.stringify({ cohort: secret, competitors: [] }) }, finish_reason: "stop" }],
      })),
    });
    await expect(providers.generate({ gate: "setup", state: {}, methodRelease: m02Release! }))
      .rejects.toMatchObject({ name: "M02ProviderDraftSchemaError", message: "AI provider returned an invalid M02 draft" });
    expect(diagnostics.at(-1)).toMatchObject({ phase: "failed", failureKind: "draft_schema" });
    expect(JSON.stringify(diagnostics)).not.toContain(secret);
    expect(JSON.stringify(diagnostics)).not.toContain("test-secret");
  });

  it("rejects setup drafts that claim a search or reachability check that did not happen", async () => {
    const providers = setup({
      competitors: [{ name: "Example participant", url: "https://example.test", urlSource: "search", urlCheck: "ok" }],
      cohort: "Independent repair shops",
      geography: "North West England",
    }).providers;
    await expect(providers.generate({ gate: "setup", state: {}, methodRelease: m02Release! })).rejects.toMatchObject({
      name: "M02ProviderDraftSchemaError",
      message: "AI provider returned an invalid M02 draft",
    });
  });

  it("fails closed when a job's pinned method release is unavailable", async () => {
    const { providers, fetch } = setup({});
    await expect(providers.generate({ gate: "gate2", state: {}, methodRelease: "missing-release" }))
      .rejects.toThrow("Requested method release is not available in this build");
    expect(fetch).not.toHaveBeenCalled();
  });

  it("uses bounded provider errors without exposing response bodies", async () => {
    const providers = createM02Providers({
      apiKey: "test-secret",
      fetch: async () => new Response("private-provider-error-body", { status: 503 }),
    });
    const error = await providers.generate({ gate: "gate2", state: {}, methodRelease: m02Release! }).catch((reason) => reason);
    expect(error.name).toBe("M02ProviderHttpError");
    expect(error.message).toBe("AI provider request failed");
    expect(error.message).not.toContain("private-provider-error-body");
  });
});
