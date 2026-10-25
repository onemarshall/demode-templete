import { beforeEach, describe, expect, it, vi } from "vitest";
import { render } from "vitest-browser-svelte";
import { page } from "vitest/browser";
import type { PageData } from "../$types";

const mocks = vi.hoisted(() => ({ deleteUser: vi.fn() }));
vi.mock("#lib/modules/auth/client/client.js", () => ({ authClient: { deleteUser: mocks.deleteUser } }));
import AccountPage from "../+page.svelte";

function data(allowed = true): PageData {
  return {
    user: {
      id: "account-test",
      email: "person@example.com",
      emailVerified: true,
      name: "Test Person",
      createdAt: new Date("2026-10-22T10:00:00Z"),
    },
    roles: [allowed ? "user" : "admin"],
    hasPassword: false,
    deletionEligibility: allowed
      ? { allowed: true, reason: null, message: null }
      : { allowed: false, reason: "admin", message: "Administrator accounts cannot be deleted." },
  } as unknown as PageData;
}

beforeEach(() => vi.clearAllMocks());

describe("Account & privacy page", () => {
  it("shows account details and requires reviewing deletion before making a request", async () => {
    render(AccountPage, { data: data() });
    await expect.element(page.getByText("person@example.com", { exact: true })).toBeVisible();
    await expect.element(page.getByText("22 October 2026", { exact: true })).toBeVisible();
    await expect.element(page.getByRole("button", { name: "Download account data" })).toBeVisible();
    await expect
      .element(page.getByText(/Data held by connected services is not included/))
      .toBeVisible();
    await page.getByRole("button", { name: "Review account deletion", exact: true }).click();
    await expect.element(page.getByRole("alertdialog")).toBeVisible();
    expect(mocks.deleteUser).not.toHaveBeenCalled();
  });

  it("offers sign-in again when the download needs a fresh session", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 403,
        json: async () => ({ error: "Please sign in again before downloading your data." }),
      }),
    );
    render(AccountPage, { data: data() });
    await page.getByRole("button", { name: "Download account data" }).click();
    await expect
      .element(page.getByText(/Please sign in again before downloading your data/))
      .toBeVisible();
    await expect
      .element(page.getByRole("link", { name: "Sign in again" }))
      .toHaveAttribute("href", "/auth/sign-in");
    vi.unstubAllGlobals();
  });

  it("attaches a JSON download link and reports when the download is prepared", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue({
          ok: true,
          blob: async () => new Blob(["{}"], { type: "application/json" }),
        }),
    );
    const createObjectURL = vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:account-export");
    const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
    render(AccountPage, { data: data() });
    await page.getByRole("button", { name: "Download account data" }).click();
    await expect
      .element(page.getByRole("status"))
      .toHaveTextContent("Download prepared. Check your downloads.");
    expect(createObjectURL).toHaveBeenCalled();
    expect(click).toHaveBeenCalled();
    const downloadLink = document.querySelector<HTMLAnchorElement>('a[download^="account-data-"]');
    expect(downloadLink?.isConnected).toBe(true);
    expect(downloadLink?.href).toBe("blob:account-export");
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("explains an administrator restriction and disables the deletion action", async () => {
    render(AccountPage, { data: data(false) });
    await expect
      .element(page.getByText("Administrator accounts cannot be deleted.", { exact: true }))
      .toBeVisible();
    await expect
      .element(page.getByRole("button", { name: "Review account deletion", exact: true }))
      .toBeDisabled();
    expect(mocks.deleteUser).not.toHaveBeenCalled();
  });
});
