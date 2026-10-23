import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  state: {
    membershipActive: true,
    assignmentActive: true,
    assignmentExpiresAt: Number.POSITIVE_INFINITY,
    entitled: true,
  },
  query: vi.fn(),
  findMembership: vi.fn(),
  getPersonalOrganisationOwner: vi.fn(),
}));
vi.mock("#lib/auth/server/database/db.js", () => ({ getDB: async () => ({ query: mocks.query }) }));
vi.mock("../better-auth-adapter.js", () => ({
  findMembership: mocks.findMembership,
  getPersonalOrganisationOwner: mocks.getPersonalOrganisationOwner,
}));

import { requireWorkspaceAccess } from "../context.js";
import { WorkspaceAccessError } from "../errors.js";
import {
  captureWorkspaceJob,
  executeWorkspaceJob,
  issueWorkspaceFileUrl,
  publishWorkspaceJobResult,
  type WorkspaceJobPolicy,
} from "../resource-contracts.js";

beforeEach(() => {
  mocks.state.membershipActive = true;
  mocks.state.assignmentActive = true;
  mocks.state.assignmentExpiresAt = Number.POSITIVE_INFINITY;
  mocks.state.entitled = true;
  vi.clearAllMocks();
  mocks.findMembership.mockImplementation(async (userId: string, organisationId: string) =>
    mocks.state.membershipActive &&
    userId === "user-a" &&
    ["org-a", "org-b"].includes(organisationId)
      ? {
          id: `member-${organisationId}`,
          organizationId: organisationId,
          userId,
          role: "owner",
          createdAt: new Date(),
        }
      : null,
  );
  mocks.getPersonalOrganisationOwner.mockResolvedValue("user-a");
  mocks.query.mockImplementation(async (sql: string, params: unknown[] = []) => {
    if (sql.includes('FROM "workspace"')) {
      const id = String(params[0]);
      return {
        rows: ["workspace-a", "workspace-b"].includes(id)
          ? [
              {
                id,
                organisationId: id === "workspace-a" ? "org-a" : "org-b",
                name: id,
                slug: id,
                createdBy: "user-a",
                status: "active",
              },
            ]
          : [],
      };
    }
    if (sql.includes('FROM "workspace_member"')) {
      const workspaceId = String(params[0]);
      const valid =
        mocks.state.assignmentActive &&
        mocks.state.assignmentExpiresAt > Date.now() &&
        ["workspace-a", "workspace-b"].includes(workspaceId);
      return {
        rows: valid
          ? [
              {
                id: `assignment-${workspaceId}`,
                workspaceId,
                userId: "user-a",
                role: "workspace_admin",
                status: "active",
                expiresAt: null,
                grantSource: "backfill",
                grantedBy: null,
                provisioningId: null,
                createdAt: new Date(),
                updatedAt: new Date(),
              },
            ]
          : [],
      };
    }
    if (sql.includes("creem_subscription")) {
      return {
        rows: mocks.state.entitled
          ? [{ status: "active", periodEnd: new Date(Date.now() + 60_000) }]
          : [],
      };
    }
    return { rows: [] };
  });
});

async function workspaceContext(action: "workspace:read" | "workspace:update" = "workspace:read") {
  return requireWorkspaceAccess(
    "user-a",
    "workspace-a",
    action,
    action === "workspace:update" ? { requireEntitlement: true } : {},
  );
}

function jobPolicy(overrides: Partial<WorkspaceJobPolicy> = {}): WorkspaceJobPolicy {
  return {
    resolveCurrentContext: async (principal) =>
      requireWorkspaceAccess(principal.userId, principal.workspaceId, "workspace:update", {
        requireEntitlement: true,
      }),
    authorizeAction: async (ctx, action) =>
      action === "workspace:update" && ctx.authorizedAction === "workspace:update",
    isEntitled: async () => mocks.state.entitled,
    ...overrides,
  };
}

