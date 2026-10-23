#!/usr/bin/env bun
/** Versioned SQL migration runner. Applied files are immutable; repair forward. */

import { createHash } from "crypto";
import { readdirSync, readFileSync } from "fs";
import { join } from "path";
import * as dotenv from "dotenv";
import { Pool, type PoolClient } from "pg";

dotenv.config();

const MIGRATIONS_DIR = join(import.meta.dir, "..", "..", "database", "migrations");
const LOCK_KEY = [1296916814, 1] as const;

interface MigrationFile {
  version: number;
  name: string;
  sql: string;
  checksum: string;
}

interface AppliedMigration {
  version: number;
  name: string;
  checksum: string;
  applied_at: Date;
}

function loadMigrationFiles(): MigrationFile[] {
  const entries = readdirSync(MIGRATIONS_DIR)
    .filter((file) => file.endsWith(".sql"))
    .map((name) => {
      const match = /^(\d+)_/.exec(name);
      if (!match) throw new Error(`Migration file lacks a numeric version prefix: ${name}`);
      const version = Number(match[1]);
      if (!Number.isSafeInteger(version) || version < 1)
        throw new Error(`Invalid migration version: ${name}`);
      const sql = readFileSync(join(MIGRATIONS_DIR, name), "utf8");
      return { version, name, sql, checksum: createHash("sha256").update(sql).digest("hex") };
    })
    .sort((a, b) => a.version - b.version);
  const seen = new Set<number>();
  for (const file of entries) {
    if (seen.has(file.version)) throw new Error(`Duplicate migration version: ${file.version}`);
    seen.add(file.version);
  }
  return entries;
}

async function hasMigrationLedger(client: PoolClient): Promise<boolean> {
  const { rows } = await client.query<{ exists: boolean }>(
    `SELECT to_regclass('public.schema_migrations') IS NOT NULL AS exists`,
  );
  return rows[0]?.exists ?? false;
}

async function ensureMigrationTables(client: PoolClient): Promise<void> {
  await client.query(`
		CREATE TABLE IF NOT EXISTS "schema_migrations" (
			"version" integer PRIMARY KEY,
			"name" text NOT NULL,
			"checksum" text NOT NULL,
			"applied_at" timestamptz NOT NULL DEFAULT now()
		)
	`);
  await client.query(`
		CREATE TABLE IF NOT EXISTS "schema_migration_attempts" (
			"id" bigserial PRIMARY KEY,
			"version" integer NOT NULL,
			"name" text NOT NULL,
			"status" text NOT NULL CHECK ("status" IN ('running', 'applied', 'failed')),
			"started_at" timestamptz NOT NULL DEFAULT now(),
			"finished_at" timestamptz,
			"error" text
		)
	`);
}

async function appliedMigrations(client: PoolClient): Promise<Map<number, AppliedMigration>> {
  const { rows } = await client.query<AppliedMigration>(
    `SELECT "version", "name", "checksum", "applied_at" FROM "schema_migrations" ORDER BY "version"`,
  );
  return new Map(rows.map((row) => [row.version, row]));
}

function assertNoChecksumDrift(
  files: MigrationFile[],
  applied: Map<number, AppliedMigration>,
): void {
  for (const file of files) {
    const record = applied.get(file.version);
    if (record && record.checksum !== file.checksum) {
      throw new Error(
        `Checksum drift for migration ${file.version} (${file.name}). ` +
          `Applied ${record.checksum.slice(0, 12)}… vs file ${file.checksum.slice(0, 12)}…. ` +
          `Applied migrations are immutable: fix forward with a new migration.`,
      );
    }
  }
  for (const record of applied.values()) {
    if (!files.some((file) => file.version === record.version)) {
      console.warn(`⚠ Recorded migration ${record.version} (${record.name}) has no file on disk`);
    }
  }
}

function showStatus(files: MigrationFile[], applied: Map<number, AppliedMigration>): void {
  console.log(`Migrations directory: database/migrations (${files.length} files)`);
  for (const file of files) {
    console.log(`  ${applied.has(file.version) ? "✓" : "○"} ${file.version} ${file.name}`);
  }
}

async function main(): Promise<void> {
  const databaseUrl = process.env.BETTER_DATABASE_URL || process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("BETTER_DATABASE_URL (or DATABASE_URL) is required");

  const dryRun = process.argv.includes("--dry-run");
  const statusOnly = process.argv.includes("--status");
  if (dryRun && statusOnly) throw new Error("Use either --dry-run or --status, not both");
  const files = loadMigrationFiles();
  const pool = new Pool({ connectionString: databaseUrl, max: 1 });
  const client = await pool.connect();
  let lockAcquired = false;
  try {
    const hasLedger = await hasMigrationLedger(client);
    // Status and dry-run are intentionally read-only, including on a fresh DB.
    if (statusOnly || dryRun) {
      const applied = hasLedger
        ? await appliedMigrations(client)
        : new Map<number, AppliedMigration>();
      assertNoChecksumDrift(files, applied);
      if (statusOnly) showStatus(files, applied);
      else {
        for (const file of files.filter((item) => !applied.has(item.version))) {
          console.log(`[dry-run] would apply ${file.version} ${file.name}`);
        }
      }
      return;
    }

    // Lock before creating the ledger. All runners re-read state after the lock.
    await client.query("SELECT pg_advisory_lock($1, $2)", [...LOCK_KEY]);
    lockAcquired = true;
    await ensureMigrationTables(client);
    await client.query(`
			UPDATE "schema_migration_attempts"
			SET "status" = 'failed', "finished_at" = now(),
			    "error" = 'Runner stopped before recording completion'
			WHERE "status" = 'running'
		`);
    const applied = await appliedMigrations(client);
    assertNoChecksumDrift(files, applied);
    const pending = files.filter((file) => !applied.has(file.version));
    if (pending.length === 0) {
      console.log("✓ Database is up to date");
      return;
    }

    for (const file of pending) {
      const started = Date.now();
      const { rows } = await client.query<{ id: string }>(
        `INSERT INTO "schema_migration_attempts" ("version", "name", "status")
				 VALUES ($1, $2, 'running') RETURNING "id"`,
        [file.version, file.name],
      );
      const attemptId = rows[0]!.id;
      try {
        await client.query("BEGIN");
        await client.query(file.sql);
        await client.query(
          `INSERT INTO "schema_migrations" ("version", "name", "checksum") VALUES ($1, $2, $3)`,
          [file.version, file.name, file.checksum],
        );
        await client.query(
          `UPDATE "schema_migration_attempts"
					 SET "status" = 'applied', "finished_at" = now() WHERE "id" = $1`,
          [attemptId],
        );
        await client.query("COMMIT");
        console.log(`✓ ${file.version} ${file.name} (${Date.now() - started}ms)`);
      } catch (error) {
        try {
          await client.query("ROLLBACK");
        } finally {
          const message = (error instanceof Error ? error.message : String(error)).slice(0, 4000);
          await client.query(
            `UPDATE "schema_migration_attempts"
						 SET "status" = 'failed', "finished_at" = now(), "error" = $2 WHERE "id" = $1`,
            [attemptId, message],
          );
        }
        throw new Error(
          `Migration ${file.version} (${file.name}) failed and was rolled back. ` +
            `Cause: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }
  } finally {
    if (lockAcquired) await client.query("SELECT pg_advisory_unlock($1, $2)", [...LOCK_KEY]);
    client.release();
    await pool.end();
  }
}

main().catch((error) => {
  console.error(`\n✗ ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
