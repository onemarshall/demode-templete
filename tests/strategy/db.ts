import { readFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { Pool } from "pg";
import { readConnection } from "../../scripts/strategy/integration/local-stack";

/** A disposable schema on the explicitly guarded strategy_auth_integration_test database. */
export async function createStrategyTestDatabase() {
  const config = await readConnection();
  const schema = `strategy_m01_${randomUUID().replaceAll("-", "")}`;
  const admin = new Pool({ connectionString: config.databaseUrl });
  await admin.query(`CREATE SCHEMA ${schema}`);
  const pool = new Pool({ connectionString: config.databaseUrl, options: `-c search_path=${schema}` });
  try {
    for (const migration of ["0004_strategy_core.sql", "0005_strategy_jobs.sql"])
      await pool.query(await readFile(new URL(`../../database/migrations/${migration}`, import.meta.url), "utf8"));
  } catch (error) {
    await pool.end();
    await admin.query(`DROP SCHEMA ${schema} CASCADE`);
    await admin.end();
    throw error;
  }
  return {
    pool,
    async close() {
      await pool.end();
      await admin.query(`DROP SCHEMA ${schema} CASCADE`);
      await admin.end();
    },
  };
}
