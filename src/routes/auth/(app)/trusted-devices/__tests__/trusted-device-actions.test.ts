import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ session: vi.fn(), revoke: vi.fn(), cookie: vi.fn() }));
vi.mock("#lib/modules/auth/server/config.js", () => ({
  auth: {
    api: { getSession: mocks.session, revokeOtherSessions: mocks.revoke },
    $context: Promise.resolve({ createAuthCookie: mocks.cookie }),
  },
}));
import { actions, load } from "../+page.server";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.session.mockResolvedValue({ user: { id: "user", twoFactorEnabled: true } });
  mocks.cookie.mockReturnValue({
    name: "__Secure-iam-studio.trust_device",
    attributes: { path: "/", domain: "example.test", secure: true, httpOnly: true },
  });
  mocks.revoke.mockResolvedValue({ status: true });
});
const request = new Request("https://example.test/auth/trusted-devices", {
  headers: { cookie: "__Secure-iam-studio.trust_device=signed" },
});
const callAction = (name: "revokeCurrentDevice" | "revokeAllDevices", deleteCookie = vi.fn()) =>
  actions[name]!({ request, cookies: { delete: deleteCookie } } as never);

describe("trusted device response accuracy", () => {
  it("clears the configured trust cookie with matching domain and path", async () => {
    const remove = vi.fn();
    const result = await callAction("revokeCurrentDevice", remove);
    expect(remove).toHaveBeenCalledWith(
      "__Secure-iam-studio.trust_device",
      expect.objectContaining({ path: "/", domain: "example.test", secure: true }),
    );
    expect(result).toMatchObject({ success: true });
  });

  it("does not claim other-browser trust was removed after signing out sessions", async () => {
    const result = await callAction("revokeAllDevices");
    expect(result).toMatchObject({
      success: true,
      message: expect.stringContaining("Trust cookies on other browsers are unchanged"),
    });
  });

  it("reports the completed browser change and failed session sign-out separately", async () => {
    mocks.revoke.mockRejectedValue(new Error("Unavailable"));
    const result = await callAction("revokeAllDevices");
    expect(result).toMatchObject({
      status: 500,
      data: {
        partial: true,
        error: expect.stringContaining("other sessions could not be signed out"),
      },
    });
  });

  it("rejects explicit unsuccessful session revocation results", async () => {
    mocks.revoke.mockResolvedValue({ status: false });
    expect(await callAction("revokeAllDevices")).toMatchObject({
      status: 500,
      data: { partial: true },
    });
  });

  it("requires authentication before clearing trust", async () => {
    mocks.session.mockResolvedValue(null);
    const remove = vi.fn();
    expect(await callAction("revokeCurrentDevice", remove)).toMatchObject({ status: 401 });
    expect(remove).not.toHaveBeenCalled();
  });

  it("detects the exact configured cookie and correctly recognises iOS", async () => {
    const data = await load({
      request: new Request(request.url, {
        headers: {
          cookie: "__Secure-iam-studio.trust_device=signed",
          "user-agent": "iPhone Mac OS X Safari",
        },
      }),
      getClientAddress: () => "192.0.2.1",
      depends: vi.fn(),
    } as never);
    expect(data).toMatchObject({ isCurrentDeviceTrusted: true, currentDevice: { osName: "iOS" } });
  });
});
