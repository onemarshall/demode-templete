import { afterEach, describe, expect, it, vi } from "vitest";
import { betterAuth } from "better-auth";
import { getMigrations } from "better-auth/db/migration";
import Database from "better-sqlite3";

const mocks = vi.hoisted(() => ({
  findMembership: vi.fn(),
  membershipHasRole: vi.fn(),
  cancelProvisioning: vi.fn(),
  onInvitationCreated: vi.fn(),
  guardInvitationAcceptance: vi.fn(),
  onInvitationAccepted: vi.fn(),
  cascadeMembershipRemoval: vi.fn(),
  auditMembershipChange: vi.fn(),
}));
vi.mock("#lib/server/workspace/better-auth-adapter.js", () => ({
  findMembership: mocks.findMembership,
  membershipHasRole: mocks.membershipHasRole,
}));
vi.mock("#lib/server/workspace/provisioning.js", () => ({
  onInvitationCreated: mocks.onInvitationCreated,
  guardInvitationAcceptance: mocks.guardInvitationAcceptance,
  onInvitationAccepted: mocks.onInvitationAccepted,
  cancelProvisioning: mocks.cancelProvisioning,
}));
vi.mock("#lib/server/workspace/cascade.js", () => ({
  cascadeMembershipRemoval: mocks.cascadeMembershipRemoval,
  auditMembershipChange: mocks.auditMembershipChange,
}));

import { OrganizationPlugin } from "../plugin.js";

const databases: Database.Database[] = [];
const baseURL = "http://localhost:3000";
type TestAuth = ReturnType<typeof makeAuth>["auth"];

function makeAuth() {
  const database = new Database(":memory:");
  databases.push(database);
  const auth = betterAuth({
    database,
    baseURL,
    secret: "organization-plugin-security-tests-secret-at-least-32",
    emailAndPassword: { enabled: true },
    plugins: [OrganizationPlugin({ AUTH_ORGANIZATION_PLUGIN: true })!],
    advanced: { backgroundTasks: { handler: () => {} } },
  });
  return { auth, database };
}

function cookie(response: Response) {
  return response.headers
    .getSetCookie()
    .map((value) => value.split(";")[0])
    .join("; ");
}

async function post(auth: TestAuth, path: string, body: unknown, sessionCookie: string) {
  return auth.handler(
    new Request(`${baseURL}/api/auth${path}`, {
      method: "POST",
      headers: { cookie: sessionCookie, origin: baseURL, "content-type": "application/json" },
      body: JSON.stringify(body),
    }),
  );
}

async function signUp(auth: TestAuth, email: string) {
  const response = await auth.api.signUpEmail({
    body: { name: "Organisation Test", email, password: "test-password-123" },
    asResponse: true,
  });
  const payload = (await response.json()) as { user: { id: string } };
  return { cookie: cookie(response), userId: payload.user.id };
}

afterEach(() => {
  for (const database of databases.splice(0)) database.close();
  vi.clearAllMocks();
});

async function createOrganisation(auth: TestAuth, ownerCookie: string) {
  const response = await post(
    auth,
    "/organization/create",
    { name: "Montsel Test", slug: `montsel-${Math.random().toString(36).slice(2, 9)}` },
    ownerCookie,
  );
  expect(response.status).toBe(200);
  return ((await response.json()) as { id: string }).id;
}

