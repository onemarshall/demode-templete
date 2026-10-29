import { describe, expect, it, vi } from "vitest";
import { collectM02Url, htmlToM02Text, type M02UrlCollectorDependencies, type M02UrlRequestResponse } from "./m02-collection";

const publicV4 = [{ address: "93.184.216.34", family: 4 }];
type RequestInput = Parameters<NonNullable<M02UrlCollectorDependencies["request"]>>[0];
const page = (status: number, contentType: string, text: string, location?: string): M02UrlRequestResponse => ({
  status,
  headers: { "content-type": contentType, ...(location ? { location } : {}) },
  body: (async function* () { yield new TextEncoder().encode(text); })(),
});
const baseInput = { url: "https://evidence.example.org/page", kind: "market" as const, target: "regional repair market" };
const dependencies = (request: NonNullable<M02UrlCollectorDependencies["request"]>, overrides: Partial<M02UrlCollectorDependencies> = {}): M02UrlCollectorDependencies => ({
  resolve: async () => publicV4,
  request,
  now: () => "2026-10-29T12:00:00.000Z",
  ...overrides,
});

describe("M02 public URL evidence collection", () => {
  it("retains legacy HTML extraction semantics and safely handles invalid numeric entities", () => {
    const extracted = htmlToM02Text(`<!doctype html><html><head><title>Market &amp; care</title><meta name="description" content="A &#x1F4C8; signal"></head><body><script>hidden()</script><h2>Market&nbsp;shape</h2><p>Buyers&#39; needs &#x110000; remain visible.</p></body></html>`);
    expect(extracted.title).toBe("Market & care");
    expect(extracted.text).toContain("A 📈 signal");
    expect(extracted.text).toContain("Market shape");
    expect(extracted.text).toContain("Buyers' needs &#x110000; remain visible.");
    expect(extracted.text).not.toContain("hidden()");
  });

  it("captures citation-ready text with exact requested/final URL, status, retrieval time and public consent", async () => {
    const request = vi.fn(async (_input: RequestInput) => page(200, "text/html; charset=utf-8", "<title>Public report</title><p>Observed evidence, verbatim.</p>"));
    const result = await collectM02Url(baseInput, dependencies(request));
    expect(result.artifacts).toHaveLength(1);
    expect(result.artifacts[0]).toMatchObject({
      kind: "market",
      channel: "url_fetch",
      target: "regional repair market",
      source: "Public web page",
      url: "https://evidence.example.org/page",
      finalUrl: "https://evidence.example.org/page",
      retrievedAt: "2026-10-29T12:00:00.000Z",
      status: "gathered",
      httpStatus: 200,
      access: "public",
      consent: "public artifact",
      title: "Public report",
      verbatim: "Public report Observed evidence, verbatim.",
    });
    expect(request).toHaveBeenCalledWith(expect.objectContaining({
      address: "93.184.216.34",
      headers: expect.objectContaining({ accept: expect.stringContaining("text/html"), "user-agent": expect.any(String) }),
    }));
    const options = request.mock.calls[0]![0];
    expect(Object.keys(options.headers).some((key) => /authorization|cookie/i.test(key))).toBe(false);
  });

  it.each([
    "http://evidence.example.org/page",
    "https://user:secret@evidence.example.org/page",
    "https://evidence.example.org:8443/page",
    "https://localhost/page",
    "https://sub.localhost/page",
    "https://127.0.0.1/page",
    "https://10.2.3.4/page",
    "https://169.254.10.2/page",
    "https://192.0.2.12/page",
    "https://100.64.12.10/page",
    "https://[fd00::1]/page",
    "https://[::ffff:127.0.0.1]/page",
  ])("fails safely before making a request for a forbidden URL: %s", async (url) => {
    const request = vi.fn(async () => page(200, "text/plain", "must not fetch"));
    const result = await collectM02Url({ ...baseInput, url }, dependencies(request));
    expect(result.artifacts[0]).toMatchObject({ status: "failed", error: expect.any(String), consent: "public artifact" });
    expect(request).not.toHaveBeenCalled();
  });

  it("rejects a DNS answer set containing any private address, preventing mixed-answer rebinding", async () => {
    const request = vi.fn(async () => page(200, "text/plain", "must not fetch"));
    const result = await collectM02Url(baseInput, dependencies(request, {
      resolve: async () => [{ address: "93.184.216.34", family: 4 }, { address: "192.168.1.9", family: 4 }],
    }));
    expect(result.artifacts[0]).toMatchObject({ status: "failed", error: "destination host resolves to a non-public address" });
    expect(request).not.toHaveBeenCalled();
  });

  it.each([
    { address: "127.0.0.1", family: 4 },
    { address: "169.254.169.254", family: 4 },
    { address: "2001:db8::1", family: 6 },
    { address: "fe80::1", family: 6 },
    { address: "fc00::1", family: 6 },
  ])("rejects non-public DNS answer $address", async (answer) => {
    const request = vi.fn(async (_input: RequestInput) => page(200, "text/plain", "must not fetch"));
    const result = await collectM02Url(baseInput, dependencies(request, { resolve: async () => [answer] }));
    expect(result.artifacts[0]?.status).toBe("failed");
    expect(request).not.toHaveBeenCalled();
  });

  it("revalidates each redirect and refuses redirects to local or reserved destinations", async () => {
    const request = vi.fn(async () => page(302, "text/html", "", "https://127.0.0.1/private"));
    const result = await collectM02Url(baseInput, dependencies(request));
    expect(result.artifacts[0]).toMatchObject({ status: "failed", finalUrl: "https://127.0.0.1/private", httpStatus: 302, error: "destination host resolves to a non-public address" });
    expect(request).toHaveBeenCalledOnce();
  });

  it("follows at most three individually validated public redirects", async () => {
    let count = 0;
    const request = vi.fn(async () => {
      count += 1;
      return count <= 3
        ? page(302, "text/html", "", `/step-${count}`)
        : page(200, "text/plain", "Final public evidence");
    });
    const result = await collectM02Url(baseInput, dependencies(request));
    expect(result.artifacts[0]).toMatchObject({ status: "gathered", url: baseInput.url, finalUrl: "https://evidence.example.org/step-3", verbatim: "Final public evidence" });
    expect(request).toHaveBeenCalledTimes(4);
  });

  it("records redirect-limit, HTTP, unsupported-type and empty-page failures without substituting inference", async () => {
    const redirects = vi.fn(async () => page(302, "text/html", "", "/next"));
    const redirectFailure = await collectM02Url(baseInput, dependencies(redirects));
    expect(redirectFailure.artifacts[0]).toMatchObject({ status: "failed", error: "redirect limit exceeded" });
    expect(redirects).toHaveBeenCalledTimes(4);

    const httpFailure = await collectM02Url(baseInput, dependencies(async () => page(503, "text/plain", "private response body")));
    expect(httpFailure.artifacts[0]).toMatchObject({ status: "failed", httpStatus: 503, error: "HTTP 503" });
    expect(httpFailure.artifacts[0]?.verbatim).toBe("");

    const typeFailure = await collectM02Url(baseInput, dependencies(async () => page(200, "application/octet-stream", "binary")));
    expect(typeFailure.artifacts[0]).toMatchObject({ status: "failed", error: "unsupported content type" });

    const emptyFailure = await collectM02Url(baseInput, dependencies(async () => page(200, "text/plain", " \n ")));
    expect(emptyFailure.artifacts[0]).toMatchObject({ status: "failed", error: "page returned no usable content" });
  });

  it("rejects a body as soon as streamed bytes exceed the cap and cancels the stream", async () => {
    let cancelled = false;
    const response: M02UrlRequestResponse = {
      status: 200,
      headers: { "content-type": "text/plain" },
      body: (async function* () {
        yield new Uint8Array(400_000);
        yield new Uint8Array(300_001);
      })(),
      cancel: () => { cancelled = true; },
    };
    const result = await collectM02Url(baseInput, dependencies(async () => response));
    expect(result.artifacts[0]).toMatchObject({ status: "failed", error: "page exceeded the 700 KB capture limit" });
    expect(cancelled).toBe(true);
  });

  it("applies one total deadline, including DNS resolution", async () => {
    const request = vi.fn(async () => page(200, "text/plain", "late"));
    const result = await collectM02Url(baseInput, dependencies(request, {
      timeoutMs: 10,
      resolve: async () => new Promise((resolve) => setTimeout(() => resolve(publicV4), 50)),
    }));
    expect(result.artifacts[0]).toMatchObject({ status: "failed", error: "timed out after 1s" });
    expect(request).not.toHaveBeenCalled();
  });
});
