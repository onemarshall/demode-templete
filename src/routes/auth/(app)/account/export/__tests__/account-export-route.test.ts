import { beforeEach, describe, expect, it, vi } from "vitest";

const mockCreateExport = vi.hoisted(() => vi.fn());
vi.mock("#lib/auth/server/account-export.js", () => ({ createAccountExport: mockCreateExport }));

import { GET } from "../+server";

beforeEach(() => vi.clearAllMocks());

describe("account export download route", () => {
  it("returns JSON as a private attachment and forwards request credentials", async () => {
    mockCreateExport.mockResolvedValue({
      format: "account-data-export",
      profile: { id: "user-a" },
    });
    const request = new Request("https://example.test/auth/account/export", {
      headers: { cookie: "session-cookie" },
    });
    const response = await GET({ request } as never);
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("application/json");
    expect(response.headers.get("content-disposition")).toMatch(
      /^attachment; filename="account-data-\d{4}-\d{2}-\d{2}\.json"$/,
    );
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(mockCreateExport).toHaveBeenCalledWith(request.headers);
    expect(await response.json()).toMatchObject({ profile: { id: "user-a" } });
  });

  it("keeps authentication failures actionable and hides internal failures", async () => {
    mockCreateExport.mockRejectedValueOnce(
      Object.assign(new Error("Please sign in again"), { status: 403 }),
    );
    const denied = await GET({
      request: new Request("https://example.test/auth/account/export"),
    } as never);
    expect(denied.status).toBe(403);
    expect(await denied.json()).toEqual({ error: "Please sign in again" });

    mockCreateExport.mockRejectedValueOnce(new Error("database password leaked"));
    const failed = await GET({
      request: new Request("https://example.test/auth/account/export"),
    } as never);
    expect(failed.status).toBe(503);
    expect(await failed.json()).toEqual({
      error: "Your account data could not be prepared. Please try again later.",
    });
  });
});