describe("Phase 1 file and job authorization contracts", () => {
  it("does not let workspace:read imply file download or expose a URL", async () => {
    const ctx = await workspaceContext("workspace:read");
    const resolver = vi.fn(async () => ({ id: "file-a", workspaceId: "workspace-a" }));
    const signer = vi.fn(async () => "https://fixture.invalid/private/file-a");
    const actionPolicy = vi.fn(async (_context, action) => action === "workspace:read");
    await expect(
      issueWorkspaceFileUrl(ctx, "file-a", "file:download", actionPolicy, resolver, signer),
    ).rejects.toThrow(WorkspaceAccessError);
    expect(actionPolicy).toHaveBeenCalledWith(ctx, "file:download");
    expect(resolver).not.toHaveBeenCalled();
    expect(signer).not.toHaveBeenCalled();
  });

  it("passes only the context workspace to lookup and refuses a mismatched resource before signing", async () => {
    const ctx = await workspaceContext();
    const resolver = vi.fn(async (_workspaceId: string) => ({
      id: "file-b",
      workspaceId: "workspace-b",
    }));
    const signer = vi.fn(async () => "https://fixture.invalid/private/file-b");
    await expect(
      issueWorkspaceFileUrl(
        ctx,
        "file-b",
        "file:download",
        async (_context, action) => action === "file:download",
        resolver,
        signer,
      ),
    ).rejects.toThrow(WorkspaceAccessError);
    expect(resolver).toHaveBeenCalledWith("workspace-a", "file-b");
    expect(signer).not.toHaveBeenCalled();
  });

  it("issues a fixture URL only after explicit action approval and same-workspace ownership", async () => {
    const ctx = await workspaceContext();
    const order: string[] = [];
    const url = await issueWorkspaceFileUrl(
      ctx,
      "file-a",
      "file:download",
      async (_context, action) => {
        order.push(`authorize:${action}`);
        return action === "file:download";
      },
      async (workspaceId, id) => {
        order.push(`lookup:${workspaceId}:${id}`);
        return { id, workspaceId };
      },
      async () => {
        order.push("sign");
        return "https://fixture.invalid/private/file-a";
      },
    );
    expect(order).toEqual(["authorize:file:download", "lookup:workspace-a:file-a", "sign"]);
    expect(url).toBe("https://fixture.invalid/private/file-a");
    // This is a local contract fixture; it does not claim a real storage provider or URL lifetime is safe.
  });

  it("captures the principal from the validated workspace and rechecks access, action, and entitlement before both phases", async () => {
    const ctx = await workspaceContext("workspace:update");
    const policy = jobPolicy();
    const job = await captureWorkspaceJob(
      ctx,
      "workspace:update",
      { draft: "fixture", preferredWorkspaceId: "workspace-b" },
      policy,
    );
    expect(job.principal).toEqual({
      userId: "user-a",
      organisationId: "org-a",
      workspaceId: "workspace-a",
    });
    expect(Object.isFrozen(job)).toBe(true);
    expect(Object.isFrozen(job.principal)).toBe(true);
    const execution = await executeWorkspaceJob(job, policy, async (current, input) => ({
      workspaceId: current.workspaceId,
      text: input.draft,
    }));
    const publish = vi.fn(async () => {});
    await publishWorkspaceJobResult(execution, policy, publish);
    expect(execution.output).toEqual({ workspaceId: "workspace-a", text: "fixture" });
    expect(publish).toHaveBeenCalledOnce();
  });

  it("drops a result when organisation membership is revoked after execution, even if assignment data remains", async () => {
    const ctx = await workspaceContext("workspace:update");
    const policy = jobPolicy();
    const job = await captureWorkspaceJob(
      ctx,
      "workspace:update",
      { text: "private output" },
      policy,
    );
    const execution = await executeWorkspaceJob(job, policy, async (_current, input) => input.text);
    mocks.state.membershipActive = false;
    const publish = vi.fn(async () => {});
    await expect(publishWorkspaceJobResult(execution, policy, publish)).rejects.toThrow(
      WorkspaceAccessError,
    );
    expect(publish).not.toHaveBeenCalled();
  });

  it("denies execution for an expired assignment and denies publication when entitlement expires", async () => {
    const ctx = await workspaceContext("workspace:update");
    const policy = jobPolicy();
    const job = await captureWorkspaceJob(ctx, "workspace:update", { text: "fixture" }, policy);
    mocks.state.assignmentExpiresAt = Date.now() - 1;
    const execute = vi.fn(async () => "must not run");
    await expect(executeWorkspaceJob(job, policy, execute)).rejects.toThrow(WorkspaceAccessError);
    expect(execute).not.toHaveBeenCalled();

    mocks.state.assignmentExpiresAt = Number.POSITIVE_INFINITY;
    const secondJob = await captureWorkspaceJob(
      ctx,
      "workspace:update",
      { text: "fixture" },
      policy,
    );
    const execution = await executeWorkspaceJob(
      secondJob,
      policy,
      async (_current, input) => input.text,
    );
    mocks.state.entitled = false;
    const publish = vi.fn(async () => {});
    await expect(publishWorkspaceJobResult(execution, policy, publish)).rejects.toThrow(
      WorkspaceAccessError,
    );
    expect(publish).not.toHaveBeenCalled();
  });

  it("rejects a revalidation context for a different workspace before publication", async () => {
    const ctx = await workspaceContext("workspace:update");
    const job = await captureWorkspaceJob(
      ctx,
      "workspace:update",
      { text: "Brand A output" },
      jobPolicy(),
    );
    const execution = await executeWorkspaceJob(
      job,
      jobPolicy(),
      async (_current, input) => input.text,
    );
    const wrongWorkspacePolicy = jobPolicy({
      resolveCurrentContext: async () =>
        requireWorkspaceAccess("user-a", "workspace-b", "workspace:update", {
          requireEntitlement: true,
        }),
    });
    const publish = vi.fn(async () => {});
    await expect(
      publishWorkspaceJobResult(execution, wrongWorkspacePolicy, publish),
    ).rejects.toThrow(WorkspaceAccessError);
    expect(publish).not.toHaveBeenCalled();
  });
});
