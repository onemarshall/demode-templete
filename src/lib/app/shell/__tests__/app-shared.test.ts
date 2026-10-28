import { describe, expect, it } from "vitest";
import {
  displayBrandId,
  getNavGroups,
  getNavLinks,
  isItemActive,
  navGroups,
  assistantPath,
} from "../../navigation/config";

const user = { id: "user-1", email: "person@example.com" };

describe("unified application navigation", () => {
  it("keeps one product order across every shell", () => {
    expect(navGroups[0].items.map((item) => item.title)).toEqual([
      "Dashboard",
      "Diagnostic",
      "Strategy",
      "Tools",
      "Documents",
    ]);
  });

  it("exposes every account destination from the same sidebar", () => {
    const account = getNavGroups(user).find((group) => group.label === "Account");
    const settings = account?.items.find((item) => item.title === "Account settings");
    expect(settings?.subItems?.map((item) => item.path)).toEqual([
      "/auth/profile",
      "/auth/security",
      "/auth/sessions",
      "/auth/activity",
      "/auth/account",
      "/auth/billing",
    ]);
  });

  it("reaches organisations and help from the account group", () => {
    const account = getNavGroups(user).find((group) => group.label === "Account");
    expect(account?.items.filter((item) => item.path).map((item) => item.title)).toEqual([
      "Organisations",
      "Help",
    ]);
  });

  it("keeps the assistant in the header rather than the sidebar", () => {
    expect(getNavLinks(user).some((item) => item.path === assistantPath)).toBe(false);
  });

  it("hides product and tenancy destinations when tenancy is disabled", () => {
    const paths = getNavLinks(user, { tenancyEnabled: false }).map((item) => item.path);
    expect(paths).not.toContain("/app");
    expect(paths).not.toContain("/app/diagnostic");
    expect(paths).not.toContain("/organisations");
    expect(paths).toContain("/auth/profile");
  });

  it.each(["admin", "user, admin", ["user", "admin"]])(
    "exposes administration for supported admin role representation %j",
    (role) => {
      const admin = getNavGroups({ ...user, role }).find(
        (group) => group.label === "Administration",
      );
      expect(admin?.items.map((item) => item.title)).toEqual([
        "Users & access",
        "Security activity",
      ]);
    },
  );

  it.each([null, undefined, { ...user, role: "user" }, { ...user, role: "superadmin" }])(
    "hides administration from unauthorised users %j",
    (account) => {
      expect(getNavGroups(account).some((group) => group.label === "Administration")).toBe(false);
    },
  );
});

describe("active destination", () => {
  it("matches the dashboard only on its exact path", () => {
    const dashboard = { title: "Dashboard", path: "/app", exact: true };
    expect(isItemActive("/app", dashboard)).toBe(true);
    expect(isItemActive("/app/diagnostic", dashboard)).toBe(false);
  });

  it("keeps a product section active for its deeper routes", () => {
    const diagnostic = { title: "Diagnostic", path: "/app/diagnostic" };
    expect(isItemActive("/app/diagnostic/signal", diagnostic)).toBe(true);
    expect(isItemActive("/app/diagnostics", diagnostic)).toBe(false);
  });

  it("marks account subpages active without matching unrelated prefixes", () => {
    const account = { title: "Account & privacy", path: "/auth/account" };
    expect(isItemActive("/auth/account/delete", account)).toBe(true);
    expect(isItemActive("/auth/accounting", account)).toBe(false);
  });
});

describe("header brand display", () => {
  const organisations = [
    {
      organisationId: "org-a",
      organisationName: "Acme",
      organisationSlug: "acme",
      role: "owner",
      brands: [
        { brandId: "brand-a", brandName: "Acme Studio", brandSlug: "acme-studio", role: "editor" },
      ],
    },
    {
      organisationId: "org-b",
      organisationName: "Client Co",
      organisationSlug: "client-co",
      role: "member",
      brands: [
        { brandId: "brand-b", brandName: "Studio", brandSlug: "studio", role: "viewer" },
      ],
    },
  ];

  it("shows the saved brand when the user is still assigned to it", () => {
    expect(displayBrandId(organisations, "brand-b")).toBe("brand-b");
  });

  it("ignores a saved brand the user no longer has and falls back to the first", () => {
    expect(displayBrandId(organisations, "brand-revoked")).toBe("brand-a");
  });

  it("returns nothing when the user has no assigned brand", () => {
    expect(displayBrandId([], "brand-a")).toBeNull();
  });
});
