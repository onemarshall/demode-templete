import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { organization } from "better-auth/plugins";

function sourceFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return sourceFiles(path);
    return /\.(?:ts|js|svelte)$/.test(entry.name) ? [path] : [];
  });
}

describe("workspace access contracts", () => {
  it("pins the Better Auth organisation adapter assumptions to installed 1.7.12 schema", () => {
    const installed = JSON.parse(
      readFileSync(join(process.cwd(), "node_modules/better-auth/package.json"), "utf8"),
    ) as { version: string };
    expect(installed.version).toBe("1.7.12");
    const schema = organization().schema;
    expect(Object.keys(schema.organization.fields)).toEqual(
      expect.arrayContaining(["name", "slug", "logo", "createdAt", "metadata"]),
    );
    expect(Object.keys(schema.member.fields)).toEqual(
      expect.arrayContaining(["organizationId", "userId", "role", "createdAt"]),
    );
    expect(Object.keys(schema.invitation.fields)).toEqual(
      expect.arrayContaining([
        "organizationId",
        "email",
        "role",
        "status",
        "expiresAt",
        "createdAt",
        "inviterId",
      ]),
    );
    expect(Object.keys(schema.session.fields)).toContain("activeOrganizationId");
  });

  it("keeps workspace-scoped SQL out of product routes and remote entry points", () => {
    const roots = ["src"];
    const files = roots
      .flatMap((root) => sourceFiles(join(process.cwd(), root)))
      .filter(
        (file) =>
          !file.includes("/src/lib/server/workspace/") &&
          !file.includes("/__tests__/") &&
          !/\.(?:test|spec)\./.test(file),
      );
    const scopedSql =
      /\b(?:FROM|JOIN|UPDATE|INSERT\s+INTO|DELETE\s+FROM)\s+["']?(?:workspace|workspace_member|audit_event|foundation|strategy|campaign|content_item|asset)\b/i;
    const violations = files.filter((file) => scopedSql.test(readFileSync(file, "utf8")));
    expect(violations).toEqual([]);
  });
});
