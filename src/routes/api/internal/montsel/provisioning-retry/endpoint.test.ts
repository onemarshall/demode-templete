import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  env: {
    AUTH_ORGANIZATION_PLUGIN: true,
    MONTSEL_RECOVERY_TOKEN: "a-private-recovery-token-with-32-characters",
  },
  process: vi.fn(),
}));
vi.mock("#lib/auth/shared/env/index.js", () => ({ getServerEnv: async () => mocks.env }));
vi.mock("#lib/server/brand/provisioning.js", () => ({
  processDueProvisioningRetries: mocks.process,
}));
import { POST } from "./+server";
function event(authorization?: string) {
  return {
    request: new Request("http://localhost/api/internal/montsel/provisioning-retry", {
      method: "POST",
      headers: authorization ? { authorization } : {},
    }),
  } as Parameters<typeof POST>[0];
}
beforeEach(() => {
  vi.clearAllMocks();
  mocks.env.AUTH_ORGANIZATION_PLUGIN = true;
  mocks.process.mockResolvedValue({ processed: 1, active: 1, failed: 0 });
});
describe("bounded provisioning recovery endpoint", () => {
  it("denies missing and invalid service tokens without database work", async () => {
    await expect(POST(event())).rejects.toMatchObject({ status: 404 });
    await expect(POST(event("Bearer wrong"))).rejects.toMatchObject({ status: 404 });
    expect(mocks.process).not.toHaveBeenCalled();
  });
  it("stays disabled with the tenancy feature", async () => {
    mocks.env.AUTH_ORGANIZATION_PLUGIN = false;
    await expect(POST(event(`Bearer ${mocks.env.MONTSEL_RECOVERY_TOKEN}`))).rejects.toMatchObject({
      status: 404,
    });
    expect(mocks.process).not.toHaveBeenCalled();
  });
  it("runs a fixed batch for an explicit service principal and prevents caching", async () => {
    const response = await POST(event(`Bearer ${mocks.env.MONTSEL_RECOVERY_TOKEN}`));
    expect(mocks.process).toHaveBeenCalledWith(25);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(await response.json()).toEqual({ processed: 1, active: 1, failed: 0 });
  });
});