describe("Montsel Better Auth organisation plugin", () => {
  it("rejects native admin invitations, including comma and array role payloads, from an organisation admin", async () => {
    const { auth, database } = makeAuth();
    await (await getMigrations(auth.options)).runMigrations();
    const owner = await signUp(auth, "plugin-owner@example.test");
    const administrator = await signUp(auth, "plugin-admin@example.test");
    const organisationId = await createOrganisation(auth, owner.cookie);
    database
      .prepare("UPDATE user SET emailVerified = 1 WHERE id IN (?, ?)")
      .run(owner.userId, administrator.userId);
    const adminMembershipId = "plugin-admin-membership";
    database
      .prepare(
        "INSERT INTO member (id, organizationId, userId, role, createdAt) VALUES (?, ?, ?, ?, ?)",
      )
      .run(adminMembershipId, organisationId, administrator.userId, "admin", Date.now());
    mocks.findMembership.mockImplementation(
      async (userId: string, orgId: string) =>
        database
          .prepare(
            "SELECT id, organizationId, userId, role, createdAt FROM member WHERE userId = ? AND organizationId = ?",
          )
          .get(userId, orgId) ?? null,
    );
    mocks.membershipHasRole.mockImplementation((membership: { role: string }, role: string) =>
      membership.role
        .split(",")
        .map((value) => value.trim())
        .includes(role),
    );

    for (const [suffix, role] of [
      ["single", "admin"],
      ["comma", "admin,member"],
      ["array", ["admin", "member"]],
    ] as const) {
      const response = await post(
        auth,
        "/organization/invite-member",
        {
          email: `target-${suffix}@example.test`,
          organizationId: organisationId,
          role,
        },
        administrator.cookie,
      );
      expect(response.status).toBe(403);
    }
    const ownerInvitation = await post(
      auth,
      "/organization/invite-member",
      {
        email: "owner-authorized@example.test",
        organizationId: organisationId,
        role: "admin",
      },
      owner.cookie,
    );
    expect(ownerInvitation.status).toBe(200);
    expect(database.prepare("SELECT count(*) AS count FROM invitation").get()).toEqual({
      count: 1,
    });
  });

  it("blocks direct Better Auth member and ownership endpoints before they mutate membership", async () => {
    const { auth, database } = makeAuth();
    await (await getMigrations(auth.options)).runMigrations();
    const owner = await signUp(auth, "native-owner@example.test");
    const target = await signUp(auth, "native-target@example.test");
    const directTarget = await signUp(auth, "native-direct-add@example.test");
    const organisationId = await createOrganisation(auth, owner.cookie);
    database
      .prepare("UPDATE user SET emailVerified = 1 WHERE id IN (?, ?, ?)")
      .run(owner.userId, target.userId, directTarget.userId);
    database
      .prepare(
        "INSERT INTO member (id, organizationId, userId, role, createdAt) VALUES (?, ?, ?, ?, ?)",
      )
      .run("native-target-membership", organisationId, target.userId, "member", Date.now());

    const requests = [
      [
        "/organization/update-member-role",
        { organizationId: organisationId, memberId: "native-target-membership", role: "admin" },
      ],
      [
        "/organization/remove-member",
        { organizationId: organisationId, memberIdOrEmail: "native-target-membership" },
      ],
      ["/organization/leave", { organizationId: organisationId }],
    ] as const;
    for (const [path, body] of requests) {
      const response = await post(auth, path, body, owner.cookie);
      expect(response.status, path).toBe(403);
    }
    const nativeApi = auth.api as unknown as Record<string, (args: unknown) => Promise<Response>>;
    const directCalls = [
      [
        "updateMemberRole",
        { organizationId: organisationId, memberId: "native-target-membership", role: "admin" },
      ],
      [
        "removeMember",
        { organizationId: organisationId, memberIdOrEmail: "native-target-membership" },
      ],
      ["leaveOrganization", { organizationId: organisationId }],
      [
        "addMember",
        { organizationId: organisationId, userId: directTarget.userId, role: "member" },
      ],
    ] as const;
    for (const [method, body] of directCalls) {
      try {
        const response = await nativeApi[method]({
          body,
          headers: new Headers({ cookie: owner.cookie, origin: baseURL }),
          asResponse: true,
        });
        expect(response.status, method).toBe(403);
      } catch (error) {
        expect(error, method).toBeInstanceOf(Error);
        expect((error as Error).message).toContain("Use organisation settings");
      }
    }
    expect(
      database
        .prepare("SELECT userId, role FROM member WHERE organizationId = ? ORDER BY userId")
        .all(organisationId),
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ userId: owner.userId, role: "owner" }),
        expect.objectContaining({ userId: target.userId, role: "member" }),
      ]),
    );
    expect(
      database
        .prepare("SELECT count(*) AS count FROM member WHERE organizationId = ?")
        .get(organisationId),
    ).toEqual({ count: 2 });
  });
});
