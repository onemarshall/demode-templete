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

import { requireBrandAccess } from "../context.js";
import { BrandAccessError } from "../errors.js";
import {
  captureBrandJob,
  executeBrandJob,
  issueBrandFileUrl,
  publishBrandJobResult,
  type BrandJobPolicy,
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
    if (sql.includes('FROM "brand"')) {
      const id = String(params[0]);
      return {
        rows: ["brand-a", "brand-b"].includes(id)
          ? [
              {
                id,
                organisationId: id === "brand-a" ? "org-a" : "org-b",
                name: id,
                slug: id,
                createdBy: "user-a",
                status: "active",
              },
            ]
          : [],
      };
    }
    if (sql.includes('FROM "brand_member"')) {
      const brandId = String(params[0]);
      const valid =
        mocks.state.assignmentActive &&
        mocks.state.assignmentExpiresAt > Date.now() &&
        ["brand-a", "brand-b"].includes(brandId);
      return {
        rows: valid
          ? [
              {
                id: `assignment-${brandId}`,
                brandId,
                userId: "user-a",
                role: "brand_admin",
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

async function brandContext(action: "brand:read" | "brand:update" = "brand:read") {
  return requireBrandAccess(
    "user-a",
    "brand-a",
    action,
    action === "brand:update" ? { requireEntitlement: true } : {},
  );
}

function jobPolicy(overrides: Partial<BrandJobPolicy> = {}): BrandJobPolicy {
  return {
    resolveCurrentContext: async (principal) =>
      requireBrandAccess(principal.userId, principal.brandId, "brand:update", {
        requireEntitlement: true,
      }),
    authorizeAction: async (ctx, action) =>
      action === "brand:update" && ctx.authorizedAction === "brand:update",
    isEntitled: async () => mocks.state.entitled,
    ...overrides,
  };
}

describe("Phase 1 file and job authorization contracts", () => {
  it("does not let brand:read imply file download or expose a URL", async () => {
    const ctx = await brandContext("brand:read");
    const resolver = vi.fn(async () => ({ id: "file-a", brandId: "brand-a" }));
    const signer = vi.fn(async () => "https://fixture.invalid/private/file-a");
    const actionPolicy = vi.fn(async (_context, action) => action === "brand:read");
    await expect(
      issueBrandFileUrl(ctx, "file-a", "file:download", actionPolicy, resolver, signer),
    ).rejects.toThrow(BrandAccessError);
    expect(actionPolicy).toHaveBeenCalledWith(ctx, "file:download");
    expect(resolver).not.toHaveBeenCalled();
    expect(signer).not.toHaveBeenCalled();
  });

  it("passes only the context brand to lookup and refuses a mismatched resource before signing", async () => {
    const ctx = await brandContext();
    const resolver = vi.fn(async (_brandId: string) => ({
      id: "file-b",
      brandId: "brand-b",
    }));
    const signer = vi.fn(async () => "https://fixture.invalid/private/file-b");
    await expect(
      issueBrandFileUrl(
        ctx,
        "file-b",
        "file:download",
        async (_context, action) => action === "file:download",
        resolver,
        signer,
      ),
    ).rejects.toThrow(BrandAccessError);
    expect(resolver).toHaveBeenCalledWith("brand-a", "file-b");
    expect(signer).not.toHaveBeenCalled();
  });

  it("issues a fixture URL only after explicit action approval and same-brand ownership", async () => {
    const ctx = await brandContext();
    const order: string[] = [];
    const url = await issueBrandFileUrl(
      ctx,
      "file-a",
      "file:download",
      async (_context, action) => {
        order.push(`authorize:${action}`);
        return action === "file:download";
      },
      async (brandId, id) => {
        order.push(`lookup:${brandId}:${id}`);
        return { id, brandId };
      },
      async () => {
        order.push("sign");
        return "https://fixture.invalid/private/file-a";
      },
    );
    expect(order).toEqual(["authorize:file:download", "lookup:brand-a:file-a", "sign"]);
    expect(url).toBe("https://fixture.invalid/private/file-a");
    // This is a local contract fixture; it does not claim a real storage provider or URL lifetime is safe.
  });

  it("captures the principal from the validated brand and rechecks access, action, and entitlement before both phases", async () => {
    const ctx = await brandContext("brand:update");
    const policy = jobPolicy();
    const job = await captureBrandJob(
      ctx,
      "brand:update",
      { draft: "fixture", preferredBrandId: "brand-b" },
      policy,
    );
    expect(job.principal).toEqual({
      userId: "user-a",
      organisationId: "org-a",
      brandId: "brand-a",
    });
    expect(Object.isFrozen(job)).toBe(true);
    expect(Object.isFrozen(job.principal)).toBe(true);
    const execution = await executeBrandJob(job, policy, async (current, input) => ({
      brandId: current.brandId,
      text: input.draft,
    }));
    const publish = vi.fn(async () => {});
    await publishBrandJobResult(execution, policy, publish);
    expect(execution.output).toEqual({ brandId: "brand-a", text: "fixture" });
    expect(publish).toHaveBeenCalledOnce();
  });

  it("drops a result when organisation membership is revoked after execution, even if assignment data remains", async () => {
    const ctx = await brandContext("brand:update");
    const policy = jobPolicy();
    const job = await captureBrandJob(
      ctx,
      "brand:update",
      { text: "private output" },
      policy,
    );
    const execution = await executeBrandJob(job, policy, async (_current, input) => input.text);
    mocks.state.membershipActive = false;
    const publish = vi.fn(async () => {});
    await expect(publishBrandJobResult(execution, policy, publish)).rejects.toThrow(
      BrandAccessError,
    );
    expect(publish).not.toHaveBeenCalled();
  });

  it("denies execution for an expired assignment and denies publication when entitlement expires", async () => {
    const ctx = await brandContext("brand:update");
    const policy = jobPolicy();
    const job = await captureBrandJob(ctx, "brand:update", { text: "fixture" }, policy);
    mocks.state.assignmentExpiresAt = Date.now() - 1;
    const execute = vi.fn(async () => "must not run");
    await expect(executeBrandJob(job, policy, execute)).rejects.toThrow(BrandAccessError);
    expect(execute).not.toHaveBeenCalled();

    mocks.state.assignmentExpiresAt = Number.POSITIVE_INFINITY;
    const secondJob = await captureBrandJob(
      ctx,
      "brand:update",
      { text: "fixture" },
      policy,
    );
    const execution = await executeBrandJob(
      secondJob,
      policy,
      async (_current, input) => input.text,
    );
    mocks.state.entitled = false;
    const publish = vi.fn(async () => {});
    await expect(publishBrandJobResult(execution, policy, publish)).rejects.toThrow(
      BrandAccessError,
    );
    expect(publish).not.toHaveBeenCalled();
  });

  it("rejects a revalidation context for a different brand before publication", async () => {
    const ctx = await brandContext("brand:update");
    const job = await captureBrandJob(
      ctx,
      "brand:update",
      { text: "Brand A output" },
      jobPolicy(),
    );
    const execution = await executeBrandJob(
      job,
      jobPolicy(),
      async (_current, input) => input.text,
    );
    const wrongBrandPolicy = jobPolicy({
      resolveCurrentContext: async () =>
        requireBrandAccess("user-a", "brand-b", "brand:update", {
          requireEntitlement: true,
        }),
    });
    const publish = vi.fn(async () => {});
    await expect(
      publishBrandJobResult(execution, wrongBrandPolicy, publish),
    ).rejects.toThrow(BrandAccessError);
    expect(publish).not.toHaveBeenCalled();
  });
});
