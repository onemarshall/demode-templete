import { describe, expect, it, vi } from "vitest";
import { methodReleaseManifests } from "../system.generated";
import { createM03Providers } from "./m03";

const m03Release = Object.entries(methodReleaseManifests).find(([, manifest]) =>
  Boolean(manifest.hashes["03-Business-Commitments/03-Prompt.md"]),
)?.[0];

function setup(payload: unknown) {
  let request: RequestInit | undefined;
  const fetch = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
    request = init;
    return new Response(
      JSON.stringify({
        choices: [{ message: { content: JSON.stringify(payload) }, finish_reason: "stop" }],
        usage: { total_tokens: 321 },
      }),
      { status: 200 },
    );
  });
  const providers = createM03Providers({
    apiKey: "test-secret",
    model: "openai/test-model",
    endpoint: "https://provider.test/chat",
    fetch,
  });
  return { providers, getRequest: () => request };
}

const challenge = {
  contradictions: ["The market assumes feature count proves quality."],
  genuineVsContrarian: "A genuine difference: proof must be inspectable.",
};

describe("M03 provider", () => {
  it("uses the exact pinned M03 method release and returns a validated candidate", async () => {
    expect(m03Release).toBeTruthy();
    const { providers, getRequest } = setup(challenge);
    const result = await providers.generate({
      step: "challenge",
      state: { commitments: { upstream: { m01Inputs: { coreBelief: "Synthetic" } } } },
      methodRelease: m03Release!,
    });
    expect(result.candidate).toEqual(challenge);
    expect(result.model).toBe("openai/test-model");
    const body = JSON.parse(String(getRequest()?.body)) as {
      messages: { role: string; content: string }[];
      response_format: { json_schema: { name: string } };
    };
    expect(body.messages[0]!.content).toContain("Module 03: Business Commitments Prompt");
    expect(body.response_format.json_schema.name).toBe("m03_challenge");
  });

  it("rejects a malformed candidate without leaking provider content", async () => {
    const { providers } = setup({ contradictions: [], genuineVsContrarian: "" });
    const failure = await providers
      .generate({ step: "challenge", state: {}, methodRelease: m03Release! })
      .catch((error: unknown) => error as Error);
    expect(failure).toBeInstanceOf(Error);
    expect((failure as Error).name).toBe("M03ProviderDraftSchemaError");
    expect((failure as Error).message).toBe("AI provider returned an invalid M03 draft");
  });

  it("fails closed when the pinned M03 method release is unavailable", async () => {
    const { providers } = setup(challenge);
    await expect(
      providers.generate({ step: "challenge", state: {}, methodRelease: "0".repeat(64) }),
    ).rejects.toThrow();
  });
});
