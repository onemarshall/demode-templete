#!/usr/bin/env bun
/**
 * End-to-end Phase 1 schema proof for a dedicated, loopback PostgreSQL database.
 * This uses the repository's real Better Auth CLI config and the getMigrations
 * implementation from the installed Better Auth package.
 */

import { execFileSync } from "child_process";
import { Pool } from "pg";
import { getMigrations } from "better-auth/db/migration";
import type { BetterAuthOptions } from "better-auth";
import { join } from "path";

const DATABASE_NAME = "montsel_phase1_verify";
const PROJECT_ROOT = join(import.meta.dir, "..", "..");
const VERIFY_URL = process.env.MONTSEL_PHASE1_VERIFY_DATABASE_URL;

function requireSafeDatabase(urlValue: string | undefined): string {
  if (!urlValue) {
    throw new Error(
      `Set MONTSEL_PHASE1_VERIFY_DATABASE_URL to a dedicated loopback database named ${DATABASE_NAME}.`,
    );
  }
  const url = new URL(urlValue);
  const hostname = url.hostname.replace(/^\[|\]$/g, "").toLowerCase();
  if (!["localhost", "127.0.0.1", "::1"].includes(hostname)) {
    throw new Error("Verification is restricted to PostgreSQL on localhost/loopback.");
  }
  if (decodeURIComponent(url.pathname.replace(/^\//, "")) !== DATABASE_NAME) {
    throw new Error(`Verification database must be named exactly ${DATABASE_NAME}.`);
  }
  if (url.searchParams.has("options") || url.searchParams.has("host")) {
    throw new Error("Do not override the PostgreSQL host through URL options.");
  }
  return urlValue;
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

async function ensureEmptyOrPreviouslyVerified(pool: Pool): Promise<boolean> {
  const { rows: tables } = await pool.query<{ table_name: string }>(`
		SELECT table_name
		FROM information_schema.tables
		WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
		ORDER BY table_name
	`);
  const ledgerExists = tables.some((row) => row.table_name === "schema_migrations");
  if (!ledgerExists) {
    assert(
      tables.length === 0,
      `The database already has public tables (${tables.map((row) => row.table_name).join(", ")}). Use a fresh dedicated database.`,
    );
    return false;
  }
  const { rows } = await pool.query<{ version: number }>(
    `SELECT version FROM schema_migrations ORDER BY version`,
  );
  assert(
    rows.length === 2 && rows[0]?.version === 1 && rows[1]?.version === 2,
    `Existing ledger is not the completed Phase 1 proof schema (versions: ${rows.map((row) => row.version).join(", ")}).`,
  );
  return true;
}

async function assertColumns(pool: Pool, table: string, required: string[]): Promise<string[]> {
  const { rows } = await pool.query<{ column_name: string }>(
    `SELECT column_name FROM information_schema.columns
		 WHERE table_schema = 'public' AND table_name = $1 ORDER BY ordinal_position`,
    [table],
  );
  const actual = rows.map((row) => row.column_name);
  const missing = required.filter((column) => !actual.includes(column));
  assert(
    missing.length === 0,
    `Better Auth table ${table} is missing required columns: ${missing.join(", ")}`,
  );
  return actual;
}

async function assertNoBetterAuthDrift(
  options: Parameters<typeof getMigrations>[0],
): Promise<void> {
  const plan = await getMigrations(options);
  assert(
    plan.unsafeChanges.length === 0,
    `Better Auth reports unsafe changes: ${plan.unsafeChanges.join("; ")}`,
  );
  assert(
    plan.schemaProblems.length === 0,
    `Better Auth reports schema problems: ${plan.schemaProblems.join("; ")}`,
  );
  assert(
    plan.toBeCreated.length === 0 &&
      plan.toBeAdded.length === 0 &&
      plan.toBeAddedIndexes.length === 0,
    `Better Auth schema drift remains: ${[
      ...plan.toBeCreated.map((item) => `create ${item.table}`),
      ...plan.toBeAdded.map((item) => `add fields to ${item.table}`),
      ...plan.toBeAddedIndexes.map((item) => `add index ${item.name}`),
    ].join(", ")}`,
  );
}

async function runMontselMigrations(databaseUrl: string): Promise<string> {
  try {
    return execFileSync(process.execPath, ["scripts/database/migrate.ts"], {
      cwd: PROJECT_ROOT,
      env: { ...process.env, BETTER_DATABASE_URL: databaseUrl },
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
  } catch (error) {
    const output =
      error && typeof error === "object" && "stderr" in error ? String(error.stderr) : "";
    throw new Error(`Montsel migration runner failed. ${output.trim()}`);
  }
}

async function main(): Promise<void> {
  const databaseUrl = requireSafeDatabase(VERIFY_URL);
  // The CLI config reads BETTER_DATABASE_URL and contains the installed plugin set.
  process.env.BETTER_DATABASE_URL = databaseUrl;
  const { default: auth } = await import("../auth-cli.ts");
  const authOptions = auth.options as BetterAuthOptions;
  // A blank database is an intentional input to getMigrations; suppress the
  // separate request-time schema guard during that pre-migration window.
  authOptions.advanced = {
    ...authOptions.advanced,
    database: { ...authOptions.advanced?.database, validateSchema: false },
  };
  const authPool = authOptions.database as Pool;
  const pool = new Pool({ connectionString: databaseUrl, max: 2 });
  try {
    const previouslyVerified = await ensureEmptyOrPreviouslyVerified(pool);
    const initialPlan = await getMigrations(authOptions);
    assert(initialPlan.unsafeChanges.length === 0, initialPlan.unsafeChanges.join("; "));
    assert(initialPlan.schemaProblems.length === 0, initialPlan.schemaProblems.join("; "));
    if (!previouslyVerified) {
      const plannedTables = new Set(initialPlan.toBeCreated.map((item) => item.table));
      for (const table of ["organization", "member", "invitation"]) {
        assert(
          plannedTables.has(table),
          `Installed Better Auth migration plan does not create ${table}.`,
        );
      }
      await initialPlan.runMigrations();
    }

    const organizationColumns = await assertColumns(pool, "organization", [
      "id",
      "name",
      "slug",
      "metadata",
      "createdAt",
    ]);
    const memberColumns = await assertColumns(pool, "member", [
      "id",
      "organizationId",
      "userId",
      "role",
      "createdAt",
    ]);
    const invitationColumns = await assertColumns(pool, "invitation", [
      "id",
      "organizationId",
      "email",
      "role",
      "status",
      "inviterId",
      "expiresAt",
      "createdAt",
    ]);
    const userColumns = await assertColumns(pool, "user", ["id", "name", "email", "emailVerified"]);

    const seedUsers = [
      {
        id: "montsel_verify_user_1",
        name: "Montsel Verify One",
        email: "montsel-verify-one@example.test",
      },
      {
        id: "montsel_verify_user_2",
        name: "Montsel Verify Two",
        email: "montsel-verify-two@example.test",
      },
    ];
    const { rows: existingUsers } = await pool.query<{ id: string }>(
      `SELECT id FROM "user" ORDER BY id`,
    );
    const seedIds = new Set(seedUsers.map((user) => user.id));
    assert(
      existingUsers.every((row) => seedIds.has(row.id)) && existingUsers.length <= seedUsers.length,
      "The dedicated verification database contains non-verifier user rows.",
    );
    for (const user of seedUsers) {
      await pool.query(
        `INSERT INTO "user" ("id", "name", "email", "emailVerified")
				 VALUES ($1, $2, $3, false) ON CONFLICT ("id") DO NOTHING`,
        [user.id, user.name, user.email],
      );
    }

    const firstRun = await runMontselMigrations(databaseUrl);
    const secondRun = await runMontselMigrations(databaseUrl);
    if (previouslyVerified) {
      assert(
        firstRun.includes("up to date"),
        "Repeat verification unexpectedly changed the Montsel schema.",
      );
    } else {
      assert(
        firstRun.includes("✓ 1 ") && firstRun.includes("✓ 2 "),
        "First Montsel run did not apply both ordered migrations.",
      );
    }
    assert(secondRun.includes("up to date"), "Second Montsel run was not idempotent.");

    await assertNoBetterAuthDrift(authOptions);
    const counts = await pool.query<{
      users: string;
      personal_orgs: string;
      workspaces: string;
      assignments: string;
      preferences: string;
    }>(`
			SELECT
				(SELECT count(*) FROM "user") AS users,
				(SELECT count(*) FROM "personal_organisation_owner") AS personal_orgs,
				(SELECT count(*) FROM "workspace") AS workspaces,
				(SELECT count(*) FROM "workspace_member" WHERE "grant_source" = 'backfill') AS assignments,
				(SELECT count(*) FROM "user_workspace_preference") AS preferences
		`);
    const result = counts.rows[0]!;
    for (const [key, value] of Object.entries(result)) {
      assert(Number(value) === 2, `Expected two seeded rows for ${key}, found ${value}.`);
    }
    const { rows: migrationRows } = await pool.query<{ version: number }>(
      `SELECT version FROM schema_migrations ORDER BY version`,
    );
    assert(migrationRows.length === 2, "Unexpected Montsel migration ledger contents.");

    console.log(
      `Better Auth tables verified: organization (${organizationColumns.join(", ")}); member (${memberColumns.join(", ")}); invitation (${invitationColumns.join(", ")}); user (${userColumns.join(", ")}).`,
    );
    console.log("Better Auth getMigrations reports no remaining schema changes.");
    console.log("Montsel migrations 1 and 2 applied in order; repeat run is up to date.");
    console.log(
      "Backfill verified: 2 users, 2 personal-owner links, 2 workspaces, 2 active assignments, 2 preferences.",
    );
  } finally {
    await pool.end();
    await authPool.end();
  }
}

main().catch((error) => {
  console.error(`\n✗ ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
